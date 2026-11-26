import { Button, Modal } from "@/shared/ui";

type ConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  error: string | null;
  onReload: () => void;
  onOverwrite: () => void;
};

/** 409 REVISION_CONFLICT: шаблон изменили в другой вкладке или на другом устройстве. */
export function ConflictDialog({
  open,
  onOpenChange,
  busy,
  error,
  onReload,
  onOverwrite,
}: ConflictDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Шаблон изменился">
      <div className="template-editor__conflict">
        <p>
          Шаблон изменили в другой вкладке или на другом устройстве. Автосохранение
          остановлено, ваши правки на месте.
        </p>
        {error ? (
          <p className="template-editor__error" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={busy} onClick={onReload}>
          Загрузить актуальную версию
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onOverwrite}>
          Перезаписать своей
        </Button>
      </div>
    </Modal>
  );
}
