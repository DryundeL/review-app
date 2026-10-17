import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  deleteReview,
  listMyReviews,
  listUserReviews,
  type RemoteReviewSummary,
} from "@/entities/review";
import {
  fetchPublicProfile,
  type PublicProfile,
  type SessionProfile,
  type User,
} from "@/entities/user";
import { useAuthSession } from "@/features/auth";
import { useFollowUser } from "@/features/follow-user";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import { UserHeader } from "@/widgets/UserHeader";
import "./ProfilePage.css";

export function ProfilePage() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { profile: sessionProfile } = useAuthSession();
  const isOwnRoute = !routeUserId;

  if (isOwnRoute) {
    if (!sessionProfile) return null;
    return <OwnProfileView profile={sessionProfile} />;
  }

  return <PublicProfileView userId={routeUserId} sessionProfile={sessionProfile} />;
}

function OwnProfileView({ profile }: { profile: SessionProfile }) {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["my-reviews"],
    queryFn: ({ signal }) => listMyReviews(50, signal),
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
    onError: (error) => {
      setDeleteError(messageFromError(error));
    },
  });

  const user = toUser(profile);
  const reviews = reviewsQuery.data?.items ?? [];
  const published = reviews.filter((item) => item.status === "published").length;
  const drafts = reviews.length - published;

  return (
    <section className="profile-page screen">
      <UserHeader user={user} />
      {profile.isPremium ? <p className="profile-page__note">Telegram Premium</p> : null}

      <div className="profile-page__ledger" aria-label="Сводка обзоров">
        <div>
          <span className="profile-page__ledger-num">{published}</span>
          <span className="profile-page__ledger-label">опубликовано</span>
        </div>
        <div>
          <span className="profile-page__ledger-num">{drafts}</span>
          <span className="profile-page__ledger-label">черновики</span>
        </div>
      </div>

      <header className="profile-page__section-head">
        <h2>Мои обзоры</h2>
        <Link className="profile-page__write" to="/create">
          Написать
        </Link>
      </header>

      <ReviewsBlock
        reviewsQuery={reviewsQuery}
        reviews={reviews}
        canEdit
        deleteError={deleteError}
        deletingId={
          deleteMutation.isPending && deleteMutation.variables
            ? deleteMutation.variables
            : null
        }
        onDelete={(id) => deleteMutation.mutateAsync(id)}
        emptyOwn
      />
    </section>
  );
}

