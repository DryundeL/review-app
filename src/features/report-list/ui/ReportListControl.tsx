import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportList, type ListKind } from "@/entities/list";
import { useAuthSession } from "@/features/auth";
import { FALLBACK_REPORT_REASONS, listReportReasons } from "@/features/report-review";
import { ApiError } from "@/shared/api";
import { Button, Modal } from "@/shared/ui";
import "./ReportListControl.css";

type ReportListControlProps = {
  kind: ListKind;
  id: string;
};

export function ReportListControl({ kind, id }: ReportListControlProps) {
  const { profile } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const reasonsQuery = useQuery({
    queryKey: ["report-reasons"],
    queryFn: ({ signal }) => listReportReasons(signal),
    enabled: open && Boolean(profile),
    staleTime: 60_000,
    retry: false,
  });

  const reasons = reasonsQuery.data?.items.length
    ? reasonsQuery.data.items
    : FALLBACK_REPORT_REASONS.items;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!reasonCode && reasons[0]) setReasonCode(reasons[0].code);
  }, [open, reasonCode, reasons]);

  const reportMutation = useMutation({
    mutationFn: () => reportList(kind, id, reasonCode),
    onSuccess: () => {
      setAlreadyReported(true);
      setError(null);
      setOpen(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && err.code === "ALREADY_REPORTED") {
        setAlreadyReported(true);
        setError(null);
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
        setOpen(false);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Не удалось отправить жалобу");
    },
  });

  if (forbidden) return null;

  return (
    <>
      <button
        type="button"
        className="report-list__trigger"
        aria-label="Пожаловаться"
        onClick={() => setOpen(true)}
      >
        <WarningTriangleIcon />
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Пожаловаться">
        {!profile ? (
          <>
            <p className="report-list__hint">Войдите, чтобы отправить жалобу.</p>
            <Button asChild>
              <Link to="/profile">Войти</Link>
            </Button>
          </>
        ) : alreadyReported ? (
          <>
            <p className="report-list__hint" role="status">
              Жалоба уже отправлена
            </p>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Понятно
            </Button>
          </>
        ) : (
          <>
            <p className="report-list__hint">Выберите причину. Жалоба анонимна для автора.</p>
            <label className="report-list__select">
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
              <span className="report-list__select-face" aria-hidden>
                {reasons.find((item) => item.code === reasonCode)?.label ?? "Выберите причину"}
              </span>
            </label>
            {error ? (
              <p className="report-list__error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="report-list__actions">
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
      <path d="M10 7.4v4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.2" r="1" fill="currentColor" />
    </svg>
  );
}
