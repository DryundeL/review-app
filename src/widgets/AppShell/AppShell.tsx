import { NavLink, Outlet } from "react-router-dom";
import logoUrl from "@/assets/review-hub-logo.png";
import { BottomNavigation } from "@/widgets/BottomNavigation";
import "./AppShell.css";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <NavLink to="/" className="app-shell__brand">
          <img className="app-shell__logo" src={logoUrl} alt="Review Hub" width={2172} height={724} />
        </NavLink>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
