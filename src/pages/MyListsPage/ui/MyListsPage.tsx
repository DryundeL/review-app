import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ListFilters, ListScope } from "@/entities/list";
import { usePageMeta } from "@/shared/hooks";
import { Button } from "@/shared/ui";
import { ListsFeed, ListsHint } from "@/widgets/ListsFeed";
import { CreateTemplateModal } from "./CreateTemplateModal";
import "./MyListsPage.css";

const TABS = [
  { id: "results", label: "Мои топы" },
  { id: "templates", label: "Мои шаблоны" },
] as const;

const STATUSES: { value: NonNullable<ListFilters["status"]> | ""; label: string }[] = [
  { value: "", label: "Все" },
  { value: "draft", label: "Черновики" },
  { value: "published", label: "Опубликованные" },
  { value: "unlisted", label: "По ссылке" },
  { value: "hidden", label: "Скрыто модератором" },
];

function parseStatus(value: string | null): ListFilters["status"] {
  return STATUSES.find((item) => item.value && item.value === value)?.value || undefined;
}

export function MyListsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // ?create=template — пришли из раздела шаблонов по кнопке «Создать шаблон».
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("create") === "template",
  );
  const kind = searchParams.get("tab") === "templates" ? "templates" : "results";
  const status = parseStatus(searchParams.get("status"));

  usePageMeta({ title: "Мои топы и шаблоны", path: "/my-lists", noindex: true });

  function patchParams(patch: Record<string, string | undefined>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }

  const scope: ListScope = { kind, owner: "me" };
  const filters: ListFilters = { status };

  return (
    <section className="my-lists-page screen">
      <div className="my-lists-page__header">
        <h1 className="my-lists-page__title">Мои топы и шаблоны</h1>
      </div>

      <div className="my-lists-page__actions">
        <Button asChild>
          <Link to="/lists?tab=templates">Составить топ</Link>
        </Button>
        <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
          Создать шаблон
        </Button>
      </div>

      <div className="my-lists-page__tabs" role="tablist" aria-label="Раздел">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={kind === tab.id}
            className={
              kind === tab.id
                ? "my-lists-page__tab my-lists-page__tab--active"
                : "my-lists-page__tab"
            }
            onClick={() =>
              patchParams({ tab: tab.id === "templates" ? "templates" : undefined })
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <select
        className="my-lists-page__select"
        aria-label="Статус"
        value={status ?? ""}
        onChange={(event) => patchParams({ status: event.target.value || undefined })}
      >
        {STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      {kind === "results" ? (
        <ListsHint>
          Топ — ваша расстановка элементов шаблона. Черновик видите только вы, после
          публикации топ появится в ленте.
        </ListsHint>
      ) : (
        <ListsHint>
          Шаблон — набор произведений, по которому вы и другие пользователи составляют свои
          топы. Опубликуйте его, чтобы им могли пользоваться.
        </ListsHint>
      )}

      <ListsFeed
        scope={scope}
        filters={filters}
        emptyState={
          status ? (
            <p>Здесь ничего нет.</p>
          ) : kind === "results" ? (
            <>
              <p>У вас пока нет топов. Выберите шаблон и расставьте элементы по-своему.</p>
              <Button asChild>
                <Link to="/lists?tab=templates">Выбрать шаблон</Link>
              </Button>
            </>
          ) : (
            <>
              <p>
                У вас пока нет шаблонов. Создайте свой, если подходящего в разделе
                шаблонов нет.
              </p>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Создать шаблон
              </Button>
            </>
          )
        }
      />

      <CreateTemplateModal
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next && searchParams.has("create")) patchParams({ create: undefined });
        }}
      />
    </section>
  );
}
