import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth";
import type { Format, ListFilters, ListScope } from "@/entities/list";
import { fetchReviewTypes } from "@/entities/settings";
import { useDebouncedValue, usePageMeta } from "@/shared/hooks";
import { metaForPath } from "@/shared/lib/pageMeta";
import { Button, Input } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";
import { ListsFeed, ListsHint } from "@/widgets/ListsFeed";
import "./ListsPage.css";

// Топы — то, ради чего приходят; шаблоны — заготовки, из которых их составляют.
const TABS = [
  { id: "results", label: "Топы" },
  { id: "templates", label: "Шаблоны" },
] as const;

const FORMATS: Format[] = ["tiers", "ranked", "collection"];
const Q_MAX = 100;

function parseFormat(value: string | null): Format | undefined {
  return FORMATS.find((format) => format === value);
}

export function ListsPage() {
  const { profile } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = searchParams.get("tab") === "templates" ? "templates" : "results";
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
          <Button asChild variant="secondary" className="lists-page__mine">
            <Link to="/my-lists">Мои топы и шаблоны</Link>
          </Button>
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
              patchParams({ tab: tab.id === "templates" ? "templates" : undefined })
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {kind === "results" ? (
        <ListsHint
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => patchParams({ tab: "templates" })}
            >
              Составить свой топ
            </Button>
          }
        >
          Тир-листы, рейтинги и подборки пользователей. Свой топ составляется по шаблону:
          выберите шаблон и расставьте элементы.
        </ListsHint>
      ) : (
        <ListsHint
          action={
            profile ? (
              <Button asChild variant="secondary">
                <Link to="/my-lists?create=template">Создать шаблон</Link>
              </Button>
            ) : null
          }
        >
          Шаблон — набор произведений. Откройте шаблон, расставьте элементы по-своему и
          опубликуйте свой топ.
          {profile ? " Не нашли подходящий — создайте свой." : null}
        </ListsHint>
      )}

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

      <ListsFeed
        scope={scope}
        filters={filters}
        emptyState={
          kind === "results" ? (
            <>
              <p>Топов пока нет. Станьте первым — выберите шаблон и составьте свой.</p>
              <Button type="button" onClick={() => patchParams({ tab: "templates" })}>
                К шаблонам
              </Button>
            </>
          ) : (
            <p>Шаблонов по этим условиям нет. Попробуйте изменить поиск или фильтры.</p>
          )
        }
      />
    </section>
  );
}
