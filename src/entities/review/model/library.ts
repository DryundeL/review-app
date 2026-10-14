import { useSyncExternalStore } from "react";
import type { MediaItem } from "@/entities/media-item";
import { MEDIA_TYPE_LABELS } from "../../../shared/types/media.ts";
import type { Review } from "./types";

const KEY = "rh-library";
const MAX_RAW = 200_000;
const MAX_REVIEWS = 30;
const XP_GRANT = 15;

export type Library = {
  reviews: Review[];
  works: MediaItem[];
  xp: number;
};

const EMPTY: Library = { reviews: [], works: [], xp: 0 };

const REVIEW_ID = /^local-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORK_ID = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["released", "ongoing", "announced"]);

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  let text = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 31 && code !== 9 && code !== 10 && code !== 13) continue;
    text += char;
  }
  text = text.trim();
  if (text.length === 0 || text.length > max) return null;
  return text;
}

function asWork(value: unknown): MediaItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = clean(raw.id, 80);
  const title = clean(raw.title, 120);
  const primaryType = raw.primaryType;
  const status = raw.status;
  const year = raw.year;
  if (!id || !WORK_ID.test(id) || !title) return null;
  if (typeof primaryType !== "string" || !(primaryType in MEDIA_TYPE_LABELS)) return null;
  if (typeof status !== "string" || !STATUSES.has(status)) return null;
  if (typeof year !== "number" || year < 1800 || year > 2100) return null;
  const types = Array.isArray(raw.types)
    ? raw.types.filter((type): type is MediaItem["primaryType"] => typeof type === "string" && type in MEDIA_TYPE_LABELS)
    : [];
  return {
    id,
    title,
    altTitles: [],
    primaryType: primaryType as MediaItem["primaryType"],
    types: types.length > 0 ? types : [primaryType as MediaItem["primaryType"]],
    year,
    status: status as MediaItem["status"],
    statusSource: "user",
    synopsis: clean(raw.synopsis, 500) ?? "",
    relatedIds: [],
  };
}

function asReview(value: unknown): Review | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = clean(raw.id, 80);
  const title = clean(raw.title, 140);
  const html = typeof raw.html === "string" ? raw.html.slice(0, 50_000) : "";
  const primaryType = raw.primaryType;
  const rating = raw.rating;
  const mediaId = clean(raw.mediaId, 80);
  if (!id || !REVIEW_ID.test(id) || !title || !mediaId) return null;
  if (typeof primaryType !== "string" || !(primaryType in MEDIA_TYPE_LABELS)) return null;
  if (typeof rating !== "number" || rating < 1 || rating > 10) return null;
  const types = Array.isArray(raw.types)
    ? raw.types.filter((type): type is Review["primaryType"] => typeof type === "string" && type in MEDIA_TYPE_LABELS)
    : [];
  const mediaIds = Array.isArray(raw.mediaIds)
    ? raw.mediaIds.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 80).slice(0, 5)
    : [];
  return {
    id,
    authorId: clean(raw.authorId, 64) ?? "local",
    authorName: clean(raw.authorName, 80) ?? "Вы",
    authorReputation: 0,
    mediaId,
    mediaIds: mediaIds.includes(mediaId) ? mediaIds : [mediaId, ...mediaIds].slice(0, 5),
    title,
    primaryType: primaryType as Review["primaryType"],
    types: types.length > 0 ? types : [primaryType as Review["primaryType"]],
    rating: Math.round(rating),
    excerpt: clean(raw.excerpt, 180) ?? title,
    blocks: [],
    html,
    spoilerWarning: raw.spoilerWarning === true,
    viewsCount: 0,
    likesCount: 0,
    dislikesCount: 0,
    comments: [],
    createdAt: clean(raw.createdAt, 40) ?? new Date(0).toISOString(),
  };
}

export function readLibrary(raw: string | null): Library {
  if (!raw || raw.length > MAX_RAW) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return EMPTY;
    const record = data as Record<string, unknown>;
    const reviews = Array.isArray(record.reviews) ? record.reviews.map(asReview).filter((item) => item !== null) : [];
    const works = Array.isArray(record.works) ? record.works.map(asWork).filter((item) => item !== null) : [];
    const xp = typeof record.xp === "number" && Number.isFinite(record.xp) ? Math.max(0, Math.min(1_000_000, Math.floor(record.xp))) : 0;
    return { reviews: reviews.slice(0, MAX_REVIEWS), works: works.slice(0, MAX_REVIEWS), xp };
  } catch {
    return EMPTY;
  }
}

export function addPublication(library: Library, review: Review, works: MediaItem[]): Library {
  const storedReview = asReview(review);
  if (!storedReview) return library;
  const storedWorks = works.map(asWork).filter((item) => item !== null);
  return {
    xp: Math.min(1_000_000, library.xp + XP_GRANT),
    reviews: [storedReview, ...library.reviews.filter((item) => item.id !== storedReview.id)].slice(0, MAX_REVIEWS),
    works: [...storedWorks, ...library.works.filter((item) => !storedWorks.some((work) => work.id === item.id))].slice(0, MAX_REVIEWS),
  };
}

let state: Library | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function current(): Library {
  if (!state) state = readLibrary(readRaw());
  return state;
}

function emit(next: Library) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Хранилище недоступно: остаётся память вкладки.
  }
  listeners.forEach((listener) => listener());
}

export function publishLocal(review: Review, works: MediaItem[]): Library {
  const next = addPublication(current(), review, works);
  emit(next);
  return next;
}

export function useLibrary(): Library {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => EMPTY,
  );
}
