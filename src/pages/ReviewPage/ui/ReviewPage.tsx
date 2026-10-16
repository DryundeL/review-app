import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getMediaObject, getReview, viewReview, voteReview } from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { Button, MediaPoster, SpoilerText } from "@/shared/ui";
import "./ReviewPage.css";

export function ReviewPage() {
  const { reviewId } = useParams();
  const { profile } = useAuthSession();
  const queryClient = useQueryClient();

  const reviewQuery = useQuery({
    queryKey: ["review", reviewId],
    queryFn: ({ signal }) => getReview(reviewId!, signal),
    enabled: Boolean(reviewId),
    retry: false,
  });

  const mediaQuery = useQuery({
    queryKey: ["media-object", reviewQuery.data?.mediaObjectId],
    queryFn: ({ signal }) => getMediaObject(reviewQuery.data!.mediaObjectId, signal),
    enabled: Boolean(reviewQuery.data?.mediaObjectId),
    retry: false,
  });

  useEffect(() => {
    if (!reviewId || reviewQuery.data?.status !== "published") return;
    if (profile && reviewQuery.data.authorId === profile.id) return;
    void viewReview(reviewId).catch(() => {
      // просмотр не критичен для чтения
    });
  }, [profile, reviewId, reviewQuery.data?.authorId, reviewQuery.data?.status]);

  const voteMutation = useMutation({
    mutationFn: (isLike: boolean) => voteReview(reviewId!, isLike),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
    },
  });

  if (!reviewId) {
    return (
      <section className="review-page screen">
        <p>Обзор не найден.</p>
        <Link to="/">На ленту</Link>
      </section>
    );
  }

  if (reviewQuery.isLoading) {
    return (
      <section className="review-page screen" aria-busy="true">
        <p className="muted">Загрузка обзора…</p>
      </section>
    );
  }

  if (reviewQuery.isError || !reviewQuery.data) {
    const notFound = reviewQuery.error instanceof ApiError && reviewQuery.error.status === 404;
    return (
      <section className="review-page screen">
        <h1>{notFound ? "Обзор недоступен" : "Ошибка загрузки"}</h1>
        <p className="muted">
          {notFound ? "Нет такого обзора или это чужой черновик." : "Попробуйте ещё раз позже."}
        </p>
        <Link to="/profile">В профиль</Link>
      </section>
    );
  }

  const review = reviewQuery.data;
  const isOwn = Boolean(profile && review.authorId === profile.id);
  const mediaTitle = mediaQuery.data?.title?.trim() || "Произведение";

  return (
    <article className="review-page screen">
      <header className="review-page__head">
        <div className="review-page__poster" aria-hidden>
          <MediaPoster title={mediaTitle} posterUrl={mediaQuery.data?.posterUrl} />
        </div>
        <div className="review-page__titles">
          {review.status === "draft" ? <span className="review-page__draft">Черновик</span> : null}
          <p className="review-page__media">{mediaTitle}</p>
          <h1>{review.title}</h1>
          <p className="review-page__stats">
            {isOwn ? null : (
              <>
                +{review.likesCount} · −{review.dislikesCount} ·{" "}
              </>
            )}
            {review.viewsCount} просм.
            <span className="review-page__rating" aria-label={`Оценка ${review.rating} из 10`}>
              {review.rating}
              <small>/10</small>
            </span>
          </p>
          {isOwn ? (
            <Link className="review-page__edit" to={`/reviews/${review.id}/edit`}>
              Изменить
            </Link>
          ) : null}
        </div>
      </header>

      <div className="review-page__blocks">
        {review.blocks.length === 0 ? (
          <p className="muted">В этом обзоре пока нет блоков.</p>
        ) : (
          review.blocks.map((block) => (
            <section key={block.id} className="review-page__block">
              <h2>{block.title}</h2>
              <SpoilerText text={block.body} />
            </section>
          ))
        )}
      </div>

      {review.status === "published" && !isOwn ? (
        <div className="review-page__vote">
          <Button
            type="button"
            variant="secondary"
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate(true)}
          >
            Нравится
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate(false)}
          >
            Не нравится
          </Button>
        </div>
      ) : null}
    </article>
  );
}
