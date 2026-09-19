import type { PlatformAdapter } from "./types";

export function createWebAdapter(): PlatformAdapter {
  return {
    kind: "web",
    ready: () => undefined,
    getInitData: () => null,
    getUser: () => null,
    getTheme: () => ({
      backgroundColor: "#0f1115",
      textColor: "#f2f4f8",
      buttonColor: "#3d8bfd",
      buttonTextColor: "#ffffff",
    }),
    openLink: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    hapticImpact: () => undefined,
  };
}
