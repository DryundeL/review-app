import { apiClient } from "@/shared/api";
import {
  parseContentPreferences,
  parseReviewTypes,
  validatePreferenceTypes,
} from "./parseContentPreferences";

export function fetchReviewTypes(signal?: AbortSignal) {
  return apiClient("/v1/review-types", { auth: false, signal, parse: parseReviewTypes });
}
export function fetchContentPreferences(signal?: AbortSignal) {
  return apiClient("/v1/content-preferences", { signal, parse: parseContentPreferences });
}
export function saveContentPreferences(types: string[], signal?: AbortSignal) {
  return apiClient("/v1/content-preferences", {
    method: "PUT",
    body: { types: validatePreferenceTypes(types) },
    signal,
    parse: parseContentPreferences,
  });
}
