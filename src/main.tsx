import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { redirectBrowserToTelegramIfNeeded } from "@/shared/platform";
import "@/app/styles/index.css";

if (!redirectBrowserToTelegramIfNeeded()) {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element #root not found");
  }

  createRoot(rootElement).render(<App />);
}
