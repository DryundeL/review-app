import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError } from "@/shared/api";
import { codeLifetimeLabel, normalizeCode, normalizeEmail } from "@/shared/lib/email";
import { useSecondsLeft } from "@/shared/hooks";
import { Button, Input } from "@/shared/ui";
import {
  EMAIL_RESEND_MS,
  confirmEmailLogin,
  emailFlowMessage,
  requestEmailLogin,
} from "../api/emailApi";
import { acceptAccessToken } from "../model/authController";
import { useAbortableRequest } from "../model/useAbortableRequest";
import "./LoginScreen.css";

type EmailLoginProps = {
  onClose: () => void;
};

export function EmailLogin({ onClose }: EmailLoginProps) {
  const { busy, run } = useAbortableRequest();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(resendAt);
  const normalizedDraft = normalizeEmail(draft);
  const cooling = secondsLeft > 0 && sentTo !== null && normalizedDraft === sentTo;

  useEffect(() => {
    document
      .getElementById(pending ? "email-login-code" : "email-login-address")
      ?.focus();
  }, [pending]);

  function rememberSend(address: string) {
    setSentTo(address);
    setResendAt(Date.now() + EMAIL_RESEND_MS);
  }

  function noteRateLimit(caught: unknown, address: string): boolean {
    if (
      !(caught instanceof ApiError) ||
      (caught.status !== 429 && caught.code !== "RATE_LIMITED")
    ) {
      return false;
    }
    rememberSend(address);
    setInfo("Код на этот адрес уже запрашивали. Подождите минуту.");
    return true;
  }

  async function sendAddress(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!normalizedDraft || cooling) {
      if (!normalizedDraft) setError("Проверьте адрес почты.");
      return;
    }
    try {
      const outcome = await run((signal) => requestEmailLogin(normalizedDraft, signal));
      if (!outcome.ok) return;
      rememberSend(normalizedDraft);
      setPending(normalizedDraft);
      setCode("");
      setInfo(
        `Если ${normalizedDraft} привязан к аккаунту, код уже в письме. Действует ${codeLifetimeLabel(outcome.value.expiresIn)}.`,
      );
    } catch (caught) {
      if (!noteRateLimit(caught, normalizedDraft))
        setError(emailFlowMessage(caught, "address"));
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!pending) return;
    setError(null);
    const normalized = normalizeCode(code);
    if (!normalized) {
      setError("Код — это 6 цифр.");
      return;
    }
    try {
      const outcome = await run((signal) =>
        confirmEmailLogin(pending, normalized, signal),
      );
      if (!outcome.ok) return;
      acceptAccessToken(outcome.value);
    } catch (caught) {
      if (!noteRateLimit(caught, pending)) setError(emailFlowMessage(caught, "login"));
    }
  }

  async function resend() {
    if (!pending || secondsLeft > 0 || busy) return;
    setError(null);
    try {
      const outcome = await run((signal) => requestEmailLogin(pending, signal));
      if (!outcome.ok) return;
      rememberSend(pending);
      setInfo(
        `Если ${pending} привязан к аккаунту, код уже в письме. Действует ${codeLifetimeLabel(outcome.value.expiresIn)}.`,
      );
    } catch (caught) {
      if (!noteRateLimit(caught, pending)) setError(emailFlowMessage(caught, "address"));
    }
  }

  return (
    <div className="login-screen__form">
      {pending ? (
        <form onSubmit={(event) => void confirm(event)} noValidate>
          <Field id="email-login-code" label="Код из письма">
            <Input
              id="email-login-code"
              name="one-time-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(error, info)}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
            />
          </Field>
          <Messages error={error} info={info} />
          <div className="login-screen__form-actions">
            <Button
              type="submit"
              className="login-screen__action"
              disabled={busy || code.length !== 6}
            >
              Войти
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="login-screen__action"
              disabled={busy || secondsLeft > 0}
              onClick={() => void resend()}
            >
              {secondsLeft > 0 ? `Повторить через ${secondsLeft}` : "Отправить снова"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setCode("");
                setError(null);
              }}
            >
              Другая почта
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={(event) => void sendAddress(event)} noValidate>
          <Field id="email-login-address" label="Почта">
            <Input
              id="email-login-address"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={254}
              placeholder="name@example.com"
              value={draft}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(error, info)}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
            />
          </Field>
          <Messages error={error} info={info} />
          <div className="login-screen__form-actions">
            <Button
              type="submit"
              className="login-screen__action"
              disabled={busy || cooling}
            >
              {cooling ? `Повторить через ${secondsLeft}` : "Получить код"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              К входу через Telegram
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="login-screen__field" htmlFor={id}>
      {label}
      {children}
    </label>
  );
}

function Messages({ error, info }: { error: string | null; info: string | null }) {
  return (
    <>
      {info ? (
        <p id="email-login-status" className="login-screen__status" role="status">
          {info}
        </p>
      ) : null}
      {error ? (
        <p id="email-login-error" className="login-screen__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function describedBy(error: string | null, info: string | null): string | undefined {
  const ids = [
    info ? "email-login-status" : null,
    error ? "email-login-error" : null,
  ].filter((id): id is string => id !== null);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
