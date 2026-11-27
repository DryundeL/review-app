import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchResult, fetchTemplate } from "../api/listsApi";
import { isOwnerView } from "../api/parseLists";
import type { Result, Template } from "./types";

/*
 * Ответ зависит от входа (Vary: Authorization), а SSR всегда гостевой:
 * при наличии сессии перезапрашиваем на монтировании. При смене аккаунта
 * AuthGate сбрасывает кеш, и запрос уходит заново уже с новым токеном.
 */

export function useTemplateQuery(id: string | undefined, accountId: string | null) {
  return useQuery({
    queryKey: ["list-template", id],
    queryFn: ({ signal }) => fetchTemplate(id!, signal),
    enabled: Boolean(id),
    retry: false,
    refetchOnMount: accountId ? "always" : true,
  });
}

export function useResultQuery(id: string | undefined, accountId: string | null) {
  return useQuery({
    queryKey: ["list-result", id],
    queryFn: ({ signal }) => fetchResult(id!, signal),
    enabled: Boolean(id),
    retry: false,
    refetchOnMount: accountId ? "always" : true,
  });
}

/**
 * Объект в виде автора, принадлежащий текущему аккаунту. Последний такой ответ
 * держится, пока запрос перезагружается (повторный вход, сброс кеша), чтобы
 * открытый редактор не размонтировался. Чужой аккаунт снимок не получает.
 */
export function useOwnerSnapshot<T extends Template | Result>(
  data: T | undefined,
  accountId: string | null,
): T | null {
  const owned = data && isOwnerView(data) && data.author.id === accountId ? data : null;
  const [snapshot, setSnapshot] = useState<T | null>(null);
  if (owned && owned !== snapshot) setSnapshot(owned);
  const current = owned ?? snapshot;
  if (!current) return null;
  // Во время повторного входа аккаунт неизвестен: экран скрыт AuthGate.
  return accountId === null || current.author.id === accountId ? current : null;
}
