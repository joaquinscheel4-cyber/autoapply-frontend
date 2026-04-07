"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { JobWithMatch } from "@/types";
import JobCard from "./JobCard";
import { RefreshCw, Loader2 } from "lucide-react";

export default function JobsList({ initialJobs }: { initialJobs: JobWithMatch[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-buscar si no hay trabajos al cargar
  useEffect(() => {
    if (initialJobs.length === 0) {
      handleRefresh(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh(silent = false) {
    setRefreshing(true);
    if (!silent) toast.info("Buscando trabajos en Chile...");

    try {
      const res = await fetch("/api/jobs/search", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error desconocido");
      }

      if (data.total === 0) {
        toast.warning("JSearch no devolvió resultados ahora. Intenta en unos minutos.");
      } else {
        toast.success(`¡${data.found} trabajos cargados!`);
      }

      // Recargar la página para mostrar los nuevos trabajos desde DB
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al buscar trabajos";
      toast.error(msg);
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  function handleApplied(jobId: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, already_applied: true } : j))
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => handleRefresh(false)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Buscando..." : "Actualizar trabajos"}
        </button>
      </div>

      {refreshing && jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Loader2 size={36} className="animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Buscando trabajos en Chile...</p>
          <p className="text-gray-400 text-sm mt-1">
            Esto puede tomar hasta 20 segundos la primera vez
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 font-medium">No se encontraron trabajos</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            JSearch no devolvió resultados para tus roles. Prueba actualizando o ajusta tus preferencias.
          </p>
          <button
            onClick={() => handleRefresh(false)}
            disabled={refreshing}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onApplied={() => handleApplied(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
