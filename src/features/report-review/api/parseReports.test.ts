import assert from "node:assert/strict";
import test from "node:test";
import { parseReportReasonsText, parseReviewReportText } from "./parseReports.ts";

test("parseReportReasonsText accepts items", () => {
  const list = parseReportReasonsText(
    JSON.stringify({
      items: [
        { code: "spam", label: "Спам" },
        { code: "other", label: "Другое" },
      ],
    }),
  );
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0]?.code, "spam");
});

test("parseReportReasonsText rejects broken json", () => {
  assert.throws(() => parseReportReasonsText("{"), (error: Error) => error.name === "ApiError");
});

test("parseReviewReportText accepts payload", () => {
  const report = parseReviewReportText(
    JSON.stringify({
      id: "11111111-1111-4111-8111-111111111111",
      reviewId: "22222222-2222-4222-8222-222222222222",
      reasonCode: "spam",
      createdAt: "2026-10-19T20:00:00Z",
    }),
  );
  assert.equal(report.reasonCode, "spam");
});
