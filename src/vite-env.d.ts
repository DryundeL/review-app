/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
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
  text_color?: string;
  button_color?: string;
  button_text_color?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramWebAppUser };
  themeParams?: TelegramThemeParams;
  ready: () => void;
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
