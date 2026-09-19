import { NavLink, Outlet } from "react-router-dom";
import { BottomNavigation } from "@/widgets/BottomNavigation";
import "./AppShell.css";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <NavLink to="/" className="app-shell__brand">
          Review App
        </NavLink>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
