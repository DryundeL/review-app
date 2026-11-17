import {
  bodyHasText,
  reviewBodyText,
  unicodeLength,
} from "../../../shared/lib/reviewBody.ts";
import type { CreateReviewInput, ReviewStatus } from "@/entities/review";

export type ReviewDraft = CreateReviewInput;
export function toCreatePayload(
  draft: ReviewDraft,
  status: ReviewStatus,
):
  | { ok: true; payload: CreateReviewInput }
  | { ok: false; message: string; field: string } {
  const invalid = (field: string, message: string) => ({
    ok: false as const,
    field,
    message,
  });
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      draft.mediaObjectId,
    )
  )
    return invalid("mediaObjectId", "Выберите произведение из каталога.");
  if (unicodeLength(draft.title) > 256)
    return invalid("title", "Заголовок длиннее 256 символов.");
  if (/[<>]/.test(draft.title))
    return invalid("title", "Заголовок не должен содержать < или >.");
  if (
    draft.rating !== null &&
    (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 10)
  )
    return invalid("rating", "Оценка должна быть от 1 до 10.");
  if (unicodeLength(reviewBodyText(draft.body)) > 20_000)
    return invalid("body", "Текст длиннее 20 000 символов.");
  if (
    new TextEncoder().encode(
      JSON.stringify({ ...draft, revision: Number.MAX_SAFE_INTEGER }),
    ).length >
    256 * 1024
  )
    return invalid("body", "Размер запроса превышает 256 КБ. Упростите форматирование.");
  if (status === "published") {
    if (draft.rating === null) return invalid("rating", "Для публикации укажите оценку.");
    if (!bodyHasText(draft.body)) return invalid("body", "Для публикации нужен текст.");
  }
  return { ok: true, payload: { ...draft } };
}
