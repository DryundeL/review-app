import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReview, viewReview, voteReview } from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { useFollowToggle } from "@/features/follow-user";
import { ApiError } from "@/shared/api";
import { usePageMeta } from "@/shared/hooks";
import { truncateMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import { MEDIA_TYPE_LABELS } from "@/shared/types";
import {
  Button,
  DislikeIcon,
  LikeIcon,
  MediaPoster,
  SpoilerText,
  UserAvatar,
  VoteCounts,
} from "@/shared/ui";
import "./ReviewPage.css";

export function ReviewPage() {
  const { reviewId } = useParams();
  const { profile } = useAuthSession();
  const queryClient = useQueryClient();
  const followMutation = useFollowToggle();
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  /** Локальный выбор голоса: API не отдаёт текущий vote viewer'а. */
  const [myVote, setMyVote] = useState<boolean | null>(null);

  const reviewQuery = useQuery({
    queryKey: ["review", reviewId],
    queryFn: ({ signal }) => getReview(reviewId!, signal),
    enabled: Boolean(reviewId),
    retry: false,
  });

  useEffect(() => {
    setFollowOverride(null);
    setMyVote(null);
  }, [reviewId]);

  const pageMeta = useMemo((): PageMeta => {
    const path = reviewId ? `/reviews/${reviewId}` : "/reviews";
    if (!reviewQuery.data) {
      return { path, title: "Обзор", noindex: reviewQuery.isError };
    }
    const review = reviewQuery.data;
    const mediaTitle = review.mediaObject.title.trim() || "Произведение";
    const draft = review.status !== "published";
    return {
      path,
      title: review.title.trim() || mediaTitle,
      description: truncateMeta(
        `${mediaTitle} · оценка ${review.rating}/10. ${review.title}`.trim(),
      ),
      image: safeHttpsUrl(review.mediaObject.posterUrl),
      noindex: draft,
    };
  }, [reviewId, reviewQuery.data, reviewQuery.isError]);

  usePageMeta(pageMeta);

  useEffect(() => {
    if (!reviewId || reviewQuery.data?.status !== "published") return;
    if (profile && reviewQuery.data.authorId === profile.id) return;
    void viewReview(reviewId).catch(() => {
      // просмотр не критичен для чтения
    });
  }, [profile, reviewId, reviewQuery.data?.authorId, reviewQuery.data?.status]);

  const voteMutation = useMutation({
    mutationFn: (isLike: boolean) => voteReview(reviewId!, isLike),
    onMutate: (isLike) => {
      const previous = myVote;
      setMyVote(isLike);
      return { previous };
    },
    onError: (_error, _isLike, context) => {
      setMyVote(context?.previous ?? null);
    },
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
  const authorId = review.author.id;
  const isOwn = Boolean(profile && authorId === profile.id);
  const username = review.author.username.trim();
  const authorLabel = username ? `@${username}` : "Автор";
  const isFollowing =
    followOverride ?? review.author.isFollowing ?? review.isFollowing ?? false;
  const media = review.mediaObject;
  const mediaTitle = media.title.trim() || "Произведение";
  const typeLabel = MEDIA_TYPE_LABELS[media.type];

  return (
    <article className="review-page screen">
      <div className="review-page__author">
        <Link className="review-page__author-link" to={`/profiles/${authorId}`}>
          <UserAvatar
            className="review-page__avatar"
            label={authorLabel}
            photoUrl={review.author.photoUrl}
          />
          <span className="review-page__author-name">{authorLabel}</span>
        </Link>
        {!isOwn ? (
          <Button
            type="button"
            className="review-page__follow"
            variant={isFollowing ? "secondary" : "primary"}
            disabled={followMutation.isPending}
            aria-pressed={isFollowing}
            onClick={() => {
              const next = !isFollowing;
              followMutation.mutate(
                { userId: authorId, nextFollowing: next },
                { onSuccess: () => setFollowOverride(next) },
              );
            }}
          >
            {isFollowing ? "Отписаться" : "Подписаться"}
          </Button>
        ) : null}
      </div>
      <header className="review-page__head">
        <div className="review-page__poster" aria-hidden>
          <MediaPoster title={mediaTitle} posterUrl={media.posterUrl} />
        </div>
        <div className="review-page__titles">
          <div className="review-page__meta">
            {review.status === "draft" ? (
              <span className="review-page__draft">Черновик</span>
            ) : (
              <span className="review-page__draft review-page__draft--live">Опубликован</span>
            )}
            {review.hasSpoilers ? (
              <span className="review-page__spoiler-flag">есть спойлеры</span>
            ) : null}
          </div>
          <p className="review-page__media">
            <span className="review-page__type">{typeLabel}</span>
            <span aria-hidden>·</span>
            <span>{mediaTitle}</span>
          </p>
          <h1>{review.title}</h1>
          <p className="review-page__stats">
            <VoteCounts likes={review.likesCount} dislikes={review.dislikesCount} />
            <span>·</span>
            <span>{review.viewsCount} просм.</span>
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
        <div className="review-page__vote" role="group" aria-label="Оценка обзора">
          <Button
            type="button"
            className="review-page__vote-btn"
            variant={myVote === true ? "primary" : "secondary"}
            aria-label="Нравится"
            aria-pressed={myVote === true}
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate(true)}
          >
            <LikeIcon size={20} />
            <span>{review.likesCount}</span>
          </Button>
          <Button
            type="button"
            className="review-page__vote-btn review-page__vote-dislike"
            variant="secondary"
            aria-label="Не нравится"
            aria-pressed={myVote === false}
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate(false)}
          >
            <DislikeIcon size={20} />
            <span>{review.dislikesCount}</span>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
