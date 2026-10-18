import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { safeHttpsUrl } from "../../../shared/lib/safeHttpsUrl.ts";
import { MEDIA_TYPE_LABELS, type MediaType } from "../../../shared/types/media.ts";
import type {
  SearchAuthorHit,
  SearchMediaHit,
  SearchMediaTrend,
  SearchResponse,
  SearchReviewHit,
  SearchTrendsResponse,
  SearchTrendsTab,
  SearchTypeTrend,
} from "../model/types.ts";

const uuid = z.string().uuid();

const mediaTypeSchema = z.custom<MediaType>(
  (value) => typeof value === "string" && value in MEDIA_TYPE_LABELS,
);

const authorHitSchema = z.object({
  id: uuid,
  username: z.string().nullish().transform((value) => value ?? ""),
  firstName: z.string().nullish().transform((value) => value ?? ""),
  followersCount: z.number().nonnegative().optional().default(0),
  isFollowing: z.boolean().nullish().transform((value) => value ?? false),
  photoUrl: z.string().optional().nullable(),
});

const mediaTrendSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(256),
  type: mediaTypeSchema,
  posterUrl: z.string().optional().nullable(),
  reviewsCount: z.number().nonnegative().optional().default(0),
});

const typeTrendSchema = z.object({
  code: mediaTypeSchema,
  label: z.string().min(1).max(64),
  reviewsCount: z.number().nonnegative().optional().default(0),
});

const reviewHitSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(256),
  authorId: uuid,
  username: z.string().nullish().transform((value) => value ?? ""),
  photoUrl: z.string().optional().nullable(),
  mediaObject: z.object({
    id: uuid,
    title: z.string().min(1).max(256),
    type: mediaTypeSchema,
    posterUrl: z.string().optional().nullable(),
  }),
  rating: z.number().min(1).max(10),
  likesCount: z.number().nonnegative().optional().default(0),
  viewsCount: z.number().nonnegative().optional().default(0),
});

const mediaHitSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(256),
  type: mediaTypeSchema,
  posterUrl: z.string().optional().nullable(),
});

const searchSchema = z.object({
  users: z.array(authorHitSchema).optional().default([]),
  reviews: z.array(reviewHitSchema).optional().default([]),
  mediaObjects: z.array(mediaHitSchema).optional().default([]),
});

const TAB_VALUES = new Set<SearchTrendsTab>(["media", "authors", "types"]);

function optionalPoster(url: string | null | undefined): { posterUrl?: string } {
  const posterUrl = safeHttpsUrl(url ?? undefined);
  return posterUrl ? { posterUrl } : {};
}

function optionalPhoto(url: string | null | undefined): { photoUrl?: string } {
  const photoUrl = safeHttpsUrl(url ?? undefined);
  return photoUrl ? { photoUrl } : {};
}

function toAuthor(raw: z.infer<typeof authorHitSchema>): SearchAuthorHit {
  return {
    id: raw.id,
    username: raw.username,
    firstName: raw.firstName,
    followersCount: Math.floor(raw.followersCount),
    isFollowing: raw.isFollowing,
    ...optionalPhoto(raw.photoUrl),
  };
}

function toMediaTrend(raw: z.infer<typeof mediaTrendSchema>): SearchMediaTrend {
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type,
    reviewsCount: Math.floor(raw.reviewsCount),
    ...optionalPoster(raw.posterUrl),
  };
}

function toTypeTrend(raw: z.infer<typeof typeTrendSchema>): SearchTypeTrend {
  return {
    code: raw.code,
    label: raw.label,
    reviewsCount: Math.floor(raw.reviewsCount),
  };
}

function toReviewHit(raw: z.infer<typeof reviewHitSchema>): SearchReviewHit {
  return {
    id: raw.id,
    title: raw.title,
    authorId: raw.authorId,
    username: raw.username,
    ...optionalPhoto(raw.photoUrl),
    mediaObject: {
      id: raw.mediaObject.id,
      title: raw.mediaObject.title,
      type: raw.mediaObject.type,
      ...optionalPoster(raw.mediaObject.posterUrl),
    },
    rating: Math.round(raw.rating),
    likesCount: Math.floor(raw.likesCount),
    viewsCount: Math.floor(raw.viewsCount),
  };
}

function toMediaHit(raw: z.infer<typeof mediaHitSchema>): SearchMediaHit {
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type,
    ...optionalPoster(raw.posterUrl),
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

export function parseSearchTrendsText(text: string): SearchTrendsResponse {
  const payload = parseJson(text);
  if (!payload || typeof payload !== "object") throw unexpectedResponseError();

  const tabRaw = (payload as { tab?: unknown }).tab;
  if (typeof tabRaw !== "string" || !TAB_VALUES.has(tabRaw as SearchTrendsTab)) {
    throw unexpectedResponseError();
  }
  const tab = tabRaw as SearchTrendsTab;
  const itemsRaw = (payload as { items?: unknown }).items;
  if (!Array.isArray(itemsRaw)) throw unexpectedResponseError();

  if (tab === "media") {
    const items: SearchMediaTrend[] = [];
    for (const item of itemsRaw) {
      const parsed = mediaTrendSchema.safeParse(item);
      if (!parsed.success) throw unexpectedResponseError();
      items.push(toMediaTrend(parsed.data));
    }
    return { tab, items };
  }

  if (tab === "authors") {
    const items: SearchAuthorHit[] = [];
    for (const item of itemsRaw) {
      const parsed = authorHitSchema.safeParse(item);
      if (!parsed.success) throw unexpectedResponseError();
      items.push(toAuthor(parsed.data));
    }
    return { tab, items };
  }

  const items: SearchTypeTrend[] = [];
  for (const item of itemsRaw) {
    const parsed = typeTrendSchema.safeParse(item);
    if (!parsed.success) throw unexpectedResponseError();
    items.push(toTypeTrend(parsed.data));
  }
  return { tab, items };
}

export function parseSearchText(text: string): SearchResponse {
  const payload = parseJson(text);
  const parsed = searchSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return {
    users: parsed.data.users.map(toAuthor),
    reviews: parsed.data.reviews.map(toReviewHit),
    mediaObjects: parsed.data.mediaObjects.map(toMediaHit),
  };
}
