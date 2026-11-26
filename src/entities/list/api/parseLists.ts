import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { storageImageUrl } from "../../../shared/lib/storageImageUrl.ts";
import type {
  ListPage,
  ListReport,
  Result,
  Template,
} from "../model/types.ts";

/** Невалидный URL картинки отбрасывается (поле становится undefined), а не ломает ответ. */
const imageUrlSchema = z
  .unknown()
  .optional()
  .transform((value) => storageImageUrl(value));

const formatSchema = z.enum(["tiers", "ranked", "collection"]);
const idSchema = z.string().min(1).max(64);

const authorSchema = z.object({
  id: idSchema,
  username: z.string().max(128),
  photoUrl: imageUrlSchema,
});

const tierSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const itemSchema = z.object({
  id: idSchema,
  title: z.string().max(150),
  mediaObjectId: idSchema.optional(),
  imageUrl: imageUrlSchema,
  imageId: idSchema.optional(),
});

const entrySchema = z.object({
  itemId: idSchema,
  tierId: idSchema.optional(),
  position: z.number().int().positive(),
});

const ownerFields = {
  revision: z.number().int().nonnegative().optional(),
  status: z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
  moderation: z.literal("hidden").optional(),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),
};

const common = {
  id: idSchema,
  typeCode: z.string().min(1).max(64),
  format: formatSchema,
  title: z.string().max(150),
  description: z.string().max(2000),
  coverUrl: imageUrlSchema,
  author: authorSchema,
  firstPublishedAt: z.string().min(1).optional(),
};

const templateSchema = z.object({
  ...common,
  ...ownerFields,
  tiers: z.array(tierSchema).max(10),
  items: z.array(itemSchema).max(50),
  canCreateResult: z.boolean(),
});

const resultSchema = z.object({
  ...common,
  ...ownerFields,
  template: z.object({
    id: idSchema.optional(),
    title: z.string().max(150),
    author: authorSchema.optional(),
  }),
  canCreateOwn: z.boolean(),
  tiers: z.array(tierSchema).max(10),
  items: z.array(itemSchema).max(50),
  entries: z.array(entrySchema).max(50),
});

const cardSchema = z.object({
  id: idSchema,
  title: z.string().max(150),
  typeCode: z.string().min(1).max(64),
  format: formatSchema,
  coverUrl: imageUrlSchema,
  author: authorSchema,
  firstPublishedAt: z.string().min(1).optional(),
  templateTitle: z.string().max(150).optional(),
  status: ownerFields.status,
  visibility: ownerFields.visibility,
  moderation: ownerFields.moderation,
  updatedAt: ownerFields.updatedAt,
});

const pageSchema = z.object({
  items: z.array(cardSchema),
  nextCursor: z.string().min(1).optional(),
});

const reportSchema = z.object({
  id: idSchema,
  target: z.enum(["template", "result"]),
  targetId: idSchema,
  reasonCode: z.string().min(1).max(64),
  status: z.string().min(1).max(32),
  createdAt: z.string().min(1),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

function parseWith<T>(schema: z.ZodType<T>, text: string): T {
  const parsed = schema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseTemplateText(text: string): Template {
  return parseWith(templateSchema, text);
}

export function parseResultText(text: string): Result {
  return parseWith(resultSchema, text);
}

export function parseListPageText(text: string): ListPage {
  return parseWith(pageSchema, text);
}

export function parseListReportText(text: string): ListReport {
  return parseWith(reportSchema, text);
}

/** Автору API отдаёт `revision`; гостю и не-автору — нет. */
export function isOwnerView(obj: { revision?: number }): boolean {
  return obj.revision !== undefined;
}
