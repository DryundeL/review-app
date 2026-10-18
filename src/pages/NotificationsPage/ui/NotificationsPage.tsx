import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchNotificationSettings,
  fetchSettings,
  patchNotificationSettings,
} from "@/entities/settings";
import { ApiError } from "@/shared/api";
import { Button, Modal } from "@/shared/ui";
import "./NotificationsPage.css";

const ITEMS = [
  { id: "n1", href: "/reviews/r-frieren", text: "Плюс к обзору о Фрирен" },
  { id: "n2", href: "/reviews/r-aot", text: "Комментарий к обзору «Атаки титанов»" },
  { id: "n3", href: "/profile", text: "Новая подписка на профиль" },
] as const;

export function NotificationsPage() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ["notification-settings"],
    queryFn: ({ signal }) => fetchNotificationSettings(signal),
    enabled: prefsOpen,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
    enabled: prefsOpen,
  });

  const prefsMutation = useMutation({
    mutationFn: (input: { name: string; enabled: boolean }) =>
      patchNotificationSettings({ items: [input] }),
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-settings"], data);
    },
  });

  return (
    <section className="screen notifications-page">
      <div className="notifications-page__header">
        <h1 className="notifications-page__title">Уведомления</h1>
        <Button
          type="button"
          variant="ghost"
          className="notifications-page__gear"
          aria-label="Настройки уведомлений"
          onClick={() => setPrefsOpen(true)}
        >
          <SettingsGearIcon />
        </Button>
      </div>

      <ul className="notes">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <Link className="notes__link" to={item.href}>
              {item.text}
            </Link>
          </li>
        ))}
      </ul>

      <Modal
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        title="Настройки уведомлений"
        className="notifications-page__prefs-modal"
      >
        {settingsQuery.data?.notificationsMuted ? (
          <p className="notifications-page__mute-note" role="status">
            Все пуши отключены в{" "}
            <Link className="notifications-page__inline-link" to="/settings">
              Настройках
            </Link>
            .
          </p>
        ) : null}

        {prefsQuery.isLoading ? (
          <p className="notifications-page__muted" aria-busy="true">
            Загрузка…
          </p>
        ) : null}

        {prefsQuery.isError ? (
          <div className="notifications-page__prefs-error" role="alert">
            <p>{messageFromError(prefsQuery.error)}</p>
            <Button type="button" variant="secondary" onClick={() => void prefsQuery.refetch()}>
              Повторить
            </Button>
          </div>
        ) : null}

        {prefsQuery.data ? (
          prefsQuery.data.items.length === 0 ? (
            <p className="notifications-page__muted" role="status">
              Нет доступных типов уведомлений.
            </p>
          ) : (
            <ul className="notifications-page__prefs-list">
              {prefsQuery.data.items.map((item) => {
                const id = `notif-pref-${item.name}`;
                const pending =
                  prefsMutation.isPending && prefsMutation.variables?.name === item.name;
                return (
                  <li key={item.name} className="notifications-page__prefs-row">
                    <div className="notifications-page__prefs-copy">
                      <span className="notifications-page__prefs-label" id={`${id}-label`}>
                        {item.title}
                      </span>
                      <span className="notifications-page__prefs-hint" id={`${id}-hint`}>
                        {item.text}
                      </span>
                    </div>
                    <button
                      id={id}
                      type="button"
                      className="ui-switch"
                      role="switch"
                      aria-checked={item.enabled}
                      aria-labelledby={`${id}-label`}
                      aria-describedby={`${id}-hint`}
                      disabled={pending || prefsMutation.isPending}
                      onClick={() => {
                        prefsMutation.mutate({ name: item.name, enabled: !item.enabled });
                      }}
                    >
                      <span className="ui-switch__thumb" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}

        {prefsMutation.isError ? (
          <p className="notifications-page__error" role="alert">
            {messageFromError(prefsMutation.error)}
          </p>
        ) : null}
      </Modal>
    </section>
  );
}

function SettingsGearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.6.24-1.15.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.66.22l2.39-.96c.48.39 1.03.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.6-.24 1.15-.55 1.63-.94l2.39.96c.24.12.52.02.66-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  );
}

function messageFromError(error: unknown, fallback = "Не удалось загрузить настройки."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
