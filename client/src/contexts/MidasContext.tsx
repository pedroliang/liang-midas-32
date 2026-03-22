import React, { createContext, useContext, useState, useCallback } from "react";

export interface ChannelState {
  index: number;
  label: string;
  color: string;
  faderValue: number; // 0.0 - 1.0
  isMuted: boolean;
  isSolo: boolean;
}

export interface MixerConnection {
  id?: number;
  name: string;
  ipAddress: string;
  port: number;
}

interface MidasContextType {
  connection: MixerConnection | null;
  setConnection: (conn: MixerConnection | null) => void;
  isConnected: boolean;
  setIsConnected: (v: boolean) => void;
  channels: ChannelState[];
  setChannels: (channels: ChannelState[]) => void;
  updateChannel: (index: number, partial: Partial<ChannelState>) => void;
  masterFader: number;
  setMasterFader: (v: number) => void;
  masterMuted: boolean;
  setMasterMuted: (v: boolean) => void;
}

const MidasContext = createContext<MidasContextType | null>(null);

function defaultChannels(): ChannelState[] {
  return Array.from({ length: 32 }, (_, i) => ({
    index: i + 1,
    label: `CH ${i + 1}`,
    color: "#3b82f6",
    faderValue: 0.75,
    isMuted: false,
    isSolo: false,
  }));
}

export function MidasProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<MixerConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState<ChannelState[]>(defaultChannels());
  const [masterFader, setMasterFader] = useState(0.75);
  const [masterMuted, setMasterMuted] = useState(false);

  const updateChannel = useCallback(
    (index: number, partial: Partial<ChannelState>) => {
      setChannels((prev) =>
        prev.map((ch) => (ch.index === index ? { ...ch, ...partial } : ch))
      );
    },
    []
  );

  return (
    <MidasContext.Provider
      value={{
        connection,
        setConnection,
        isConnected,
        setIsConnected,
        channels,
        setChannels,
        updateChannel,
        masterFader,
        setMasterFader,
        masterMuted,
        setMasterMuted,
      }}
    >
      {children}
    </MidasContext.Provider>
  );
}

export function useMidas() {
  const ctx = useContext(MidasContext);
  if (!ctx) throw new Error("useMidas must be used within MidasProvider");
  return ctx;
}
