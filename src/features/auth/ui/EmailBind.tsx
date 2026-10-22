import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api";
import { codeLifetimeLabel, normalizeCode, normalizeEmail } from "@/shared/lib/email";
import { useSecondsLeft } from "@/shared/hooks";
import { Button, Input } from "@/shared/ui";
import {
  EMAIL_RESEND_MS,
  confirmEmailBind,
  emailFlowMessage,
  requestEmailBind,
} from "../api/emailApi";
import { refreshSessionProfile } from "../model/authController";
import { useAbortableRequest } from "../model/useAbortableRequest";
import "./EmailBind.css";

type EmailBindProps = {
  email?: string;
};

export function EmailBind({ email: savedEmail }: EmailBindProps) {
  const { busy, run } = useAbortableRequest();
  const [bound, setBound] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(resendAt);
  const shown = bound ?? savedEmail;
  const normalizedDraft = normalizeEmail(draft);
  const cooling = secondsLeft > 0 && sentTo !== null && normalizedDraft === sentTo;

  useEffect(() => {
    if (bound && savedEmail === bound) setBound(null);
  }, [bound, savedEmail]);

  useEffect(() => {
    if (!pending) return;
    document.getElementById("email-bind-code")?.focus();
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
    if (!normalizedDraft) {
      setError("Проверьте адрес почты.");
      return;
    }
    if (cooling) return;
    try {
      const outcome = await run((signal) => requestEmailBind(normalizedDraft, signal));
      if (!outcome.ok) return;
      if (outcome.value === null) {
        setBound(normalizedDraft);
        setEditing(false);
        setDraft("");
        setPending(null);
        setInfo("Эта почта уже привязана.");
        refreshSessionProfile();
        return;
      }
      rememberSend(normalizedDraft);
      setPending(normalizedDraft);
      setCode("");
      const lifetime = codeLifetimeLabel(outcome.value.expiresIn);
      const replacing = shown !== undefined && shown !== normalizedDraft;
      setInfo(
        replacing
          ? `Код отправлен на ${normalizedDraft}. Действует ${lifetime}. Прежний адрес работает, пока не подтвердите этот.`
          : `Код отправлен на ${normalizedDraft}. Действует ${lifetime}.`,
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
      const outcome = await run((signal) => confirmEmailBind(normalized, signal));
      if (!outcome.ok) return;
      setBound(pending);
      setPending(null);
      setEditing(false);
      setCode("");
      setDraft("");
      setInfo("Почта привязана. Теперь через неё можно войти.");
      refreshSessionProfile();
    } catch (caught) {
      setError(emailFlowMessage(caught, "code"));
    }
  }

  async function resend() {
    if (!pending || secondsLeft > 0 || busy) return;
    setError(null);
    try {
      const outcome = await run((signal) => requestEmailBind(pending, signal));
      if (!outcome.ok) return;
      if (outcome.value === null) {
        setBound(pending);
        setPending(null);
        setEditing(false);
        setInfo("Эта почта уже привязана.");
        refreshSessionProfile();
        return;
      }
      rememberSend(pending);
      setInfo(
        `Код отправлен на ${pending}. Действует ${codeLifetimeLabel(outcome.value.expiresIn)}.`,
      );
    } catch (caught) {
      if (!noteRateLimit(caught, pending)) setError(emailFlowMessage(caught, "address"));
    }
  }

  function startEdit() {
    setEditing(true);
    setError(null);
    setInfo(null);
    setDraft("");
    requestAnimationFrame(() => document.getElementById("email-bind-address")?.focus());
  }

  return (
    <section className="email-bind" aria-labelledby="email-bind-title">
      <div className="email-bind__copy">
        <h2 id="email-bind-title">Почта</h2>
        <p className="email-bind__hint">Чтобы входить по коду, без Telegram</p>
      </div>

      {pending ? (
        <form
          className="email-bind__form"
          onSubmit={(event) => void confirm(event)}
          noValidate
        >
          <label className="email-bind__field" htmlFor="email-bind-code">
            Код из письма
            <Input
              id="email-bind-code"
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
          </label>
          <Messages error={error} info={info} />
          <div className="email-bind__actions">
            <Button type="submit" disabled={busy || code.length !== 6}>
              Подтвердить
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || secondsLeft > 0}
              onClick={() => void resend()}
            >
              {secondsLeft > 0 ? `Повторить через ${secondsLeft}` : "Отправить снова"}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setDraft(pending);
              setPending(null);
              setCode("");
              setError(null);
            }}
          >
            Другой адрес
          </Button>
        </form>
      ) : shown && !editing ? (
        <>
          <div className="email-bind__current">
            <p className="email-bind__value">{shown}</p>
            <Button type="button" variant="secondary" onClick={startEdit}>
              Изменить
            </Button>
          </div>
          <Messages error={error} info={info} />
        </>
      ) : (
        <form
          className="email-bind__form"
          onSubmit={(event) => void sendAddress(event)}
          noValidate
        >
          {shown ? (
            <p className="email-bind__hint">
              Прежний адрес работает, пока не подтвердите новый.
            </p>
          ) : null}
          <label className="email-bind__field" htmlFor="email-bind-address">
            Адрес
            <Input
              id="email-bind-address"
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
          </label>
          <Messages error={error} info={info} />
          <Button type="submit" disabled={busy || cooling}>
            {cooling ? `Повторить через ${secondsLeft}` : "Отправить код"}
          </Button>
        </form>
      )}
    </section>
  );
}

function Messages({ error, info }: { error: string | null; info: string | null }) {
  return (
    <>
      {info ? (
        <p id="email-bind-status" className="email-bind__status" role="status">
          {info}
        </p>
      ) : null}
      {error ? (
        <p id="email-bind-error" className="email-bind__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function describedBy(error: string | null, info: string | null): string | undefined {
  const ids = [
    info ? "email-bind-status" : null,
    error ? "email-bind-error" : null,
  ].filter((id): id is string => id !== null);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
