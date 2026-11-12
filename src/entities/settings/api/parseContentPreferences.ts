import { z } from "zod";
import { unexpectedResponseError, ApiError } from "../../../shared/api/errors.ts";
import { storageImageUrl } from "../../../shared/lib/storageImageUrl.ts";

const codeSchema = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
const typesSchema = z
  .array(codeSchema)
  .max(32)
  .refine((types) => new Set(types).size === types.length);
const preferencesSchema = z.object({ types: typesSchema, needsOnboarding: z.boolean() });
const dictionarySchema = z.object({
  items: z
    .array(
      z.object({
        code: codeSchema,
        imageUrl: z.string().nullish().transform(storageImageUrl),
        label: z.string().min(1),
        sortOrder: z.number().int(),
      }),
    )
    .refine((items) => new Set(items.map((item) => item.code)).size === items.length),
});
export type ContentPreferences = z.infer<typeof preferencesSchema>;
export type ReviewType = z.infer<typeof dictionarySchema>["items"][number];

function parse<T>(text: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw unexpectedResponseError();
  }
}
export function parseContentPreferences(text: string): ContentPreferences {
  return parse(text, preferencesSchema);
}
export function parseReviewTypes(text: string): ReviewType[] {
  return parse(text, dictionarySchema).items;
}
export function validatePreferenceTypes(types: string[]): string[] {
  const parsed = typesSchema.safeParse(types);
  if (!parsed.success || parsed.data.length === 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Выберите от 1 до 32 типов контента.");
  }
  return parsed.data;
}
