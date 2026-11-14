import { z } from "zod";
import { apiClient, ApiError } from "@/shared/api";
import {
  normalizeCommentBody,
  parseCommentText,
  parseCommentsText,
} from "./parseComments";

function assertId(id: string): string {
  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Некорректный идентификатор комментария или обзора.",
    );
  }
  return id;
}
export function listComments(
  reviewId: string,
  parentId: string | null,
  cursor?: string,
  signal?: AbortSignal,
) {
  return apiClient(`/v1/reviews/${assertId(reviewId)}/comments`, {
    query: {
      limit: 20,
      parentId: parentId === null ? undefined : assertId(parentId),
      cursor,
    },
    signal,
    parse: parseCommentsText,
  });
}
export function createComment(reviewId: string, body: string, parentId: string | null) {
  return apiClient(`/v1/reviews/${assertId(reviewId)}/comments`, {
    method: "POST",
    body: {
      body: normalizeCommentBody(body),
      parentId: parentId === null ? null : assertId(parentId),
    },
    parse: parseCommentText,
  });
}
