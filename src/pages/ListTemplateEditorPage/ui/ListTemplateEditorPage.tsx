import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchTemplate,
  publishList,
  refreshItemFromCatalog,
  saveTemplate,
  templatePublishIssues,
  useTemplateQuery,
  useOwnerSnapshot,
  type Format,
  type PublishIssue,
  type Template,
  type Visibility,
} from "@/entities/list";
import type { SearchMediaHit } from "@/entities/search";
import { fetchReviewTypes } from "@/entities/settings";
import { currentAccountId, useAuthSession } from "@/features/auth";
import { ConflictDialog, ListAutosave, useListAutosave } from "@/features/list-autosave";
import { fieldReasonMessage, ownerActionMessage } from "@/features/manage-list";
import { ApiError } from "@/shared/api";
import { confirmLeave, usePageMeta, useUnsavedChangesGuard } from "@/shared/hooks";
import { displayImageUrl } from "@/shared/lib/imageUrl";
import { Button, Input } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";
import {
  draftFromTemplate,
  fieldErrorKey,
  LIMITS,
  missingFieldsText,
  newTier,
  readinessFromDraft,
  rebaseDraft,
  toTemplateInput,
  type DraftItem,
  type DraftTier,
  type TemplateDraft,
} from "../model/templateDraft";
import { CatalogItemPicker } from "./CatalogItemPicker";
import { FieldError } from "./FieldError";
import { ItemsEditor } from "./ItemsEditor";
import { TiersEditor } from "./TiersEditor";
import "./ListTemplateEditorPage.css";

const FORMATS: Format[] = ["tiers", "ranked", "collection"];

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "UNKNOWN", "Не удалось выполнить действие. Попробуйте ещё раз.");
}

const accountChangedError = () =>
  new ApiError(0, "ACCOUNT_CHANGED", "Войдите в аккаунт автора, чтобы сохранить изменения.");

const isRevisionConflict = (error: ApiError) =>
  error.status === 409 && error.code === "REVISION_CONFLICT";

export function ListTemplateEditorPage() {
  const { templateId } = useParams();
  const { profile } = useAuthSession();
  const query = useTemplateQuery(templateId, profile?.id ?? null);
  const template = query.data;

  const pageMeta = useMemo(
    () => ({
      path: `/list-templates/${templateId ?? ""}/edit`,
      title: "Редактор шаблона",
      noindex: true,
    }),
    [templateId],
  );
  usePageMeta(pageMeta);

  // Последний ответ автору: редактор не размонтируется на перезапросе и повторном входе.
  const owned = useOwnerSnapshot(template, profile?.id ?? null);
  if (owned) {
    // Смена статуса (публикация, снятие) меняет режим: автосохранение или «Сохранить».
    return <TemplateEditor key={`${owned.id}:${owned.status}`} template={owned} />;
  }

  // Кешированный гостевой ответ без полей автора: ждём перезапрос с входом.
  const waiting = query.isLoading || (template && query.isFetching);
  if (waiting) {
    return (
      <section className="template-editor screen" aria-busy="true">
        <p className="muted">Загрузка…</p>
      </section>
    );
  }
  const notFound =
    Boolean(template) || (query.error instanceof ApiError && query.error.status === 404);
  return (
    <section className="template-editor screen">
      <h1>{notFound ? "Не найдено" : "Ошибка загрузки"}</h1>
      <Link to="/my-lists">К моим топам и шаблонам</Link>
    </section>
  );
}

