import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { parseShopCode } from "../../../shared/lib/shopCode.ts";
import { safeHttpsUrl } from "../../../shared/lib/safeHttpsUrl.ts";
import { MEDIA_TYPE_LABELS, type MediaType } from "../../../shared/types/media.ts";
import type {
  MediaObjectSummary,
  CatalogMediaObject,
  RemoteReview,
  RemoteReviewAuthor,
  RemoteReviewList,
} from "../model/remote.ts";

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
  originalTitle: z.string().min(1).max(256).optional().nullable(),
  releaseYear: z.number().int().min(1800).max(2200).optional().nullable(),
  posterUrl: z.string().optional().nullable(),
});

const authorSchema = z.object({
  id: uuid,
  username: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  isFollowing: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  photoUrl: z.string().optional().nullable(),
  avatarFrame: z.string().optional().nullable(),
  backdrop: z.string().optional().nullable(),
});

/**
 * Detail / create / update: author обязателен.
 * status с detail убран на бэке — если нет, считаем published.
 */
const reviewSummarySchema = z.object({
  id: uuid,
  authorId: uuid,
  author: authorSchema,
  mediaObject: mediaObjectSchema,
  title: z.string().min(1).max(256),
  rating: z.number().int().min(1).max(10),
  status: z.enum(["draft", "published"]).optional().default("published"),
  hasSpoilers: z.boolean(),
  likesCount: z.number().int().nonnegative(),
  dislikesCount: z.number().int().nonnegative(),
  viewsCount: z.number().int().nonnegative(),
  isFollowing: z.boolean().nullish(),
  viewerIsLike: z.boolean().nullish(),
});

/**
 * Лента/списки: status нужен для черновиков в профиле;
 * в feed может отсутствовать (тогда published).
 * isFollowing — на item или на author.
 */
const reviewListItemSchema = z.object({
  id: uuid,
  authorId: uuid,
  author: authorSchema.optional(),
  mediaObject: mediaObjectSchema,
  title: z.string().min(1).max(256),
  rating: z.number().min(1).max(10),
  status: z.enum(["draft", "published"]).optional().default("published"),
  hasSpoilers: z.boolean().optional().default(false),
  likesCount: z.number().nonnegative().optional().default(0),
  dislikesCount: z.number().nonnegative().optional().default(0),
  viewsCount: z.number().nonnegative().optional().default(0),
  isFollowing: z.boolean().nullish(),
  viewerIsLike: z.boolean().nullish(),
});

const reviewDetailSchema = reviewSummarySchema.extend({
  blocks: z.array(blockSchema).max(10),
});

const listSchema = z.object({
  items: z.array(reviewListItemSchema),
  nextCursor: z.string().nullable().optional(),
});

const mediaInfoSchema = z.object({
  genre: z.string().max(100).optional(),
  releaseYear: z.number().int().min(1800).max(2100).optional(),
  releaseStatus: z.enum(["announced", "ongoing", "completed", "hiatus"]),
});

const catalogMediaSchema = z
  .object({
    id: uuid,
    title: z.string().min(1).max(256),
    type: mediaTypeSchema.optional(),
    primaryType: mediaTypeSchema.optional(),
    info: mediaInfoSchema,
    originalTitle: z.string().min(1).max(256).optional().nullable(),
    releaseYear: z.number().int().min(1800).max(2200).optional().nullable(),
    posterUrl: z.string().optional().nullable(),
  })
  .passthrough();

const mediaListSchema = z.union([
  z.object({ items: z.array(catalogMediaSchema) }),
  z.array(catalogMediaSchema),
]);

function optionalCatalogFields(raw: {
  originalTitle?: string | null;
  releaseYear?: number | null;
  posterUrl?: string | null;
}): Pick<MediaObjectSummary, "originalTitle" | "releaseYear" | "posterUrl"> {
  const fields: Pick<MediaObjectSummary, "originalTitle" | "releaseYear" | "posterUrl"> =
    {};
  const originalTitle = raw.originalTitle?.trim();
  if (originalTitle) fields.originalTitle = originalTitle;
  if (typeof raw.releaseYear === "number") fields.releaseYear = raw.releaseYear;
  const posterUrl = safeHttpsUrl(raw.posterUrl ?? undefined);
  if (posterUrl) fields.posterUrl = posterUrl;
  return fields;
}

function toMediaSummary(raw: z.infer<typeof mediaObjectSchema>): MediaObjectSummary {
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type,
    ...optionalCatalogFields(raw),
  };
}

function toCatalogMediaSummary(
  raw: z.infer<typeof catalogMediaSchema>,
): CatalogMediaObject | null {
  const type = raw.type ?? raw.primaryType;
  if (!type) return null;
  return {
    id: raw.id,
    title: raw.title,
    type,
    info: raw.info,
    ...optionalCatalogFields({ ...raw, releaseYear: raw.info.releaseYear }),
  };
}

function mapAuthor(
  author: z.infer<typeof authorSchema>,
  itemIsFollowing?: boolean | null,
): RemoteReviewAuthor {
  const photoUrl = safeHttpsUrl(author.photoUrl ?? undefined);
  const avatarFrame = parseShopCode(author.avatarFrame ?? undefined);
  const backdrop = parseShopCode(author.backdrop ?? undefined);
  return {
    id: author.id,
    username: author.username,
    isFollowing: itemIsFollowing ?? author.isFollowing,
    ...(photoUrl ? { photoUrl } : {}),
    ...(avatarFrame ? { avatarFrame } : {}),
    ...(backdrop ? { backdrop } : {}),
  };
}

function mapSummary(
  item: z.infer<typeof reviewSummarySchema> | z.infer<typeof reviewListItemSchema>,
) {
  const author = item.author ? mapAuthor(item.author, item.isFollowing) : undefined;

  return {
    id: item.id,
    authorId: item.authorId,
    ...(author ? { author } : {}),
    mediaObject: toMediaSummary(item.mediaObject),
    title: item.title,
    rating: Math.round(item.rating),
    status: item.status,
    hasSpoilers: item.hasSpoilers,
    likesCount: item.likesCount,
    dislikesCount: item.dislikesCount,
    viewsCount: item.viewsCount,
    ...(author
      ? { isFollowing: author.isFollowing }
      : item.isFollowing != null
        ? { isFollowing: item.isFollowing }
        : {}),
    ...(typeof item.viewerIsLike === "boolean"
      ? { viewerIsLike: item.viewerIsLike }
      : {}),
  };
}

export function parseRemoteReview(payload: unknown): RemoteReview {
  const parsed = reviewDetailSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  const summary = mapSummary(parsed.data);
  if (!summary.author) throw unexpectedResponseError();
  return {
    ...summary,
    author: summary.author,
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
  return {
    items: parsed.data.items.map(mapSummary),
    nextCursor: parsed.data.nextCursor ?? null,
  };
}

export function parseMediaObjectText(text: string): CatalogMediaObject {
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

export function parseMediaObjectsText(text: string): CatalogMediaObject[] {
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
    .filter((item): item is CatalogMediaObject => item !== null);
}

export function parseTopReviewsText(text: string): RemoteReviewList {
  const list = parseRemoteReviewListText(text);
  if (list.items.length > 5 || list.items.some((item) => item.status !== "published")) {
    throw unexpectedResponseError();
  }
  return { items: list.items };
}
