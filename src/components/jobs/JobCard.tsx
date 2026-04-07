"use client";

import { useState } from "react";
import { toast } from "sonner";
import { JobWithMatch } from "@/types";
import { getCompanyScore } from "@/lib/company-ranking";
import { getCompanyLogoUrl, getCompanyInitials } from "@/lib/company-logos";
import { MapPin, ExternalLink, CheckCircle2, Loader2, Star, ChevronDown, ChevronUp, Zap } from "lucide-react";

function CompanyAvatar({ company }: { company: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getCompanyLogoUrl(company);
  const initials = getCompanyInitials(company);

  const colors = [
    "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700", "bg-rose-100 text-rose-700",
  ];
  const colorClass = colors[company.charCodeAt(0) % colors.length];

  return (
    <div className="flex flex-col items-center gap-1.5 w-16 shrink-0">
      {logoUrl && !imgError ? (
        <div className="w-14 h-14 rounded-2xl border border-gray-100 bg-white flex items-center justify-center overflow-hidden shadow-sm">
          <img
            src={logoUrl}
            alt={company}
            className="w-11 h-11 object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${colorClass}`}>
          {initials}
        </div>
      )}
      <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-2 w-full">
        {company}
      </span>
    </div>
  );
}

function ATSBadge({ link }: { link: string }) {
  const url = link?.toLowerCase() || "";
  if (url.includes("greenhouse")) return <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-xs rounded">Greenhouse</span>;
  if (url.includes("lever")) return <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-xs rounded">Lever</span>;
  if (url.includes("workday")) return <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-xs rounded">Workday</span>;
  if (url.includes("smartrecruiters")) return <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">SmartRecruiters</span>;
  return null;
}

export default function JobCard({ job, onApplied }: { job: JobWithMatch; onApplied: () => void }) {
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<{
    success: boolean; message: string; method: string;
    cover_letter?: string; apply_link?: string;
  } | null>(null);

  const score = job.match.score;
  const scoreColor =
    score >= 70 ? "text-green-600 bg-green-50" :
    score >= 45 ? "text-yellow-600 bg-yellow-50" :
    "text-gray-400 bg-gray-50";

  const modalityLabel: Record<string, string> = {
    remote: "🌐 Remoto", hybrid: "🏠 Híbrido", presencial: "🏢 Presencial",
  };

  const companyScore = getCompanyScore(job.company);

  async function handleApply() {
    setApplying(true);
    try {
      const res = await fetch("/api/applications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al postular");

      setResult({
        success: data.success,
        message: data.message,
        method: data.method || "desconocido",
        cover_letter: data.cover_letter,
        apply_link: data.apply_link,
      });
      setExpanded(true);

      if (data.success) {
        toast.success("¡Postulación enviada!");
        onApplied();
      } else {
        toast.info("Carta lista. Postula manualmente.");
        onApplied();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al postular");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="p-5 flex items-start gap-4">
        {/* Logo + nombre empresa */}
        <CompanyAvatar company={job.company} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Prestige + match */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {companyScore >= 85 && (
                  <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-medium">
                    <Star size={11} className="fill-yellow-500 text-yellow-500" /> Top empresa
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor}`}>
                  {score}% match
                </span>
                {job.already_applied && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 size={11} /> Postulado
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 text-base leading-snug">{job.title}</h3>

              {/* Location + modality */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={11} /> {job.location}
                </span>
                {job.modality && (
                  <span className="text-xs text-gray-400">
                    {modalityLabel[job.modality] || job.modality}
                  </span>
                )}
                {job.apply_link && <ATSBadge link={job.apply_link} />}
              </div>

              {/* Skills */}
              {job.match.matchedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {job.match.matchedSkills.slice(0, 4).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                      {skill}
                    </span>
                  ))}
                  {job.match.missingSkills.length > 0 && (
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-xs">
                      +{job.match.missingSkills.length} sin match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 items-end shrink-0">
              {!job.already_applied ? (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap shadow-sm"
                >
                  {applying
                    ? <><Loader2 size={13} className="animate-spin" /> Postulando...</>
                    : <><Zap size={13} /> Postular</>
                  }
                </button>
              ) : null}

              {job.apply_link && (
                <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <ExternalLink size={11} /> Ver oferta
                </a>
              )}

              {(result?.cover_letter || job.match.reasons.length > 0) && (
                <button onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {expanded ? "Ocultar" : "Detalle"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-50 p-4 space-y-3 bg-gray-50/50 rounded-b-2xl">
          {result && (
            <div className={`p-3 rounded-xl text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
              <p className="font-semibold mb-1">
                {result.success ? "✅ Postulación enviada" : "📋 Carta generada — postula manualmente"}
              </p>
              <p className="text-xs opacity-80">{result.message}</p>
              {!result.success && result.apply_link && (
                <a href={result.apply_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline">
                  <ExternalLink size={11} /> Ir al formulario →
                </a>
              )}
            </div>
          )}

          {result?.cover_letter && (
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Carta de presentación generada por IA:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.cover_letter}</p>
            </div>
          )}

          {!result && job.match.reasons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Por qué es un buen match:</p>
              <ul className="space-y-0.5">
                {job.match.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-green-500">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
