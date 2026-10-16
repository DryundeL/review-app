import { stripAngleBrackets } from "@/shared/lib/spoilerText";
import type { CreateReviewInput, ReviewStatus } from "@/entities/review";

export type DraftBlock = {
  key: string;
  title: string;
  body: string;
};

export type ReviewDraft = {
  mediaObjectId: string;
  title: string;
  rating: number;
  blocks: DraftBlock[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeText(value: string, max: number): string {
  return stripAngleBrackets(value).trim().slice(0, max);
}

export function toCreatePayload(
  draft: ReviewDraft,
  status: ReviewStatus,
): { ok: true; payload: CreateReviewInput } | { ok: false; message: string } {
  if (!UUID.test(draft.mediaObjectId)) {
    return { ok: false, message: "Выберите произведение из каталога." };
  }

  const title = sanitizeText(draft.title, 256);
  if (title.length < 1) {
    return { ok: false, message: "Укажите заголовок обзора." };
  }

  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 10) {
    return { ok: false, message: "Оценка должна быть от 1 до 10." };
  }

  if (draft.blocks.length > 10) {
    return { ok: false, message: "Максимум 10 блоков." };
  }

  const blocks: { title: string; body: string }[] = [];
  for (const block of draft.blocks) {
    const blockTitle = sanitizeText(block.title, 50);
    const body = sanitizeText(block.body, 256);
    if (blockTitle.length === 0 && body.length === 0) continue;
    if (blockTitle.length < 1) {
      return { ok: false, message: "У каждого блока нужен заголовок (до 50 символов)." };
    }
    if (body.length < 1) {
      return { ok: false, message: "Текст блока не может быть пустым." };
    }
    if (body.length > 256) {
      return { ok: false, message: "Текст блока длиннее 256 символов." };
    }
    blocks.push({ title: blockTitle, body });
  }

  if (status === "published" && blocks.length < 1) {
    return { ok: false, message: "Для публикации нужен хотя бы один блок." };
  }

  return {
    ok: true,
    payload: {
      mediaObjectId: draft.mediaObjectId,
      title,
      rating: draft.rating,
      status,
      blocks,
    },
  };
}
