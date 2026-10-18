import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  fetchNotificationSettings,
  fetchSettings,
  patchNotificationSettings,
} from "@/entities/settings";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import "./NotificationsPage.css";

const ITEMS = [
  { id: "n1", href: "/reviews/r-frieren", text: "Плюс к обзору о Фрирен" },
  { id: "n2", href: "/reviews/r-aot", text: "Комментарий к обзору «Атаки титанов»" },
  { id: "n3", href: "/profile", text: "Новая подписка на профиль" },
] as const;

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ["notification-settings"],
    queryFn: ({ signal }) => fetchNotificationSettings(signal),
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
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
      <h1>Уведомления</h1>

      <section className="notifications-page__prefs" aria-labelledby="notif-prefs-title">
        <h2 id="notif-prefs-title" className="notifications-page__prefs-title">
          Настройки уведомлений
        </h2>

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
                      <label className="notifications-page__prefs-label" htmlFor={id}>
                        {item.title}
                      </label>
                      <span className="notifications-page__prefs-hint">{item.text}</span>
                    </div>
                    <input
                      id={id}
                      className="notifications-page__checkbox"
                      type="checkbox"
                      checked={item.enabled}
                      disabled={pending || prefsMutation.isPending}
                      onChange={(event) => {
                        prefsMutation.mutate({ name: item.name, enabled: event.target.checked });
                      }}
                    />
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
      </section>

      <ul className="notes">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <Link className="notes__link" to={item.href}>
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function messageFromError(error: unknown, fallback = "Не удалось загрузить настройки."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
