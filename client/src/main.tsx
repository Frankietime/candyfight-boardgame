import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LobbyProvider } from "./lib/LobbyProvider";
import { Game } from "@candyfight/shared/Game";
import { BoardComponent } from "./components/board-component/BoardComponent";
import { BACKEND_URL } from "./config";
import { Theme } from "@radix-ui/themes";
import "././styles.scss";


const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LobbyProvider
        serverUrl={BACKEND_URL}
        gameComponents={[{ game: Game, board: BoardComponent }]}
      >
        <Theme appearance="inherit" scaling="110%">
          <App />
        </Theme>
      </LobbyProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
