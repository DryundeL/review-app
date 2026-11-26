import { useEffect } from "react";

export const UNSAVED_CHANGES_PROMPT = "Есть несохранённые изменения. Уйти?";

/** true — можно уходить. */
export function confirmLeave(dirty: boolean): boolean {
  return !dirty || window.confirm(UNSAVED_CHANGES_PROMPT);
}

/**
 * Пока есть несохранённые правки: предупреждение при закрытии/перезагрузке вкладки
 * и закрытии Mini App, подтверждение перехода по ссылкам приложения.
 * BrowserRouter не data router, `useBlocker` недоступен: ссылки перехватываются
 * в фазе захвата, а кнопки выхода страница проверяет сама через `confirmLeave`.
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const telegram = window.Telegram?.WebApp;
    telegram?.enableClosingConfirmation?.();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Старые браузеры показывают диалог только при непустом returnValue.
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (link && !confirmLeave(true)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      telegram?.disableClosingConfirmation?.();
    };
  }, [dirty]);
}
