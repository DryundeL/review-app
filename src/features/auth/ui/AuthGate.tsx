import { isClientOnlyPath } from "@/shared/lib/publicRoutes";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { bootstrapAuth } from "../model/authController";
import { useAuthSession } from "../model/useAuthSession";
import { authScreen } from "../model/authScreen";
import { nextCacheAccount } from "../model/cacheAccount";
import { AuthLoadingScreen } from "./AuthLoadingScreen";
import { LoginScreen } from "./LoginScreen";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const session = useAuthSession();
  const { pathname } = useLocation();
  const editorPath =
    pathname === "/create" ||
    /^\/reviews\/[^/]+\/edit$/.test(pathname) ||
    /^\/list-(templates|results)\/[^/]+\/edit$/.test(pathname);
  const [editorOwner, setEditorOwner] = useState<string | null>(null);
  useEffect(() => {
    if (!editorPath) setEditorOwner(null);
    else if (session.phase === "authenticated" && session.profile)
      setEditorOwner(session.profile.id);
  }, [editorPath, session.phase, session.profile]);
  const requiresLogin = isClientOnlyPath(pathname);
  const queryClient = useQueryClient();
  const cacheAccount = useRef<string | null>(
    session.phase === "authenticated" ? (session.profile?.id ?? null) : null,
  );

  useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-telegram-startup");
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const profileId = session.profile?.id ?? null;
  useLayoutEffect(() => {
    const step = nextCacheAccount(cacheAccount.current, session.phase, profileId);
    cacheAccount.current = step.account;
    if (step.clear) queryClient.clear();
  }, [queryClient, session.phase, profileId]);

  const screen = authScreen(
    session.phase,
    session.isMiniApp,
    requiresLogin,
    session.hasToken,
  );
  // Keep unsaved editor state mounted through reauthentication, isolated by account.
  if (editorPath && editorOwner)
    return (
      <>
        <div key={session.profile?.id ?? editorOwner} hidden={screen !== "content"}>
          {children}
        </div>
        {screen === "loading" ? (
          <AuthLoadingScreen />
        ) : screen === "login" ? (
          <LoginScreen />
        ) : null}
      </>
    );
  if (screen === "loading") return <AuthLoadingScreen />;
  if (screen === "login") return <LoginScreen />;
  return children;
}
