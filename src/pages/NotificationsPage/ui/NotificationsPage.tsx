import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchNotificationSettings,
  fetchSettings,
  fetchUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  patchNotificationSettings,
  type InboxNotification,
  type InboxNotificationList,
  type UnreadNotificationsCount,
} from "@/entities/settings";
import { ApiError } from "@/shared/api";
import { Button, Modal } from "@/shared/ui";
import "./NotificationsPage.css";

export function NotificationsPage() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) => listNotifications({ limit: 20, offset: 0 }, signal),
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: ({ signal }) => fetchUnreadNotificationsCount(signal),
  });

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

  const readOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread"] });

      const previousList = queryClient.getQueryData<InboxNotificationList>([
        "notifications",
      ]);
      const previousUnread = queryClient.getQueryData<UnreadNotificationsCount>([
        "notifications-unread",
      ]);

      queryClient.setQueryData<InboxNotificationList>(["notifications"], (old) => {
        if (!old) return old;
        return {
          items: old.items.map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          ),
        };
      });

      const wasUnread = previousList?.items.some(
        (item) => item.id === id && !item.isRead,
      );
      if (wasUnread && previousUnread) {
        queryClient.setQueryData<UnreadNotificationsCount>(["notifications-unread"], {
          count: Math.max(0, previousUnread.count - 1),
        });
      }

      return { previousList, previousUnread };
    },
    onError: (_error, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(["notifications"], context.previousList);
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(["notifications-unread"], context.previousUnread);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread"] });

      const previousList = queryClient.getQueryData<InboxNotificationList>([
        "notifications",
      ]);
      const previousUnread = queryClient.getQueryData<UnreadNotificationsCount>([
        "notifications-unread",
      ]);

      queryClient.setQueryData<InboxNotificationList>(["notifications"], (old) => {
        if (!old) return old;
        return { items: old.items.map((item) => ({ ...item, isRead: true })) };
      });
      queryClient.setQueryData<UnreadNotificationsCount>(["notifications-unread"], {
        count: 0,
      });

      return { previousList, previousUnread };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(["notifications"], context.previousList);
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(["notifications-unread"], context.previousUnread);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
    },
  });

  const unreadCount = unreadQuery.data?.count ?? 0;
  const items = inboxQuery.data?.items ?? [];

  return (
    <section className="screen notifications-page">
      <div className="notifications-page__header">
        <h1 className="notifications-page__title">Уведомления</h1>
        <div className="notifications-page__header-actions">
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="notifications-page__read-all"
              disabled={readAllMutation.isPending}
              onClick={() => readAllMutation.mutate()}
            >
              Прочитать все
            </Button>
          ) : null}
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
      </div>

      {inboxQuery.isLoading ? (
        <p className="notifications-page__muted" aria-busy="true">
          Загрузка…
        </p>
      ) : null}

      {inboxQuery.isError ? (
        <div className="notifications-page__prefs-error" role="alert">
          <p>{messageFromError(inboxQuery.error, "Не удалось загрузить уведомления.")}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void inboxQuery.refetch()}
          >
            Повторить
          </Button>
        </div>
      ) : null}

      {inboxQuery.data && items.length === 0 ? (
        <p className="notifications-page__muted" role="status">
          Пока нет уведомлений.
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="notes">
          {items.map((item) => {
            const href = notificationHref(item);
            const className = item.isRead
              ? "notes__link"
              : "notes__link notes__link--unread";

            if (href) {
              return (
                <li key={item.id}>
                  <Link
                    className={className}
                    to={href}
                    onClick={() => {
                      if (!item.isRead) readOneMutation.mutate(item.id);
                    }}
                  >
                    <NotificationRow item={item} />
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${className} notes__link--button`}
                  onClick={() => {
                    if (!item.isRead) readOneMutation.mutate(item.id);
                  }}
                >
                  <NotificationRow item={item} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {readAllMutation.isError ? (
        <p className="notifications-page__error" role="alert">
          {messageFromError(readAllMutation.error, "Не удалось отметить уведомления.")}
        </p>
      ) : null}

      <Modal
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        title="Настройки уведомлений"
        className="notifications-page__prefs-modal"
      >
        {settingsQuery.data && !settingsQuery.data.allowNotifications ? (
          <p className="notifications-page__mute-note" role="status">
            Уведомления в чат отключены в{" "}
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => void prefsQuery.refetch()}
            >
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
                      <span
                        className="notifications-page__prefs-label"
                        id={`${id}-label`}
                      >
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

function NotificationRow({ item }: { item: InboxNotification }) {
  return (
    <>
      <span className="notes__main">
        <span className="notes__title">{item.title}</span>
        <span className="notes__body">{item.body}</span>
      </span>
      <time className="notes__time" dateTime={item.createdAt}>
        {formatNotifTime(item.createdAt)}
      </time>
    </>
  );
}

function notificationHref(item: InboxNotification): string | null {
  if (item.type === "follow_request") return "/settings#follow-requests-heading";
  if (item.reviewId) return `/reviews/${item.reviewId}`;
  if (item.actorId) return `/profiles/${item.actorId}`;
  return null;
}

function formatNotifTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function messageFromError(
  error: unknown,
  fallback = "Не удалось загрузить настройки.",
): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
