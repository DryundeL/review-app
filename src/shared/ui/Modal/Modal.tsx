import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onOpenChange, title, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-modal__overlay" />
        <Dialog.Content className={cn("ui-modal__content", className)}>
          <div className="ui-modal__handle" aria-hidden />
          <div className="ui-modal__head">
            <Dialog.Title className="ui-modal__title">{title}</Dialog.Title>
            <Dialog.Close className="ui-modal__close" aria-label="Закрыть">
              ×
            </Dialog.Close>
          </div>
          <div className="ui-modal__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
