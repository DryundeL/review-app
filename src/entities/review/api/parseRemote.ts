import { cosmeticImageUrls } from "../../../shared/lib/cosmeticImageUrls.ts";
import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { displayImageUrl } from "../../../shared/lib/imageUrl.ts";
import { safeHttpsUrl } from "../../../shared/lib/safeHttpsUrl.ts";
import { MEDIA_TYPE_LABELS, type MediaType } from "../../../shared/types/media.ts";
import type {
  MediaObjectSummary,
  CatalogMediaObject,
  FeedItem,
  FeedPage,
  RemoteReview,
  ReviewEditorData,
  RemoteReviewAuthor,
  RemoteReviewList,
} from "../model/remote.ts";

const uuid = z.string().uuid();

const mediaTypeSchema = z.custom<MediaType>(
  (value) => typeof value === "string" && value in MEDIA_TYPE_LABELS,
);

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
  background: z.string().nullish(),
  avatarFrame: z.string().nullish(),
  backdrop: z.string().nullish(),
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
  title: z.string().refine((value) => Array.from(value).length <= 256),
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
  title: z.string().refine((value) => Array.from(value).length <= 256),
  rating: z.number().int().min(1).max(10).nullable(),
  status: z.enum(["draft", "published"]).optional().default("published"),
  hasUnpublishedChanges: z.boolean().optional().default(false),
  hasSpoilers: z.boolean().optional().default(false),
  likesCount: z.number().nonnegative().optional().default(0),
  dislikesCount: z.number().nonnegative().optional().default(0),
  viewsCount: z.number().nonnegative().optional().default(0),
  isFollowing: z.boolean().nullish(),
  viewerIsLike: z.boolean().nullish(),
});

const reviewDetailSchema = reviewSummarySchema.extend({
  body: z.string(),
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
  return {
    id: author.id,
    username: author.username,
    isFollowing: itemIsFollowing ?? author.isFollowing,
    ...cosmeticImageUrls(author),
    ...(photoUrl ? { photoUrl } : {}),
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
    rating: item.rating === null ? null : Math.round(item.rating),
    hasUnpublishedChanges:
      "hasUnpublishedChanges" in item ? item.hasUnpublishedChanges : false,
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
    body: parsed.data.body,
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

/** Топ в ленте: автор обязателен, у результата нет mediaObject и rating. */
const feedListItemSchema = z.object({
  kind: z.literal("list"),
  id: uuid,
  authorId: uuid,
  author: authorSchema,
  title: z.string().refine((value) => Array.from(value).length <= 256),
  isFollowing: z.boolean().nullish(),
  likesCount: z.number().int().nonnegative().optional().default(0),
  dislikesCount: z.number().int().nonnegative().optional().default(0),
  viewsCount: z.number().int().nonnegative().optional().default(0),
  viewerIsLike: z.boolean().nullish(),
  list: z.object({
    typeCode: z.string().min(1),
    format: z.enum(["tiers", "ranked", "collection"]),
    coverUrl: z.unknown().optional(),
    templateTitle: z.string().optional().default(""),
  }),
});

const feedPageSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable().optional(),
});

/**
 * Элемент ленты по kind. Без kind — обзор (старый бэкенд).
 * Неизвестный kind пропускаем: новые виды карточек не должны ломать ленту.
 * Битый элемент известного вида — ошибка ответа, как и раньше.
 */
function parseFeedItem(raw: unknown): FeedItem | null {
  const kind =
    typeof raw === "object" && raw !== null && "kind" in raw
      ? (raw as { kind: unknown }).kind
      : "review";
  if (kind === "review") {
    const parsed = reviewListItemSchema.safeParse(raw);
    if (!parsed.success) throw unexpectedResponseError();
    return { kind: "review", review: mapSummary(parsed.data) };
  }
  if (kind === "list") {
    const parsed = feedListItemSchema.safeParse(raw);
    if (!parsed.success) throw unexpectedResponseError();
    const item = parsed.data;
    const coverUrl = displayImageUrl(item.list.coverUrl);
    return {
      kind: "list",
      list: {
        id: item.id,
        authorId: item.authorId,
        author: mapAuthor(item.author, item.isFollowing),
        title: item.title,
        typeCode: item.list.typeCode,
        format: item.list.format,
        ...(coverUrl ? { coverUrl } : {}),
        templateTitle: item.list.templateTitle,
        likesCount: item.likesCount,
        dislikesCount: item.dislikesCount,
        viewsCount: item.viewsCount,
        ...(typeof item.viewerIsLike === "boolean"
          ? { viewerIsLike: item.viewerIsLike }
          : {}),
      },
    };
  }
  return null;
}

export function parseFeedText(text: string): FeedPage {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = feedPageSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  const items: FeedItem[] = [];
  for (const raw of parsed.data.items) {
    const item = parseFeedItem(raw);
    if (item) items.push(item);
  }
  return { items, nextCursor: parsed.data.nextCursor ?? null };
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

const editorSchema = z.object({
  id: uuid,
  mediaObject: mediaObjectSchema,
  status: z.enum(["draft", "published"]),
  title: z.string().refine((value) => Array.from(value).length <= 256),
  rating: z.number().int().min(1).max(10).nullable(),
  body: z.string(),
  revision: z.number().int().nonnegative(),
  hasUnpublishedChanges: z.boolean(),
  publishedAt: z.string().optional(),
});

export function parseReviewEditorText(text: string): ReviewEditorData {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = editorSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return { ...parsed.data, mediaObject: toMediaSummary(parsed.data.mediaObject) };
}
