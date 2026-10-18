import { useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import logoUrl from "@/assets/review-hub-logo.png";
import { usePageMeta } from "@/shared/hooks";
import { metaForPath } from "@/shared/lib/pageMeta";
import { refreshHomeFeed } from "@/shared/lib/refreshHome";
import { BottomNavigation } from "@/widgets/BottomNavigation";
import "./AppShell.css";

export function AppShell() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  // Обзор и публичный профиль ставят meta сами — иначе shell перетрёт после их effect.
  const pageOwnsMeta =
    /^\/reviews\/[^/]+$/.test(pathname) || pathname.startsWith("/profiles/");
  usePageMeta(pageOwnsMeta ? null : metaForPath(pathname));
  const hideNav =
    pathname === "/create" ||
    pathname.startsWith("/reviews/");
  const backTo = pathname === "/settings" ? "/profile" : hideNav ? "/" : null;

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-row">
          <NavLink
            to="/"
            className="app-shell__brand"
            end
            onClick={(event) => {
              if (pathname !== "/") return;
              event.preventDefault();
              refreshHomeFeed(queryClient);
            }}
          >
            <img className="app-shell__logo" src={logoUrl} alt="Review Hub" width={2172} height={724} />
          </NavLink>
        </div>
      </header>
      <main className={hideNav ? "app-shell__main app-shell__main--solo" : "app-shell__main"}>
        {backTo ? (
          <Link className="app-shell__back" to={backTo}>
            Назад
          </Link>
        ) : null}
        <Outlet />
      </main>
      {hideNav ? null : <BottomNavigation />}
    </div>
  );
}
