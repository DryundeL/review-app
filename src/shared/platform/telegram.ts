import type { PlatformAdapter, PlatformTheme } from "./types";

const defaultTheme: PlatformTheme = {
  backgroundColor: "#0f1115",
  textColor: "#f2f4f8",
  buttonColor: "#3d8bfd",
  buttonTextColor: "#ffffff",
};

let safeAreaListenersBound = false;

export function readTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;
  const initData = window.Telegram?.WebApp?.initData;
  if (typeof initData !== "string" || initData.length === 0) return null;
  return initData;
}

/** safeArea + contentSafeArea → CSS vars, иначе шапка/кнопки под системным UI Telegram. */
function syncTelegramSafeAreaVars(webApp: TelegramWebApp): void {
  const safe = webApp.safeAreaInset;
  const content = webApp.contentSafeAreaInset;
  const top = (safe?.top ?? 0) + (content?.top ?? 0);
  const bottom = (safe?.bottom ?? 0) + (content?.bottom ?? 0);

  const root = document.documentElement;
  root.style.setProperty("--safe-top", `${top}px`);
  root.style.setProperty("--safe-bottom", `${bottom}px`);
}

function bindTelegramSafeAreaSync(webApp: TelegramWebApp): void {
  syncTelegramSafeAreaVars(webApp);

  if (safeAreaListenersBound || typeof webApp.onEvent !== "function") return;

  const sync = () => syncTelegramSafeAreaVars(webApp);
  webApp.onEvent("safeAreaChanged", sync);
  webApp.onEvent("contentSafeAreaChanged", sync);
  webApp.onEvent("fullscreenChanged", sync);
  safeAreaListenersBound = true;
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
  bindTelegramSafeAreaSync(webApp);
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
