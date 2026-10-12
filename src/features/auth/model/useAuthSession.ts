import { useSyncExternalStore } from "react";
import { readTelegramInitData } from "@/shared/platform";
import {
  getAuthSnapshot,
  retryMiniAppLogin,
  startBrowserLogin,
  subscribeAuth,
} from "./authController";

export function useAuthSession() {
  const snapshot = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

  return {
    ...snapshot,
    isMiniApp: readTelegramInitData() !== null,
    startBrowserLogin,
    retryMiniAppLogin,
  };
}
