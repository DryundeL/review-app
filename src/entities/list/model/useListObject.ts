import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { fetchResult, fetchTemplate } from "../api/listsApi";

/**
 * Ответ зависит от входа (Vary: Authorization), а SSR всегда гостевой:
 * при наличии сессии перезапрашиваем на монтировании и при смене аккаунта,
 * чтобы автор получил свои поля.
 */
function useAccountRefetch(refetch: () => unknown, accountId: string | null) {
  const previous = useRef(accountId);
  useEffect(() => {
    if (previous.current === accountId) return;
    previous.current = accountId;
    void refetch();
  }, [accountId, refetch]);
}

export function useTemplateQuery(id: string | undefined, accountId: string | null) {
  const query = useQuery({
    queryKey: ["list-template", id],
    queryFn: ({ signal }) => fetchTemplate(id!, signal),
    enabled: Boolean(id),
    retry: false,
    refetchOnMount: accountId ? "always" : true,
  });
  useAccountRefetch(query.refetch, accountId);
  return query;
}

export function useResultQuery(id: string | undefined, accountId: string | null) {
  const query = useQuery({
    queryKey: ["list-result", id],
    queryFn: ({ signal }) => fetchResult(id!, signal),
    enabled: Boolean(id),
    retry: false,
    refetchOnMount: accountId ? "always" : true,
  });
  useAccountRefetch(query.refetch, accountId);
  return query;
}
