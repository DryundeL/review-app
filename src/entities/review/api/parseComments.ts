import { z } from "zod";
import { ApiError, unexpectedResponseError } from "../../../shared/api/errors.ts";
import { safeHttpsUrl } from "../../../shared/lib/safeHttpsUrl.ts";

const commentSchema = z.object({
  id: z.string().uuid(),
  reviewId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  author: z.object({
    id: z.string().uuid(),
    username: z.string(),
    photoUrl: z.string().nullish().transform(safeHttpsUrl),
  }),
  body: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  hasReplies: z.boolean(),
});
const pageSchema = z.object({
  items: z.array(commentSchema).max(50),
  nextCursor: z.string().min(1).nullable(),
});
export type RemoteComment = z.infer<typeof commentSchema>;
export type CommentPage = z.infer<typeof pageSchema>;

function parse<T>(schema: z.ZodType<T>, text: string): T {
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw unexpectedResponseError();
  }
}
export const parseCommentText = (text: string) => parse(commentSchema, text);
export const parseCommentsText = (text: string) => parse(pageSchema, text);

export function normalizeCommentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed || Array.from(trimmed).length > 2000) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Комментарий должен содержать от 1 до 2000 символов.",
    );
  }
  return trimmed;
}

export function mergeComments(pages: RemoteComment[][]): RemoteComment[] {
  return Array.from(new Map(pages.flat().map((item) => [item.id, item])).values());
}
