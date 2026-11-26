import { useEffect, useMemo } from "react";
import {
  moveWithinGroup,
  unplaceItem,
  type Format,
  type GroupKey,
  type Item,
  type Layout,
  type Tier,
} from "@/entities/list";
import { Button, MediaPoster } from "@/shared/ui";
import { placeAtEnd, placeBefore } from "../model/selection";
import "@/widgets/ListBoard/ListBoard.css";
import "./LayoutEditor.css";

type LayoutEditorProps = {
  format: Format;
  tiers: Tier[];
  items: Item[];
  layout: Layout;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (layout: Layout) => void;
  disabled?: boolean;
};

type TileProps = {
  item: Item;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  place?: number;
  controls?: {
    canUp: boolean;
    canDown: boolean;
    onUp: () => void;
    onDown: () => void;
    onRemove: () => void;
  };
};

function Tile({ item, selected, disabled, onPress, place, controls }: TileProps) {
  return (
    <li className={`layout-editor__tile${selected ? " is-selected" : ""}`}>
      <button
        type="button"
        className="layout-editor__pick"
        aria-pressed={selected}
        disabled={disabled}
        title={item.title}
        onClick={onPress}
      >
        <span className="list-board__poster">
          <MediaPoster title={item.title} posterUrl={item.imageUrl} />
          {place !== undefined ? <span className="list-board__place">{place}</span> : null}
        </span>
        <span className="list-board__item-title">{item.title}</span>
      </button>
      {controls ? (
        <span className="layout-editor__controls">
          <button
            type="button"
            aria-label={`Выше: ${item.title}`}
            disabled={disabled || !controls.canUp}
            onClick={controls.onUp}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Ниже: ${item.title}`}
            disabled={disabled || !controls.canDown}
            onClick={controls.onDown}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Убрать: ${item.title}`}
            disabled={disabled}
            onClick={controls.onRemove}
          >
            Убрать
          </button>
        </span>
      ) : null}
    </li>
  );
}

export function LayoutEditor({
  format,
  tiers,
  items,
  layout,
  selectedId,
  onSelect,
  onChange,
  disabled = false,
}: LayoutEditorProps) {
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSelect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onSelect]);

  const apply = (next: Layout) => {
    onSelect(null);
    onChange(next);
  };

  const placedTile = (item: Item, ids: string[], index: number, numbered: boolean) => {
    const selected = selectedId === item.id;
    return (
      <Tile
        key={item.id}
        item={item}
        selected={selected}
        disabled={disabled}
        place={numbered ? index + 1 : undefined}
        onPress={() => {
          if (selectedId && !selected) apply(placeBefore(layout, selectedId, item.id));
          else onSelect(selected ? null : item.id);
        }}
        controls={{
          canUp: index > 0,
          canDown: index < ids.length - 1,
          onUp: () => onChange(moveWithinGroup(layout, item.id, -1)),
          onDown: () => onChange(moveWithinGroup(layout, item.id, 1)),
          onRemove: () => {
            if (selected) onSelect(null);
            onChange(unplaceItem(layout, item.id));
          },
        }}
      />
    );
  };

  const groupTiles = (key: GroupKey, numbered: boolean) => {
    const ids = layout.groups.get(key) ?? [];
    return ids.flatMap((id, index) => {
      const item = byId.get(id);
      return item ? [placedTile(item, ids, index, numbered)] : [];
    });
  };

  const unplaced = layout.unplaced.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });

  return (
    <div className="layout-editor">
      {format === "tiers" ? (
        <div className="list-board__tiers">
          {tiers.map((tier) => (
            <section key={tier.id} className="list-board__tier" aria-label={tier.name}>
              <button
                type="button"
                className="list-board__tier-label layout-editor__target"
                style={{ background: tier.color }}
                disabled={disabled || !selectedId}
                aria-label={`Положить в тир ${tier.name}`}
                onClick={() => selectedId && apply(placeAtEnd(layout, selectedId, tier.id))}
              >
                {tier.name}
              </button>
              <ul className="list-board__tier-items">{groupTiles(tier.id, false)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <section className="layout-editor__list" aria-label="Раскладка">
          <Button
            variant="secondary"
            disabled={disabled || !selectedId}
            onClick={() => selectedId && apply(placeAtEnd(layout, selectedId, null))}
          >
            Положить в конец списка
          </Button>
          <ul className="list-board__grid">{groupTiles(null, format === "ranked")}</ul>
        </section>
      )}

      <section className="layout-editor__unplaced" aria-label="Неразложенные">
        <h2 className="layout-editor__heading">Неразложенные</h2>
        {unplaced.length === 0 ? (
          <p className="muted">Все элементы разложены.</p>
        ) : (
          <ul className="list-board__grid">
            {unplaced.map((item) => (
              <Tile
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                disabled={disabled}
                onPress={() => onSelect(selectedId === item.id ? null : item.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
