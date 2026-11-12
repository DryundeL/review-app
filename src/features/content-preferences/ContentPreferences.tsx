import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchContentPreferences,
  fetchReviewTypes,
  saveContentPreferences,
  type ContentPreferences,
  type ReviewType,
} from "@/entities/settings";
import {
  updateSessionOnboarding,
  refreshSessionProfile,
  useAuthSession,
} from "@/features/auth";
import { ApiError } from "@/shared/api";
import { getAccessToken } from "@/shared/api/session";
import { Button, Modal } from "@/shared/ui";
import "./ContentPreferences.css";

export function ContentPreferencesOnboarding() {
  const { phase, profile, hasToken, retryMiniAppLogin } = useAuthSession();
  if (phase === "failed" && hasToken)
    return (
      <section className="content-preferences screen">
        <p role="alert">Не удалось загрузить ваш профиль и проверить предпочтения.</p>
        <Button onClick={retryMiniAppLogin}>Повторить</Button>
      </section>
    );
  if (phase !== "authenticated" || !profile || profile.needsOnboarding !== true)
    return null;
  return <PreferencesDialog key={profile.id} accountId={profile.id} onboarding />;
}

export function ContentPreferencesSettings() {
  const { phase, profile } = useAuthSession();
  const [editing, setEditing] = useState(false);
  if (phase !== "authenticated" || !profile) return null;
  return (
    <section className="content-preferences">
      <h2>Предпочтения контента</h2>
      <p>Выберите любимые типы контента.</p>
      <Button variant="secondary" onClick={() => setEditing(true)}>
        Изменить предпочтения
      </Button>
      {editing && (
        <PreferencesDialog
          key={profile.id}
          accountId={profile.id}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function PreferencesDialog({
  accountId,
  onboarding = false,
  onClose,
}: {
  accountId: string;
  onboarding?: boolean;
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const [token] = useState(getAccessToken);
  const [dismissed, setDismissed] = useState(false);
  const [items, setItems] = useState<ReviewType[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [uncertain, setUncertain] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const mounted = useRef(false);

  const current = useCallback(
    (signal: AbortSignal) => !signal.aborted && getAccessToken() === token,
    [token],
  );
  function apply(data: ContentPreferences) {
    queryClient.setQueryData(["content-preferences", accountId], data);
    updateSessionOnboarding(accountId, token, data.needsOnboarding);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [types, saved] = await Promise.all([
          fetchReviewTypes(request.signal),
          onboarding ? Promise.resolve(null) : fetchContentPreferences(request.signal),
        ]);
        if (!current(request.signal)) return;
        setItems(types);
        if (saved) {
          queryClient.setQueryData(["content-preferences", accountId], saved);
          const active = saved.types.filter((code) =>
            types.some((item) => item.code === code),
          );
          setSelected(active);
          if (active.length !== saved.types.length)
            setNotice("Некоторые прежние типы больше недоступны и исключены из выбора.");
        }
      } catch (caught) {
        if (current(request.signal))
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Не удалось загрузить предпочтения.",
          );
      } finally {
        if (current(request.signal)) setLoading(false);
      }
    }
    void load();
    return () => request.abort();
  }, [retry, accountId, onboarding, queryClient, current]);

  async function save() {
    if (saving.current || loading || !items?.length || !selected.length) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    const request = new AbortController();
    controller.current = request;
    try {
      // После неизвестного результата PUT сначала сверяем серверное состояние.
      if (uncertain) {
        const saved = await fetchContentPreferences(request.signal);
        if (!current(request.signal)) return;
        apply(saved);
        setUncertain(false);
        setNotice(
          "Состояние сервера проверено. Черновик сохранён; нажмите «Сохранить», чтобы применить его.",
        );
        return;
      }
      const data = await saveContentPreferences(selected, request.signal);
      if (!current(request.signal)) return;
      apply(data);
      if (!data.needsOnboarding) {
        setDismissed(true);
        onClose?.();
      }
    } catch (caught) {
      if (!current(request.signal)) return;
      setError(
        caught instanceof ApiError ? caught.message : "Не удалось сохранить выбор.",
      );
      if (
        caught instanceof ApiError &&
        caught.status === 422 &&
        caught.code === "VALIDATION_ERROR"
      ) {
        try {
          const types = await fetchReviewTypes(request.signal);
          if (!current(request.signal)) return;
          setItems(types);
          setSelected((old) =>
            old.filter((code) => types.some((item) => item.code === code)),
          );
          setNotice("Список типов обновлён. Проверьте выбор и сохраните снова.");
        } catch {
          /* Ошибка сохранения и черновик остаются видимыми. */
        }
      } else if (caught instanceof ApiError && caught.status === 404) {
        refreshSessionProfile();
      } else if (
        !(caught instanceof ApiError) ||
        caught.status === 0 ||
        caught.status >= 500
      ) {
        setUncertain(true);
      }
    } finally {
      saving.current = false;
      if (mounted.current && current(request.signal)) setBusy(false);
    }
  }

  return (
    <Modal
      open={!dismissed}
      title="Что вам нравится?"
      onOpenChange={(open) => {
        if (!open && !saving.current) {
          controller.current?.abort();
          setDismissed(true);
          onClose?.();
        }
      }}
    >
      <div className="content-preferences" aria-busy={loading || busy}>
        <p>Выберите от 1 до 32 типов контента. Выбор можно изменить в настройках.</p>
        {loading ? <p role="status">Загрузка…</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {notice ? <p role="status">{notice}</p> : null}
        {!loading && !items ? (
          <Button onClick={() => setRetry((value) => value + 1)}>Повторить</Button>
        ) : null}
        {!loading && items?.length === 0 ? (
          <>
            <p role="status">Типы контента временно недоступны.</p>
            <Button onClick={() => setRetry((value) => value + 1)}>Повторить</Button>
          </>
        ) : null}
        {items?.length ? (
          <>
            <fieldset disabled={loading || busy} className="content-preferences__choices">
              <legend className="sr-only">Любимые типы контента</legend>
              {items.map((item) => (
                <label key={item.code} className="content-preferences__choice">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.code)}
                    disabled={!selected.includes(item.code) && selected.length >= 32}
                    onChange={(event) =>
                      setSelected((old) =>
                        event.target.checked
                          ? [...old, item.code]
                          : old.filter((code) => code !== item.code),
                      )
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </fieldset>
            <Button
              disabled={loading || busy || selected.length === 0}
              onClick={() => void save()}
            >
              {busy ? "Сохранение…" : uncertain ? "Проверить сохранение" : "Сохранить"}
            </Button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
