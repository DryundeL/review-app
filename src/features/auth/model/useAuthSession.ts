import { usePlatform } from "@/shared/platform";

/**
 * Auth feature stub: exchanges platform credentials for an API session.
 * Telegram path uses initData; web portal will plug in later.
 */
export function useAuthSession() {
  const platform = usePlatform();

  return {
    platformKind: platform.kind,
    initData: platform.getInitData(),
    platformUser: platform.getUser(),
    isAuthenticated: Boolean(platform.getInitData() || platform.getUser()),
  };
}
