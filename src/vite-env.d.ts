/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_TELEGRAM_BOT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type TelegramWebAppUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
};

type TelegramThemeParams = {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  button_color?: string;
  button_text_color?: string;
};

type TelegramHeaderColor = "bg_color" | "secondary_bg_color" | `#${string}`;
type TelegramBackgroundColor = "bg_color" | "secondary_bg_color" | `#${string}`;

type TelegramSafeAreaInset = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type TelegramWebAppEvent =
  | "safeAreaChanged"
  | "contentSafeAreaChanged"
  | "fullscreenChanged";

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramWebAppUser };
  themeParams?: TelegramThemeParams;
  /** ios | android | android_x | macos | tdesktop | weba | webk | … */
  platform?: string;
  isFullscreen?: boolean;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  setHeaderColor?: (color: TelegramHeaderColor) => void;
  setBackgroundColor?: (color: TelegramBackgroundColor) => void;
  onEvent?: (eventType: TelegramWebAppEvent, callback: () => void) => void;
  offEvent?: (eventType: TelegramWebAppEvent, callback: () => void) => void;
  openLink: (url: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
  };
};

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
