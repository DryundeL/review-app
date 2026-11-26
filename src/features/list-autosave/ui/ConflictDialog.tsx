import { Button, Modal } from "@/shared/ui";
import "./ConflictDialog.css";

type ConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  error: string | null;
  onReload: () => void;
  onOverwrite: () => void;
  title?: string;
  /** Код ошибки сессии: при REBASE_MISMATCH перезапись создала бы дубли строк. */
  errorCode?: string;
};

/** 409 REVISION_CONFLICT: объект изменили в другой вкладке или на другом устройстве. */
export function ConflictDialog({
  open,
  onOpenChange,
  busy,
  error,
  onReload,
  onOverwrite,
  title = "Объект изменился",
  errorCode,
}: ConflictDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="list-conflict">
        <p>
          Объект изменили в другой вкладке или на другом устройстве. Автосохранение
          остановлено, ваши правки на месте.
        </p>
        {error ? (
          <p className="list-conflict__error" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={busy} onClick={onReload}>
          Загрузить актуальную версию
        </Button>
        {errorCode === "REBASE_MISMATCH" ? null : (
          <Button variant="secondary" disabled={busy} onClick={onOverwrite}>
            Перезаписать своей
          </Button>
        )}
      </div>
    </Modal>
  );
}
