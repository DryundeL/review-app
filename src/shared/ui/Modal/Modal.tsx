import { useSyncExternalStore, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { cn } from "@/shared/lib/cn";

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
  const Window = desktop ? Dialog : Drawer;
  const drawerProps = desktop
    ? {}
    : {
        repositionInputs: false,
      };

  return (
    <Window.Root open={open} onOpenChange={onOpenChange} {...drawerProps}>
      <Window.Portal>
        <Window.Overlay
          className={cn("ui-modal__overlay", desktop && "ui-modal__overlay--dialog")}
        />
        <Window.Content
          className={cn(
            "ui-modal__content",
            desktop ? "ui-modal__content--dialog" : "ui-modal__content--drawer",
            className,
          )}
          aria-describedby={undefined}
        >
          {!desktop && <div className="ui-modal__handle" aria-hidden />}
          <div className="ui-modal__head">
            <Window.Title className="ui-modal__title">{title}</Window.Title>
            <Window.Close className="ui-modal__close" aria-label="Закрыть">
              ×
            </Window.Close>
          </div>
          <div className="ui-modal__body" data-vaul-no-drag={desktop ? undefined : ""}>
            {children}
          </div>
        </Window.Content>
      </Window.Portal>
    </Window.Root>
  );
}
