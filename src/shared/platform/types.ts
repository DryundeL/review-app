export type PlatformKind = "telegram" | "web";

export type PlatformUser = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  languageCode?: string;
};

export type PlatformTheme = {
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
};

export type PlatformAdapter = {
  kind: PlatformKind;
  ready: () => void;
  getInitData: () => string | null;
  getUser: () => PlatformUser | null;
  getTheme: () => PlatformTheme;
  openLink: (url: string) => void;
  hapticImpact: (style?: "light" | "medium" | "heavy") => void;
};
