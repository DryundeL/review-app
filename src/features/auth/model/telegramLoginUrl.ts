const ALLOWED_HOSTS = new Set(["t.me", "telegram.me"]);

export function isTelegramLoginUrl(value: string): boolean {
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
    ALLOWED_HOSTS.has(url.hostname) &&
    url.pathname.length > 1
  );
}
