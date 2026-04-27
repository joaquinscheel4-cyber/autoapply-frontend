"use client";

import { useState } from "react";
import { toast } from "sonner";
import { JobWithMatch } from "@/types";
import { getCompanyScore } from "@/lib/company-ranking";
import { getCompanyLogoUrl, getCompanyInitials } from "@/lib/company-logos";
import { MapPin, ExternalLink, CheckCircle2, Loader2, Star, ChevronDown, ChevronUp, Zap, Send, UserCheck } from "lucide-react";

function CompanyAvatar({ company }: { company: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getCompanyLogoUrl(company);
  const initials = getCompanyInitials(company);

  const colors = [
    "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700", "bg-rose-100 text-rose-700",
  ];
  const colorClass = colors[company.charCodeAt(0) % colors.length];

  return (
    <div className="flex flex-col items-center gap-1.5 w-14 shrink-0">
      {logoUrl && !imgError ? (
        <div className="w-12 h-12 rounded-xl border border-slate-100 bg-white flex items-center justify-center overflow-hidden shadow-card">
          <img
            src={logoUrl}
            alt={company}
            className="w-9 h-9 object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-card ${colorClass}`}>
          {initials}
        </div>
      )}
      <span className="text-[10px] text-slate-400 text-center leading-tight line-clamp-2 w-full">
        {company}
      </span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
    score >= 45 ? "text-amber-700 bg-amber-50 border-amber-100" :
    "text-slate-500 bg-slate-50 border-slate-200";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score}% match
    </span>
  );
}

function ATSBadge({ link }: { link: string }) {
  const url = link?.toLowerCase() || "";
  if (url.includes("greenhouse")) return <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-md font-medium border border-green-100">Greenhouse</span>;
  if (url.includes("lever")) return <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[10px] rounded-md font-medium border border-violet-100">Lever</span>;
  if (url.includes("workday")) return <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded-md font-medium border border-orange-100">Workday</span>;
  if (url.includes("smartrecruiters")) return <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-md font-medium border border-blue-100">SmartRecruiters</span>;
  return null;
}

const modalityConfig: Record<string, { label: string; color: string }> = {
  remote: { label: "Remoto", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  hybrid: { label: "Híbrido", color: "bg-blue-50 text-blue-700 border-blue-100" },
  presencial: { label: "Presencial", color: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function JobCard({ job, onApplied }: { job: JobWithMatch; onApplied: () => void }) {
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<{
    success: boolean; message: string; method: string;
    cover_letter?: string; apply_link?: string;
  } | null>(null);

  const score = job.match.score;
  const companyScore = getCompanyScore(job.company);
  const modality = job.modality ? modalityConfig[job.modality] : null;

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
    <div className={`bg-white rounded-2xl border transition-all duration-200 group ${
      job.already_applied
        ? "border-slate-100 opacity-75"
        : "border-slate-100 hover:border-slate-200 hover:shadow-card-hover"
    }`}>
      <div className="p-4 sm:p-5 flex items-start gap-4">
        <CompanyAvatar company={job.company} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                {companyScore >= 85 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                    <Star size={9} className="fill-amber-500 text-amber-500" /> Top
                  </span>
                )}
                <ScoreBadge score={score} />
                {modality && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${modality.color}`}>
                    {modality.label}
                  </span>
                )}
                {job.apply_link && <ATSBadge link={job.apply_link} />}
                {job.recruiter_email && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                    <UserCheck size={9} /> Contacto directo
                  </span>
                )}
                {job.already_applied && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                    <CheckCircle2 size={9} /> Postulado
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-slate-900 text-[15px] leading-snug">{job.title}</h3>

              {/* Location */}
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={11} className="text-slate-300 shrink-0" />
                <span className="text-xs text-slate-400 truncate">{job.location}</span>
              </div>

              {/* Skills */}
              {job.match.matchedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {job.match.matchedSkills.slice(0, 5).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-md text-[10px] font-medium border border-primary-100">
                      {skill}
                    </span>
                  ))}
                  {job.match.missingSkills.length > 0 && (
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[10px] border border-slate-200">
                      +{job.match.missingSkills.length} sin match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions column */}
            <div className="flex flex-col gap-2 items-end shrink-0">
              {!job.already_applied ? (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
                >
                  {applying ? (
                    <><Loader2 size={13} className="animate-spin" /> Postulando...</>
                  ) : (
                    <><Send size={13} /> Postular</>
                  )}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium px-3 py-2">
                  <CheckCircle2 size={14} /> Enviada
                </span>
              )}

              <div className="flex items-center gap-2">
                {job.apply_link && (
                  <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                    <ExternalLink size={10} /> Ver oferta
                  </a>
                )}

                {(result?.cover_letter || job.match.reasons.length > 0) && (
                  <button onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {expanded ? "Ocultar" : "Detalle"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-slate-50 p-4 space-y-3 bg-slate-50/40 rounded-b-2xl animate-slide-up">
          {result && (
            <div className={`p-3.5 rounded-xl text-sm border ${result.success
              ? "bg-emerald-50 text-emerald-800 border-emerald-100"
              : "bg-blue-50 text-blue-800 border-blue-100"
            }`}>
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                {result.success
                  ? <><CheckCircle2 size={14} /> Postulación enviada</>
                  : <><Zap size={14} /> Carta generada — postula manualmente</>
                }
              </p>
              <p className="text-xs opacity-75">{result.message}</p>
              {!result.success && result.apply_link && (
                <a href={result.apply_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold underline">
                  <ExternalLink size={10} /> Ir al formulario →
                </a>
              )}
            </div>
          )}

          {/* Recruiter contact info — never show the email */}
          {(job.recruiter_name || job.recruiter_title) && (
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                <UserCheck size={13} className="text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  {job.recruiter_name || "Reclutador identificado"}
                </p>
                {job.recruiter_title && (
                  <p className="text-[11px] text-emerald-600">{job.recruiter_title}</p>
                )}
              </div>
            </div>
          )}

          {result?.cover_letter && (
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Carta generada por IA</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.cover_letter}</p>
            </div>
          )}

          {!result && job.match.reasons.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Por qué es un buen match</p>
              <ul className="space-y-1">
                {job.match.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span> {r}
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
