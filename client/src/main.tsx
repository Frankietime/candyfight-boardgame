import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { LobbyProvider } from "./lib/LobbyProvider";
import { BACKEND_URL } from "./config";
import { Theme } from "@radix-ui/themes";
import "./styles.scss";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LobbyProvider serverUrl={BACKEND_URL}>
        <Theme appearance="inherit" scaling="110%">
          <App />
        </Theme>
      </LobbyProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
