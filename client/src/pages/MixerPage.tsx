import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useMidas } from "@/contexts/MidasContext";
import ChannelStrip from "@/components/ChannelStrip";
import MasterFader from "@/components/MasterFader";
import ConnectionSetup from "@/components/ConnectionSetup";
import PresetsPanel from "@/components/PresetsPanel";
import { Wifi, WifiOff, Settings, BookMarked, VolumeX, Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type SidePanel = "connection" | "presets" | null;

export default function MixerPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { channels, connection, isConnected, updateChannel } = useMidas();
  const [sidePanel, setSidePanel] = useState<SidePanel>("connection");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [compactView, setCompactView] = useState(false);

  // Load saved channel configs on mount
  const { data: channelConfigs } = trpc.midas.channelConfig.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Apply saved configs when loaded
  useState(() => {
    if (!channelConfigs) return;
    channelConfigs.forEach((cfg) => {
      updateChannel(cfg.channelIndex, {
        label: cfg.label ?? `CH ${cfg.channelIndex}`,
        color: cfg.color ?? "#3b82f6",
        faderValue: cfg.faderValue,
        isMuted: cfg.isMuted,
        isSolo: cfg.isSolo,
      });
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[oklch(0.12_0.01_240)]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[oklch(0.55_0.22_240)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[oklch(0.5_0.02_240)] text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[oklch(0.12_0.01_240)]">
        <div className="text-center space-y-6 max-w-sm px-6">
          <div className="space-y-2">
            <div className="w-16 h-16 bg-[oklch(0.55_0.22_240)] rounded-2xl flex items-center justify-center mx-auto">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Liang Solution</h1>
            <p className="text-[oklch(0.5_0.02_240)] text-sm">
              Controle remoto para mesa de som Midas M32
            </p>
          </div>
          <a
            href={getLoginUrl()}
            className="block w-full py-3 bg-[oklch(0.55_0.22_240)] text-white rounded-lg font-medium hover:bg-[oklch(0.6_0.22_240)] transition-colors text-center"
          >
            Entrar para continuar
          </a>
        </div>
      </div>
    );
  }

  const muteAllChannels = () => {
    channels.forEach((ch) => {
      updateChannel(ch.index, { isMuted: true });
    });
  };

  const unmuteAllChannels = () => {
    channels.forEach((ch) => {
      updateChannel(ch.index, { isMuted: false });
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[oklch(0.12_0.01_240)] overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 bg-[oklch(0.14_0.01_240)] border-b border-[oklch(0.2_0.02_240)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[oklch(0.55_0.22_240)] rounded-lg flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Liang Solution</h1>
            <p className="text-[10px] text-[oklch(0.5_0.02_240)] leading-none">Midas M32 Controller</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[oklch(0.16_0.01_240)] rounded-md">
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-[oklch(0.65_0.22_145)]" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-[oklch(0.5_0.02_240)]" />
          )}
          <span className="text-xs text-[oklch(0.6_0.02_240)]">
            {isConnected ? connection?.ipAddress ?? "Conectado" : "Desconectado"}
          </span>
          <div className={`led ${isConnected ? "led-green" : "led-off"}`} />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={muteAllChannels}
            title="Mutar todos os canais"
            className="flex items-center gap-1 px-2 py-1 bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] hover:bg-[oklch(0.55_0.25_25)] hover:text-white rounded text-xs transition-all"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mutar tudo</span>
          </button>
          <button
            onClick={unmuteAllChannels}
            title="Desmutar todos os canais"
            className="flex items-center gap-1 px-2 py-1 bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] hover:bg-[oklch(0.65_0.22_145)] hover:text-black rounded text-xs transition-all"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desmutar tudo</span>
          </button>
          <button
            onClick={() => setCompactView(!compactView)}
            className="px-2 py-1 bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] hover:text-white rounded text-xs transition-all"
          >
            {compactView ? "Normal" : "Compacto"}
          </button>
        </div>

        {/* Sidebar toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSidePanel(sidePanel === "presets" ? null : "presets"); setSidebarOpen(true); }}
            className={`p-1.5 rounded transition-all ${sidePanel === "presets" ? "bg-[oklch(0.55_0.22_240)] text-white" : "bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] hover:text-white"}`}
          >
            <BookMarked className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setSidePanel(sidePanel === "connection" ? null : "connection"); setSidebarOpen(true); }}
            className={`p-1.5 rounded transition-all ${sidePanel === "connection" ? "bg-[oklch(0.55_0.22_240)] text-white" : "bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] hover:text-white"}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-[oklch(0.22_0.02_240)]">
          <span className="text-xs text-[oklch(0.5_0.02_240)] hidden sm:inline">{user?.name ?? user?.email}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mixer area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex items-end gap-1 p-3 h-full min-w-max">
            {/* Channels 1-32 */}
            {channels.map((channel) => (
              <ChannelStrip
                key={channel.index}
                channel={channel}
                compact={compactView}
              />
            ))}

            {/* Divider */}
            <div className="w-px h-4/5 bg-[oklch(0.25_0.02_240)] mx-2 self-center" />

            {/* Master */}
            <MasterFader />
          </div>
        </div>

        {/* Sidebar */}
        {sidePanel && sidebarOpen && (
          <div className="w-72 shrink-0 bg-[oklch(0.14_0.01_240)] border-l border-[oklch(0.2_0.02_240)] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">
                  {sidePanel === "connection" ? "Configurar Conexão" : "Presets"}
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-[oklch(0.5_0.02_240)] hover:text-white p-1 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {sidePanel === "connection" && <ConnectionSetup />}
              {sidePanel === "presets" && <PresetsPanel />}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-[oklch(0.14_0.01_240)] border-t border-[oklch(0.2_0.02_240)] shrink-0">
        <span className="text-[10px] text-[oklch(0.35_0.02_240)]">
          Liang Solution Midas 32 — Protocolo OSC via UDP
        </span>
        <span className="text-[10px] text-[oklch(0.35_0.02_240)]">
          {channels.filter((c) => c.isMuted).length} canal(is) mutado(s) •{" "}
          {channels.filter((c) => c.isSolo).length} em solo
        </span>
      </footer>
    </div>
  );
}
