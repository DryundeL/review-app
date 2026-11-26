import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth";
import type { Format, ListFilters, ListScope } from "@/entities/list";
import { fetchReviewTypes } from "@/entities/settings";
import { useDebouncedValue, usePageMeta } from "@/shared/hooks";
import { metaForPath } from "@/shared/lib/pageMeta";
import { Input } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";
import { ListsFeed } from "@/widgets/ListsFeed";
import "./ListsPage.css";

const TABS = [
  { id: "templates", label: "Шаблоны" },
  { id: "results", label: "Топы пользователей" },
] as const;

const FORMATS: Format[] = ["tiers", "ranked", "collection"];
const Q_MAX = 100;

function parseFormat(value: string | null): Format | undefined {
  return FORMATS.find((format) => format === value);
}

export function ListsPage() {
  const { profile } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = searchParams.get("tab") === "results" ? "results" : "templates";
  const type = searchParams.get("type") || undefined;
  const format = parseFormat(searchParams.get("format"));
  const urlQ = searchParams.get("q") ?? "";

  const [q, setQ] = useState(urlQ.slice(0, Q_MAX));
  const debouncedQ = useDebouncedValue(q, 300).trim();

  usePageMeta(metaForPath("/lists"));

  const typesQuery = useQuery({
    queryKey: ["review-types"],
    queryFn: ({ signal }) => fetchReviewTypes(signal),
    staleTime: 5 * 60 * 1000,
  });

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

  // Поисковая строка попадает в URL только после debounce.
  useEffect(() => {
    if (debouncedQ !== urlQ.trim()) patchParams({ q: debouncedQ || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const scope: ListScope = { kind, owner: "all" };
  const filters: ListFilters = {
    q: debouncedQ || undefined,
    type,
    format,
  };

  return (
    <section className="lists-page">
      <div className="lists-page__header">
        <h1 className="lists-page__title">Топы</h1>
        {profile ? (
          <Link className="lists-page__link" to="/my-lists">
            Мои топы и шаблоны
          </Link>
        ) : null}
      </div>

      <div className="lists-page__tabs" role="tablist" aria-label="Раздел">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={kind === tab.id}
            className={
              kind === tab.id
                ? "lists-page__tab lists-page__tab--active"
                : "lists-page__tab"
            }
            onClick={() =>
              patchParams({ tab: tab.id === "results" ? "results" : undefined })
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Поиск по названию"
        aria-label="Поиск по названию"
        maxLength={Q_MAX}
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      <div className="lists-page__filters">
        <select
          className="lists-page__select"
          aria-label="Тип произведения"
          value={type ?? ""}
          onChange={(event) => patchParams({ type: event.target.value || undefined })}
        >
          <option value="">Все типы</option>
          {(typesQuery.data ?? []).map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="lists-page__select"
          aria-label="Формат"
          value={format ?? ""}
          onChange={(event) => patchParams({ format: event.target.value || undefined })}
        >
          <option value="">Все форматы</option>
          {FORMATS.map((item) => (
            <option key={item} value={item}>
              {FORMAT_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      <ListsFeed scope={scope} filters={filters} />
    </section>
  );
}
