import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createReview,
  getReviewDraft,
  getMediaObject,
  listMediaObjects,
  listMyReviews,
  publishReview,
  updateReview,
  type MediaObjectSummary,
  type ReviewEditorData,
} from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { DraftSession, toCreatePayload } from "@/features/create-review";
import { ApiError } from "@/shared/api";
import { useDebouncedValue } from "@/shared/hooks";
import { Button, Input, MediaPoster } from "@/shared/ui";
import { ReviewEditor } from "@/widgets/ReviewEditor";
import "./CreateReviewPage.css";

export function CreateReviewPage() {
  const { reviewId } = useParams();
  const [params] = useSearchParams();
  const mediaId = params.get("mediaObjectId") ?? "";
  return (
    <ReviewSelection
      key={`${reviewId ?? ""}:${mediaId}`}
      reviewId={reviewId}
      mediaId={mediaId}
    />
  );
}

function ReviewSelection({ reviewId, mediaId }: { reviewId?: string; mediaId: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MediaObjectSummary | null>(null);
  const [loaded, setLoaded] = useState<{
    media: MediaObjectSummary;
    draft: ReviewEditorData | null;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 300);
  const catalog = useQuery({
    queryKey: ["media-objects", debounced],
    queryFn: ({ signal }) => listMediaObjects({ q: debounced, limit: 20 }, signal),
    enabled: !selected && !mediaId && !reviewId,
    retry: false,
  });
  useEffect(() => {
    if (!selected && !mediaId && !reviewId) return;
    const controller = new AbortController();
    const signal = controller.signal;
    setLoaded(null);
    setError(null);
    void (async () => {
      let media = selected;
      if (!media) {
        let id = mediaId;
        if (!id && reviewId) {
          const mine = await listMyReviews(50, signal);
          id = mine.items.find((item) => item.id === reviewId)?.mediaObject.id ?? "";
          if (!id) throw new Error("Откройте редактор из списка «Мои обзоры».");
        }
        media = await getMediaObject(id, signal);
      }
      let draft: ReviewEditorData | null = null;
      try {
        draft = await getReviewDraft(media.id, signal);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
      if (reviewId && draft?.id !== reviewId) throw new Error("Обзор не найден.");
      if (!signal.aborted) setLoaded({ media, draft });
    })().catch((error: unknown) => {
      if (!signal.aborted) setError(error);
    });
    return () => controller.abort();
  }, [selected, mediaId, reviewId, attempt]);

  if (loaded)
    return (
      <ReviewForm
        key={`${loaded.media.id}:${attempt}`}
        media={loaded.media}
        initial={loaded.draft}
        reload={() => setAttempt((value) => value + 1)}
      />
    );
  return (
    <section className="create-review screen">
      <h1>{reviewId ? "Редактировать обзор" : "Новый обзор"}</h1>
      {error ? (
        <div role="alert">
          <p>{message(error)}</p>
          <Button onClick={() => setAttempt((value) => value + 1)}>Повторить</Button>
        </div>
      ) : selected || mediaId || reviewId ? (
        <p role="status">Загрузка рабочей версии…</p>
      ) : (
        <>
          <label className="create-review__field">
            Произведение
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск в каталоге"
            />
          </label>
          {catalog.isFetching || query.trim() !== debounced ? (
            <p role="status">Поиск…</p>
          ) : null}
          {catalog.isError ? (
            <div role="alert">
              <p>Каталог недоступен.</p>
              <Button onClick={() => void catalog.refetch()}>Повторить</Button>
            </div>
          ) : null}
          {catalog.data?.length === 0 ? <p>Ничего не найдено.</p> : null}
          <ul className="create-review__media">
            {catalog.data?.map((media) => (
              <li key={media.id}>
                <button
                  type="button"
                  className="create-review__media-item"
                  onClick={() => setSelected(media)}
                >
                  {media.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReviewForm({
  media,
  initial,
  reload,
}: {
  media: MediaObjectSummary;
  initial: ReviewEditorData | null;
  reload: () => void;
}) {
  const [session] = useState(
    () =>
      new DraftSession(media.id, initial, {
        create: async (input) => {
          const result = toCreatePayload(input, "draft");
          if (!result.ok)
            throw new ApiError(422, "VALIDATION_ERROR", result.message, {
              field: result.field,
            });
          return createReview(result.payload);
        },
        save: async (id, input) => {
          const result = toCreatePayload({ mediaObjectId: media.id, ...input }, "draft");
          if (!result.ok)
            throw new ApiError(422, "VALIDATION_ERROR", result.message, {
              field: result.field,
            });
          return updateReview(id, input);
        },
        publish: publishReview,
      }),
  );
  const formRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const telegram = window.Telegram?.WebApp;
    const update = () => {
      const height = Math.min(
        viewport?.height ?? window.innerHeight,
        telegram?.viewportHeight || window.innerHeight,
      );
      const inset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
      formRef.current?.style.setProperty("--review-keyboard-inset", `${inset}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    telegram?.onEvent?.("viewportChanged", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      telegram?.offEvent?.("viewportChanged", update);
    };
  }, []);
  const { phase } = useAuthSession();
  const state = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  const [publishing, setPublishing] = useState(false);
  const [localError, setLocalError] = useState<ApiError | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (
      phase === "authenticated" &&
      session.state.error instanceof ApiError &&
      session.state.error.status === 401
    ) {
      void session.save().catch(() => {});
    }
  }, [phase, session]);
  useEffect(() => {
    session.resume();
    return () => session.dispose();
  }, [session]);
  useEffect(() => {
    const dirty = state.dirty;
    const telegram = window.Telegram?.WebApp;
    if (dirty) telegram?.enableClosingConfirmation?.();
    else telegram?.disableClosingConfirmation?.();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (
        dirty &&
        link &&
        !window.confirm("Есть несохранённые изменения. Уйти со страницы?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      telegram?.disableClosingConfirmation?.();
    };
  }, [state.dirty]);
  useEffect(() => {
    if (state.saved) void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
  }, [state.saved, queryClient]);
  const error = localError ?? state.error;
  const field = error instanceof ApiError ? error.details?.field : undefined;
  const fieldError = (name: string) =>
    field === name ? (
      <p className="create-review__error" role="alert">
        {message(error)}
      </p>
    ) : null;
  const change = (patch: Partial<typeof state.fields>) => {
    setLocalError(null);
    session.change(patch);
  };
  async function publish() {
    const result = toCreatePayload(
      { mediaObjectId: media.id, ...state.fields },
      "published",
    );
    if (!result.ok) {
      setLocalError(
        new ApiError(422, "VALIDATION_ERROR", result.message, { field: result.field }),
      );
      return;
    }
    setPublishing(true);
    setLocalError(null);
    try {
      const published = await session.publish();
      await queryClient.invalidateQueries({ queryKey: ["review", published.id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      navigate(`/reviews/${published.id}`);
    } catch {
      /* The session preserves text and exposes the error. */
    } finally {
      setPublishing(false);
    }
  }
  return (
    <section ref={formRef} className="create-review screen">
      <h1>Редактор обзора</h1>
      <div className="create-review__picked-block">
        <MediaPoster
          className="create-review__poster"
          title={media.title}
          posterUrl={media.posterUrl}
        />
        <strong>{media.title}</strong>
      </div>
      {state.conflict ? (
        <div role="alert" className="create-review__conflict">
          <h2>Обзор изменён в другом месте</h2>
          <p>Скопируйте свой текст перед загрузкой актуальной версии.</p>
          <textarea
            aria-label="Ваш текст для копирования"
            readOnly
            value={state.fields.body}
          />
          <Button
            onClick={() => {
              void navigator.clipboard?.writeText(state.fields.body).then(
                () => setCopyStatus("Текст скопирован"),
                () => setCopyStatus("Выделите и скопируйте текст из поля выше."),
              );
            }}
          >
            Скопировать текст
          </Button>
          <p role="status">{copyStatus}</p>
          <Button
            onClick={() => {
              if (
                window.confirm(
                  "Загрузить актуальную версию? Локальные правки будут заменены.",
                )
              )
                reload();
            }}
          >
            Загрузить актуальную версию
          </Button>
        </div>
      ) : null}
      <label className="create-review__field">
        Заголовок (необязательно)
        <Input
          value={state.fields.title}
          disabled={publishing || state.conflict}
          aria-invalid={field === "title"}
          onChange={(event) => change({ title: event.target.value })}
        />
      </label>
      {fieldError("title")}
      <fieldset
        className="create-review__rating"
        disabled={publishing || state.conflict}
        aria-invalid={field === "rating"}
      >
        <legend>Оценка</legend>
        <div className="create-review__rating-row">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
            <button
              type="button"
              key={score}
              aria-pressed={state.fields.rating === score}
              className={`create-review__score${state.fields.rating === score ? " is-active" : ""}`}
              onClick={() =>
                change({ rating: score === state.fields.rating ? null : score })
              }
            >
              {score}
            </button>
          ))}
        </div>
      </fieldset>
      {fieldError("rating")}
      <ReviewEditor
        value={state.fields.body}
        onChange={(body) => change({ body })}
        disabled={publishing || state.conflict}
      />
      {fieldError("body")}
      <p role="status" aria-live="polite">
        {state.saving
          ? "Сохраняется"
          : state.error
            ? "Не удалось сохранить"
            : state.dirty
              ? "Есть несохранённые изменения"
              : state.saved
                ? "Сохранено"
                : "Начните писать — черновик сохранится автоматически"}
      </p>
      {error && !field && !state.conflict ? (
        <p role="alert" className="create-review__error">
          {message(error)}
        </p>
      ) : null}
      <div className="create-review__actions">
        {state.error && !state.conflict ? (
          <Button
            variant="secondary"
            disabled={state.saving || publishing}
            onClick={() => {
              setLocalError(null);
              void session.save().catch(() => {});
            }}
          >
            Повторить
          </Button>
        ) : null}
        <Button
          disabled={
            publishing ||
            state.conflict ||
            (state.saved?.status === "published" &&
              !state.dirty &&
              !state.saved.hasUnpublishedChanges)
          }
          aria-busy={publishing}
          onClick={() => void publish()}
        >
          {state.saved?.status === "published" ? "Обновить публикацию" : "Опубликовать"}
        </Button>
      </div>
      <Link to="/profile">Мои обзоры</Link>
    </section>
  );
}
function message(error: unknown): string {
  if (error instanceof ApiError && error.status === 413)
    return "Текст слишком велик. Уменьшите размер текста или форматирования.";
  if (error instanceof ApiError && error.status === 401)
    return "Сессия истекла. Войдите повторно и повторите сохранение.";
  if (error instanceof ApiError && error.details?.field) {
    const reasons: Record<string, string> = {
      required: "Заполните поле для публикации.",
      too_long: "Превышена допустимая длина.",
      invalid: "Недопустимое значение или форматирование.",
    };
    if (error.details.reason) return reasons[error.details.reason] ?? error.message;
  }
  return error instanceof Error ? error.message : "Не удалось сохранить обзор.";
}
