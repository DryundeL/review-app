import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  entriesFromLayout,
  fetchResult,
  isOwnerView,
  publishList,
  resultPublishIssues,
  saveResult,
  useResultQuery,
  type Layout,
  type Result,
  type Visibility,
} from "@/entities/list";
import { useAuthSession } from "@/features/auth";
import { ConflictDialog, ListAutosave, useListAutosave } from "@/features/list-autosave";
import { ownerActionMessage } from "@/features/manage-list";
import { ApiError } from "@/shared/api";
import { confirmLeave, usePageMeta, useUnsavedChangesGuard } from "@/shared/hooks";
import { Button, Input } from "@/shared/ui";
import {
  LIMITS,
  rebaseDraft,
  toDraft,
  toResultInput,
  type ResultDraft,
} from "../model/resultDraft";
import { LayoutEditor } from "./LayoutEditor";
import "./ListResultEditorPage.css";

const PUBLISH_ISSUES_TEXT = "Нужно название и хотя бы один разложенный элемент";
const STALE_LAYOUT_TEXT = "Раскладка устарела, обновите страницу";

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "UNKNOWN", "Не удалось выполнить действие. Попробуйте ещё раз.");
}

const isRevisionConflict = (error: ApiError) =>
  error.status === 409 && error.code === "REVISION_CONFLICT";

const isStaleLayout = (error: ApiError | null) =>
  error?.status === 422 && Boolean(error.details?.field?.startsWith("entries"));

export function ListResultEditorPage() {
  const { resultId } = useParams();
  const { profile } = useAuthSession();
  const query = useResultQuery(resultId, profile?.id ?? null);
  const result = query.data;

  const pageMeta = useMemo(
    () => ({
      path: `/list-results/${resultId ?? ""}/edit`,
      title: "Редактор топа",
      noindex: true,
    }),
    [resultId],
  );
  usePageMeta(pageMeta);

  // Кешированный гостевой ответ без полей автора: ждём перезапрос с входом.
  const waiting = query.isLoading || (result && !isOwnerView(result) && query.isFetching);
  if (waiting) {
    return (
      <section className="result-editor screen" aria-busy="true">
        <p className="muted">Загрузка…</p>
      </section>
    );
  }
  if (!result || !isOwnerView(result)) {
    const notFound =
      (result && !isOwnerView(result)) ||
      (query.error instanceof ApiError && query.error.status === 404);
    return (
      <section className="result-editor screen">
        <h1>{notFound ? "Не найдено" : "Ошибка загрузки"}</h1>
        <Link to="/my-lists">К моим спискам</Link>
      </section>
    );
  }

  return <ResultEditor key={`${result.id}:${result.status}`} result={result} />;
}

