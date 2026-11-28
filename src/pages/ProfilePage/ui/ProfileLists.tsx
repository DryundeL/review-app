import { Link } from "react-router-dom";
import type { ListKind, ListScope } from "@/entities/list";
import { ListsFeed } from "@/widgets/ListsFeed";
import type { ListsSub } from "../model/profileTabs";

const NOT_FOUND_TEXT = "Списки недоступны: профиль закрыт";
const DRAFT_SECTIONS: { kind: ListKind; title: string; empty: string }[] = [
  { kind: "results", title: "Топы", empty: "Черновиков топов нет." },
  { kind: "templates", title: "Шаблоны", empty: "Черновиков шаблонов нет." },
];

export function ProfileLists({
  userId,
  isOwn,
  sub,
}: {
  userId: string;
  isOwn: boolean;
  sub: ListsSub;
}) {
  return (
    <div className="profile-page__lists">
      {isOwn ? (
        <Link className="profile-page__lists-link" to="/my-lists">
          Управлять топами и шаблонами
        </Link>
      ) : null}
      {sub === "drafts" && isOwn ? (
        // Черновики видны только владельцу и отдаются только приватным эндпоинтом.
        DRAFT_SECTIONS.map((section) => (
          <section
            key={section.kind}
            aria-labelledby={`profile-lists-drafts-${section.kind}`}
          >
            <h2
              id={`profile-lists-drafts-${section.kind}`}
              className="profile-page__lists-title"
            >
              {section.title}
            </h2>
            <ListsFeed
              scope={{ kind: section.kind, owner: "me" }}
              filters={{ status: "draft" }}
              emptyState={<p>{section.empty}</p>}
            />
          </section>
        ))
      ) : (
        <PublishedLists
          userId={userId}
          kind={sub === "templates" ? "templates" : "results"}
        />
      )}
    </div>
  );
}

function PublishedLists({ userId, kind }: { userId: string; kind: ListKind }) {
  const scope: ListScope = { kind, owner: { userId } };
  return <ListsFeed scope={scope} filters={{}} notFoundText={NOT_FOUND_TEXT} />;
}
