import { useEffect, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/shared/lib/cn";

const SNAP_COMPACT = 0.52;
const SNAP_EXPANDED = 0.92;
const SNAP_POINTS = [SNAP_COMPACT, SNAP_EXPANDED] as const;

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onOpenChange, title, children, className }: ModalProps) {
  const [snap, setSnap] = useState<number | string | null>(SNAP_COMPACT);

  useEffect(() => {
    if (open) setSnap(SNAP_COMPACT);
  }, [open]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      fadeFromIndex={0}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="ui-modal__overlay" />
        <Drawer.Content className={cn("ui-modal__content", className)}>
          <div className="ui-modal__handle" aria-hidden />
          <div className="ui-modal__head">
            <Drawer.Title className="ui-modal__title">{title}</Drawer.Title>
            <Drawer.Close className="ui-modal__close" aria-label="Закрыть">
              ×
            </Drawer.Close>
          </div>
          <div className="ui-modal__body" data-vaul-no-drag="">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
