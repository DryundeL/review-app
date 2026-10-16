import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import logoUrl from "@/assets/review-hub-logo.png";
import { BottomNavigation } from "@/widgets/BottomNavigation";
import "./AppShell.css";

export function AppShell() {
  const { pathname } = useLocation();
  const hideNav =
    pathname === "/create" ||
    pathname.startsWith("/reviews/");

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        {hideNav ? (
          <Link className="app-shell__back" to="/">
            Назад
          </Link>
        ) : (
          <NavLink to="/" className="app-shell__brand" end>
            <img className="app-shell__logo" src={logoUrl} alt="Review Hub" width={2172} height={724} />
          </NavLink>
        )}
      </header>
      <main className={hideNav ? "app-shell__main app-shell__main--solo" : "app-shell__main"}>
        <Outlet />
      </main>
      {hideNav ? null : <BottomNavigation />}
    </div>
  );
}
