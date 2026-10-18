import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSettings, patchSettings, type PatchSettingsInput } from "@/entities/settings";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import "./SettingsPage.css";

const LANGUAGE_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
] as const;

export function SettingsPage() {
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

  if (settingsQuery.isLoading) {
    return (
      <section className="settings-page screen" aria-busy="true">
        <h1>Настройки</h1>
        <p className="settings-page__muted">Загрузка…</p>
      </section>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <section className="settings-page screen" role="alert">
        <h1>Настройки</h1>
        <p>{messageFromError(settingsQuery.error, "Не удалось загрузить настройки.")}</p>
        <Button type="button" variant="secondary" onClick={() => void settingsQuery.refetch()}>
          Повторить
        </Button>
      </section>
    );
  }

  const settings = settingsQuery.data;
  const languageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === settings.language)?.label ??
    settings.language;
  const knownLanguage = LANGUAGE_OPTIONS.some((option) => option.value === settings.language);

  return (
    <section className="settings-page screen">
      <h1>Настройки</h1>

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
              Отключить все уведомления
            </span>
            <span className="settings-page__hint" id="settings-mute-hint">
              Глобальный mute пушей
            </span>
          </div>
          <button
            id="settings-mute"
            type="button"
            className="ui-switch"
            role="switch"
            aria-checked={settings.notificationsMuted}
            aria-labelledby="settings-mute-label"
            aria-describedby="settings-mute-hint"
            disabled={saveMutation.isPending}
            onClick={() => {
              saveMutation.mutate({ notificationsMuted: !settings.notificationsMuted });
            }}
          >
            <span className="ui-switch__thumb" aria-hidden />
          </button>
        </li>
      </ul>

      {saveError ? (
        <p className="settings-page__error" role="alert">
          {saveError}
        </p>
      ) : null}
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

function messageFromError(error: unknown, fallback = "Не удалось сохранить настройки."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
