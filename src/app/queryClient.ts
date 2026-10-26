import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api";

/** Новый экземпляр на каждый SSR-запрос; в браузере — на время жизни приложения. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && [400, 401, 404, 429].includes(error.status))
            return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
