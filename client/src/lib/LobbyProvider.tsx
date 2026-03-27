import { LobbyClient } from "boardgame.io/client";
import React, { createContext, useContext, useMemo } from 'react';

type LobbyCtx = {
  lobby: LobbyClient;
};

const LobbyContext = createContext<LobbyCtx | null>(null);

type Props = {
  serverUrl: string;
  children: React.ReactNode;
};

export function LobbyProvider({ serverUrl, children }: Props) {

  // useMemo evita recrear el cliente en cada render
  const value = useMemo(() => {
    const lobby = new LobbyClient({ server: serverUrl });
    return { lobby };
  }, [serverUrl]);

  return (
    <LobbyContext.Provider value={value}>
      {children}
    </LobbyContext.Provider>
  );
}

export const useLobby = () => {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error('useLobby must be used within <LobbyProvider>');
  return ctx.lobby;
}
