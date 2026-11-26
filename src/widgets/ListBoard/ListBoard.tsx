import { useMemo } from "react";
import type { Format, Item, Layout, Tier } from "@/entities/list";
import { MediaPoster } from "@/shared/ui";
import "./ListBoard.css";

type ListBoardProps = {
  format: Format;
  tiers: Tier[];
  items: Item[];
  /** Раскладка результата. Без неё (шаблон) — тиры и сетка всех элементов. */
  layout?: Layout;
};

function ItemTile({ item, place }: { item: Item; place?: number }) {
  return (
    <li className="list-board__item" title={item.title}>
      <span className="list-board__poster">
        <MediaPoster title={item.title} posterUrl={item.imageUrl} />
        {place !== undefined ? <span className="list-board__place">{place}</span> : null}
      </span>
      <span className="list-board__item-title">{item.title}</span>
    </li>
  );
}

function ItemGrid({ items, numbered }: { items: Item[]; numbered?: boolean }) {
  return (
    <ul className="list-board__grid">
      {items.map((item, index) => (
        <ItemTile key={item.id} item={item} place={numbered ? index + 1 : undefined} />
      ))}
    </ul>
  );
}

export function ListBoard({ format, tiers, items, layout }: ListBoardProps) {
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const pick = (ids: string[]): Item[] =>
    ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });

  if (format === "tiers") {
    return (
      <div className="list-board">
        <div className="list-board__tiers">
          {tiers.map((tier) => {
            const placed = layout ? pick(layout.groups.get(tier.id) ?? []) : [];
            return (
              <section key={tier.id} className="list-board__tier" aria-label={tier.name}>
                <h3 className="list-board__tier-label" style={{ background: tier.color }}>
                  {tier.name}
                </h3>
                <ul className="list-board__tier-items">
                  {placed.map((item) => (
                    <ItemTile key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        {layout ? null : <ItemGrid items={items} />}
      </div>
    );
  }

  const shown = layout ? pick(layout.groups.get(null) ?? []) : items;
  if (format === "ranked" && layout) {
    return (
      <ol className="list-board__ranked">
        {shown.map((item, index) => (
          <li key={item.id} className="list-board__ranked-row">
            <span className="list-board__rank">{index + 1}</span>
            <span className="list-board__ranked-poster">
              <MediaPoster title={item.title} posterUrl={item.imageUrl} />
            </span>
            <span className="list-board__ranked-title">{item.title}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="list-board">
      <ItemGrid items={shown} numbered={format === "ranked"} />
    </div>
  );
}
