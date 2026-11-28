import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { SessionProfile } from "@/entities/user";
import { UserAvatar } from "@/shared/ui";
import { MenuIcon } from "./CreateMenu";
import { LiquidMenu, type LiquidMenuOption } from "./LiquidMenu";
import "./AccountMenu.css";

// Порядок — от кнопки: «Профиль» ближе всех.
const OPTIONS: readonly LiquidMenuOption[] = [
  {
    to: "/profile",
    tone: "accent",
    title: "Профиль",
    text: "Обзоры, топы, подписки",
    icon: (
      <MenuIcon>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19.5a7 7 0 0 1 14 0" />
      </MenuIcon>
    ),
  },
  {
    to: "/achievements",
    tone: "gold",
    title: "Достижения",
    text: "Награды и прогресс",
    icon: (
      <MenuIcon>
        <circle cx="12" cy="8" r="5" />
        <path d="m8 12-2 9 6-3 6 3-2-9" />
      </MenuIcon>
    ),
  },
  {
    to: "/shop",
    tone: "gold",
    title: "Магазин",
    text: "Рамки, фоны и подложки",
    icon: (
      <MenuIcon>
        <path d="M4 8h16l-1 13H5L4 8Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </MenuIcon>
    ),
  },
  {
    to: "/settings",
    tone: "plain",
    title: "Настройки",
    text: "Аккаунт и приватность",
    icon: (
      <MenuIcon>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <path d="M8 3v6M16 9v6M10 15v6" />
      </MenuIcon>
    ),
  },
];

/** Пути, при которых сам триггер подсвечен как активный. */
const ACCOUNT_PATHS = new Set<string>(OPTIONS.map((item) => item.to));

/**
 * Аккаунт внизу бокового меню (только ПК): профиль и редкие разделы
 * вытекают из кнопки каплями — так же, как варианты у «Добавить».
 */
export function AccountMenu({ profile }: { profile: SessionProfile }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const display =
    profile.firstName.trim() || (profile.username ? `@${profile.username}` : "Профиль");
  const handle = profile.username ? `@${profile.username}` : null;

  // Переход на другую страницу (в том числе «назад») закрывает меню.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (open) setOpen(false);
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
          <path d="m10 7 5 5-5 5" />
        </svg>
      </button>
      <LiquidMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        options={OPTIONS}
        label="Аккаунт"
      />
    </div>
  );
}
