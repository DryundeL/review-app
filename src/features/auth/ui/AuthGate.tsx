import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { bootstrapAuth } from "../model/authController";
import { useAuthSession } from "../model/useAuthSession";
import { LoginScreen } from "./LoginScreen";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (session.phase === "authenticated") {
      wasAuthenticated.current = true;
      return;
    }
    if (!wasAuthenticated.current) return;
    wasAuthenticated.current = false;
    queryClient.clear();
  }, [queryClient, session.phase]);

  if (session.phase !== "authenticated") {
    return <LoginScreen />;
  }

  return children;
}
