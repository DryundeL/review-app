import { useMemo } from "react";
import {
  itemTypeLabel,
  tierLabel,
  type Format,
  type Item,
  type Layout,
  type Tier,
} from "@/entities/list";
import { readableTextColor } from "@/shared/lib/readableTextColor";
import { MediaPoster } from "@/shared/ui";
import "./ListBoard.css";

type ListBoardProps = {
  format: Format;
  tiers: Tier[];
  items: Item[];
  /** Раскладка результата. Без неё (шаблон) — тиры и сетка всех элементов. */
  layout?: Layout;
  /** Смешанный топ: подписать тип у каждого произведения. */
  showItemTypes?: boolean;
};

/** Бейдж типа произведения на постере (смешанные топы). */
export function ItemTypeTag({ item }: { item: Item }) {
  const label = itemTypeLabel(item.mediaType);
  return label ? <span className="list-board__type">{label}</span> : null;
}

function ItemTile({ item, place, showType }: { item: Item; place?: number; showType?: boolean }) {
  return (
    <li className="list-board__item" title={item.title}>
      <span className="list-board__poster">
        <MediaPoster title={item.title} posterUrl={item.imageUrl} />
        {place !== undefined ? <span className="list-board__place">{place}</span> : null}
        {showType ? <ItemTypeTag item={item} /> : null}
      </span>
      <span className="list-board__item-title">{item.title}</span>
    </li>
  );
}

function ItemGrid({
  items,
  numbered,
  showType,
}: {
  items: Item[];
  numbered?: boolean;
  showType?: boolean;
}) {
  return (
    <ul className="list-board__grid">
      {items.map((item, index) => (
        <ItemTile
          key={item.id}
          item={item}
          place={numbered ? index + 1 : undefined}
          showType={showType}
        />
      ))}
    </ul>
  );
}

export function ListBoard({
  format,
  tiers,
  items,
  layout,
  showItemTypes = false,
}: ListBoardProps) {
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
              <section key={tier.id} className="list-board__tier" aria-label={tierLabel(tier.name)}>
                <h2
                  className="list-board__tier-label"
                  style={{ background: tier.color, color: readableTextColor(tier.color) }}
                >
                  {tierLabel(tier.name)}
                </h2>
                <ul className="list-board__tier-items">
                  {placed.map((item) => (
                    <ItemTile key={item.id} item={item} showType={showItemTypes} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        {layout ? null : <ItemGrid items={items} showType={showItemTypes} />}
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
            <span className="list-board__ranked-title">
              {item.title}
              {showItemTypes && itemTypeLabel(item.mediaType) ? (
                <span className="list-board__ranked-type">
                  {itemTypeLabel(item.mediaType)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="list-board">
      <ItemGrid items={shown} numbered={format === "ranked"} showType={showItemTypes} />
    </div>
  );
}
