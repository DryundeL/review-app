import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api";
import { Button, Modal } from "@/shared/ui";
import {
  createReviewReport,
  FALLBACK_REPORT_REASONS,
  listReportReasons,
} from "../api/reportsApi";
import "./ReportReviewControl.css";

type ReportReviewControlProps = {
  reviewId: string;
};

export function ReportReviewControl({ reviewId }: ReportReviewControlProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const reasonsQuery = useQuery({
    queryKey: ["report-reasons"],
    queryFn: ({ signal }) => listReportReasons(signal),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  const reasons =
    reasonsQuery.data?.items.length
      ? reasonsQuery.data.items
      : FALLBACK_REPORT_REASONS.items;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!reasonCode && reasons[0]) {
      setReasonCode(reasons[0].code);
    }
  }, [open, reasonCode, reasons]);

  const reportMutation = useMutation({
    mutationFn: () => createReviewReport(reviewId, reasonCode),
    onSuccess: async () => {
      setAlreadyReported(true);
      setError(null);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && err.code === "ALREADY_REPORTED") {
        setAlreadyReported(true);
        setError("Вы уже отправляли жалобу");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError("Нельзя жаловаться на свой обзор");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Не удалось отправить жалобу");
    },
  });

  return (
    <>
      <button
        type="button"
        className="report-review__trigger"
        aria-label="Пожаловаться на обзор"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <WarningTriangleIcon />
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Пожаловаться">
        {alreadyReported ? (
          <>
            <p className="report-review__hint" role="status">
              Вы уже отправляли жалобу на этот обзор.
            </p>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Понятно
            </Button>
          </>
        ) : (
          <>
            <p className="report-review__hint">Выберите причину — жалоба анонимна для автора.</p>

            <label className="report-review__select">
              <span className="sr-only">Причина жалобы</span>
              <select
                value={reasonCode}
                aria-label="Причина жалобы"
                disabled={reportMutation.isPending}
                onChange={(event) => {
                  setReasonCode(event.target.value);
                  setError(null);
                }}
              >
                {reasons.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="report-review__select-face" aria-hidden>
                {reasons.find((item) => item.code === reasonCode)?.label ?? "Выберите причину"}
                <SelectCaret />
              </span>
            </label>

            {error ? (
              <p className="report-review__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="report-review__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={reportMutation.isPending}
                onClick={() => setOpen(false)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                disabled={reportMutation.isPending || !reasonCode}
                onClick={() => reportMutation.mutate()}
              >
                Отправить
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function WarningTriangleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable="false">
      <path
        d="M10 2.4 18.2 16.6H1.8L10 2.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.4v4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14.2" r="1" fill="currentColor" />
    </svg>
  );
}

function SelectCaret() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden focusable="false">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
