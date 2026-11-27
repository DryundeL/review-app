import {
  placeItem,
  unplaceItem,
  type GroupKey,
  type Layout,
} from "../../../entities/list/model/layout.ts";

export type Box = { left: number; top: number; right: number; bottom: number };

/** Куда отпустили элемент: место в группе (индекс без самого элемента) или «неразложенные». */
export type DropTarget =
  { kind: "group"; group: GroupKey; index: number } | { kind: "unplace" };

type Row = { top: number; bottom: number; first: number; last: number };

/** Плитки в порядке DOM, переносятся по строкам; строки собираются по вертикальному перекрытию. */
function toRows(boxes: Box[]): Row[] {
  const rows: Row[] = [];
  boxes.forEach((box, index) => {
    const row = rows[rows.length - 1];
    const centerY = (box.top + box.bottom) / 2;
    if (row && centerY <= row.bottom) {
      row.top = Math.min(row.top, box.top);
      row.bottom = Math.max(row.bottom, box.bottom);
      row.last = index;
    } else {
      rows.push({ top: box.top, bottom: box.bottom, first: index, last: index });
    }
  });
  return rows;
}

function distanceToRow(row: Row, y: number): number {
  if (y < row.top) return row.top - y;
  if (y > row.bottom) return y - row.bottom;
  return 0;
}

/**
 * Индекс вставки для точки (x, y) среди плиток группы.
 * `boxes` — плитки группы без перетаскиваемого элемента, в порядке раскладки.
 */
export function insertionIndex(boxes: Box[], x: number, y: number): number {
  if (boxes.length === 0) return 0;
  const rows = toRows(boxes);
  let row = rows[0]!;
  for (const candidate of rows) {
    if (distanceToRow(candidate, y) < distanceToRow(row, y)) row = candidate;
  }
  for (let index = row.first; index <= row.last; index += 1) {
    const box = boxes[index]!;
    if (x < (box.left + box.right) / 2) return index;
  }
  return row.last + 1;
}

export function applyDrop(layout: Layout, itemId: string, target: DropTarget): Layout {
  if (target.kind === "unplace") return unplaceItem(layout, itemId);
  return placeItem(layout, itemId, target.group, target.index);
}
