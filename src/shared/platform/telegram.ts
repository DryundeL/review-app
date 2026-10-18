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

/**
 * CSS vars для safe-area.
 * Top: safe + contentSafe (status + Close). Шапка: padding-top = spacer, ряд с «Назад» ниже.
 * Bottom: только home-indicator (без content.bottom — иначе пустота под таббаром).
 * Не пишем 0px — иначе затирается env(safe-area-inset-*).
 */
function syncTelegramSafeAreaVars(webApp: TelegramWebApp): void {
  const safe = webApp.safeAreaInset;
  const content = webApp.contentSafeAreaInset;
  const root = document.documentElement;

  const systemTop = safe?.top ?? 0;
  const contentTop = content?.top ?? 0;
  let top = systemTop + contentTop;

  // fullscreen: insets часто приходят с задержкой / нулями — минимум под Close
  if (webApp.isFullscreen && top < 56) {
    top = systemTop > 0 ? systemTop + 48 : 88;
  }

  if (top > 0) {
    root.style.setProperty("--safe-top", `${top}px`);
  } else {
    root.style.removeProperty("--safe-top");
  }

  const bottom = safe?.bottom ?? 0;
  if (bottom > 0) {
    root.style.setProperty("--safe-bottom", `${bottom}px`);
  } else {
    root.style.removeProperty("--safe-bottom");
  }
}

function bindTelegramSafeAreaSync(webApp: TelegramWebApp): void {
  const sync = () => syncTelegramSafeAreaVars(webApp);
  sync();

  if (safeAreaListenersBound || typeof webApp.onEvent !== "function") return;

  webApp.onEvent("safeAreaChanged", sync);
  webApp.onEvent("contentSafeAreaChanged", sync);
  webApp.onEvent("fullscreenChanged", sync);
  safeAreaListenersBound = true;
}

function isMobileTelegramPlatform(platform: string | undefined): boolean {
  const value = platform?.toLowerCase() ?? "";
  return value === "ios" || value === "android" || value === "android_x";
}

/**
 * Старт Mini App.
 * Mobile: expand + fullscreen (как Altyn на телефоне).
 * Desktop/web: только ready — иначе уходит в полный экран вместо компактного модала.
 */
function bootstrapTelegramWebApp(webApp: TelegramWebApp): void {
  webApp.ready();

  if (isMobileTelegramPlatform(webApp.platform)) {
    webApp.expand();

    if (typeof webApp.requestFullscreen === "function") {
      try {
        webApp.requestFullscreen();
      } catch {
        // старый клиент / недоступно — останется expand
      }
    }
  } else {
    // на macOS/tdesktop не разворачиваем; сбросим fullscreen, если уже включился
    if (webApp.isFullscreen && typeof webApp.exitFullscreen === "function") {
      try {
        webApp.exitFullscreen();
      } catch {
        // ignore
      }
    }
  }

  webApp.setHeaderColor?.("secondary_bg_color");
  webApp.setBackgroundColor?.("bg_color");
  bindTelegramSafeAreaSync(webApp);

  // insets после requestFullscreen часто обновляются не сразу
  window.setTimeout(() => syncTelegramSafeAreaVars(webApp), 50);
  window.setTimeout(() => syncTelegramSafeAreaVars(webApp), 300);
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
