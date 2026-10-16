import { z } from "zod";
import { unexpectedResponseError } from "@/shared/api/errors";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/shared/types";
import type {
  MediaObjectSummary,
  RemoteReview,
  RemoteReviewList,
} from "../model/remote";

const uuid = z.string().uuid();

const mediaTypeSchema = z.custom<MediaType>(
  (value) => typeof value === "string" && value in MEDIA_TYPE_LABELS,
);

const blockSchema = z.object({
  id: uuid,
  position: z.number().int().min(1).max(10),
  title: z.string().min(1).max(50),
  body: z.string().min(1).max(256),
});

const mediaObjectSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(256),
  type: mediaTypeSchema,
  posterUrl: z.string().optional().nullable(),
});

const reviewSummarySchema = z.object({
  id: uuid,
  authorId: uuid,
  mediaObject: mediaObjectSchema,
  title: z.string().min(1).max(256),
  rating: z.number().int().min(1).max(10),
  status: z.enum(["draft", "published"]),
  hasSpoilers: z.boolean(),
  likesCount: z.number().int().nonnegative(),
  dislikesCount: z.number().int().nonnegative(),
  viewsCount: z.number().int().nonnegative(),
});

const reviewDetailSchema = reviewSummarySchema.extend({
  blocks: z.array(blockSchema).max(10),
});

const listSchema = z.object({
  items: z.array(reviewSummarySchema),
});

const catalogMediaSchema = z
  .object({
    id: uuid,
    title: z.string().min(1).max(256),
    type: mediaTypeSchema.optional(),
    primaryType: mediaTypeSchema.optional(),
    posterUrl: z.string().optional().nullable(),
  })
  .passthrough();

const mediaListSchema = z.union([
  z.object({ items: z.array(catalogMediaSchema) }),
  z.array(catalogMediaSchema),
]);

function toMediaSummary(raw: z.infer<typeof mediaObjectSchema>): MediaObjectSummary {
  const posterUrl = safeHttpsUrl(raw.posterUrl ?? undefined);
  return posterUrl
    ? { id: raw.id, title: raw.title, type: raw.type, posterUrl }
    : { id: raw.id, title: raw.title, type: raw.type };
}

function toCatalogMediaSummary(raw: z.infer<typeof catalogMediaSchema>): MediaObjectSummary | null {
  const type = raw.type ?? raw.primaryType;
  if (!type) return null;
  const posterUrl = safeHttpsUrl(raw.posterUrl ?? undefined);
  return posterUrl
    ? { id: raw.id, title: raw.title, type, posterUrl }
    : { id: raw.id, title: raw.title, type };
}

function mapSummary(item: z.infer<typeof reviewSummarySchema>) {
  return {
    ...item,
    mediaObject: toMediaSummary(item.mediaObject),
  };
}

export function parseRemoteReview(payload: unknown): RemoteReview {
  const parsed = reviewDetailSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return {
    ...mapSummary(parsed.data),
    blocks: parsed.data.blocks,
  };
}

export function parseRemoteReviewText(text: string): RemoteReview {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  return parseRemoteReview(payload);
}

export function parseRemoteReviewListText(text: string): RemoteReviewList {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = listSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return { items: parsed.data.items.map(mapSummary) };
}

export function parseMediaObjectText(text: string): MediaObjectSummary {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = catalogMediaSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  const media = toCatalogMediaSummary(parsed.data);
  if (!media) throw unexpectedResponseError();
  return media;
}

export function parseMediaObjectsText(text: string): MediaObjectSummary[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = mediaListSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  const items = Array.isArray(parsed.data) ? parsed.data : parsed.data.items;
  return items
    .map(toCatalogMediaSummary)
    .filter((item): item is MediaObjectSummary => item !== null);
}
