import { NavLink } from "react-router-dom";
import "./BottomNavigation.css";

const links = [
  { to: "/", label: "Лента", end: true },
  { to: "/search", label: "Поиск" },
  { to: "/create", label: "Обзор" },
  { to: "/profile", label: "Профиль" },
] as const;

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={"end" in link ? link.end : false}
          className={({ isActive }) =>
            isActive ? "bottom-nav__link bottom-nav__link--active" : "bottom-nav__link"
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
