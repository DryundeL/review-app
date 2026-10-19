import { apiClient, ApiError } from "@/shared/api";
import type { ReportReasonsList, ReviewReport } from "../model/types";
import { parseReportReasonsText, parseReviewReportText } from "./parseReports";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASON_CODE = /^[a-z0-9_]{1,64}$/i;

/** Fallback, если GET /report-reasons недоступен. */
export const FALLBACK_REPORT_REASONS: ReportReasonsList = {
  items: [
    { code: "spam", label: "Спам" },
    { code: "abuse", label: "Оскорбления / токсичность" },
    { code: "spoiler", label: "Спойлеры без предупреждения" },
    { code: "wrong_title", label: "Неверный тайтл / обман" },
    { code: "illegal", label: "Запрещённый контент" },
    { code: "other", label: "Другое" },
  ],
};

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

function assertReasonCode(value: string): string {
  const code = value.trim();
  if (!REASON_CODE.test(code)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Выберите причину жалобы.");
  }
  return code;
}

export function listReportReasons(signal?: AbortSignal): Promise<ReportReasonsList> {
  return apiClient("/v1/report-reasons", {
    method: "GET",
    auth: false,
    signal,
    parse: parseReportReasonsText,
  });
}

export function createReviewReport(
  reviewId: string,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<ReviewReport> {
  return apiClient(`/v1/reviews/${assertUuid(reviewId)}/reports`, {
    method: "POST",
    body: { reasonCode: assertReasonCode(reasonCode) },
    signal,
    parse: parseReviewReportText,
  });
}
