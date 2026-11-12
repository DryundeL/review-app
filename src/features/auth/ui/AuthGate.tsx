import { isClientOnlyPath } from "@/shared/lib/publicRoutes";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { bootstrapAuth } from "../model/authController";
import { useAuthSession } from "../model/useAuthSession";
import { authScreen } from "../model/authScreen";
import { AuthLoadingScreen } from "./AuthLoadingScreen";
import { LoginScreen } from "./LoginScreen";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const session = useAuthSession();
  const { pathname } = useLocation();
  const requiresLogin = isClientOnlyPath(pathname);
  const queryClient = useQueryClient();
  const previousAccount = useRef<string | null>(session.profile?.id ?? null);

  useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-telegram-startup");
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  useLayoutEffect(() => {
    const account = session.profile?.id ?? null;
    if (previousAccount.current === account) return;
    previousAccount.current = account;
    queryClient.clear();
  }, [queryClient, session.profile?.id]);

  const screen = authScreen(
    session.phase,
    session.isMiniApp,
    requiresLogin,
    session.hasToken,
  );
  if (screen === "loading") return <AuthLoadingScreen />;
  if (screen === "login") return <LoginScreen />;
  return children;
}
