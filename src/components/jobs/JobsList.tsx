"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { JobWithMatch } from "@/types";
import JobCard from "./JobCard";
import { RefreshCw, Loader2, Search, Star, Clock } from "lucide-react";
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
    if (initialJobs.length === 0) {
      handleRefresh(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cutoff48h = useMemo(() => new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), []);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.location?.toLowerCase().includes(search.toLowerCase());

      const matchesModality =
        modality === "all" || job.modality === modality;

      const matchesPrestige =
        !onlyPrestigious || getCompanyScore(job.company) >= 65;

      const matchesRecent =
        !onlyRecent || (job.fetched_at && job.fetched_at >= cutoff48h);

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
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, already_applied: true } : j))
    );
  }

  const modalityOptions: { value: Modality; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "remote", label: "Remoto" },
    { value: "hybrid", label: "Híbrido" },
    { value: "presencial", label: "Presencial" },
  ];

  const prestigiousCount = jobs.filter(j => getCompanyScore(j.company) >= 65).length;
  const recentCount = jobs.filter(j => j.fetched_at && j.fetched_at >= cutoff48h).length;

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cargo, empresa o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Modality filter */}
        <div className="flex gap-1.5">
          {modalityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setModality(opt.value)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                modality === opt.value
                  ? "bg-primary-600 text-white border-primary-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Prestigious toggle */}
        <button
          onClick={() => setOnlyPrestigious(!onlyPrestigious)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            onlyPrestigious
              ? "bg-yellow-400 text-yellow-900 border-yellow-400 font-medium"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Star size={13} className={onlyPrestigious ? "fill-yellow-900" : ""} />
          Empresas conocidas
          {!onlyPrestigious && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-0.5">
              {prestigiousCount}
            </span>
          )}
        </button>

        {/* Recent filter */}
        <button
          onClick={() => setOnlyRecent(!onlyRecent)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            onlyRecent
              ? "bg-green-500 text-white border-green-500 font-medium"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Clock size={13} />
          Recientes
          {!onlyRecent && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-0.5">
              {recentCount}
            </span>
          )}
        </button>

        {/* Import + Refresh */}
        <ImportJobInput onImported={() => window.location.reload()} />
        <button
          onClick={() => handleRefresh(false)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Buscando..." : "Actualizar"}
        </button>
      </div>

      {/* Results count */}
      {jobs.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          Mostrando <span className="font-medium text-gray-600">{filtered.length}</span> de {jobs.length} trabajos
          {onlyPrestigious && " · Solo empresas reconocidas"}
          {search && ` · "${search}"`}
          {modality !== "all" && ` · ${modalityOptions.find(m => m.value === modality)?.label}`}
        </p>
      )}

      {/* List */}
      {refreshing && jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Loader2 size={36} className="animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Buscando trabajos en Chile...</p>
          <p className="text-gray-400 text-sm mt-1">Esto puede tomar hasta 20 segundos la primera vez</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 font-medium">
            {jobs.length === 0 ? "No se encontraron trabajos" : "Sin resultados para este filtro"}
          </p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            {jobs.length === 0
              ? "Intenta actualizando la lista."
              : "Prueba cambiando el filtro o la búsqueda."}
          </p>
          {jobs.length === 0 && (
            <button
              onClick={() => handleRefresh(false)}
              disabled={refreshing}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Buscar trabajos
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onApplied={() => handleApplied(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
