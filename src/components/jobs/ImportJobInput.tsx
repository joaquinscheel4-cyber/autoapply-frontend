"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, Loader2 } from "lucide-react";

export default function ImportJobInput({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleImport() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error importando");

      toast.success(`✅ "${data.job?.title}" agregado a tu lista`);
      setUrl("");
      setOpen(false);
      onImported();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error importando trabajo");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        <Plus size={14} />
        Agregar trabajo
      </button>
    );
  }

  return (
    <div className="flex gap-2 flex-1">
      <div className="relative flex-1">
        <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="url"
          autoFocus
          placeholder="Pega el link de LinkedIn, portal empresa, etc..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleImport()}
          className="w-full pl-8 pr-4 py-2 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <button
        onClick={handleImport}
        disabled={loading || !url.trim()}
        className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {loading ? "Importando..." : "Agregar"}
      </button>
      <button
        onClick={() => { setOpen(false); setUrl(""); }}
        className="text-sm text-gray-400 hover:text-gray-600 px-2"
      >
        Cancelar
      </button>
    </div>
  );
}
