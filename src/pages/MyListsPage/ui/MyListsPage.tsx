import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ListFilters, ListScope } from "@/entities/list";
import { usePageMeta } from "@/shared/hooks";
import { Button } from "@/shared/ui";
import { ListsFeed } from "@/widgets/ListsFeed";
import { CreateTemplateModal } from "./CreateTemplateModal";
import "./MyListsPage.css";

const TABS = [
  { id: "templates", label: "Шаблоны" },
  { id: "results", label: "Топы" },
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
  const [createOpen, setCreateOpen] = useState(false);
  const kind = searchParams.get("tab") === "results" ? "results" : "templates";
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
        <Button type="button" onClick={() => setCreateOpen(true)}>
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
              patchParams({ tab: tab.id === "results" ? "results" : undefined })
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

      <ListsFeed scope={scope} filters={filters} />

      <CreateTemplateModal open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}
