import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { createTelegramAdapter } from "./telegram";
import type { PlatformAdapter } from "./types";
import { createWebAdapter } from "./web";

const PlatformContext = createContext<PlatformAdapter | null>(null);

type PlatformProviderProps = {
  children: ReactNode;
};

export function PlatformProvider({ children }: PlatformProviderProps) {
  const platform = useMemo(
    () => createTelegramAdapter() ?? createWebAdapter(),
    [],
  );

  useEffect(() => {
    platform.ready();
  }, [platform]);

  return (
    <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformAdapter {
  const platform = useContext(PlatformContext);

  if (!platform) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }

  return platform;
}
