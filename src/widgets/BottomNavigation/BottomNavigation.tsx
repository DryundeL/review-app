import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, useLocation } from "react-router-dom";
import { fetchUnreadNotificationsCount } from "@/entities/settings";
import { refreshHomeFeed } from "@/shared/lib/refreshHome";
import "./BottomNavigation.css";

const links = [
  { to: "/", label: "Главная", end: true, icon: "home" },
  { to: "/search", label: "Поиск", icon: "search" },
  { to: "/create", label: "Создать", icon: "plus", create: true },
  { to: "/notifications", label: "Уведомления", icon: "bell" },
  { to: "/profile", label: "Профиль", icon: "user" },
] as const;

export function BottomNavigation() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: ({ signal }) => fetchUnreadNotificationsCount(signal),
    refetchInterval: 60_000,
  });

  const unreadCount = unreadQuery.data?.count ?? 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div className="bottom-nav__bar" aria-hidden="true">
        <span className="bottom-nav__notch" />
      </div>

      <div className="bottom-nav__items">
        {links.map((link) => {
          const showBadge = link.icon === "bell" && unreadCount > 0;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={"end" in link ? link.end : false}
              aria-label={
                showBadge ? `${link.label}, непрочитанных: ${unreadCount}` : link.label
              }
              className={({ isActive }) =>
                [
                  "bottom-nav__link",
                  `bottom-nav__link--${link.icon}`,
                  "create" in link ? "bottom-nav__create" : "",
                  isActive ? "bottom-nav__link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              onClick={(event) => {
                if (link.to !== "/") return;
                if (location.pathname !== "/") return;
                event.preventDefault();
                refreshHomeFeed(queryClient);
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
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  return (
    <svg className="bottom-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
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
      {name === "bell" ? <path d="M6 9a6 6 0 1 1 12 0c0 7 2 7 2 7H4s2 0 2-7ZM10 19a2 2 0 0 0 4 0" /> : null}
      {name === "user" ? (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19.5a7 7 0 0 1 14 0" />
        </>
      ) : null}
    </svg>
  );
}
