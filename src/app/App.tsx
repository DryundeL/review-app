import { BrowserRouter } from "react-router-dom";
import type { DehydratedState } from "@tanstack/react-query";
import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/router";

export function App({ dehydratedState }: { dehydratedState?: DehydratedState }) {
  return (
    <AppProviders dehydratedState={dehydratedState}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
