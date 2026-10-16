import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { listMediaObjects, listMyReviews, type MediaObjectSummary } from "@/entities/review";
import type { SessionProfile, User } from "@/entities/user";
import { useAuthSession } from "@/features/auth";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import { UserHeader } from "@/widgets/UserHeader";
import "./ProfilePage.css";

export function ProfilePage() {
  const { profile } = useAuthSession();
  const reviewsQuery = useQuery({
    queryKey: ["my-reviews"],
    queryFn: ({ signal }) => listMyReviews(50, signal),
    enabled: Boolean(profile),
  });

  const mediaQuery = useQuery({
    queryKey: ["media-objects"],
    queryFn: ({ signal }) => listMediaObjects(50, signal),
    enabled: Boolean(profile),
    retry: false,
  });

  const mediaById = useMemo(() => {
    const map = new Map<string, MediaObjectSummary>();
    for (const item of mediaQuery.data ?? []) {
      map.set(item.id, item);
    }
    return map;
  }, [mediaQuery.data]);

  if (!profile) return null;

  const user: User = {
    id: profile.id,
    username: profile.username.trim(),
    displayName: displayName(profile),
    popularityScore: 0,
    followersCount: 0,
    followingCount: 0,
  };

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

      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? (
        <div className="profile-page__empty" role="status">
          <p>Пока пусто — ни одного обзора.</p>
          <Link to="/create">Создать первый</Link>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="profile-page__list">
          {reviews.map((review) => (
            <li key={review.id}>
              <RemoteReviewCard
                review={review}
                media={mediaById.get(review.mediaObjectId)}
                canEdit
                hideVotes
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function displayName(profile: SessionProfile): string {
  const fullName = [profile.firstName, profile.lastName]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
  if (fullName) return fullName;
  const username = profile.username.trim();
  if (username) return username;
  return "Пользователь";
}