function ResultEditor({ result }: { result: Result }) {
  const id = result.id;
  const auto = result.status === "draft";
  const queryKey = useMemo(() => ["list-result", id], [id]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [session] = useState(
    () =>
      new ListAutosave<ResultDraft, Result>(
        result,
        toDraft,
        async (revision, draft) => {
          const saved = await saveResult(id, toResultInput(draft, result, revision));
          queryClient.setQueryData(queryKey, saved);
          return saved;
        },
        { auto, rebase: rebaseDraft },
      ),
  );
  useEffect(
    () => () => {
      session.dispose();
      void queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    [session, queryClient],
  );

  const { draft, saved, dirty, saving, conflict, error } = useListAutosave(session);
  useUnsavedChangesGuard(dirty || saving);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(result.visibility ?? "public");
  const [actionConflict, setActionConflict] = useState(false);
  const [conflictHidden, setConflictHidden] = useState(false);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const update = useCallback(
    (patch: Partial<ResultDraft>) => {
      setNotice(null);
      setActionError(null);
      session.change(patch);
    },
    [session],
  );
  const changeLayout = useCallback((layout: Layout) => update({ layout }), [update]);

  /** false — сохранение не удалось; причина уже в состоянии сессии. */
  async function flushSafely(): Promise<boolean> {
    try {
      await session.flush();
      return true;
    } catch {
      return false;
    }
  }

  function checkReadiness(): boolean {
    const { title, layout } = session.snapshot().draft;
    if (resultPublishIssues(title, entriesFromLayout(layout, result.tiers)).length === 0) {
      return true;
    }
    setNotice(PUBLISH_ISSUES_TEXT);
    return false;
  }

  function handleActionError(cause: unknown, action: "publish" | "other") {
    const apiError = toApiError(cause);
    if (isRevisionConflict(apiError)) {
      setActionConflict(true);
      setConflictHidden(false);
      return;
    }
    setActionError(apiError);
    if (action === "publish" && apiError.status === 403) {
      setNotice("Шаблон скрыт модератором");
    } else if (isStaleLayout(apiError)) {
      setNotice(STALE_LAYOUT_TEXT);
    } else {
      setNotice(ownerActionMessage(apiError, action));
    }
  }

  async function publish() {
    setNotice(null);
    setActionError(null);
    setBusy(true);
    try {
      if (!(await flushSafely())) return;
      if (!checkReadiness()) return;
      const revision = session.snapshot().saved.revision;
      if (revision === undefined) {
        throw new ApiError(0, "NO_REVISION", "Обновите страницу.");
      }
      const published = await publishList("results", id, revision, visibility);
      navigate(`/list-results/${id}`);
      queryClient.setQueryData(queryKey, published);
      void queryClient.invalidateQueries({ queryKey: ["lists"] });
    } catch (cause) {
      handleActionError(cause, "publish");
    } finally {
      setBusy(false);
    }
  }

  async function savePublished() {
    setNotice(null);
    setActionError(null);
    // Опубликованный топ должен остаться пригодным к публикации.
    if (!checkReadiness()) return;
    await flushSafely();
  }

  async function resolveConflict(mode: "reload" | "overwrite") {
    setConflictBusy(true);
    setConflictError(null);
    try {
      const fresh = await fetchResult(id);
      setActionConflict(false);
      setConflictHidden(false);
      setSelectedId(null);
      setNotice(null);
      setActionError(null);
      if (mode === "reload") {
        session.reload(fresh);
        queryClient.setQueryData(queryKey, fresh);
      } else {
        await session.overwrite(fresh).catch(() => {});
      }
    } catch (cause) {
      setConflictError(toApiError(cause).message);
    } finally {
      setConflictBusy(false);
    }
  }

  async function reloadStale() {
    setConflictBusy(true);
    try {
      const fresh = await fetchResult(id);
      setSelectedId(null);
      setNotice(null);
      setActionError(null);
      session.reload(fresh);
      queryClient.setQueryData(queryKey, fresh);
    } catch (cause) {
      setNotice(toApiError(cause).message);
    } finally {
      setConflictBusy(false);
    }
  }

  async function leave() {
    if (auto) await flushSafely();
    if (!confirmLeave(session.snapshot().dirty)) return;
    navigate(`/list-results/${id}`);
  }

  const hasConflict = conflict || actionConflict;
  const stale = isStaleLayout(error) || isStaleLayout(actionError);
  const statusText = hasConflict
    ? "Конфликт версий"
    : saving
      ? "Сохранение…"
      : stale
        ? STALE_LAYOUT_TEXT
        : error && !isRevisionConflict(error)
          ? `Не сохранено: ${error.message}`
          : dirty
            ? "Есть несохранённые изменения"
            : "Сохранено";
  const disabled = busy || conflictBusy;
  const titleInvalid = error?.status === 422 && error.details?.field === "title";

  return (
    <section className="result-editor screen">
      <header className="result-editor__header">
        <h1 className="result-editor__title">Редактор топа</h1>
        <Button variant="ghost" disabled={disabled} onClick={() => void leave()}>
          {auto ? "Готово" : "Назад"}
        </Button>
      </header>
      <p className="muted">Шаблон: {saved.template.title}</p>

      <div className="result-editor__status" role="status" aria-live="polite">
        <span className={error || hasConflict ? "result-editor__status--error" : "muted"}>
          {statusText}
        </span>
        {hasConflict && conflictHidden ? (
          <Button variant="ghost" onClick={() => setConflictHidden(false)}>
            Решить
          </Button>
        ) : null}
        {stale ? (
          <Button variant="ghost" disabled={conflictBusy} onClick={() => void reloadStale()}>
            Обновить
          </Button>
        ) : null}
      </div>

      <fieldset className="result-editor__form" disabled={disabled}>
        <label className="result-editor__field">
          Название
          <Input
            aria-invalid={titleInvalid ? true : undefined}
            maxLength={LIMITS.title}
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
        <label className="result-editor__field">
          Описание
          <textarea
            className="result-editor__textarea"
            maxLength={LIMITS.description}
            rows={3}
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
          />
        </label>

        <LayoutEditor
          format={saved.format}
          tiers={saved.tiers}
          items={saved.items}
          layout={draft.layout}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={changeLayout}
          disabled={disabled}
        />
      </fieldset>

      {notice ? (
        <p className="result-editor__error" role="alert">
          {notice}
        </p>
      ) : null}

      <footer className="result-editor__footer">
        {auto ? (
          <>
            <fieldset className="result-editor__formats" disabled={disabled}>
              <legend>Кто увидит</legend>
              <label className="result-editor__radio">
                <input
                  type="radio"
                  name="result-visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                Всем
              </label>
              <label className="result-editor__radio">
                <input
                  type="radio"
                  name="result-visibility"
                  checked={visibility === "unlisted"}
                  onChange={() => setVisibility("unlisted")}
                />
                По ссылке
              </label>
            </fieldset>
            <Button disabled={disabled || hasConflict} onClick={() => void publish()}>
              {busy ? "Публикуем…" : "Опубликовать"}
            </Button>
          </>
        ) : (
          <Button
            disabled={!dirty || saving || disabled || hasConflict}
            onClick={() => void savePublished()}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        )}
      </footer>

      <ConflictDialog
        title="Топ изменился"
        errorCode={error?.code}
        open={hasConflict && !conflictHidden}
        onOpenChange={(open) => setConflictHidden(!open)}
        busy={conflictBusy}
        error={
          conflictError ??
          (conflict && error && !isRevisionConflict(error) ? error.message : null)
        }
        onReload={() => void resolveConflict("reload")}
        onOverwrite={() => void resolveConflict("overwrite")}
      />
    </section>
  );
}
