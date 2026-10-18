import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { usePageMeta } from "@/shared/hooks";
import { truncateMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import { Button } from "@/shared/ui";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import { UserHeader } from "@/widgets/UserHeader";
import "./ProfilePage.css";

type ReviewTab = "published" | "drafts";

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
  const [tab, setTab] = useState<ReviewTab>("published");

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

  const reviews = reviewsQuery.data?.items ?? [];
  const { published, drafts, visible } = splitReviews(reviews, tab);

  return (
    <section className="profile-page screen">
      <UserHeader
        user={toUser(profile)}
        note={profile.isPremium ? "Premium" : null}
      />

      <ReviewTabs
        tab={tab}
        onChange={setTab}
        publishedCount={published.length}
        draftsCount={drafts.length}
      />

      <ReviewsBlock
        reviewsQuery={reviewsQuery}
        reviews={visible}
        canEdit
        deleteError={deleteError}
        deletingId={
          deleteMutation.isPending && deleteMutation.variables
            ? deleteMutation.variables
            : null
        }
        onDelete={(id) => deleteMutation.mutateAsync(id)}
        emptyOwn
        emptyTab={tab}
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
  const [tab, setTab] = useState<ReviewTab>("published");
  const profileKey = ["profile", userId] as const;

  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => fetchPublicProfile(userId, signal),
  });

  const profile = profileQuery.data;
  const isMe =
    profile?.isMe === true ||
    (sessionProfile !== null && sessionProfile.id === userId);

  const pageMeta = useMemo((): PageMeta => {
    const path = `/profiles/${userId}`;
    if (!profileQuery.data) {
      return { path, title: "Профиль", noindex: profileQuery.isError };
    }
    const name = displayName(profileQuery.data);
    return {
      path,
      title: name,
      description: truncateMeta(`Обзоры и профиль ${name} в Review Hub.`),
      image: safeHttpsUrl(profileQuery.data.photoUrl),
    };
  }, [userId, profileQuery.data, profileQuery.isError]);

  usePageMeta(pageMeta);

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

  const reviews = reviewsQuery.data?.items ?? [];
  const { published, drafts, visible } = splitReviews(reviews, isMe ? tab : "published");
  const list = isMe ? visible : published;

  return (
    <section className="profile-page screen">
      <UserHeader
        user={toUser(profile)}
        note={isMe && profile.isPremium ? "Premium" : null}
        actions={
          isMe ? null : (
            <Button
              type="button"
              className="profile-page__follow"
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

      {isMe ? (
        <ReviewTabs
          tab={tab}
          onChange={setTab}
          publishedCount={published.length}
          draftsCount={drafts.length}
        />
      ) : null}

      <ReviewsBlock
        reviewsQuery={reviewsQuery}
        reviews={list}
        canEdit={isMe}
        deleteError={deleteError}
        deletingId={
          deleteMutation.isPending && deleteMutation.variables
            ? deleteMutation.variables
            : null
        }
        onDelete={(id) => deleteMutation.mutateAsync(id)}
        emptyOwn={isMe}
        emptyTab={isMe ? tab : "published"}
      />
    </section>
  );
}

function ReviewTabs({
  tab,
  onChange,
  publishedCount,
  draftsCount,
}: {
  tab: ReviewTab;
  onChange: (tab: ReviewTab) => void;
  publishedCount: number;
  draftsCount: number;
}) {
  return (
    <div className="profile-page__tabs" role="tablist" aria-label="Обзоры">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "published"}
        className={
          tab === "published"
            ? "profile-page__tab profile-page__tab--active"
            : "profile-page__tab"
        }
        onClick={() => onChange("published")}
      >
        Опубликовано
        <span className="profile-page__tab-count">{publishedCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "drafts"}
        className={
          tab === "drafts"
            ? "profile-page__tab profile-page__tab--active"
            : "profile-page__tab"
        }
        onClick={() => onChange("drafts")}
      >
        Черновики
        <span className="profile-page__tab-count">{draftsCount}</span>
      </button>
    </div>
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
  emptyTab,
}: {
  reviewsQuery: { isLoading: boolean; isError: boolean };
  reviews: RemoteReviewSummary[];
  canEdit: boolean;
  deleteError: string | null;
  deletingId: string | null;
  onDelete: (id: string) => Promise<void>;
  emptyOwn: boolean;
  emptyTab: ReviewTab;
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
            emptyTab === "drafts" ? (
              <p>Черновиков пока нет.</p>
            ) : (
              <>
                <p>Пока нет опубликованных обзоров.</p>
                <Link to="/create">Создать первый</Link>
              </>
            )
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

function splitReviews(reviews: RemoteReviewSummary[], tab: ReviewTab) {
  const published = reviews.filter((item) => item.status === "published");
  const drafts = reviews.filter((item) => item.status === "draft");
  return {
    published,
    drafts,
    visible: tab === "published" ? published : drafts,
  };
}

function toUser(profile: SessionProfile | PublicProfile): User {
  return {
    id: profile.id,
    username: profile.username.trim(),
    displayName: displayName(profile),
    ...(profile.photoUrl ? { photoUrl: profile.photoUrl } : {}),
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
