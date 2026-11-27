import { Link } from "react-router-dom";
import type { Card } from "@/entities/list";
import { FORMAT_LABELS } from "./formatLabels";
import { MEDIA_TYPE_LABELS, isMediaType } from "@/shared/types";
import { MediaPoster, UserAvatar } from "@/shared/ui";
import "./ListCard.css";

type ListCardProps = {
  card: Card;
  href: string;
  /** Шаблон помечается бейджем, чтобы его не путали с топом. */
  kind?: "templates" | "results";
};

export function ListCard({ card, href, kind }: ListCardProps) {
  const typeLabel = isMediaType(card.typeCode) ? MEDIA_TYPE_LABELS[card.typeCode] : null;
  return (
    <article className="list-card">
      <Link className="list-card__main" to={href} aria-label={`${kind === "templates" ? "Шаблон" : "Топ"}: ${card.title}`}>
        <span className="list-card__cover">
          <MediaPoster title={card.title} posterUrl={card.coverUrl} />
        </span>
        <span className="list-card__body">
          <span className="list-card__meta">
            {kind === "templates" ? (
              <span className="list-card__badge list-card__badge--template">Шаблон</span>
            ) : null}
            <span className="list-card__badge">{FORMAT_LABELS[card.format]}</span>
            {typeLabel ? <span className="list-card__badge">{typeLabel}</span> : null}
            {card.status === "draft" ? (
              <span className="list-card__badge list-card__badge--status">Черновик</span>
            ) : null}
            {card.visibility === "unlisted" ? (
              <span className="list-card__badge list-card__badge--status">По ссылке</span>
            ) : null}
            {card.moderation === "hidden" ? (
              <span className="list-card__badge list-card__badge--danger">
                Скрыто модератором
              </span>
            ) : null}
          </span>
          <span className="list-card__title">{card.title}</span>
          {card.templateTitle ? (
            <span className="list-card__subtitle">по шаблону «{card.templateTitle}»</span>
          ) : null}
          <span className="list-card__author">
            <UserAvatar
              className="list-card__avatar"
              label={card.author.username}
              photoUrl={card.author.photoUrl}
            />
            <span>{card.author.username}</span>
          </span>
        </span>
      </Link>
    </article>
  );
}
