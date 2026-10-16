import { z } from "zod";
import { unexpectedResponseError } from "@/shared/api/errors";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import type { MediaObjectSummary, RemoteReview, RemoteReviewList } from "../model/remote";

const uuid = z.string().uuid();

const blockSchema = z.object({
  id: uuid,
  position: z.number().int().min(1).max(10),
  title: z.string().min(1).max(50),
  body: z.string().min(1).max(256),
});

const reviewSchema = z.object({
  id: uuid,
  authorId: uuid,
  mediaObjectId: uuid,
  title: z.string().min(1).max(256),
  rating: z.number().int().min(1).max(10),
  status: z.enum(["draft", "published"]),
  blocks: z.array(blockSchema).max(10),
  likesCount: z.number().int().nonnegative(),
  dislikesCount: z.number().int().nonnegative(),
  viewsCount: z.number().int().nonnegative(),
});

const listSchema = z.object({
  items: z.array(reviewSchema),
});

const mediaItemSchema = z
  .object({
    id: uuid,
    title: z.string().min(1).max(256),
  })
  .passthrough();

const mediaListSchema = z.union([
  z.object({ items: z.array(mediaItemSchema) }),
  z.array(mediaItemSchema),
]);

function readPosterUrl(raw: Record<string, unknown>): string | undefined {
  for (const key of ["posterUrl", "poster", "imageUrl", "coverUrl", "cover"]) {
    const url = safeHttpsUrl(raw[key]);
    if (url) return url;
  }
  return undefined;
}

function toMediaSummary(item: z.infer<typeof mediaItemSchema>): MediaObjectSummary {
  const posterUrl = readPosterUrl(item as Record<string, unknown>);
  return posterUrl
    ? { id: item.id, title: item.title, posterUrl }
    : { id: item.id, title: item.title };
}

export function parseRemoteReview(payload: unknown): RemoteReview {
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
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
  return parsed.data;
}

export function parseMediaObjectText(text: string): MediaObjectSummary {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = mediaItemSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return toMediaSummary(parsed.data);
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
  return items.map(toMediaSummary);
}
