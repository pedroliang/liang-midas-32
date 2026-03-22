import { trpc } from "@/lib/trpc";
import { useMidas } from "@/contexts/MidasContext";

function faderToDb(value: number): string {
  if (value === 0) return "-∞";
  if (value >= 0.75) {
    const db = (value - 0.75) * 40 - 10;
    return `${db >= 0 ? "+" : ""}${db.toFixed(0)}`;
  }
  const db = (value / 0.75) * 60 - 60;
  return `${db.toFixed(0)}`;
}

export default function MasterFader() {
  const { connection, masterFader, setMasterFader, masterMuted, setMasterMuted } = useMidas();
  const setFaderMutation = trpc.midas.master.setFader.useMutation();
  const setMuteMutation = trpc.midas.master.setMute.useMutation();

  const handleFader = (value: number) => {
    setMasterFader(value);
    if (connection) {
      setFaderMutation.mutate({ ip: connection.ipAddress, port: connection.port, value });
    }
  };

  const toggleMute = () => {
    const newMuted = !masterMuted;
    setMasterMuted(newMuted);
    if (connection) {
      setMuteMutation.mutate({ ip: connection.ipAddress, port: connection.port, muted: newMuted });
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-2 w-20 bg-[oklch(0.16_0.01_240)] border-2 border-[oklch(0.4_0.15_240)] rounded-lg p-2 select-none"
      style={{ borderTop: "3px solid oklch(0.6 0.2 240)" }}
    >
      <span className="text-[10px] font-bold text-[oklch(0.6_0.02_240)]">MASTER</span>
      <span className="text-xs font-bold text-white">ST</span>

      <button
        onClick={toggleMute}
        className={`w-full text-[9px] font-bold py-0.5 rounded transition-all ${
          masterMuted
            ? "bg-[oklch(0.55_0.25_25)] text-white shadow-[0_0_6px_oklch(0.55_0.25_25)]"
            : "bg-[oklch(0.2_0.01_240)] text-[oklch(0.6_0.02_240)] hover:bg-[oklch(0.25_0.01_240)]"
        }`}
      >
        MUTE
      </button>

      <div className="flex flex-col items-center justify-center h-48 relative w-full">
        <div className="absolute right-1 top-[25%] w-2 h-px bg-[oklch(0.5_0.02_240)]" />
        <div className="absolute right-1 top-[25%] -translate-y-2 text-[8px] text-[oklch(0.5_0.02_240)]">0</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={masterFader}
          onChange={(e) => handleFader(parseFloat(e.target.value))}
          className="fader-vertical"
          style={{
            height: "192px",
            accentColor: masterMuted ? "oklch(0.55 0.25 25)" : "oklch(0.6 0.2 240)",
          }}
        />
      </div>

      <span className="text-[9px] font-mono text-[oklch(0.6_0.02_240)]">
        {faderToDb(masterFader)} dB
      </span>

      <div className="flex gap-1">
        <div className={`led ${masterMuted ? "led-red" : "led-green"}`} />
        <div className="led led-off" />
      </div>
    </div>
  );
}
