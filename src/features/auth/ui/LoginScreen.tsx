import { useEffect } from "react";
import logoUrl from "@/assets/review-hub-logo.png";
import { Button } from "@/shared/ui";
import { useAuthSession } from "../model/useAuthSession";
import { isTelegramLoginUrl } from "../model/telegramLoginUrl";
import "./LoginScreen.css";

const REOPEN_MINI_APP =
  "Не удалось подтвердить сессию Telegram. Закройте Mini App и откройте его снова: Telegram выдаст новые данные для входа.";

export function LoginScreen() {
  const session = useAuthSession();
  const fallbackUrl =
    session.fallbackUrl && isTelegramLoginUrl(session.fallbackUrl) ? session.fallbackUrl : null;
  const showBrowserLogin =
    !session.isMiniApp &&
    (session.phase === "anonymous" ||
      session.phase === "denied" ||
      session.phase === "expired" ||
      (session.phase === "failed" && !session.hasToken));
  const showRetry = session.phase === "failed" && (session.isMiniApp || session.hasToken);
  const busy = session.phase === "booting" || session.phase === "authenticating";

  useEffect(() => {
    if (!showBrowserLogin && !showRetry) return;
    document.getElementById("login-action")?.focus();
  }, [showBrowserLogin, showRetry, session.phase]);

  return (
    <main className="login-screen">
      <div className="login-screen__panel">
        <h1 className="login-screen__title">
          <img className="login-screen__logo" src={logoUrl} alt="Review Hub" width={2172} height={724} />
        </h1>
        <p className="login-screen__text" role="status" aria-live="polite" aria-busy={busy}>
          {messageFor(session.phase, session.message)}
        </p>
        {session.phase === "awaiting_confirmation" && fallbackUrl ? (
          <a className="login-screen__link" href={fallbackUrl} target="_blank" rel="noopener noreferrer">
            Открыть Telegram
          </a>
        ) : null}
        {showBrowserLogin ? (
          <Button id="login-action" className="login-screen__action" onClick={session.startBrowserLogin}>
            Войти через Telegram
          </Button>
        ) : null}
        {showRetry ? (
          <Button id="login-action" className="login-screen__action" onClick={session.retryMiniAppLogin}>
            Повторить
          </Button>
        ) : null}
      </div>
    </main>
  );
}

function messageFor(phase: ReturnType<typeof useAuthSession>["phase"], failure: string | null): string {
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
      return "Войдите через Telegram, чтобы открыть отзывы.";
    case "authenticated":
      return "";
  }
}
