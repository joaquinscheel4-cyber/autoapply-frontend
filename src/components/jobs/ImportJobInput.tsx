"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Link2, Plus, Loader2, FileSpreadsheet, X } from "lucide-react";

export default function ImportJobInput({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "excel">("url");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImportUrl() {
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
      toast.success(`✅ "${data.job?.title}" agregado`);
      setUrl("");
      setOpen(false);
      onImported();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error importando trabajo");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportExcel(file: File) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/jobs/import-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error importando Excel");
      toast.success(`✅ ${data.inserted} trabajos nuevos importados`);
      setOpen(false);
      onImported();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error importando Excel");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
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
    <div className="flex gap-2 flex-1 flex-col sm:flex-row">
      {/* Mode tabs */}
      <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50 shrink-0">
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === "url" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Link2 size={12} /> URL
        </button>
        <button
          onClick={() => setMode("excel")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === "excel" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileSpreadsheet size={12} /> Excel
        </button>
      </div>

      {mode === "url" ? (
        <>
          <div className="relative flex-1">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              autoFocus
              placeholder="Pega el link del trabajo..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImportUrl()}
              className="w-full pl-8 pr-4 py-2 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleImportUrl}
            disabled={loading || !url.trim()}
            className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? "Importando..." : "Agregar"}
          </button>
        </>
      ) : (
        <>
          <div
            onClick={() => !loading && fileRef.current?.click()}
            className="flex-1 flex items-center gap-3 border-2 border-dashed border-primary-300 rounded-lg px-4 py-2 cursor-pointer hover:bg-primary-50 transition-colors"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-primary-500" />
            ) : (
              <FileSpreadsheet size={16} className="text-primary-500 shrink-0" />
            )}
            <span className="text-sm text-gray-500">
              {loading ? "Importando trabajos..." : "Seleccionar archivo .xlsx o .csv"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportExcel(file);
              }}
            />
          </div>
          <a
            href="/plantilla-trabajos.csv"
            download
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline whitespace-nowrap self-center"
          >
            Descargar plantilla
          </a>
        </>
      )}

      <button
        onClick={() => { setOpen(false); setUrl(""); setMode("url"); }}
        className="text-gray-400 hover:text-gray-600 self-center"
      >
        <X size={16} />
      </button>
    </div>
  );
}
