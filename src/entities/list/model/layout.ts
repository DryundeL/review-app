import type { Entry, Result, Tier } from "./types.ts";

/** Ключ группы: id тира для формата `tiers`, `null` для `ranked`/`collection`. */
export type GroupKey = string | null;

export type Layout = {
  groups: Map<GroupKey, string[]>;
  unplaced: string[];
};

export function layoutFromResult(result: Result): Layout {
  const groups = new Map<GroupKey, string[]>();
  if (result.format === "tiers") {
    for (const tier of result.tiers) groups.set(tier.id, []);
  } else {
    groups.set(null, []);
  }
  const known = new Set(result.items.map((i) => i.id));
  const placed = new Set<string>();
  const sorted = [...result.entries].sort((a, b) => a.position - b.position);
  for (const e of sorted) {
    if (!known.has(e.itemId) || placed.has(e.itemId)) continue;
    const key: GroupKey = result.format === "tiers" ? (e.tierId ?? null) : null;
    const group = groups.get(key);
    if (!group) continue;
    group.push(e.itemId);
    placed.add(e.itemId);
  }
  return { groups, unplaced: result.items.map((i) => i.id).filter((id) => !placed.has(id)) };
}

function without(layout: Layout, itemId: string): Layout {
  const groups = new Map<GroupKey, string[]>();
  for (const [k, ids] of layout.groups) groups.set(k, ids.filter((id) => id !== itemId));
  return { groups, unplaced: layout.unplaced.filter((id) => id !== itemId) };
}

function isKnown(layout: Layout, itemId: string): boolean {
  if (layout.unplaced.includes(itemId)) return true;
  for (const ids of layout.groups.values()) if (ids.includes(itemId)) return true;
  return false;
}

export function placeItem(
  layout: Layout,
  itemId: string,
  groupKey: GroupKey,
  index?: number,
): Layout {
  if (!layout.groups.has(groupKey) || !isKnown(layout, itemId)) return layout;
  const next = without(layout, itemId);
  const group = next.groups.get(groupKey) ?? [];
  const at = Math.min(Math.max(index ?? group.length, 0), group.length);
  next.groups.set(groupKey, [...group.slice(0, at), itemId, ...group.slice(at)]);
  return next;
}

export function unplaceItem(layout: Layout, itemId: string): Layout {
  if (!isKnown(layout, itemId) || layout.unplaced.includes(itemId)) return layout;
  const next = without(layout, itemId);
  return { groups: next.groups, unplaced: [...next.unplaced, itemId] };
}

export function moveWithinGroup(layout: Layout, itemId: string, delta: -1 | 1): Layout {
  for (const [key, ids] of layout.groups) {
    const from = ids.indexOf(itemId);
    if (from === -1) continue;
    const to = from + delta;
    if (to < 0 || to >= ids.length) return layout;
    const copy = [...ids];
    [copy[from], copy[to]] = [copy[to], copy[from]];
    const groups = new Map(layout.groups);
    groups.set(key, copy);
    return { groups, unplaced: layout.unplaced };
  }
  return layout;
}

/** Канонический порядок: тиры сверху вниз (порядок `tiers`), внутри — позиции 1..n. */
export function entriesFromLayout(layout: Layout, tiers: Tier[]): Entry[] {
  const entries: Entry[] = [];
  const nullGroup = layout.groups.get(null);
  if (nullGroup) {
    nullGroup.forEach((itemId, i) => entries.push({ itemId, position: i + 1 }));
  }
  for (const tier of tiers) {
    layout.groups.get(tier.id)?.forEach((itemId, i) =>
      entries.push({ itemId, tierId: tier.id, position: i + 1 }),
    );
  }
  return entries;
}
