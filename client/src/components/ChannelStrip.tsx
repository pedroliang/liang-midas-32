import { useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useMidas, ChannelState } from "@/contexts/MidasContext";
import { toast } from "sonner";

interface ChannelStripProps {
  channel: ChannelState;
  compact?: boolean;
}

// Converts linear 0-1 to dB display string
function faderToDb(value: number): string {
  if (value === 0) return "-∞";
  if (value >= 0.75) {
    const db = (value - 0.75) * 40 - 10;
    return `${db >= 0 ? "+" : ""}${db.toFixed(0)}`;
  }
  const db = (value / 0.75) * 60 - 60;
  return `${db.toFixed(0)}`;
}

const CHANNEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function ChannelStrip({ channel, compact = false }: ChannelStripProps) {
  const { connection, updateChannel } = useMidas();
  const faderRef = useRef<HTMLInputElement>(null);

  const setFaderMutation = trpc.midas.channel.setFader.useMutation();
  const setMuteMutation = trpc.midas.channel.setMute.useMutation();
  const setSoloMutation = trpc.midas.channel.setSolo.useMutation();
  const upsertConfigMutation = trpc.midas.channelConfig.upsert.useMutation();

  const sendFader = useCallback(
    (value: number) => {
      updateChannel(channel.index, { faderValue: value });
      upsertConfigMutation.mutate({ channelIndex: channel.index, faderValue: value });
      if (connection) {
        setFaderMutation.mutate({
          ip: connection.ipAddress,
          port: connection.port,
          channel: channel.index,
          value,
        });
      }
    },
    [channel.index, connection, updateChannel, setFaderMutation, upsertConfigMutation]
  );

  const toggleMute = useCallback(() => {
    const newMuted = !channel.isMuted;
    updateChannel(channel.index, { isMuted: newMuted });
    upsertConfigMutation.mutate({ channelIndex: channel.index, isMuted: newMuted });
    if (connection) {
      setMuteMutation.mutate({
        ip: connection.ipAddress,
        port: connection.port,
        channel: channel.index,
        muted: newMuted,
      });
    }
  }, [channel.index, channel.isMuted, connection, updateChannel, setMuteMutation, upsertConfigMutation]);

  const toggleSolo = useCallback(() => {
    const newSolo = !channel.isSolo;
    updateChannel(channel.index, { isSolo: newSolo });
    upsertConfigMutation.mutate({ channelIndex: channel.index, isSolo: newSolo });
    if (connection) {
      setSoloMutation.mutate({
        ip: connection.ipAddress,
        port: connection.port,
        channel: channel.index,
        solo: newSolo,
      });
    }
  }, [channel.index, channel.isSolo, connection, updateChannel, setSoloMutation, upsertConfigMutation]);

  const handleColorChange = (color: string) => {
    updateChannel(channel.index, { color });
    upsertConfigMutation.mutate({ channelIndex: channel.index, color });
  };

  const handleLabelChange = (label: string) => {
    updateChannel(channel.index, { label });
    upsertConfigMutation.mutate({ channelIndex: channel.index, label });
    if (connection && label.length > 0) {
      trpc.midas.channel.setLabel.useMutation;
    }
  };

  const faderHeight = compact ? "h-28" : "h-40";
  const stripWidth = compact ? "w-14" : "w-16";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${stripWidth} bg-[oklch(0.16_0.01_240)] border border-[oklch(0.22_0.02_240)] rounded-lg p-1.5 select-none`}
      style={{ borderTop: `3px solid ${channel.color}` }}
    >
      {/* Channel number */}
      <span className="text-[10px] font-bold text-[oklch(0.5_0.02_240)]">
        {channel.index.toString().padStart(2, "0")}
      </span>

      {/* Label */}
      <input
        type="text"
        value={channel.label}
        onChange={(e) => handleLabelChange(e.target.value)}
        maxLength={8}
        className="w-full text-center text-[10px] font-medium bg-transparent border-none outline-none text-white truncate"
        style={{ color: channel.color }}
      />

      {/* Solo button */}
      <button
        onClick={toggleSolo}
        className={`w-full text-[9px] font-bold py-0.5 rounded transition-all ${
          channel.isSolo
            ? "bg-[oklch(0.8_0.18_85)] text-black shadow-[0_0_6px_oklch(0.8_0.18_85)]"
            : "bg-[oklch(0.2_0.01_240)] text-[oklch(0.6_0.02_240)] hover:bg-[oklch(0.25_0.01_240)]"
        }`}
      >
        SOLO
      </button>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className={`w-full text-[9px] font-bold py-0.5 rounded transition-all ${
          channel.isMuted
            ? "bg-[oklch(0.55_0.25_25)] text-white shadow-[0_0_6px_oklch(0.55_0.25_25)]"
            : "bg-[oklch(0.2_0.01_240)] text-[oklch(0.6_0.02_240)] hover:bg-[oklch(0.25_0.01_240)]"
        }`}
      >
        MUTE
      </button>

      {/* Fader */}
      <div className={`flex flex-col items-center justify-center ${faderHeight} relative w-full`}>
        {/* 0dB mark */}
        <div className="absolute right-1 top-[25%] w-2 h-px bg-[oklch(0.5_0.02_240)]" />
        <div className="absolute right-1 top-[25%] -translate-y-2 text-[8px] text-[oklch(0.5_0.02_240)]">0</div>

        <input
          ref={faderRef}
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={channel.faderValue}
          onChange={(e) => sendFader(parseFloat(e.target.value))}
          className="fader-vertical"
          style={{
            height: compact ? "112px" : "160px",
            accentColor: channel.isMuted ? "oklch(0.55 0.25 25)" : channel.color,
          }}
        />
      </div>

      {/* dB value */}
      <span className="text-[9px] font-mono text-[oklch(0.6_0.02_240)]">
        {faderToDb(channel.faderValue)} dB
      </span>

      {/* Color picker dots */}
      <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
        {CHANNEL_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => handleColorChange(c)}
            className="w-2.5 h-2.5 rounded-full border transition-all"
            style={{
              background: c,
              borderColor: channel.color === c ? "white" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
