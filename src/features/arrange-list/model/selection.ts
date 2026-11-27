import { placeItem, type GroupKey, type Layout } from "../../../entities/list/model/layout.ts";

export function placeAtEnd(layout: Layout, itemId: string, group: GroupKey): Layout {
  return placeItem(layout, itemId, group);
}

/** Вставить `itemId` перед уже разложенным `targetId`; иначе раскладка не меняется. */
export function placeBefore(layout: Layout, itemId: string, targetId: string): Layout {
  if (itemId === targetId) return layout;
  for (const [key, ids] of layout.groups) {
    const targetIndex = ids.indexOf(targetId);
    if (targetIndex === -1) continue;
    // placeItem сначала убирает элемент: если он стоял раньше цели в той же группе,
    // индекс цели сдвигается на единицу.
    const itemIndex = ids.indexOf(itemId);
    const at = itemIndex !== -1 && itemIndex < targetIndex ? targetIndex - 1 : targetIndex;
    return placeItem(layout, itemId, key, at);
  }
  return layout;
}
