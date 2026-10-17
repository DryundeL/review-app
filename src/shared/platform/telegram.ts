import type { PlatformAdapter, PlatformTheme } from "./types";

const defaultTheme: PlatformTheme = {
  backgroundColor: "#0f1115",
  textColor: "#f2f4f8",
  buttonColor: "#3d8bfd",
  buttonTextColor: "#ffffff",
};

export function readTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;
  const initData = window.Telegram?.WebApp?.initData;
  if (typeof initData !== "string" || initData.length === 0) return null;
  return initData;
}

/** Старт Mini App: ready → expand → fullscreen (Bot API 8.0+), иначе остаётся expand. */
function bootstrapTelegramWebApp(webApp: TelegramWebApp): void {
  webApp.ready();
  webApp.expand();

  if (typeof webApp.requestFullscreen === "function") {
    try {
      webApp.requestFullscreen();
    } catch {
      // старый клиент / недоступно — останется expand
    }
  }

  webApp.setHeaderColor?.("secondary_bg_color");
  webApp.setBackgroundColor?.("bg_color");
}

export function createTelegramAdapter(): PlatformAdapter | null {
  const webApp = window.Telegram?.WebApp;

  if (!webApp || !readTelegramInitData()) {
    return null;
  }

  return {
    kind: "telegram",
    ready: () => bootstrapTelegramWebApp(webApp),
    getInitData: () => readTelegramInitData(),
    getUser: () => {
      const user = webApp.initDataUnsafe?.user;
      if (!user) {
        return null;
      }

      return {
        id: String(user.id),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        photoUrl: user.photo_url,
        languageCode: user.language_code,
      };
    },
    getTheme: () => ({
      backgroundColor: webApp.themeParams?.bg_color ?? defaultTheme.backgroundColor,
      textColor: webApp.themeParams?.text_color ?? defaultTheme.textColor,
      buttonColor: webApp.themeParams?.button_color ?? defaultTheme.buttonColor,
      buttonTextColor:
        webApp.themeParams?.button_text_color ?? defaultTheme.buttonTextColor,
    }),
    openLink: (url) => webApp.openLink(url),
    hapticImpact: (style = "light") => {
      webApp.HapticFeedback?.impactOccurred(style);
    },
  };
}
