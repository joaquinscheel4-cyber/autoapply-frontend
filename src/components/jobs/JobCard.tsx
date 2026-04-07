"use client";

import { useState } from "react";
import { toast } from "sonner";
import { JobWithMatch } from "@/types";
import { getCompanyScore } from "@/lib/company-ranking";
import { getCompanyLogoUrl, getCompanyInitials } from "@/lib/company-logos";
import { MapPin, ExternalLink, CheckCircle2, Loader2, Star, ChevronDown, ChevronUp, Zap } from "lucide-react";

function CompanyLogo({ company }: { company: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getCompanyLogoUrl(company);
  const initials = getCompanyInitials(company);

  const colors = [
    "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  ];
  const colorClass = colors[company.charCodeAt(0) % colors.length];

  if (logoUrl && !imgError) {
    return (
      <div className="w-12 h-12 rounded-xl border border-gray-100 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
        <img
          src={logoUrl}
          alt={company}
          className="w-10 h-10 object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-sm ${colorClass}`}>
      {initials}
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

function CompanyPrestige({ company }: { company: string }) {
  const score = getCompanyScore(company);
  if (score >= 85) return <span title="Empresa muy reconocida"><Star size={13} className="text-yellow-400 fill-yellow-400" /></span>;
  if (score >= 70) return <span title="Empresa reconocida"><Star size={13} className="text-yellow-300 fill-yellow-300" /></span>;
  return null;
}

export default function JobCard({
  job,
  onApplied,
}: {
  job: JobWithMatch;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    method: string;
    cover_letter?: string;
    apply_link?: string;
  } | null>(null);

  const score = job.match.score;
  const scoreColor =
    score >= 70 ? "text-green-600 bg-green-50" :
    score >= 45 ? "text-yellow-600 bg-yellow-50" :
    "text-gray-500 bg-gray-100";

  const modalityLabel: Record<string, string> = {
    remote: "Remoto",
    hybrid: "Híbrido",
    presencial: "Presencial",
  };

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

      if (data.success) {
        toast.success(`¡Postulado vía ${data.method || "formulario"}!`);
        onApplied();
      } else {
        toast.info("Carta generada. Postula manualmente con el link.");
        onApplied();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al postular");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
      {/* Main row */}
      <div className="p-5 flex items-start gap-4">
        {/* Company logo */}
        <CompanyLogo company={job.company} />

        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-gray-900">{job.title}</h3>
            <CompanyPrestige company={job.company} />
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor}`}>
              {score}% match
            </span>
            {job.already_applied && result?.success && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 size={12} /> Postulado
              </span>
            )}
            {job.already_applied && !result?.success && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <CheckCircle2 size={12} /> Guardado
              </span>
            )}
          </div>

          {/* Company + location */}
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <span className="font-semibold text-gray-800 text-base">{job.company}</span>
            <span className="flex items-center gap-1 text-gray-400">
              <MapPin size={12} />
              {job.location}
            </span>
            {job.modality && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {modalityLabel[job.modality] || job.modality}
              </span>
            )}
            {job.apply_link && <ATSBadge link={job.apply_link} />}
          </div>

          {/* Skills */}
          {job.match.matchedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.match.matchedSkills.slice(0, 5).map((skill) => (
                <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  {skill}
                </span>
              ))}
              {job.match.missingSkills.length > 0 && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-xs">
                  +{job.match.missingSkills.length} faltan
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 shrink-0 items-end">
          {!job.already_applied ? (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
            >
              {applying ? (
                <><Loader2 size={14} className="animate-spin" /> Postulando...</>
              ) : (
                <><Zap size={14} /> Auto-postular</>
              )}
            </button>
          ) : null}

          {job.apply_link && (
            <a
              href={job.apply_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <ExternalLink size={12} /> Ver oferta
            </a>
          )}

          {(result?.cover_letter || job.match.reasons.length > 0) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Ocultar" : "Ver detalle"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-50 p-4 space-y-3">
          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
              <p className="font-medium mb-1">
                {result.success ? "✅ Postulación enviada automáticamente" : "📋 Carta generada — postula manualmente"}
              </p>
              <p className="text-xs opacity-80">{result.message}</p>
              {!result.success && result.apply_link && (
                <a
                  href={result.apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline"
                >
                  <ExternalLink size={11} /> Ir al formulario de postulación
                </a>
              )}
            </div>
          )}

          {result?.cover_letter && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Carta de presentación generada:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.cover_letter}
              </p>
            </div>
          )}

          {!result && job.match.reasons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">¿Por qué es un buen match?</p>
              <ul className="space-y-1">
                {job.match.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="text-green-500">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result && job.match.gaps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Brechas detectadas:</p>
              <ul className="space-y-1">
                {job.match.gaps.map((g, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
                    <span>→</span> {g}
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
