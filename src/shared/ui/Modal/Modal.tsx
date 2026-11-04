import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Drawer } from "vaul";
import { cn } from "@/shared/lib/cn";

const SNAP_COMPACT = 0.52;
const SNAP_EXPANDED = 0.92;
const SNAP_POINTS = [SNAP_COMPACT, SNAP_EXPANDED] as const;

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function serverDesktop() {
  return false;
}

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onOpenChange, title, children, className }: ModalProps) {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, serverDesktop);
  const [snap, setSnap] = useState<number | string | null>(SNAP_COMPACT);

  useEffect(() => {
    if (open) setSnap(SNAP_COMPACT);
  }, [open]);

  const rootProps: ComponentProps<typeof Drawer.Root> = desktop
    ? { open, onOpenChange, handleOnly: true, autoFocus: true, repositionInputs: false }
    : {
        open,
        onOpenChange,
        snapPoints: [...SNAP_POINTS],
        activeSnapPoint: snap,
        setActiveSnapPoint: setSnap,
        fadeFromIndex: 0,
        repositionInputs: false,
      };

  return (
    <Drawer.Root {...rootProps}>
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
