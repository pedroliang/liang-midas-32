import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useMidas } from "@/contexts/MidasContext";
import { toast } from "sonner";
import { Save, FolderOpen, Trash2, Plus } from "lucide-react";

export default function PresetsPanel() {
  const { channels, masterFader, masterMuted, setChannels, setMasterFader, setMasterMuted } = useMidas();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDesc, setPresetDesc] = useState("");

  const { data: presets, refetch } = trpc.midas.preset.list.useQuery();
  const saveMutation = trpc.midas.preset.save.useMutation({
    onSuccess: () => {
      refetch();
      setShowSaveForm(false);
      setPresetName("");
      setPresetDesc("");
      toast.success("Preset salvo com sucesso!");
    },
  });
  const deleteMutation = trpc.midas.preset.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Preset removido.");
    },
  });

  const handleSave = () => {
    if (!presetName.trim()) {
      toast.error("Informe um nome para o preset.");
      return;
    }
    saveMutation.mutate({
      name: presetName,
      description: presetDesc || undefined,
      data: {
        channels,
        masterFader,
        masterMuted,
        savedAt: new Date().toISOString(),
      },
    });
  };

  const handleLoad = (preset: any) => {
    const data = preset.data as any;
    if (data.channels) setChannels(data.channels);
    if (typeof data.masterFader === "number") setMasterFader(data.masterFader);
    if (typeof data.masterMuted === "boolean") setMasterMuted(data.masterMuted);
    toast.success(`Preset "${preset.name}" carregado!`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[oklch(0.5_0.02_240)] uppercase tracking-wider">
          Presets
        </h3>
        <button
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="flex items-center gap-1 px-2 py-1 bg-[oklch(0.55_0.22_240)] text-white rounded text-xs font-medium hover:bg-[oklch(0.6_0.22_240)] transition-colors"
        >
          <Save className="w-3 h-3" />
          Salvar atual
        </button>
      </div>

      {showSaveForm && (
        <div className="space-y-2 p-3 bg-[oklch(0.16_0.01_240)] rounded-lg border border-[oklch(0.35_0.1_240)]">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Nome do preset"
            className="w-full px-2 py-1.5 bg-[oklch(0.12_0.01_240)] border border-[oklch(0.25_0.02_240)] rounded text-sm text-white outline-none focus:border-[oklch(0.55_0.22_240)]"
          />
          <input
            type="text"
            value={presetDesc}
            onChange={(e) => setPresetDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full px-2 py-1.5 bg-[oklch(0.12_0.01_240)] border border-[oklch(0.25_0.02_240)] rounded text-sm text-white outline-none focus:border-[oklch(0.55_0.22_240)]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 py-1.5 bg-[oklch(0.55_0.22_240)] text-white rounded text-xs font-medium hover:bg-[oklch(0.6_0.22_240)] transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? "Salvando..." : "Confirmar"}
            </button>
            <button
              onClick={() => setShowSaveForm(false)}
              className="px-3 py-1.5 bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] rounded text-xs hover:bg-[oklch(0.25_0.02_240)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {presets && presets.length > 0 ? (
        <div className="space-y-1.5">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center gap-2 p-2 bg-[oklch(0.16_0.01_240)] rounded-lg border border-[oklch(0.22_0.02_240)] hover:border-[oklch(0.35_0.1_240)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{preset.name}</p>
                {preset.description && (
                  <p className="text-[10px] text-[oklch(0.5_0.02_240)] truncate">{preset.description}</p>
                )}
                <p className="text-[10px] text-[oklch(0.4_0.02_240)]">
                  {formatDate(preset.createdAt.toString())}
                </p>
              </div>
              <button
                onClick={() => handleLoad(preset)}
                className="flex items-center gap-1 px-2 py-1 bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] rounded text-xs hover:bg-[oklch(0.65_0.22_145)] hover:text-black transition-all"
              >
                <FolderOpen className="w-3 h-3" />
                Carregar
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: preset.id })}
                className="text-[oklch(0.5_0.02_240)] hover:text-[oklch(0.55_0.25_25)] p-1 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-[oklch(0.4_0.02_240)] text-xs">
          <Save className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum preset salvo ainda.</p>
          <p>Salve o estado atual da mesa para recuperar depois.</p>
        </div>
      )}
    </div>
  );
}
