import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { AuthGate } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { PlatformProvider } from "@/shared/platform";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && [400, 401, 404, 429].includes(error.status)) {
                return false;
              }
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <AuthGate>{children}</AuthGate>
      </PlatformProvider>
    </QueryClientProvider>
  );
}
