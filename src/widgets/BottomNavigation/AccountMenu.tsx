import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import type { SessionProfile } from "@/entities/user";
import { UserAvatar } from "@/shared/ui";
import "./AccountMenu.css";

const ITEMS = [
  { to: "/profile", label: "Профиль" },
  { to: "/achievements", label: "Достижения" },
  { to: "/shop", label: "Магазин" },
  { to: "/settings", label: "Настройки" },
] as const;

const GAP = 8;
const EDGE = 12;
const MIN_WIDTH = 220;

/** Пути, при которых сам триггер подсвечен как активный пункт меню. */
const ACCOUNT_PATHS = new Set<string>(ITEMS.map((item) => item.to));

/**
 * Аккаунт внизу бокового меню (только ПК): профиль и редкие разделы
 * собраны в выпадающий список, чтобы основное меню было короче.
 */
export function AccountMenu({ profile }: { profile: SessionProfile }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const display =
    profile.firstName.trim() || (profile.username ? `@${profile.username}` : "Профиль");
  const handle = profile.username ? `@${profile.username}` : null;

  // Смена страницы закрывает меню.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (open) setOpen(false);
  }

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(
        Math.max(rect.width, MIN_WIDTH),
        window.innerWidth - rect.left - EDGE,
      );
      setPosition({
        left: rect.left,
        bottom: Math.max(EDGE, window.innerHeight - rect.top + GAP),
        width,
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open || !position) return;
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus({
      preventScroll: true,
    });
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      close(false);
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []),
    ];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(current + step + items.length) % items.length]?.focus();
  }

  return (
    <div className="account-menu">
      <button
        ref={triggerRef}
        type="button"
        className={[
          "account-menu__trigger",
          ACCOUNT_PATHS.has(pathname) ? "account-menu__trigger--active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Аккаунт: ${display}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <UserAvatar
          className="account-menu__avatar"
          label={display}
          photoUrl={profile.photoUrl}
          frameUrl={profile.avatarFrame}
        />
        <span className="account-menu__text">
          <span className="account-menu__name">{display}</span>
          {handle ? <span className="account-menu__handle">{handle}</span> : null}
        </span>
        <svg className="account-menu__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 14 5-5 5 5" />
        </svg>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="account-menu__list"
              role="menu"
              aria-label="Аккаунт"
              style={position ?? { visibility: "hidden" }}
              onKeyDown={onMenuKeyDown}
            >
              {ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  role="menuitem"
                  className={({ isActive }) =>
                    `account-menu__item${isActive ? " account-menu__item--active" : ""}`
                  }
                  onClick={() => close(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
