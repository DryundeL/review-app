import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getReview, viewReview, voteReview } from "@/entities/review";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import { SpoilerText } from "@/shared/ui/SpoilerText";
import "./ReviewPage.css";

export function ReviewPage() {
  const { reviewId } = useParams();
  const queryClient = useQueryClient();

  const reviewQuery = useQuery({
    queryKey: ["review", reviewId],
    queryFn: ({ signal }) => getReview(reviewId!, signal),
    enabled: Boolean(reviewId),
    retry: false,
  });

  useEffect(() => {
    if (!reviewId || reviewQuery.data?.status !== "published") return;
    void viewReview(reviewId).catch(() => {
      // просмотр не критичен для чтения
    });
  }, [reviewId, reviewQuery.data?.status]);

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

  return (
    <article className="review-page screen">
      <header className="review-page__head">
        <div className="review-page__score" aria-label={`Оценка ${review.rating} из 10`}>
          <span>{review.rating}</span>
          <small>/10</small>
        </div>
        <div className="review-page__titles">
          {review.status === "draft" ? <span className="review-page__draft">Черновик</span> : null}
          <h1>{review.title}</h1>
          <p className="review-page__stats">
            +{review.likesCount} · −{review.dislikesCount} · {review.viewsCount} просм.
          </p>
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

      {review.status === "published" ? (
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
