import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import { ContentPreferencesOnboarding } from "@/features/content-preferences/ContentPreferences";
import logoUrl from "@/assets/review-hub-logo.png";
import { refreshSessionProfile } from "@/features/auth";
import { usePageMeta } from "@/shared/hooks";
import { metaForPath } from "@/shared/lib/pageMeta";
import { refreshHomeFeed } from "@/shared/lib/refreshHome";
import { createRouteScrollRestoration } from "@/shared/lib/routeScroll";
import { AppImage } from "@/shared/ui";
import { BottomNavigation } from "@/widgets/BottomNavigation";
import "./AppShell.css";

function showBackButton(pathname: string): boolean {
  return (
    pathname === "/settings" ||
    pathname === "/shop" ||
    pathname === "/create" ||
    pathname === "/achievements" ||
    pathname.startsWith("/media-objects/") ||
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
  const { pathname, key: locationKey } = useLocation();
  const navigationType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathRef = useRef(pathname);
  const scrollRestorationRef = useRef<ReturnType<
    typeof createRouteScrollRestoration
  > | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshAfterBackRef = useRef(false);
  // Обзор и публичный профиль ставят meta сами — иначе shell перетрёт после их effect.
  const pageOwnsMeta =
    /^\/reviews\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/profiles/") ||
    pathname.startsWith("/media-objects/");
  usePageMeta(pageOwnsMeta ? null : metaForPath(pathname));
  const hideNav =
    pathname === "/create" ||
    pathname.startsWith("/media-objects/") ||
    pathname.startsWith("/reviews/");
  const showBack = showBackButton(pathname);

  useLayoutEffect(() => {
    const restoration = createRouteScrollRestoration();
    scrollRestorationRef.current = restoration;
    return () => {
      restoration.dispose();
      scrollRestorationRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    scrollRestorationRef.current?.navigate(locationKey, navigationType, pathname);
  }, [locationKey, navigationType, pathname]);

  useLayoutEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;
    const main = mainRef.current;
    if (
      previousPath === pathname ||
      !main?.animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const styles = getComputedStyle(main);
    const animation = main.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: parseFloat(styles.getPropertyValue("--motion-duration-normal")) || 240,
        easing: styles.getPropertyValue("--motion-ease").trim() || "ease-out",
      },
    );
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cancel = () => animation.cancel();
    motionPreference.addEventListener("change", cancel);
    return () => {
      animation.cancel();
      motionPreference.removeEventListener("change", cancel);
    };
  }, [pathname]);

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
            <AppImage
              className="app-shell__logo"
              src={logoUrl}
              alt="Review Hub"
              width={2172}
              height={724}
              objectFit="contain"
            />
          </NavLink>
        </div>
      </header>
      <main
        ref={mainRef}
        className={hideNav ? "app-shell__main app-shell__main--solo" : "app-shell__main"}
      >
        {showBack ? (
          <div className="app-shell__back-row">
            <button
              type="button"
              className="app-shell__back"
              aria-label="Назад"
              onClick={handleBack}
            >
              <BackArrowIcon />
            </button>
          </div>
        ) : null}
        <Outlet />
      </main>
      <BottomNavigation hideOnMobile={hideNav} />
      <ContentPreferencesOnboarding />
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}
