import { appConfig } from "@/shared/config";
import { readTelegramInitData } from "./telegram";

const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

function isLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isSafeTelegramBotUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.port === "" &&
    !url.username &&
    !url.password &&
    TELEGRAM_HOSTS.has(url.hostname) &&
    url.pathname.length > 1
  );
}

function isMobileBrowser(): boolean {
  const uaData = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent,
  );
}

/**
 * Пока нет десктопной версии: десктопный браузер → редирект в Telegram-бота.
 * Мобильный браузер, Mini App и localhost — открываем сайт как есть.
 * @returns true, если уходим в Telegram (приложение не монтировать).
 */
export function redirectBrowserToTelegramIfNeeded(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV || isLocalDevHost(window.location.hostname)) return false;
  if (readTelegramInitData()) return false;
  if (isMobileBrowser()) return false;

  const botUrl = appConfig.telegramBotUrl;
  if (!isSafeTelegramBotUrl(botUrl)) {
    console.error("VITE_TELEGRAM_BOT_URL is not a valid https://t.me/… link");
    return false;
  }

  window.location.replace(botUrl);
  return true;
}
