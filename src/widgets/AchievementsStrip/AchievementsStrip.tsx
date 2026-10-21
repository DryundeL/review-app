import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  achievementAssetUrl,
  fetchProfileAchievements,
  type Achievement,
} from "@/entities/achievement";
import { Modal } from "@/shared/ui";
import "./AchievementsStrip.css";

const PREVIEW_LIMIT = 6;

type AchievementsStripProps = {
  profileId: string;
};

export function AchievementsStrip({ profileId }: AchievementsStripProps) {
  const [open, setOpen] = useState(false);
  const query = useAchievements(profileId);

  if (query.isPending) {
    return (
      <div
        className="achievements-strip achievements-strip--skeleton"
        aria-busy="true"
        aria-label="Загрузка достижений"
      >
        <div className="achievements-strip__meta">
          <div className="achievements-strip__skeleton-bar" />
        </div>
        <div className="achievements-strip__previews" aria-hidden>
          <span className="achievements-strip__skeleton-dot" />
          <span className="achievements-strip__skeleton-dot" />
          <span className="achievements-strip__skeleton-dot" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) return null;

  const list = query.data.achievements;
  const unlocked = list.filter((a) => Boolean(a.unlockedAt)).length;
  const total = list.length;
  const previews = pickPreviews(list, PREVIEW_LIMIT);

  return (
    <>
      <button
        type="button"
        className="achievements-strip"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="achievements-strip__meta">
          <span className="achievements-strip__label">Достижения</span>
          <span className="achievements-strip__count">
            {unlocked}/{total}
          </span>
        </span>
        {previews.length > 0 ? (
          <span className="achievements-strip__previews" aria-hidden>
            {previews.map((item) => (
              <AchievementIcon
                key={item.code}
                achievement={item}
                className={
                  item.unlockedAt
                    ? "achievements-strip__preview"
                    : "achievements-strip__preview achievements-strip__preview--locked"
                }
                size="sm"
              />
            ))}
          </span>
        ) : null}
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Достижения">
        <AchievementsBoard achievements={list} />
      </Modal>
    </>
  );
}

type AchievementsBoardPageProps = {
  profileId: string;
};

/** Полная доска для /achievements (свой профиль). */
export function AchievementsBoardPage({ profileId }: AchievementsBoardPageProps) {
  const query = useAchievements(profileId);

  if (query.isPending) {
    return (
      <p className="achievements-board__empty" aria-busy="true">
        Загрузка…
      </p>
    );
  }

  if (query.isError || !query.data) {
    return (
      <p className="achievements-board__empty" role="status">
        Не удалось загрузить достижения.
      </p>
    );
  }

  const list = query.data.achievements;
  const unlocked = list.filter((a) => Boolean(a.unlockedAt)).length;

  return (
    <div className="achievements-page-board">
      <p className="achievements-page-board__count">
        Открыто {unlocked} из {list.length}
      </p>
      <AchievementsBoard achievements={list} />
    </div>
  );
}

function AchievementsBoard({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) {
    return <p className="achievements-board__empty">Пока нет достижений.</p>;
  }

  return (
    <ul className="achievements-board" role="list">
      {achievements.map((item) => {
        const unlocked = Boolean(item.unlockedAt);
        return (
          <li
            key={item.code}
            className={
              unlocked
                ? "achievements-board__item"
                : "achievements-board__item achievements-board__item--locked"
            }
          >
            <AchievementIcon
              achievement={item}
              className="achievements-board__icon"
              size="md"
            />
            <h3 className="achievements-board__title">{item.title}</h3>
            {item.description ? (
              <p className="achievements-board__desc">{item.description}</p>
            ) : null}
            <div className="achievements-board__progress">
              <div
                className="achievements-board__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.progress)}
                aria-label={`${item.title}: ${item.current} из ${item.target}`}
              >
                <div
                  className="achievements-board__bar-fill"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="achievements-board__stats">
                {unlocked ? "Открыто · " : ""}
                {item.current}/{item.target}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function useAchievements(profileId: string) {
  return useQuery({
    queryKey: ["profile-achievements", profileId],
    queryFn: ({ signal }) => fetchProfileAchievements(profileId, signal),
    enabled: Boolean(profileId),
  });
}

function pickPreviews(list: Achievement[], limit: number): Achievement[] {
  if (list.length === 0) return [];
  const unlocked = list.filter((a) => Boolean(a.unlockedAt));
  if (unlocked.length >= limit) return unlocked.slice(0, limit);
  const locked = list.filter((a) => !a.unlockedAt);
  return [...unlocked, ...locked].slice(0, limit);
}

function AchievementIcon({
  achievement,
  className,
  size,
}: {
  achievement: Achievement;
  className: string;
  size: "sm" | "md";
}) {
  const src = achievementAssetUrl(achievement.code);
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span
        className={`${className} ${
          size === "sm"
            ? "achievements-strip__preview--placeholder"
            : "achievements-board__icon--placeholder"
        }`}
        aria-hidden
      >
        {achievement.title.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size === "sm" ? 28 : 48}
      height={size === "sm" ? 28 : 48}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
