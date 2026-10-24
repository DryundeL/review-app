import { useEffect, useState } from "react";
import authBgUrl from "@/assets/auth-background.webp";
import logoUrl from "@/assets/review-hub-logo.png";
import { Button } from "@/shared/ui";
import { usePageMeta } from "@/shared/hooks";
import { metaForPath } from "@/shared/lib/pageMeta";
import { useAuthSession } from "../model/useAuthSession";
import { isTelegramLoginUrl } from "../model/telegramLoginUrl";
import { EmailLogin } from "./EmailLogin";
import "./LoginScreen.css";

const REOPEN_MINI_APP =
  "Не удалось подтвердить сессию Telegram. Закройте Mini App и откройте его снова: Telegram выдаст новые данные для входа.";

const TAGLINE = "Твои истории\nо том, что вдохновляет";
const CAPTION = "Делись. Читай. Оценивай. Открывай новое.";

export function LoginScreen() {
  usePageMeta(metaForPath(window.location.pathname));
  const session = useAuthSession();
  const [emailLogin, setEmailLogin] = useState(false);
  const fallbackUrl =
    session.fallbackUrl && isTelegramLoginUrl(session.fallbackUrl)
      ? session.fallbackUrl
      : null;
  const showBrowserLogin =
    !session.isMiniApp &&
    (session.phase === "anonymous" ||
      session.phase === "denied" ||
      session.phase === "expired" ||
      (session.phase === "failed" && !session.hasToken));
  const showRetry = session.phase === "failed" && (session.isMiniApp || session.hasToken);
  const busy = session.phase === "booting" || session.phase === "authenticating";
  const status = messageFor(session.phase, session.message);
  const showCaption = showBrowserLogin && session.phase === "anonymous";

  useEffect(() => {
    if (emailLogin || (!showBrowserLogin && !showRetry)) return;
    document.getElementById("login-action")?.focus();
  }, [emailLogin, showBrowserLogin, showRetry, session.phase]);

  return (
    <main className="login-screen">
      <div
        className="login-screen__bg"
        style={{ backgroundImage: `url(${authBgUrl})` }}
        aria-hidden
      />
      <div className="login-screen__content">
        <header className="login-screen__brand">
          <h1 className="login-screen__title">
            <img
              className="login-screen__logo"
              src={logoUrl}
              alt="Review Hub"
              width={2172}
              height={724}
            />
          </h1>
          {emailLogin ? null : <p className="login-screen__tagline">{TAGLINE}</p>}
          <p className="login-screen__description">
            Review Hub (Ревью Хаб) — сообщество с обзорами аниме, манги, фильмов и
            сериалов. Делитесь рецензиями, ставьте оценки и находите, что посмотреть или
            почитать.
          </p>
        </header>

        <div className="login-screen__footer" data-nosnippet>
          {status && !emailLogin ? (
            <p
              className="login-screen__text"
              role="status"
              aria-live="polite"
              aria-busy={busy}
            >
              {status}
            </p>
          ) : null}
          {session.phase === "awaiting_confirmation" && fallbackUrl ? (
            <a
              className="login-screen__link"
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Открыть Telegram
            </a>
          ) : null}
          {showBrowserLogin && emailLogin ? (
            <EmailLogin onClose={() => setEmailLogin(false)} />
          ) : null}
          {showBrowserLogin && !emailLogin ? (
            <>
              <Button
                id="login-action"
                className="login-screen__action"
                onClick={session.startBrowserLogin}
              >
                <TelegramIcon />
                Войти через Telegram
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="login-screen__action"
                onClick={() => setEmailLogin(true)}
              >
                Войти по почте
              </Button>
            </>
          ) : null}
          {showRetry ? (
            <Button
              id="login-action"
              className="login-screen__action"
              onClick={session.retryMiniAppLogin}
            >
              Повторить
            </Button>
          ) : null}
          {showCaption && !emailLogin ? (
            <p className="login-screen__caption">{CAPTION}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function TelegramIcon() {
  return (
    <svg
      className="login-screen__tg-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M21.8 4.3c.3-.9-.5-1.6-1.3-1.3L2.9 9.6c-.9.3-.9 1.6.1 1.9l4.4 1.4 1.7 5.3c.3.9 1.5 1.1 2.1.4l2.5-2.8 4.7 3.5c.8.6 1.9.1 2.1-.8l2.3-14.2ZM9.2 13.1l8.3-5.2c.2-.1.4.2.2.3l-6.9 6.4-.3 3.3-1.3-4.8Z"
      />
    </svg>
  );
}

function messageFor(
  phase: ReturnType<typeof useAuthSession>["phase"],
  failure: string | null,
): string {
  switch (phase) {
    case "booting":
    case "authenticating":
      return "Входим…";
    case "awaiting_confirmation":
      return "Подтвердите вход в Telegram, затем вернитесь в браузер.";
    case "denied":
      return "Вход отклонён.";
    case "expired":
      return "Ссылка на вход истекла. Начните заново.";
    case "failed":
      return failure ?? "Не удалось выполнить запрос. Попробуйте ещё раз.";
    case "miniapp_reopen":
      return REOPEN_MINI_APP;
    case "anonymous":
    case "authenticated":
      return "";
  }
}
