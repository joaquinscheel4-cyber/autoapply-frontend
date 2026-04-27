import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Application, Job } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import SniperToggle from "@/components/SniperToggle";
import { getCompanyLogoUrl, getCompanyInitials } from "@/lib/company-logos";
import { Briefcase, TrendingUp, Calendar, Mail, ArrowRight, CheckCircle2, Clock, XCircle, UserCheck } from "lucide-react";

function CompanyLogo({ company }: { company: string }) {
  const logoUrl = getCompanyLogoUrl(company);
  const initials = getCompanyInitials(company);
  const colors = [
    "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700",
    "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  ];
  const colorClass = colors[company.charCodeAt(0) % colors.length];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={company}
        className="w-9 h-9 object-contain rounded-xl border border-slate-100 bg-white p-0.5 shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
    );
  }
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${colorClass}`}>
      {initials}
    </div>
  );
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent: { label: "Enviada", color: "bg-emerald-50 text-emerald-700 border border-emerald-100", icon: <CheckCircle2 size={11} /> },
  pending: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border border-amber-100", icon: <Clock size={11} /> },
  failed: { label: "Error", color: "bg-red-50 text-red-600 border border-red-100", icon: <XCircle size={11} /> },
  sin_contacto: { label: "Sin contacto", color: "bg-slate-50 text-slate-500 border border-slate-200", icon: <XCircle size={11} /> },
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, parsed_cv, preferences, gmail_tokens")
    .eq("user_id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/profile/setup");

  const { data: applications } = await supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const apps = (applications || []) as (Application & { job: Job })[];

  const today = new Date().toISOString().split("T")[0];
  const todayApps = apps.filter((a) => a.created_at?.startsWith(today));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekApps = apps.filter((a) => a.created_at > weekAgo);
  const sentApps = apps.filter((a) => a.status === "sent");

  const sniperEnabled = !!profile?.preferences?.sniper_enabled;
  const gmailConnected = !!profile?.gmail_tokens;
  const firstName = profile?.parsed_cv?.name?.split(" ")[0] || null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {firstName ? `Hola, ${firstName} 👋` : "Dashboard"}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Resumen de tus postulaciones</p>
        </div>
        <Link href="/jobs"
          className="btn-primary">
          Ver trabajos <ArrowRight size={14} />
        </Link>
      </div>

      {/* Gmail Connect Banner */}
      {!gmailConnected && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Conecta tu Gmail para postular</p>
              <p className="text-xs text-slate-500 mt-0.5">Los mails salen desde tu cuenta. El reclutador ve tu nombre.</p>
            </div>
          </div>
          <a href="/api/auth/gmail"
            className="shrink-0 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm">
            Conectar Gmail →
          </a>
        </div>
      )}

      {gmailConnected && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Mail size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Gmail conectado</p>
            <p className="text-xs text-slate-500 mt-0.5">Los mails se envían directamente desde tu cuenta</p>
          </div>
          <CheckCircle2 size={18} className="text-emerald-500 ml-auto shrink-0" />
        </div>
      )}

      {/* Sniper */}
      <SniperToggle initialEnabled={sniperEnabled} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total enviadas", value: apps.length, icon: Briefcase, color: "text-primary-600", bg: "bg-primary-50", iconColor: "text-primary-500" },
          { label: "Confirmadas", value: sentApps.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", iconColor: "text-emerald-500" },
          { label: "Hoy", value: todayApps.length, icon: Calendar, color: "text-violet-600", bg: "bg-violet-50", iconColor: "text-violet-500" },
          { label: "Esta semana", value: weekApps.length, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", iconColor: "text-blue-500" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={13} className={stat.iconColor} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Applications list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Historial de postulaciones</h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full font-medium">
            {apps.length} total
          </span>
        </div>

        {apps.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase size={24} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">Sin postulaciones aún</p>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
              Activa el Modo Sniper o postula manualmente desde la lista de trabajos.
            </p>
            <Link href="/jobs" className="btn-primary">
              Ver trabajos disponibles <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {apps.map((app) => {
              const status = statusConfig[app.status] || { label: app.status, color: "bg-slate-100 text-slate-600 border border-slate-200", icon: null };
              return (
                <div key={app.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                  <CompanyLogo company={app.job?.company || "?"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {app.job?.title || "Trabajo eliminado"}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      {app.triggered_by === "sniper" && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-600 font-medium border border-primary-100">⚡ Sniper</span>
                      )}
                      {app.triggered_by === "cron" && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-100">Auto</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{app.job?.company || "—"} · {app.job?.location || "—"}</p>
                    {app.recruiter_name && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                        <UserCheck size={10} />
                        Enviado a {app.recruiter_name}
                        {app.recruiter_title && <span className="text-slate-400 font-normal">· {app.recruiter_title}</span>}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-slate-400">
                      {app.created_at ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true, locale: es }) : "—"}
                    </p>
                    {app.job?.apply_link && (
                      <a href={app.job.apply_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary-500 hover:text-primary-700 hover:underline block">
                        Ver oferta →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
