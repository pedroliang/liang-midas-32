import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useMidas } from "@/contexts/MidasContext";
import { toast } from "sonner";
import { Wifi, WifiOff, Trash2, Plus, Check } from "lucide-react";

export default function ConnectionSetup() {
  const { connection, setConnection, isConnected, setIsConnected } = useMidas();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "Midas M32", ipAddress: "", port: 10023 });
  const [editId, setEditId] = useState<number | undefined>();

  const { data: connections, refetch } = trpc.midas.connection.list.useQuery();
  const saveMutation = trpc.midas.connection.save.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      setForm({ name: "Midas M32", ipAddress: "", port: 10023 });
      setEditId(undefined);
      toast.success("Conexão salva com sucesso!");
    },
  });
  const deleteMutation = trpc.midas.connection.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Conexão removida.");
    },
  });
  const pingMutation = trpc.midas.connection.ping.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Mesa encontrada! Conexão estabelecida.");
        setIsConnected(true);
      } else {
        toast.error("Mesa não respondeu. Verifique o IP e a rede.");
        setIsConnected(false);
      }
    },
  });

  const handleConnect = (conn: { id?: number; name: string; ipAddress: string; port: number }) => {
    setConnection({ id: conn.id, name: conn.name, ipAddress: conn.ipAddress, port: conn.port });
    pingMutation.mutate({ ip: conn.ipAddress, port: conn.port });
  };

  const handleEdit = (conn: { id?: number; name: string; ipAddress: string; port: number }) => {
    setForm({ name: conn.name, ipAddress: conn.ipAddress, port: conn.port });
    setEditId(conn.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.ipAddress) {
      toast.error("Informe o endereço IP da mesa.");
      return;
    }
    saveMutation.mutate({ ...form, id: editId });
  };

  return (
    <div className="space-y-4">
      {/* Status atual */}
      <div className="flex items-center gap-3 p-3 bg-[oklch(0.16_0.01_240)] rounded-lg border border-[oklch(0.22_0.02_240)]">
        {isConnected ? (
          <Wifi className="w-5 h-5 text-[oklch(0.65_0.22_145)]" />
        ) : (
          <WifiOff className="w-5 h-5 text-[oklch(0.5_0.02_240)]" />
        )}
        <div className="flex-1">
          {connection ? (
            <div>
              <p className="text-sm font-semibold text-white">{connection.name}</p>
              <p className="text-xs text-[oklch(0.5_0.02_240)]">
                {connection.ipAddress}:{connection.port}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[oklch(0.5_0.02_240)]">Nenhuma mesa conectada</p>
          )}
        </div>
        <div className={`led ${isConnected ? "led-green" : "led-off"}`} />
      </div>

      {/* Lista de conexões salvas */}
      {connections && connections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[oklch(0.5_0.02_240)] uppercase tracking-wider">
            Conexões salvas
          </h3>
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-2 p-2.5 bg-[oklch(0.16_0.01_240)] rounded-lg border border-[oklch(0.22_0.02_240)] hover:border-[oklch(0.35_0.1_240)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{conn.name}</p>
                <p className="text-xs text-[oklch(0.5_0.02_240)]">
                  {conn.ipAddress}:{conn.port}
                </p>
              </div>
              <button
                onClick={() => handleEdit(conn)}
                className="text-[oklch(0.5_0.02_240)] hover:text-white p-1 rounded transition-colors text-xs"
              >
                Editar
              </button>
              <button
                onClick={() => handleConnect(conn)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  connection?.id === conn.id && isConnected
                    ? "bg-[oklch(0.65_0.22_145)] text-black"
                    : "bg-[oklch(0.55_0.22_240)] text-white hover:bg-[oklch(0.6_0.22_240)]"
                }`}
              >
                {connection?.id === conn.id && isConnected ? (
                  <>
                    <Check className="w-3 h-3" /> Ativo
                  </>
                ) : (
                  "Conectar"
                )}
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: conn.id! })}
                className="text-[oklch(0.5_0.02_240)] hover:text-[oklch(0.55_0.25_25)] p-1 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de nova conexão */}
      {showForm ? (
        <div className="space-y-3 p-3 bg-[oklch(0.16_0.01_240)] rounded-lg border border-[oklch(0.35_0.1_240)]">
          <h3 className="text-sm font-semibold text-white">
            {editId ? "Editar conexão" : "Nova conexão"}
          </h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[oklch(0.5_0.02_240)]">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 bg-[oklch(0.12_0.01_240)] border border-[oklch(0.25_0.02_240)] rounded text-sm text-white outline-none focus:border-[oklch(0.55_0.22_240)]"
                placeholder="Ex: Midas M32 Principal"
              />
            </div>
            <div>
              <label className="text-xs text-[oklch(0.5_0.02_240)]">Endereço IP da mesa</label>
              <input
                type="text"
                value={form.ipAddress}
                onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 bg-[oklch(0.12_0.01_240)] border border-[oklch(0.25_0.02_240)] rounded text-sm text-white outline-none focus:border-[oklch(0.55_0.22_240)]"
                placeholder="Ex: 192.168.1.100"
              />
            </div>
            <div>
              <label className="text-xs text-[oklch(0.5_0.02_240)]">Porta UDP</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 10023 })}
                className="w-full mt-1 px-2 py-1.5 bg-[oklch(0.12_0.01_240)] border border-[oklch(0.25_0.02_240)] rounded text-sm text-white outline-none focus:border-[oklch(0.55_0.22_240)]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 py-1.5 bg-[oklch(0.55_0.22_240)] text-white rounded text-sm font-medium hover:bg-[oklch(0.6_0.22_240)] transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(undefined);
                setForm({ name: "Midas M32", ipAddress: "", port: 10023 });
              }}
              className="px-3 py-1.5 bg-[oklch(0.22_0.02_240)] text-[oklch(0.6_0.02_240)] rounded text-sm hover:bg-[oklch(0.25_0.02_240)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 w-full py-2 px-3 bg-[oklch(0.16_0.01_240)] border border-dashed border-[oklch(0.3_0.05_240)] rounded-lg text-sm text-[oklch(0.5_0.02_240)] hover:text-white hover:border-[oklch(0.55_0.22_240)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar conexão
        </button>
      )}
    </div>
  );
}
