import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  moveWithinGroup,
  tierLabel,
  unplaceItem,
  type Format,
  type GroupKey,
  type Item,
  type Layout,
  type Tier,
} from "@/entities/list";
import { cn } from "@/shared/lib/cn";
import { readableTextColor } from "@/shared/lib/readableTextColor";
import { Button, MediaPoster } from "@/shared/ui";
import { applyDrop } from "../model/dragDrop";
import { placeAtEnd, placeBefore } from "../model/selection";
import {
  DRAG_ITEM_ATTR,
  DROP_GROUP_ATTR,
  dropGroupValue,
  useLayoutDrag,
  type DragState,
} from "../model/useLayoutDrag";
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

type DropMark = "before" | "after" | undefined;

type TileProps = {
  item: Item;
  selected: boolean;
  disabled: boolean;
  dragging: boolean;
  mark: DropMark;
  onPress: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  place?: number;
  controls?: {
    canUp: boolean;
    canDown: boolean;
    onUp: () => void;
    onDown: () => void;
    onRemove: () => void;
  };
};

function Tile({
  item,
  selected,
  disabled,
  dragging,
  mark,
  onPress,
  onPointerDown,
  place,
  controls,
}: TileProps) {
  return (
    <li
      {...{ [DRAG_ITEM_ATTR]: item.id }}
      className={cn(
        "layout-editor__tile",
        selected && "is-selected",
        dragging && "is-dragging",
        mark === "before" && "is-drop-before",
        mark === "after" && "is-drop-after",
      )}
    >
      <button
        type="button"
        className="layout-editor__pick"
        aria-pressed={selected}
        disabled={disabled}
        title={item.title}
        onClick={onPress}
        onPointerDown={onPointerDown}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      >
        <span className="list-board__poster">
          <MediaPoster title={item.title} posterUrl={item.imageUrl} />
          {place !== undefined ? (
            <span className="list-board__place">{place}</span>
          ) : null}
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

/** Какой плитке рисовать полосу вставки, чтобы не сдвигать раскладку под пальцем. */
function dropMarks(layout: Layout, drag: DragState | null): Map<string, DropMark> {
  const marks = new Map<string, DropMark>();
  const target = drag?.target;
  if (!drag || !target || target.kind !== "group") return marks;
  const rest = (layout.groups.get(target.group) ?? []).filter((id) => id !== drag.itemId);
  const before = rest[target.index];
  if (before) marks.set(before, "before");
  else if (rest.length > 0) marks.set(rest[rest.length - 1]!, "after");
  return marks;
}

function isDropGroup(drag: DragState | null, group: GroupKey | "unplaced"): boolean {
  const target = drag?.target;
  if (!target) return false;
  if (group === "unplaced") return target.kind === "unplace";
  return target.kind === "group" && target.group === group;
}

function DragGhost({ drag, item }: { drag: DragState; item: Item }) {
  return createPortal(
    <div
      className="layout-editor__ghost"
      aria-hidden
      style={{
        width: drag.width,
        transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px)`,
      }}
    >
      <span className="list-board__poster">
        <MediaPoster title={item.title} posterUrl={item.imageUrl} />
      </span>
    </div>,
    document.body,
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
  const rootRef = useRef<HTMLDivElement>(null);

  const { drag, onPointerDown } = useLayoutDrag({
    rootRef,
    disabled,
    onDrop: (itemId, target) => {
      onSelect(null);
      const next = applyDrop(layout, itemId, target);
      if (next !== layout) onChange(next);
    },
  });

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSelect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onSelect]);

  const marks = dropMarks(layout, drag);
  const draggedItem = drag ? byId.get(drag.itemId) : undefined;

  const apply = (next: Layout) => {
    onSelect(null);
    onChange(next);
  };

  const dropGroupProps = (group: GroupKey | "unplaced") => ({
    [DROP_GROUP_ATTR]: dropGroupValue(group),
  });

  const placedTile = (item: Item, ids: string[], index: number, numbered: boolean) => {
    const selected = selectedId === item.id;
    return (
      <Tile
        key={item.id}
        item={item}
        selected={selected}
        disabled={disabled}
        dragging={drag?.itemId === item.id}
        mark={marks.get(item.id)}
        place={numbered ? index + 1 : undefined}
        onPointerDown={(event) => onPointerDown(item.id, event)}
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
    <div ref={rootRef} className={cn("layout-editor", drag && "is-dragging")}>
      <p className="layout-editor__hint muted">
        Перетащите элемент в нужное место или выберите его и нажмите на тир.
      </p>
      {format === "tiers" ? (
        <div className="list-board__tiers">
          {tiers.map((tier) => (
            <section
              key={tier.id}
              {...dropGroupProps(tier.id)}
              className={cn(
                "list-board__tier",
                isDropGroup(drag, tier.id) && "is-drop-target",
              )}
              aria-label={tierLabel(tier.name)}
            >
              <button
                type="button"
                className="list-board__tier-label layout-editor__target"
                style={{ background: tier.color, color: readableTextColor(tier.color) }}
                disabled={disabled || !selectedId}
                aria-label={`Положить в тир ${tierLabel(tier.name)}`}
                onClick={() =>
                  selectedId && apply(placeAtEnd(layout, selectedId, tier.id))
                }
              >
                {tierLabel(tier.name)}
              </button>
              <ul className="list-board__tier-items">{groupTiles(tier.id, false)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <section
          {...dropGroupProps(null)}
          className={cn(
            "layout-editor__list",
            isDropGroup(drag, null) && "is-drop-target",
          )}
          aria-label="Раскладка"
        >
          <Button
            variant="secondary"
            disabled={disabled || !selectedId}
            onClick={() => selectedId && apply(placeAtEnd(layout, selectedId, null))}
          >
            Положить в конец списка
          </Button>
          <ul className="list-board__grid layout-editor__drop-area">
            {groupTiles(null, format === "ranked")}
          </ul>
        </section>
      )}

      <section
        {...dropGroupProps("unplaced")}
        className={cn(
          "layout-editor__unplaced",
          isDropGroup(drag, "unplaced") && "is-drop-target",
        )}
        aria-label="Неразложенные"
      >
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
                dragging={drag?.itemId === item.id}
                mark={undefined}
                onPointerDown={(event) => onPointerDown(item.id, event)}
                onPress={() => onSelect(selectedId === item.id ? null : item.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {drag && draggedItem ? <DragGhost drag={drag} item={draggedItem} /> : null}
    </div>
  );
}