function TemplateEditor({ template }: { template: Template }) {
  const id = template.id;
  const auto = template.status === "draft";
  const queryKey = useMemo(() => ["list-template", id], [id]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [session] = useState(
    () =>
      new ListAutosave<TemplateDraft, Template>(
        template,
        draftFromTemplate,
        async (revision, draft) => {
          // Сессия сменилась (выход, другой аккаунт): чужими учётными данными не сохраняем.
          if (currentAccountId() !== template.author.id) throw accountChangedError();
          const saved = await saveTemplate(id, toTemplateInput(draft, revision));
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
  // Черновик досохраняется при уходе (dispose); удержать стоит только то, что не сохранится.
  useUnsavedChangesGuard(auto ? conflict || error !== null : dirty || saving);

  const [issues, setIssues] = useState<PublishIssue[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(template.visibility ?? "public");
  const [actionConflict, setActionConflict] = useState(false);
  const [conflictHidden, setConflictHidden] = useState(false);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ["review-types"],
    queryFn: ({ signal }) => fetchReviewTypes(signal),
    staleTime: 5 * 60 * 1000,
  });

  // Изменения считаются от актуального draft сессии, а не от замыкания рендера:
  // rebase после ответа мог уже проставить id новым тирам и элементам.
  const update = useCallback(
    (patch: (current: TemplateDraft) => Partial<TemplateDraft>) => {
      setIssues(null);
      setNotice(null);
      setActionError(null);
      session.change(patch(session.snapshot().draft));
    },
    [session],
  );
  const updateTiers = useCallback(
    (fn: (tiers: DraftTier[]) => DraftTier[]) => update((d) => ({ tiers: fn(d.tiers) })),
    [update],
  );
  const updateItems = useCallback(
    (fn: (items: DraftItem[]) => DraftItem[]) => update((d) => ({ items: fn(d.items) })),
    [update],
  );

  const fieldErrors = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of issues ?? []) map.set(fieldErrorKey(issue), "Обязательное поле");
    for (const e of [error, actionError]) {
      if (e?.status === 422 && e.details?.field) {
        map.set(
          fieldErrorKey(e.details),
          fieldReasonMessage(e.details.reason) ?? e.message,
        );
      }
    }
    return map;
  }, [issues, error, actionError]);
  const errorFor = useCallback((key: string) => fieldErrors.get(key), [fieldErrors]);

  const addedIds = useMemo(
    () =>
      new Set(
        draft.items.flatMap((item) => (item.mediaObjectId ? [item.mediaObjectId] : [])),
      ),
    [draft.items],
  );
  const itemsFull = draft.items.length >= LIMITS.items;
  const locked = Boolean(saved.firstPublishedAt);

  function addFromCatalog(hit: SearchMediaHit) {
    updateItems((items) => {
      if (items.length >= LIMITS.items || items.some((i) => i.mediaObjectId === hit.id)) {
        return items;
      }
      const imageUrl = displayImageUrl(hit.posterUrl);
      return [
        ...items,
        {
          key: crypto.randomUUID(),
          mediaObjectId: hit.id,
          title: hit.title,
          catalogTitle: hit.title,
          ...(imageUrl ? { imageUrl } : {}),
        },
      ];
    });
  }

  function changeFormat(format: Format) {
    update((d) =>
      format === "tiers"
        ? { format, tiers: d.tiers.length > 0 ? d.tiers : [newTier()] }
        : { format, tiers: [] },
    );
  }

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
    const found = templatePublishIssues(readinessFromDraft(session.snapshot().draft));
    if (found.length === 0) return true;
    setIssues(found);
    setNotice(missingFieldsText(found));
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
    setNotice(ownerActionMessage(apiError, action));
  }

  async function publish() {
    setNotice(null);
    setActionError(null);
    setBusy(true);
    try {
      if (!(await flushSafely())) return;
      if (!checkReadiness()) return;
      const revision = session.snapshot().saved.revision;
      if (revision === undefined)
        throw new ApiError(0, "NO_REVISION", "Обновите страницу.");
      const published = await publishList("templates", id, revision, visibility);
      queryClient.setQueryData(queryKey, published);
      navigate(`/list-templates/${id}`);
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
    // Опубликованный шаблон должен остаться пригодным к публикации.
    if (!checkReadiness()) return;
    await flushSafely();
  }

  async function refresh(item: DraftItem) {
    if (!item.id || !item.mediaObjectId) return;
    setNotice(null);
    setActionError(null);
    setRefreshingId(item.id);
    try {
      if (!(await flushSafely())) return;
      const revision = session.snapshot().saved.revision;
      if (revision === undefined)
        throw new ApiError(0, "NO_REVISION", "Обновите страницу.");
      const fresh = await refreshItemFromCatalog(id, item.id, revision);
      session.reload(fresh);
      queryClient.setQueryData(queryKey, fresh);
    } catch (cause) {
      const apiError = toApiError(cause);
      if (apiError.status === 409 && apiError.code === "CONFLICT") {
        setNotice("Произведение недоступно в каталоге");
      } else {
        handleActionError(apiError, "other");
      }
    } finally {
      setRefreshingId(null);
    }
  }

  async function resolveConflict(mode: "reload" | "overwrite") {
    setConflictBusy(true);
    setConflictError(null);
    try {
      const fresh = await fetchTemplate(id);
      setActionConflict(false);
      setConflictHidden(false);
      setIssues(null);
      setNotice(null);
      setActionError(null);
      if (mode === "reload") {
        session.reload(fresh);
        queryClient.setQueryData(queryKey, fresh);
      } else {
        // Ошибки повторного PUT попадают в состояние сессии.
        await session.overwrite(fresh).catch(() => {});
      }
    } catch (cause) {
      setConflictError(toApiError(cause).message);
    } finally {
      setConflictBusy(false);
    }
  }

  async function leave() {
    if (auto) await flushSafely();
    if (!confirmLeave(session.snapshot().dirty)) return;
    navigate(`/list-templates/${id}`);
  }

  const hasConflict = conflict || actionConflict;
  const statusText = hasConflict
    ? "Конфликт версий"
    : saving
      ? "Сохранение…"
      : error && !isRevisionConflict(error)
        ? error.status === 422 && error.details?.field
          ? "Не сохранено: исправьте подсвеченные поля"
          : `Не сохранено: ${error.message}`
        : dirty
          ? "Есть несохранённые изменения"
          : "Сохранено";
  const disabled = busy || refreshingId !== null || conflictBusy;
  const types = typesQuery.data ?? [];
  const titleError = errorFor("title");
  const descriptionError = errorFor("description");
  const typeError = errorFor("typeCode");
  const formatError = errorFor("format");

  return (
    <section className="template-editor screen">
      <header className="template-editor__header">
        <h1 className="template-editor__title">Редактор шаблона</h1>
        <Button variant="ghost" disabled={disabled} onClick={() => void leave()}>
          {auto ? "Готово" : "Назад"}
        </Button>
      </header>

      <div className="template-editor__status" role="status" aria-live="polite">
        <span
          className={error || hasConflict ? "template-editor__status--error" : "muted"}
        >
          {statusText}
        </span>
        {hasConflict && conflictHidden ? (
          <Button variant="ghost" onClick={() => setConflictHidden(false)}>
            Решить
          </Button>
        ) : null}
      </div>

      <fieldset className="template-editor__form" disabled={disabled}>
        <label className="template-editor__field">
          Название
          <Input
            className={titleError ? "is-invalid" : undefined}
            aria-invalid={titleError ? true : undefined}
            maxLength={LIMITS.title}
            value={draft.title}
            onChange={(event) => update(() => ({ title: event.target.value }))}
          />
          <FieldError text={titleError} />
        </label>

        <label className="template-editor__field">
          Описание
          <textarea
            className={`template-editor__textarea${descriptionError ? " is-invalid" : ""}`}
            aria-invalid={descriptionError ? true : undefined}
            maxLength={LIMITS.description}
            rows={3}
            value={draft.description}
            onChange={(event) => update(() => ({ description: event.target.value }))}
          />
          <FieldError text={descriptionError} />
        </label>

        <label className="template-editor__field">
          Тип произведения
          <select
            className="template-editor__select"
            aria-invalid={typeError ? true : undefined}
            value={draft.typeCode}
            disabled={locked}
            onChange={(event) => update(() => ({ typeCode: event.target.value }))}
          >
            {types.some((type) => type.code === draft.typeCode) ? null : (
              <option value={draft.typeCode}>{draft.typeCode}</option>
            )}
            {types.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
          </select>
          <FieldError text={typeError} />
        </label>

        <fieldset
          className="template-editor__field template-editor__formats"
          disabled={locked}
        >
          <legend>Формат</legend>
          {FORMATS.map((format) => (
            <label key={format} className="template-editor__radio">
              <input
                type="radio"
                name="template-format"
                value={format}
                checked={draft.format === format}
                onChange={() => changeFormat(format)}
              />
              {FORMAT_LABELS[format]}
            </label>
          ))}
          <FieldError text={formatError} />
        </fieldset>
        {locked ? (
          <p className="muted">Тип и формат нельзя изменить после первой публикации.</p>
        ) : null}

        {draft.format === "tiers" ? (
          <TiersEditor tiers={draft.tiers} errorFor={errorFor} onUpdate={updateTiers} />
        ) : null}

        <ItemsEditor
          items={draft.items}
          errorFor={errorFor}
          onUpdate={updateItems}
          onOpenPicker={() => setPickerOpen(true)}
          onRefresh={(item) => void refresh(item)}
          refreshingId={refreshingId}
        />
      </fieldset>

      {notice ? (
        <p className="template-editor__error" role="alert">
          {notice}
        </p>
      ) : null}

      <footer className="template-editor__footer">
        {auto ? (
          <>
            <fieldset className="template-editor__formats" disabled={disabled}>
              <legend>Кто увидит</legend>
              <label className="template-editor__radio">
                <input
                  type="radio"
                  name="template-visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                Всем
              </label>
              <label className="template-editor__radio">
                <input
                  type="radio"
                  name="template-visibility"
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

      <CatalogItemPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        typeCode={draft.typeCode}
        addedIds={addedIds}
        full={itemsFull}
        onAdd={addFromCatalog}
      />
      <ConflictDialog
        title="Шаблон изменился"
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
