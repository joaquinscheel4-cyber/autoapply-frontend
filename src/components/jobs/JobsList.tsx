"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { JobWithMatch } from "@/types";
import JobCard from "./JobCard";
import { RefreshCw, Loader2, Search, Star, Clock, Briefcase } from "lucide-react";
import ImportJobInput from "./ImportJobInput";
import { getCompanyScore } from "@/lib/company-ranking";

type Modality = "all" | "remote" | "hybrid" | "presencial";

export default function JobsList({ initialJobs }: { initialJobs: JobWithMatch[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState<Modality>("all");
  const [onlyPrestigious, setOnlyPrestigious] = useState(false);
  const [onlyRecent, setOnlyRecent] = useState(false);

  useEffect(() => {
    if (initialJobs.length === 0) handleRefresh(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cutoff48h = useMemo(() => new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), []);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.location?.toLowerCase().includes(search.toLowerCase());
      const matchesModality = modality === "all" || job.modality === modality;
      const matchesPrestige = !onlyPrestigious || getCompanyScore(job.company) >= 65;
      const matchesRecent = !onlyRecent || (job.fetched_at && job.fetched_at >= cutoff48h);
      return matchesSearch && matchesModality && matchesPrestige && matchesRecent;
    });
  }, [jobs, search, modality, onlyPrestigious, onlyRecent, cutoff48h]);

  async function handleRefresh(silent = false) {
    setRefreshing(true);
    if (!silent) toast.info("Buscando trabajos en Chile...");
    try {
      const res = await fetch("/api/jobs/search", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      if (data.total === 0) {
        toast.warning("No se encontraron nuevos trabajos ahora.");
      } else {
        toast.success(`¡${data.found} trabajos cargados!`);
      }
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al buscar trabajos");
    } finally {
      setRefreshing(false);
    }
  }

  function handleApplied(jobId: string) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, already_applied: true } : j)));
  }

  const prestigiousCount = jobs.filter(j => getCompanyScore(j.company) >= 65).length;
  const recentCount = jobs.filter(j => j.fetched_at && j.fetched_at >= cutoff48h).length;

  const modalityOptions: { value: Modality; label: string; emoji: string }[] = [
    { value: "all", label: "Todos", emoji: "" },
    { value: "remote", label: "Remoto", emoji: "🌐" },
    { value: "hybrid", label: "Híbrido", emoji: "🏠" },
    { value: "presencial", label: "Presencial", emoji: "🏢" },
  ];

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cargo, empresa o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {modalityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setModality(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 active:scale-[0.97] ${
                  modality === opt.value
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
                }`}
              >
                {opt.emoji && <span className="mr-1">{opt.emoji}</span>}{opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-slate-200 hidden sm:block" />

          <button
            onClick={() => setOnlyPrestigious(!onlyPrestigious)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 active:scale-[0.97] ${
              onlyPrestigious
                ? "bg-amber-400 text-amber-900 border-amber-400 shadow-sm"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
            }`}
          >
            <Star size={12} className={onlyPrestigious ? "fill-amber-900" : ""} />
            Conocidas
            {!onlyPrestigious && (
              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px] ml-0.5">
                {prestigiousCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setOnlyRecent(!onlyRecent)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 active:scale-[0.97] ${
              onlyRecent
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
            }`}
          >
            <Clock size={12} />
            Recientes
            {!onlyRecent && (
              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px] ml-0.5">
                {recentCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <ImportJobInput onImported={() => window.location.reload()} />
            <button
              onClick={() => handleRefresh(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all active:scale-[0.97]"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Buscando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {jobs.length > 0 && (
        <p className="text-xs text-slate-400 px-1">
          Mostrando{" "}
          <span className="font-semibold text-slate-600">{filtered.length}</span>
          {" "}de {jobs.length} trabajos
          {search && <span> · <span className="text-primary-600">&quot;{search}&quot;</span></span>}
          {modality !== "all" && <span> · {modalityOptions.find(m => m.value === modality)?.label}</span>}
          {onlyPrestigious && <span> · Empresas conocidas</span>}
          {onlyRecent && <span> · Últimas 48h</span>}
        </p>
      )}

      {refreshing && jobs.length === 0 ? (
        <div className="card p-16 text-center">
          <Loader2 size={32} className="animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">Buscando trabajos en Chile...</p>
          <p className="text-slate-400 text-sm mt-1">Puede tomar hasta 20 segundos la primera vez</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-slate-300" />
          </div>
          <p className="text-slate-700 font-semibold">
            {jobs.length === 0 ? "No hay trabajos cargados" : "Sin resultados para este filtro"}
          </p>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            {jobs.length === 0 ? "Intenta actualizando la lista." : "Cambia el filtro o la búsqueda."}
          </p>
          {jobs.length === 0 && (
            <button
              onClick={() => handleRefresh(false)}
              disabled={refreshing}
              className="btn-primary mx-auto"
            >
              <RefreshCw size={14} /> Buscar trabajos
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onApplied={() => handleApplied(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
