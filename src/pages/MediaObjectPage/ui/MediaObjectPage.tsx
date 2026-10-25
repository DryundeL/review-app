import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getMediaObject, getMediaTopReviews } from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { usePageMeta } from "@/shared/hooks";
import { ApiError } from "@/shared/api";
import { MEDIA_TYPE_LABELS } from "@/shared/types";
import { Button, MediaPoster } from "@/shared/ui";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import "./MediaObjectPage.css";

const STATUS_LABELS = {
  announced: "Анонсировано",
  ongoing: "Выходит",
  completed: "Завершено",
  hiatus: "На паузе",
};

export function MediaObjectPage() {
  const { mediaId = "" } = useParams<{ mediaId: string }>();
  const { profile } = useAuthSession();
  const mediaQuery = useQuery({
    queryKey: ["media-object", mediaId],
    queryFn: ({ signal }) => getMediaObject(mediaId, signal),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  const topQuery = useQuery({
    queryKey: ["media-top-reviews", mediaId, profile?.id ?? null],
    queryFn: ({ signal }) => getMediaTopReviews(mediaId, signal),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  const media = mediaQuery.data;
  usePageMeta({
    path: `/media-objects/${mediaId}`,
    title: media?.title ?? "Произведение",
    description: media ? `Информация и популярные обзоры: ${media.title}` : undefined,
    image: media?.posterUrl,
    noindex: mediaQuery.isError,
  });
  return (
    <section className="media-page screen" aria-busy={mediaQuery.isLoading}>
      {mediaQuery.isLoading ? <p role="status">Загрузка произведения…</p> : null}
      {mediaQuery.isError ? (
        <div role="alert">
          <h1>
            {mediaQuery.error instanceof ApiError && mediaQuery.error.status === 404
              ? "Произведение не найдено"
              : "Не удалось загрузить произведение"}
          </h1>
          <Button variant="secondary" onClick={() => void mediaQuery.refetch()}>
            Повторить
          </Button>
        </div>
      ) : null}
      {media && !mediaQuery.isError ? (
        <>
          <header className="media-page__header">
            <MediaPoster
              className="media-page__poster"
              title={media.title}
              posterUrl={media.posterUrl}
            />
            <div>
              <p>{MEDIA_TYPE_LABELS[media.type]}</p>
              <h1>{media.title}</h1>
              {media.originalTitle ? <p>{media.originalTitle}</p> : null}
              <dl className="media-page__info">
                <dt>Жанр</dt>
                <dd>{media.info.genre || "Не указан"}</dd>
                <dt>Год</dt>
                <dd>{media.info.releaseYear ?? "Не указан"}</dd>
                <dt>Статус</dt>
                <dd>{STATUS_LABELS[media.info.releaseStatus]}</dd>
              </dl>
            </div>
          </header>
          <Button asChild variant="secondary" className="media-page__search-button">
            <Link to="/search">
              <span aria-hidden>←</span> К поиску
            </Link>
          </Button>
          <h2>Популярные обзоры</h2>
          {topQuery.isLoading ? <p role="status">Загрузка обзоров…</p> : null}
          {topQuery.isError ? (
            <div role="alert">
              <p>Не удалось загрузить обзоры.</p>
              <Button variant="secondary" onClick={() => void topQuery.refetch()}>
                Повторить
              </Button>
            </div>
          ) : null}
          {topQuery.data && !topQuery.isError ? (
            topQuery.data.items.length ? (
              <ul className="media-page__reviews">
                {topQuery.data.items.slice(0, 5).map((review) => (
                  <li key={review.id}>
                    <RemoteReviewCard review={review} hideStatus />
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status">У этого произведения пока нет опубликованных обзоров.</p>
            )
          ) : null}
        </>
      ) : null}
    </section>
  );
}
