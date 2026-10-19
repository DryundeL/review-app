import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  deleteReview,
  listMyReviews,
  listUserReviews,
  type RemoteReviewSummary,
} from "@/entities/review";
import {
  listProfileFollowers,
  listProfileFollowing,
  fetchPublicProfile,
  type FollowConnection,
  type FollowConnectionList,
  type PublicProfile,
  type SessionProfile,
  type User,
} from "@/entities/user";
import { useAuthSession } from "@/features/auth";
import { useFollowToggle, useFollowUser } from "@/features/follow-user";
import { ApiError } from "@/shared/api";
import { usePageMeta } from "@/shared/hooks";
import { truncateMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import { shopAssetUrl } from "@/shared/lib/shopCode";
import { Button, Modal, UserAvatar } from "@/shared/ui";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import { UserHeader } from "@/widgets/UserHeader";
import "./ProfilePage.css";

type ReviewTab = "published" | "drafts";
type FollowListKind = "followers" | "following";

const FOLLOW_PAGE_SIZE = 20;

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
  const [followList, setFollowList] = useState<FollowListKind | null>(null);

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
      <div className="profile-page__topbar">
        <Button asChild variant="ghost" className="profile-page__shop-btn">
          <Link to="/shop">
            <ShopBagIcon />
            Магазин очков
          </Link>
        </Button>
        <Button asChild variant="ghost" className="profile-page__settings-btn">
          <Link to="/settings" aria-label="Настройки">
            <SettingsGearIcon />
          </Link>
        </Button>
      </div>

      <UserHeader
        user={toUser(profile)}
        note={profile.isPremium ? "Premium" : null}
        onFollowersClick={() => setFollowList("followers")}
        onFollowingClick={() => setFollowList("following")}
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
        backdropCode={profile.backdrop}
      />

      <FollowConnectionsModal
        profileId={profile.id}
        viewerId={profile.id}
        kind={followList}
        onClose={() => setFollowList(null)}
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
  const [followList, setFollowList] = useState<FollowListKind | null>(null);
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
        onFollowersClick={() => setFollowList("followers")}
        onFollowingClick={() => setFollowList("following")}
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
        backdropCode={profile.backdrop}
      />

      <FollowConnectionsModal
        profileId={profile.id}
        viewerId={sessionProfile?.id ?? null}
        kind={followList}
        onClose={() => setFollowList(null)}
      />
    </section>
  );
}

