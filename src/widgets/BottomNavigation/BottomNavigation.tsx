import { useRef, useState, type CSSProperties } from "react";
import logoUrl from "@/assets/review-hub-logo.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, useLocation } from "react-router-dom";
import { fetchUnreadNotificationsCount } from "@/entities/settings";
import { useAuthSession, refreshSessionProfile } from "@/features/auth";
import { refreshQueriesForPath } from "@/shared/lib/refreshHome";
import { AppImage } from "@/shared/ui";
import { CreateMenu } from "./CreateMenu";
import "./BottomNavigation.css";

const links = [
  { to: "/", label: "Главная", end: true, icon: "home" },
  { to: "/search", label: "Поиск", end: true, icon: "search" },
  { to: "/notifications", label: "Уведомления", end: true, icon: "bell" },
  { to: "/profile", label: "Профиль", end: true, icon: "user" },
] as const;

const secondaryLinks = [
  { to: "/lists", label: "Топы", icon: "list" },
  { to: "/achievements", label: "Достижения", icon: "award" },
  { to: "/shop", label: "Магазин", icon: "shop" },
  { to: "/settings", label: "Настройки", icon: "settings" },
] as const;

function isExactTab(pathname: string, to: string): boolean {
  return pathname === to;
}

export function BottomNavigation({ hideOnMobile = false }: { hideOnMobile?: boolean }) {
  const location = useLocation();
  const { profile } = useAuthSession();
  const visibleLinks = profile ? links : links.slice(0, 2);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLButtonElement>(null);
  // Переход на другую страницу (в том числе «назад») закрывает меню.
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    if (createOpen) setCreateOpen(false);
  }

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: ({ signal }) => fetchUnreadNotificationsCount(signal),
    refetchInterval: 60_000,
    enabled: Boolean(profile),
  });

  const activeIndex = visibleLinks.findIndex((link) =>
    isExactTab(location.pathname, link.to),
  );

  const unreadCount = unreadQuery.data?.count ?? 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <nav
      className={`bottom-nav${hideOnMobile ? " bottom-nav--desktop-only" : ""}`}
      aria-label="Основная навигация"
    >
      <div className="bottom-nav__panel">
        <NavLink
          to="/"
          end
          className="bottom-nav__brand"
          aria-label="Review Hub — главная"
        >
          <AppImage
            className="bottom-nav__logo"
            src={logoUrl}
            alt="Review Hub"
            width={2172}
            height={724}
            objectFit="contain"
          />
        </NavLink>
        <div
          className="bottom-nav__items"
          style={
            {
              "--active-tab": Math.max(0, activeIndex),
              "--tab-count": visibleLinks.length,
            } as CSSProperties
          }
        >
          <div className="bottom-nav__bar" aria-hidden="true" />
          <span
            className="bottom-nav__indicator"
            data-visible={activeIndex >= 0}
            aria-hidden="true"
          />
          {visibleLinks.map((link) => {
            const showBadge = link.icon === "bell" && unreadCount > 0;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                aria-label={
                  showBadge ? `${link.label}, непрочитанных: ${unreadCount}` : link.label
                }
                className={({ isActive }) =>
                  [
                    "bottom-nav__link",
                    `bottom-nav__link--${link.icon}`,
                    isActive ? "bottom-nav__link--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                onClick={(event) => {
                  // Повторный тап по активной вкладке — перезапросить данные экрана.
                  if (!isExactTab(location.pathname, link.to)) return;
                  event.preventDefault();
                  refreshQueriesForPath(queryClient, link.to);
                  if (link.to === "/profile") {
                    refreshSessionProfile();
                  }
                }}
              >
                <span className="bottom-nav__icon-wrap">
                  <NavIcon name={link.icon} />
                  {showBadge ? (
                    <span className="bottom-nav__badge" aria-hidden>
                      {badgeLabel}
                    </span>
                  ) : null}
                </span>
                <span className="bottom-nav__label">{link.label}</span>
              </NavLink>
            );
          })}
        </div>
        {profile ? (
          <div className="bottom-nav__secondary">
            {secondaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                aria-label={link.label}
                className={({ isActive }) =>
                  `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`
                }
              >
                <span className="bottom-nav__icon-wrap">
                  <NavIcon name={link.icon} />
                </span>
                <span className="bottom-nav__label">{link.label}</span>
              </NavLink>
            ))}
          </div>
        ) : null}
      </div>
      {profile ? (
        <>
          <button
            ref={createRef}
            type="button"
            aria-label={createOpen ? "Закрыть" : "Добавить"}
            aria-haspopup="dialog"
            aria-expanded={createOpen}
            className={[
              "bottom-nav__link",
              "bottom-nav__create",
              location.pathname === "/create" ? "bottom-nav__link--active" : "",
              createOpen ? "bottom-nav__create--open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setCreateOpen((value) => !value)}
          >
            <span className="bottom-nav__icon-wrap">
              <NavIcon name="plus" />
            </span>
            <span className="bottom-nav__label bottom-nav__label--create">
              {createOpen ? "Закрыть" : "Добавить"}
            </span>
          </button>
          <CreateMenu
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            anchorRef={createRef}
          />
        </>
      ) : (
        <NavLink
          to="/profile"
          end
          aria-label="Войти"
          className={({ isActive }) =>
            `bottom-nav__link bottom-nav__create${isActive ? " bottom-nav__link--active" : ""}`
          }
        >
          <span className="bottom-nav__icon-wrap">
            <NavIcon name="user" />
          </span>
          <span className="bottom-nav__label bottom-nav__label--create">Войти</span>
        </NavLink>
      )}
    </nav>
  );
}

function NavIcon({
  name,
}: {
  name: (typeof links)[number]["icon"] | (typeof secondaryLinks)[number]["icon"] | "plus";
}) {
  return (
    <svg className="bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === "award" ? (
        <>
          <circle cx="12" cy="8" r="5" />
          <path d="m8 12-2 9 6-3 6 3-2-9" />
        </>
      ) : null}
      {name === "list" ? (
        <>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" />
        </>
      ) : null}
      {name === "shop" ? (
        <>
          <path d="M4 8h16l-1 13H5L4 8Z" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" />
        </>
      ) : null}
      {name === "settings" ? (
        <>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <path d="M8 3v6M16 9v6M10 15v6" />
        </>
      ) : null}
      {name === "home" ? (
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      ) : null}
      {name === "search" ? (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </>
      ) : null}
      {name === "plus" ? (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      ) : null}
      {name === "bell" ? (
        <path d="M6 9a6 6 0 1 1 12 0c0 7 2 7 2 7H4s2 0 2-7ZM10 19a2 2 0 0 0 4 0" />
      ) : null}
      {name === "user" ? (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19.5a7 7 0 0 1 14 0" />
        </>
      ) : null}
    </svg>
  );
}
