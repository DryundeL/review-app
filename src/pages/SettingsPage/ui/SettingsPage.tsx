import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchSettings,
  patchSettings,
  type PatchSettingsInput,
} from "@/entities/settings";
import { EmailBind, useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import "./SettingsPage.css";

const LANGUAGE_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
] as const;

export function SettingsPage() {
  const { profile } = useAuthSession();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => fetchSettings(signal),
  });

  const saveMutation = useMutation({
    mutationFn: (input: PatchSettingsInput) => patchSettings(input),
    onSuccess: (data) => {
      setSaveError(null);
      queryClient.setQueryData(["settings"], data);
    },
    onError: (error) => {
      setSaveError(messageFromError(error));
    },
  });

  const settings = settingsQuery.data ?? null;
  const languageLabel = settings
    ? (LANGUAGE_OPTIONS.find((option) => option.value === settings.language)?.label ??
      settings.language)
    : "";
  const knownLanguage = settings
    ? LANGUAGE_OPTIONS.some((option) => option.value === settings.language)
    : false;
  const settingsFailed = settingsQuery.isError || (!settingsQuery.isLoading && !settings);

  return (
    <section className="settings-page screen" aria-busy={settingsQuery.isLoading}>
      <h1>Настройки</h1>

      {settingsQuery.isLoading ? <p className="settings-page__muted">Загрузка…</p> : null}

      {settingsFailed ? (
        <>
          <p role="alert">
            {messageFromError(settingsQuery.error, "Не удалось загрузить настройки.")}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void settingsQuery.refetch()}
          >
            Повторить
          </Button>
        </>
      ) : null}

      {settings ? (
        <ul className="settings-page__list">
          <li className="settings-page__row">
            <div className="settings-page__copy">
              <span className="settings-page__label">Язык</span>
              <span className="settings-page__hint">Локаль Mini App</span>
            </div>
            <label className="settings-page__select">
              <span className="sr-only">Язык</span>
              <select
                value={settings.language}
                aria-label="Язык"
                disabled={saveMutation.isPending}
                onChange={(event) => {
                  saveMutation.mutate({ language: event.target.value });
                }}
              >
                {!knownLanguage ? (
                  <option value={settings.language}>{settings.language}</option>
                ) : null}
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="settings-page__select-face" aria-hidden>
                {languageLabel}
                <SelectCaret />
              </span>
            </label>
          </li>

          <li className="settings-page__row">
            <div className="settings-page__copy">
              <span className="settings-page__label" id="settings-mute-label">
                Присылать уведомление в чат
              </span>
            </div>
            <button
              id="settings-mute"
              type="button"
              className="ui-switch"
              role="switch"
              aria-checked={settings.allowNotifications}
              aria-labelledby="settings-mute-label"
              disabled={saveMutation.isPending}
              onClick={() => {
                saveMutation.mutate({ allowNotifications: !settings.allowNotifications });
              }}
            >
              <span className="ui-switch__thumb" aria-hidden />
            </button>
          </li>
        </ul>
      ) : null}

      {saveError ? (
        <p className="settings-page__error" role="alert">
          {saveError}
        </p>
      ) : null}

      {settingsQuery.isLoading ? null : <EmailBind email={profile?.email} />}
    </section>
  );
}

function SelectCaret() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
      <path
        d="M3 4.5 6 8l3-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function messageFromError(
  error: unknown,
  fallback = "Не удалось сохранить настройки.",
): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
