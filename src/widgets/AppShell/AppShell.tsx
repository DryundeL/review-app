import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logoUrl from "@/assets/review-hub-logo.png";
import { refreshSessionProfile } from "@/features/auth";
import { usePageMeta } from "@/shared/hooks";
import { metaForPath } from "@/shared/lib/pageMeta";
import { refreshHomeFeed } from "@/shared/lib/refreshHome";
import { BottomNavigation } from "@/widgets/BottomNavigation";
import "./AppShell.css";

function showBackButton(pathname: string): boolean {
  return (
    pathname === "/settings" ||
    pathname === "/shop" ||
    pathname === "/create" ||
    pathname === "/achievements" ||
    pathname.startsWith("/reviews/")
    // /profiles/:id — «Назад» в topbar профиля (как «Магазин» на своём).
  );
}

/** React Router кладёт idx в history.state — надёжнее, чем history.length. */
function canNavigateBack(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" ? idx > 0 : window.history.length > 1;
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshAfterBackRef = useRef(false);
  // Обзор и публичный профиль ставят meta сами — иначе shell перетрёт после их effect.
  const pageOwnsMeta =
    /^\/reviews\/[^/]+$/.test(pathname) || pathname.startsWith("/profiles/");
  usePageMeta(pageOwnsMeta ? null : metaForPath(pathname));
  const hideNav =
    pathname === "/create" ||
    pathname.startsWith("/reviews/");
  const showBack = showBackButton(pathname);

  useEffect(() => {
    if (!refreshAfterBackRef.current) return;
    refreshAfterBackRef.current = false;
    // После перехода «назад» активные запросы целевой страницы перезапрашиваем сразу.
    void queryClient.invalidateQueries({ refetchType: "active" });
    if (pathname === "/profile" || pathname.startsWith("/profiles/")) {
      refreshSessionProfile();
    }
  }, [pathname, queryClient]);

  function handleBack() {
    refreshAfterBackRef.current = true;
    if (canNavigateBack()) {
      navigate(-1);
      return;
    }
    navigate(pathname === "/settings" || pathname === "/shop" ? "/profile" : "/", {
      replace: true,
    });
  }

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
        {showBack ? (
          <button type="button" className="app-shell__back" aria-label="Назад" onClick={handleBack}>
            <BackArrowIcon />
          </button>
        ) : null}
        <Outlet />
      </main>
      {hideNav ? null : <BottomNavigation />}
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
      />
    </svg>
  );
}