function FollowConnectionsModal({
  profileId,
  viewerId,
  kind,
  onClose,
}: {
  profileId: string;
  viewerId: string | null;
  kind: FollowListKind | null;
  onClose: () => void;
}) {
  const open = kind !== null;
  const queryClient = useQueryClient();
  const title = kind === "following" ? "Подписки" : "Подписчики";

  const listQuery = useInfiniteQuery({
    queryKey: ["profile-connections", profileId, kind],
    enabled: open && kind !== null,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const params = { limit: FOLLOW_PAGE_SIZE, offset: pageParam };
      return kind === "following"
        ? listProfileFollowing(profileId, params, signal)
        : listProfileFollowers(profileId, params, signal);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < FOLLOW_PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.items.length, 0);
    },
  });

  const items = listQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      className="profile-page__follow-modal"
    >
      {listQuery.isLoading ? (
        <div
          className="profile-page__skeleton profile-page__follow-skeleton"
          aria-busy="true"
          aria-label={`Загрузка: ${title.toLowerCase()}`}
        >
          <div />
          <div />
        </div>
      ) : null}

      {listQuery.isError ? (
        <div className="profile-page__follow-error" role="alert">
          <p>Не удалось загрузить список.</p>
          <Button type="button" variant="secondary" onClick={() => void listQuery.refetch()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <p className="profile-page__follow-empty" role="status">
          {kind === "following" ? "Подписок пока нет." : "Подписчиков пока нет."}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="profile-page__follow-list">
          {items.map((item) => (
            <li key={item.userId}>
              <FollowConnectionRow
                item={item}
                viewerId={viewerId}
                onOpenProfile={onClose}
                onFollowChange={(userId, nextFollowing) => {
                  queryClient.setQueryData<InfiniteData<FollowConnectionList, number>>(
                    ["profile-connections", profileId, kind],
                    (prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        pages: prev.pages.map((page) => ({
                          ...page,
                          items: page.items.map((row) =>
                            row.userId === userId
                              ? { ...row, isFollowing: nextFollowing }
                              : row,
                          ),
                        })),
                      };
                    },
                  );
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {listQuery.hasNextPage ? (
        <Button
          type="button"
          variant="secondary"
          className="profile-page__follow-more"
          disabled={listQuery.isFetchingNextPage}
          onClick={() => void listQuery.fetchNextPage()}
        >
          {listQuery.isFetchingNextPage ? "Загрузка…" : "Ещё"}
        </Button>
      ) : null}
    </Modal>
  );
}

function FollowConnectionRow({
  item,
  viewerId,
  onOpenProfile,
  onFollowChange,
}: {
  item: FollowConnection;
  viewerId: string | null;
  onOpenProfile: () => void;
  onFollowChange: (userId: string, nextFollowing: boolean) => void;
}) {
  const followMutation = useFollowToggle();
  const isMe = viewerId !== null && viewerId === item.userId;
  const label = item.username ? `@${item.username}` : "Пользователь";

  return (
    <div className="profile-page__follow-row">
      <Link
        className="profile-page__follow-link"
        to={`/profiles/${item.userId}`}
        onClick={onOpenProfile}
      >
        <UserAvatar
          className="profile-page__follow-avatar"
          label={label}
          photoUrl={item.photoUrl}
        />
        <span className="profile-page__follow-name">{label}</span>
      </Link>
      {!isMe ? (
        <Button
          type="button"
          className="profile-page__follow"
          variant={item.isFollowing ? "secondary" : "primary"}
          disabled={followMutation.isPending}
          aria-pressed={item.isFollowing}
          onClick={() => {
            const next = !item.isFollowing;
            followMutation.mutate(
              { userId: item.userId, nextFollowing: next },
              { onSuccess: () => onFollowChange(item.userId, next) },
            );
          }}
        >
          {item.isFollowing ? "Отписаться" : "Подписаться"}
        </Button>
      ) : null}
    </div>
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
  backdropCode,
}: {
  reviewsQuery: { isLoading: boolean; isError: boolean };
  reviews: RemoteReviewSummary[];
  canEdit: boolean;
  deleteError: string | null;
  deletingId: string | null;
  onDelete: (id: string) => Promise<void>;
  emptyOwn: boolean;
  emptyTab: ReviewTab;
  backdropCode?: string;
}) {
  const backdropUrl = backdropCode ? shopAssetUrl(backdropCode) : undefined;

  return (
    <div
      className={backdropUrl ? "profile-page__reviews profile-page__reviews--backdrop" : "profile-page__reviews"}
      style={
        backdropUrl
          ? { ["--profile-backdrop" as string]: `url("${backdropUrl}")` }
          : undefined
      }
    >
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
    </div>
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
    ...(profile.background ? { background: profile.background } : {}),
    ...(profile.avatarFrame ? { avatarFrame: profile.avatarFrame } : {}),
    ...(profile.backdrop ? { backdrop: profile.backdrop } : {}),
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

function SettingsGearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.6.24-1.15.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.66.22l2.39-.96c.48.39 1.03.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.6-.24 1.15-.55 1.63-.94l2.39.96c.24.12.52.02.66-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  );
}

function ShopBagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 2.5 14.6 8l5.9.5-4.5 3.9 1.4 5.8L12 15.6 6.6 18.2l1.4-5.8L3.5 8.5 9.4 8 12 2.5Z"
      />
    </svg>
  );
}
