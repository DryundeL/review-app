import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createReview,
  getReview,
  listMediaObjects,
  updateReview,
} from "@/entities/review";
import { toCreatePayload, type DraftBlock } from "@/features/create-review";
import { ApiError } from "@/shared/api";
import { Button, Input } from "@/shared/ui";
import { ReviewEditor } from "@/widgets/ReviewEditor";
import "./CreateReviewPage.css";

function newBlock(): DraftBlock {
  return { key: crypto.randomUUID(), title: "", body: "" };
}

export function CreateReviewPage() {
  const { reviewId: routeReviewId } = useParams<{ reviewId?: string }>();
  const isEdit = Boolean(routeReviewId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mediaObjectId, setMediaObjectId] = useState("");
  const [lockedMediaTitle, setLockedMediaTitle] = useState<string | null>(null);
  const [mediaQuery, setMediaQuery] = useState("");
  const [title, setTitle] = useState("");
  const [rating, setRating] = useState(8);
  const [blocks, setBlocks] = useState<DraftBlock[]>([newBlock()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(routeReviewId ?? null);
  const [hydrated, setHydrated] = useState(!isEdit);

  const existingQuery = useQuery({
    queryKey: ["review", routeReviewId],
    queryFn: ({ signal }) => getReview(routeReviewId!, signal),
    enabled: isEdit,
    retry: false,
  });

  useEffect(() => {
    if (!existingQuery.data || hydrated) return;
    const review = existingQuery.data;
    setReviewId(review.id);
    setMediaObjectId(review.mediaObject.id);
    setLockedMediaTitle(review.mediaObject.title);
    setTitle(review.title);
    setRating(review.rating);
    setBlocks(
      review.blocks.length > 0
        ? review.blocks.map((block) => ({
            key: block.id,
            title: block.title,
            body: block.body,
          }))
        : [newBlock()],
    );
    setHydrated(true);
  }, [existingQuery.data, hydrated]);

  const mediaQueryResult = useQuery({
    queryKey: ["media-objects"],
    queryFn: ({ signal }) => listMediaObjects(50, signal),
    enabled: !isEdit,
    retry: false,
  });

  const mediaOptions = useMemo(() => {
    const items = mediaQueryResult.data ?? [];
    const q = mediaQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 12);
  }, [mediaQuery, mediaQueryResult.data]);

  const selectedMedia = mediaQueryResult.data?.find((item) => item.id === mediaObjectId);

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const prepared = toCreatePayload(
        { mediaObjectId, title, rating, blocks },
        status,
      );
      if (!prepared.ok) throw new Error(prepared.message);

      if (reviewId) {
        return updateReview(reviewId, {
          title: prepared.payload.title,
          rating: prepared.payload.rating,
          status: prepared.payload.status,
          blocks: prepared.payload.blocks,
        });
      }
      return createReview(prepared.payload);
    },
    onSuccess: async (review, status) => {
      setReviewId(review.id);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["review", review.id] }),
      ]);
      if (status === "published") {
        navigate(`/reviews/${review.id}`);
      } else if (isEdit) {
        navigate("/profile");
      }
    },
    onError: (error) => {
      setFormError(messageFromError(error));
    },
  });

  function updateBlock(key: string, patch: Partial<DraftBlock>) {
    setBlocks((current) =>
      current.map((block) => (block.key === key ? { ...block, ...patch } : block)),
    );
  }

  if (isEdit && existingQuery.isLoading) {
    return (
      <section className="create-review screen" aria-busy="true">
        <p className="muted">Загрузка обзора…</p>
      </section>
    );
  }

  if (isEdit && (existingQuery.isError || !existingQuery.data)) {
    return (
      <section className="create-review screen">
        <h1>Не удалось открыть обзор</h1>
        <p className="muted">Возможно, это чужой черновик или обзор удалён.</p>
        <Link to="/profile">В профиль</Link>
      </section>
    );
  }

  return (
    <section className="create-review screen">
      <header className="create-review__head">
        <p className="create-review__eyebrow">{isEdit ? "Правка" : "Новый разбор"}</p>
        <h1>{isEdit ? "Редактировать обзор" : "Собери обзор"}</h1>
        <p className="muted">
          Текст режется на блоки. Спойлеры прячутся за плашкой при чтении.
        </p>
      </header>

      {isEdit ? (
        <p className="create-review__picked">
          Произведение: <strong>{lockedMediaTitle ?? "…"}</strong>
          <span className="muted"> (не меняется)</span>
        </p>
      ) : (
        <>
          <label className="create-review__field">
            <span>Произведение</span>
            <Input
              type="search"
              value={mediaQuery}
              onChange={(event) => setMediaQuery(event.target.value)}
              placeholder="Поиск в каталоге"
              autoComplete="off"
            />
          </label>

          {mediaQueryResult.isError ? (
            <p className="create-review__warn" role="status">
              Каталог недоступен. Можно вставить UUID произведения вручную ниже.
            </p>
          ) : null}

          <ul className="create-review__media" role="listbox" aria-label="Произведения">
            {mediaOptions.map((item) => {
              const active = item.id === mediaObjectId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={
                      active ? "create-review__media-item is-active" : "create-review__media-item"
                    }
                    onClick={() => setMediaObjectId(item.id)}
                  >
                    {item.title}
                  </button>
                </li>
              );
            })}
          </ul>

          {!selectedMedia ? (
            <label className="create-review__field">
              <span>UUID произведения</span>
              <Input
                value={mediaObjectId}
                onChange={(event) => setMediaObjectId(event.target.value.trim())}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ) : (
            <p className="create-review__picked">
              Выбрано: <strong>{selectedMedia.title}</strong>
            </p>
          )}
        </>
      )}

      <label className="create-review__field">
        <span>Заголовок</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={256}
          placeholder="Короткий заголовок обзора"
        />
      </label>

      <fieldset className="create-review__rating">
        <legend>Оценка</legend>
        <div className="create-review__rating-row">
          {Array.from({ length: 10 }, (_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                className={value === rating ? "create-review__score is-active" : "create-review__score"}
                aria-pressed={value === rating}
                onClick={() => setRating(value)}
              >
                {value}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="create-review__blocks">
        {blocks.map((block, index) => (
          <article key={block.key} className="create-review__block">
            <div className="create-review__block-head">
              <span className="create-review__block-index">Блок {index + 1}</span>
              {blocks.length > 1 ? (
                <button
                  type="button"
                  className="create-review__remove"
                  onClick={() =>
                    setBlocks((current) => current.filter((item) => item.key !== block.key))
                  }
                >
                  Удалить
                </button>
              ) : null}
            </div>
            <label className="create-review__field">
              <span>Заголовок блока</span>
              <Input
                value={block.title}
                onChange={(event) => updateBlock(block.key, { title: event.target.value })}
                maxLength={50}
                placeholder="Плюсы / Минусы / Финал"
              />
            </label>
            <ReviewEditor
              value={block.body}
              onChange={(body) => updateBlock(block.key, { body })}
              disabled={saveMutation.isPending}
            />
          </article>
        ))}
      </div>

      {blocks.length < 10 ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setBlocks((current) => [...current, newBlock()])}
        >
          + Ещё блок
        </Button>
      ) : null}

      {formError ? (
        <p className="create-review__error" role="alert">
          {formError}
        </p>
      ) : null}

      {saveMutation.isSuccess && saveMutation.variables === "draft" && !isEdit ? (
        <p className="create-review__ok" role="status">
          Черновик сохранён. <Link to="/profile">К профилю</Link>
        </p>
      ) : null}

      <div className="create-review__actions">
        <Button
          type="button"
          variant="secondary"
          disabled={saveMutation.isPending || (isEdit && !hydrated)}
          onClick={() => saveMutation.mutate("draft")}
        >
          {isEdit ? "Сохранить черновик" : "Черновик"}
        </Button>
        <Button
          type="button"
          disabled={saveMutation.isPending || (isEdit && !hydrated)}
          onClick={() => saveMutation.mutate("published")}
        >
          {isEdit ? "Сохранить и опубликовать" : "Опубликовать"}
        </Button>
      </div>
    </section>
  );
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Не удалось сохранить обзор.";
}
