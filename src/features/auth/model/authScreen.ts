import type { AuthPhase } from "./authController";

export function authScreen(
  phase: AuthPhase,
  isMiniApp: boolean,
  requiresLogin: boolean,
  hasToken = false,
): "loading" | "login" | "content" {
  if (phase === "authenticated") return "content";
  if ((isMiniApp || hasToken) && (phase === "booting" || phase === "authenticating")) {
    return "loading";
  }
  return isMiniApp || requiresLogin ? "login" : "content";
}
