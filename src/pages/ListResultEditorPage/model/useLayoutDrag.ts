import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import type { GroupKey } from "@/entities/list";
import { insertionIndex, type Box, type DropTarget } from "./dragDrop";

/** Атрибуты разметки, по которым хук находит цели и плитки. */
export const DROP_GROUP_ATTR = "data-drop-group";
export const DRAG_ITEM_ATTR = "data-drag-item";
const UNPLACED = "unplaced";
const LIST = "list";

export function dropGroupValue(group: GroupKey | "unplaced"): string {
  if (group === "unplaced") return UNPLACED;
  return group === null ? LIST : `tier:${group}`;
}

function parseDropGroup(
  value: string,
): DropTarget | { kind: "group"; group: GroupKey } | null {
  if (value === UNPLACED) return { kind: "unplace" };
  if (value === LIST) return { kind: "group", group: null };
  if (value.startsWith("tier:")) return { kind: "group", group: value.slice(5) };
  return null;
}

const MOUSE_THRESHOLD = 4;
const TOUCH_SLOP = 8;
const LONG_PRESS_MS = 250;
const EDGE = 64;
const MAX_SCROLL_STEP = 14;

export type DragState = {
  itemId: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  target: DropTarget | null;
};

type Pending = {
  itemId: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  rect: DOMRect;
  timer?: ReturnType<typeof setTimeout>;
};

type Options = {
  rootRef: RefObject<HTMLElement | null>;
  disabled: boolean;
  onDrop: (itemId: string, target: DropTarget) => void;
};

/**
 * Перетаскивание плиток на Pointer Events без библиотек.
 * Мышь: перетаскивание начинается после сдвига на несколько пикселей.
 * Палец: после удержания ~250 мс, чтобы обычный свайп оставался прокруткой.
 */
export function useLayoutDrag({ rootRef, disabled, onDrop }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const update = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const findTarget = useCallback(
    (itemId: string, x: number, y: number): DropTarget | null => {
      const root = rootRef.current;
      const hit = document.elementFromPoint(x, y);
      if (!root || !hit || !root.contains(hit)) return null;
      const container = hit.closest<HTMLElement>(`[${DROP_GROUP_ATTR}]`);
      const value = container?.getAttribute(DROP_GROUP_ATTR);
      const parsed = value ? parseDropGroup(value) : null;
      if (!container || !parsed) return null;
      if (parsed.kind === "unplace") return parsed;
      const boxes: Box[] = [];
      container.querySelectorAll<HTMLElement>(`[${DRAG_ITEM_ATTR}]`).forEach((el) => {
        if (el.getAttribute(DRAG_ITEM_ATTR) !== itemId)
          boxes.push(el.getBoundingClientRect());
      });
      return { kind: "group", group: parsed.group, index: insertionIndex(boxes, x, y) };
    },
    [rootRef],
  );

  const moveTo = useCallback(
    (x: number, y: number) => {
      const current = dragRef.current;
      if (!current) return;
      update({ ...current, x, y, target: findTarget(current.itemId, x, y) });
    },
    [findTarget, update],
  );

  // Пока идёт перетаскивание пальцем, страница не должна прокручиваться. Слушатель
  // непассивный, поэтому вешается только на время касания, а не на всю страницу.
  const touchGuardRef = useRef<((event: TouchEvent) => void) | null>(null);
  const attachTouchGuard = useCallback(() => {
    if (touchGuardRef.current) return;
    const guard = (event: TouchEvent) => {
      if (dragRef.current) event.preventDefault();
    };
    touchGuardRef.current = guard;
    window.addEventListener("touchmove", guard, { passive: false });
  }, []);
  const detachTouchGuard = useCallback(() => {
    if (!touchGuardRef.current) return;
    window.removeEventListener("touchmove", touchGuardRef.current);
    touchGuardRef.current = null;
  }, []);

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending?.timer) clearTimeout(pending.timer);
    pendingRef.current = null;
  }, []);

  const begin = useCallback(
    (pending: Pending, x: number, y: number) => {
      clearPending();
      update({
        itemId: pending.itemId,
        x,
        y,
        offsetX: pending.startX - pending.rect.left,
        offsetY: pending.startY - pending.rect.top,
        width: pending.rect.width,
        target: findTarget(pending.itemId, x, y),
      });
      if (pending.pointerType !== "mouse") navigator.vibrate?.(10);
    },
    [clearPending, findTarget, update],
  );

  const onPointerDown = useCallback(
    (itemId: string, event: PointerEvent<HTMLElement>) => {
      if (disabled || dragRef.current || !event.isPrimary || event.button !== 0) return;
      const pending: Pending = {
        itemId,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        rect: event.currentTarget.getBoundingClientRect(),
      };
      if (event.pointerType !== "mouse") {
        attachTouchGuard();
        pending.timer = setTimeout(() => {
          if (pendingRef.current === pending)
            begin(pending, pending.startX, pending.startY);
        }, LONG_PRESS_MS);
      }
      pendingRef.current = pending;
    },
    [attachTouchGuard, begin, disabled],
  );

  const active = drag !== null;

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const pending = pendingRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        const distance = Math.hypot(
          event.clientX - pending.startX,
          event.clientY - pending.startY,
        );
        if (pending.pointerType === "mouse") {
          if (distance >= MOUSE_THRESHOLD) begin(pending, event.clientX, event.clientY);
        } else if (distance > TOUCH_SLOP) {
          // Палец сдвинулся до долгого нажатия — это прокрутка, не перетаскивание.
          clearPending();
          detachTouchGuard();
        }
        return;
      }
      if (dragRef.current) moveTo(event.clientX, event.clientY);
    };

    const suppressNextClick = () => {
      const stop = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    };

    const onUp = (event: globalThis.PointerEvent) => {
      clearPending();
      detachTouchGuard();
      const current = dragRef.current;
      if (!current) return;
      update(null);
      suppressNextClick();
      const target =
        findTarget(current.itemId, event.clientX, event.clientY) ?? current.target;
      if (target) onDropRef.current(current.itemId, target);
    };

    const onCancel = () => {
      clearPending();
      detachTouchGuard();
      if (dragRef.current) update(null);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dragRef.current) onCancel();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, [begin, clearPending, detachTouchGuard, findTarget, moveTo, update]);

  // Автопрокрутка у краёв окна.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      const current = dragRef.current;
      if (current) {
        const { y } = current;
        let step = 0;
        if (y < EDGE) step = -Math.ceil(((EDGE - y) / EDGE) * MAX_SCROLL_STEP);
        else if (y > window.innerHeight - EDGE)
          step = Math.ceil(((y - (window.innerHeight - EDGE)) / EDGE) * MAX_SCROLL_STEP);
        if (step !== 0) {
          window.scrollBy(0, step);
          moveTo(current.x, current.y);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, moveTo]);

  // Блокировка редактора (сохранение, публикация) прерывает перетаскивание.
  useEffect(() => {
    if (!disabled) return;
    clearPending();
    detachTouchGuard();
    if (dragRef.current) update(null);
  }, [disabled, clearPending, detachTouchGuard, update]);

  useEffect(
    () => () => {
      clearPending();
      detachTouchGuard();
    },
    [clearPending, detachTouchGuard],
  );

  return { drag, onPointerDown };
}
