import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { PlatformProvider } from "@/shared/platform";
import { createQueryClient } from "./queryClient";

type AppProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  dehydratedState?: DehydratedState;
};

export function AppProviders({
  children,
  queryClient: providedClient,
  dehydratedState,
}: AppProvidersProps) {
  const [queryClient] = useState(() => providedClient ?? createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <PlatformProvider>{children}</PlatformProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
