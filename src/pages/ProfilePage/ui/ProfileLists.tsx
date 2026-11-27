import { Link } from "react-router-dom";
import type { ListScope } from "@/entities/list";
import { ListsFeed } from "@/widgets/ListsFeed";

const NOT_FOUND_TEXT = "Списки недоступны: профиль закрыт";
const SECTIONS = [
  { kind: "templates", title: "Шаблоны" },
  { kind: "results", title: "Топы" },
] as const;

export function ProfileLists({ userId, isOwn }: { userId: string; isOwn: boolean }) {
  return (
    <div className="profile-page__lists">
      {isOwn ? (
        <Link className="profile-page__lists-link" to="/my-lists">
          Мои топы и шаблоны
        </Link>
      ) : null}
      {SECTIONS.map((section) => {
        const scope: ListScope = { kind: section.kind, owner: { userId } };
        return (
          <section key={section.kind} aria-labelledby={`profile-lists-${section.kind}`}>
            <h2
              id={`profile-lists-${section.kind}`}
              className="profile-page__lists-title"
            >
              {section.title}
            </h2>
            <ListsFeed scope={scope} filters={{}} notFoundText={NOT_FOUND_TEXT} />
          </section>
        );
      })}
    </div>
  );
}
