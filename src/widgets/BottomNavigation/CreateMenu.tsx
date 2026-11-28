import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "./CreateMenu.css";

type CreateMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Кнопка «+»: из неё «вытекают» варианты и в неё же возвращается фокус. */
  anchorRef: RefObject<HTMLElement | null>;
};

// Порядок — от кнопки: первый вариант ближе всех к «+».
const OPTIONS = [
  {
    to: "/create",
    icon: "review",
    title: "Обзор",
    text: "Оценка и рецензия",
  },
  {
    to: "/lists?tab=templates",
    icon: "top",
    title: "Топ",
    text: "Тир-лист, рейтинг, подборка",
  },
  {
    to: "/my-lists?create=template",
    icon: "template",
    title: "Шаблон",
    text: "Свой набор для топов",
  },
] as const;

const GAP = 12;
const EDGE = 12;
const MAX_WIDTH = 280;
/** Совпадает с брейкпоинтом в CreateMenu.css. */
const DESKTOP_QUERY = "(min-width: 768px)";
/** Длительность «втягивания» обратно: не меньше самой долгой CSS-анимации закрытия (ПК). */
const CLOSE_MS = 420;

type Placement = {
  /** Колонка вариантов: на телефоне — над кнопкой, на ПК — справа от неё. */
  menu: CSSProperties;
  /** Центр кнопки в координатах окна — точка, откуда течёт стекло. */
  originX: number;
  originY: number;
};

function measure(anchor: HTMLElement): Placement {
  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let menu: CSSProperties;
  if (window.matchMedia(DESKTOP_QUERY).matches) {
    // ПК: колонка справа от кнопки, нижний край — вровень с кнопкой.
    const left = rect.right + GAP;
    const width = Math.max(0, Math.min(MAX_WIDTH, vw - left - EDGE));
    menu = { left, bottom: Math.max(EDGE, vh - rect.bottom), width };
  } else {
    // Телефон: колонка над кнопкой, по ближнему к ней краю экрана.
    const alignRight = rect.left + rect.width / 2 > vw / 2;
    const width = Math.min(MAX_WIDTH, vw - EDGE * 2, Math.max(rect.width, 260));
    const bottom = vh - rect.top + GAP;
    menu = alignRight
      ? { right: Math.max(EDGE, vw - rect.right), bottom, width }
      : { left: Math.max(EDGE, rect.left), bottom, width };
  }
  return {
    menu,
    originX: rect.left + rect.width / 2,
    originY: rect.top + rect.height / 2,
  };
}

/**
 * Меню «Что добавить»: варианты вытекают из кнопки «+» каплями жидкого стекла
 * и втягиваются обратно при закрытии.
 */
export function CreateMenu({ open, onClose, anchorRef }: CreateMenuProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  /** Смещение каждой капли от её места до центра кнопки. */
  const [offsets, setOffsets] = useState<{ dx: number; dy: number }[]>([]);
  /**
   * Капли встали на место. Только тогда включаем размытие стекла:
   * backdrop-filter на движущемся слое пересчитывается каждый кадр и даёт лаги.
   */
  const [settled, setSettled] = useState(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Монтируем при открытии; при закрытии ждём анимацию втягивания.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    setSettled(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setOffsets([]);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (anchor) setPlacement(measure(anchor));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!mounted) return;
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [mounted, place]);

  // Смещение каждой капли от её места до центра кнопки — старт и финиш анимации.
  useLayoutEffect(() => {
    if (!mounted || !placement) return;
    setOffsets(
      OPTIONS.map((_, index) => {
        const rect = itemRefs.current[index]?.getBoundingClientRect();
        if (!rect) return { dx: 0, dy: 0 };
        return {
          dx: placement.originX - (rect.left + rect.width / 2),
          dy: placement.originY - (rect.top + rect.height / 2),
        };
      }),
    );
  }, [mounted, placement]);

  // Фокус на ближайший вариант после открытия.
  useEffect(() => {
    if (open && offsets.length > 0) itemRefs.current[0]?.focus({ preventScroll: true });
  }, [open, offsets.length]);

  const ready = offsets.length === OPTIONS.length && placement !== null;
  const state = closing ? "closing" : ready ? "open" : "measuring";
  // Последней встаёт самая дальняя капля.
  const lastIndex = OPTIONS.length - 1;

  // Без анимаций (reduced motion) animationend не придёт — стекло «встало» сразу.
  useEffect(() => {
    if (state === "open" && prefersReducedMotion()) setSettled(true);
  }, [state]);

  const closeAndReturnFocus = useCallback(() => {
    onClose();
    anchorRef.current?.focus({ preventScroll: true });
  }, [onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndReturnFocus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeAndReturnFocus]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const items = itemRefs.current.filter(Boolean) as HTMLAnchorElement[];
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    // Варианты идут снизу вверх от кнопки: «вверх» — к следующему.
    const step = event.key === "ArrowUp" ? 1 : -1;
    const next = (current + step + items.length) % items.length;
    items[next]?.focus();
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="create-menu" data-state={state} data-settled={settled || undefined}>
      <div className="create-menu__scrim" aria-hidden="true" onClick={closeAndReturnFocus} />

      <div
        className="create-menu__list"
        role="menu"
        aria-label="Что добавить"
        style={placement?.menu}
        onKeyDown={onMenuKeyDown}
        onAnimationEnd={(event) => {
          if (state === "open" && event.target === itemRefs.current[lastIndex]) setSettled(true);
        }}
      >
        {OPTIONS.map((option, index) => (
          <Link
            key={option.to}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            role="menuitem"
            to={option.to}
            className={`create-menu__drop create-menu__drop--${option.icon}`}
            tabIndex={closing ? -1 : 0}
            style={
              {
                "--dx": `${offsets[index]?.dx ?? 0}px`,
                "--dy": `${offsets[index]?.dy ?? 0}px`,
                "--i": index,
              } as CSSProperties
            }
            onClick={onClose}
          >
            <span className="create-menu__icon">
              <OptionIcon name={option.icon} />
            </span>
            <span className="create-menu__text">
              <span className="create-menu__title">{option.title}</span>
              <span className="create-menu__hint">{option.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function OptionIcon({ name }: { name: (typeof OPTIONS)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {name === "review" ? (
        <>
          <path d="M5 4h10l4 4v12H5z" />
          <path d="M15 4v4h4M8.5 12h7M8.5 16h5" />
        </>
      ) : null}
      {name === "top" ? (
        <>
          <rect x="3.5" y="4" width="4" height="4" rx="1" />
          <rect x="3.5" y="10" width="4" height="4" rx="1" />
          <rect x="3.5" y="16" width="4" height="4" rx="1" />
          <path d="M10.5 6h10M10.5 12h7M10.5 18h4" />
        </>
      ) : null}
      {name === "template" ? (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <path d="M16.5 13.5v6M13.5 16.5h6" />
        </>
      ) : null}
    </svg>
  );
}