function PublicProfileView({
  userId,
  sessionProfile,
}: {
  userId: string;
  sessionProfile: SessionProfile | null;
}) {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const profileKey = ["profile", userId] as const;

  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => fetchPublicProfile(userId, signal),
  });

  const profile = profileQuery.data;
  const isMe =
    profile?.isMe === true ||
    (sessionProfile !== null && sessionProfile.id === userId);

  const reviewsQuery = useQuery({
    queryKey: isMe ? ["my-reviews"] : ["user-reviews", userId],
    queryFn: ({ signal }) =>
      isMe ? listMyReviews(50, signal) : listUserReviews(userId, 50, signal),
    enabled: Boolean(profile) || isMe,
  });

  const followMutation = useFollowUser(profileKey);

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["user-reviews", userId] });
    },
    onError: (error) => {
      setDeleteError(messageFromError(error));
    },
  });

  if (profileQuery.isLoading) {
    return (
      <section className="profile-page screen">
        <div className="profile-page__skeleton" aria-busy="true" aria-label="Загрузка профиля">
          <div />
          <div />
        </div>
      </section>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <section className="profile-page screen">
        <p className="profile-page__error" role="alert">
          {profileQuery.error instanceof ApiError && profileQuery.error.status === 404
            ? "Профиль не найден."
            : "Не удалось загрузить профиль."}
        </p>
        <Button type="button" variant="secondary" onClick={() => void profileQuery.refetch()}>
          Повторить
        </Button>
      </section>
    );
  }

  const user = toUser(profile);
  const reviews = reviewsQuery.data?.items ?? [];
  const published = reviews.filter((item) => item.status === "published").length;
  const drafts = isMe ? reviews.length - published : 0;

  return (
    <section className="profile-page screen">
      <UserHeader
        user={user}
        actions={
          isMe ? null : (
            <Button
              type="button"
              variant={profile.isFollowing ? "secondary" : "primary"}
              disabled={followMutation.isPending}
              aria-pressed={profile.isFollowing}
              onClick={() => {
                setFollowError(null);
                followMutation.mutate(
                  { userId: profile.id, nextFollowing: !profile.isFollowing },
                  {
                    onError: (error) => {
                      setFollowError(messageFromError(error, "Не удалось изменить подписку."));
                    },
                  },
                );
              }}
            >
              {profile.isFollowing ? "Отписаться" : "Подписаться"}
            </Button>
          )
        }
      />

      {followError ? (
        <p className="profile-page__error" role="alert">
          {followError}
        </p>
      ) : null}

      {isMe && profile.isPremium ? (
        <p className="profile-page__note">Telegram Premium</p>
      ) : null}

      {isMe ? (
        <div className="profile-page__ledger" aria-label="Сводка обзоров">
          <div>
            <span className="profile-page__ledger-num">{published}</span>
            <span className="profile-page__ledger-label">опубликовано</span>
          </div>
          <div>
            <span className="profile-page__ledger-num">{drafts}</span>
            <span className="profile-page__ledger-label">черновики</span>
          </div>
        </div>
      ) : null}

      <header className="profile-page__section-head">
        <h2>{isMe ? "Мои обзоры" : "Обзоры"}</h2>
        {isMe ? (
          <Link className="profile-page__write" to="/create">
            Написать
          </Link>
        ) : null}
      </header>

      <ReviewsBlock
        reviewsQuery={reviewsQuery}
        reviews={reviews}
        canEdit={isMe}
        deleteError={deleteError}
        deletingId={
          deleteMutation.isPending && deleteMutation.variables
            ? deleteMutation.variables
            : null
        }
        onDelete={(id) => deleteMutation.mutateAsync(id)}
        emptyOwn={isMe}
      />
    </section>
  );
}

function ReviewsBlock({
  reviewsQuery,
  reviews,
  canEdit,
  deleteError,
  deletingId,
  onDelete,
  emptyOwn,
}: {
  reviewsQuery: { isLoading: boolean; isError: boolean };
  reviews: RemoteReviewSummary[];
  canEdit: boolean;
  deleteError: string | null;
  deletingId: string | null;
  onDelete: (id: string) => Promise<void>;
  emptyOwn: boolean;
}) {
  return (
    <>
      {reviewsQuery.isLoading ? (
        <div className="profile-page__skeleton" aria-busy="true" aria-label="Загрузка обзоров">
          <div />
          <div />
        </div>
      ) : null}

      {reviewsQuery.isError ? (
        <p className="profile-page__error" role="alert">
          Не удалось загрузить обзоры. Обновите страницу.
        </p>
      ) : null}

      {deleteError ? (
        <p className="profile-page__error" role="alert">
          {deleteError}
        </p>
      ) : null}

      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? (
        <div className="profile-page__empty" role="status">
          {emptyOwn ? (
            <>
              <p>Пока пусто — ни одного обзора.</p>
              <Link to="/create">Создать первый</Link>
            </>
          ) : (
            <p>У пользователя пока нет опубликованных обзоров.</p>
          )}
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="profile-page__list">
          {reviews.map((review) => (
            <li key={review.id}>
              <RemoteReviewCard
                review={review}
                canEdit={canEdit}
                deleting={deletingId === review.id}
                onDelete={canEdit ? onDelete : undefined}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function toUser(profile: SessionProfile | PublicProfile): User {
  return {
    id: profile.id,
    username: profile.username.trim(),
    displayName: displayName(profile),
    popularityScore: 0,
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
  };
}

function displayName(profile: Pick<PublicProfile, "firstName" | "lastName" | "username">): string {
  const fullName = [profile.firstName, profile.lastName]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
  if (fullName) return fullName;
  const username = profile.username.trim();
  if (username) return username;
  return "Пользователь";
}

function messageFromError(error: unknown, fallback = "Не удалось удалить обзор."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
