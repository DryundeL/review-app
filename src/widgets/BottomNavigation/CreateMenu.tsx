import type { RefObject } from "react";
import { LiquidMenu, type LiquidMenuOption } from "./LiquidMenu";

const OPTIONS: readonly LiquidMenuOption[] = [
  {
    to: "/create",
    tone: "accent",
    title: "Обзор",
    text: "Оценка и рецензия",
    icon: (
      <MenuIcon>
        <path d="M5 4h10l4 4v12H5z" />
        <path d="M15 4v4h4M8.5 12h7M8.5 16h5" />
      </MenuIcon>
    ),
  },
  {
    to: "/lists?tab=templates",
    tone: "gold",
    title: "Топ",
    text: "Тир-лист, рейтинг, подборка",
    icon: (
      <MenuIcon>
        <rect x="3.5" y="4" width="4" height="4" rx="1" />
        <rect x="3.5" y="10" width="4" height="4" rx="1" />
        <rect x="3.5" y="16" width="4" height="4" rx="1" />
        <path d="M10.5 6h10M10.5 12h7M10.5 18h4" />
      </MenuIcon>
    ),
  },
  {
    to: "/my-lists?create=template",
    tone: "plain",
    title: "Шаблон",
    text: "Свой набор для топов",
    icon: (
      <MenuIcon>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <path d="M16.5 13.5v6M13.5 16.5h6" />
      </MenuIcon>
    ),
  },
];

/** Меню «Что добавить» у кнопки «+». */
export function CreateMenu(props: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  return <LiquidMenu {...props} options={OPTIONS} label="Что добавить" />;
}

export function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {children}
    </svg>
  );
}
