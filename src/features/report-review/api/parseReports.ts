import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import type { ReportReasonsList, ReviewReport } from "../model/types.ts";

const reasonSchema = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
});

const reasonsListSchema = z.object({
  items: z.array(reasonSchema),
});

const reportSchema = z.object({
  id: z.string().uuid(),
  reviewId: z.string().uuid(),
  reasonCode: z.string().min(1).max(64),
  createdAt: z.string().min(1),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

export function parseReportReasonsText(text: string): ReportReasonsList {
  const parsed = reasonsListSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseReviewReportText(text: string): ReviewReport {
  const parsed = reportSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}
