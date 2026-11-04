import type { AuthPhase } from "./authController";

export function authScreen(
  phase: AuthPhase,
  isMiniApp: boolean,
  requiresLogin: boolean,
): "loading" | "login" | "content" {
  if (phase === "authenticated") return "content";
  if (isMiniApp && (phase === "booting" || phase === "authenticating")) {
    return "loading";
  }
  return isMiniApp || requiresLogin ? "login" : "content";
}
