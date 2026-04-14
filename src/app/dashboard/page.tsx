import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Application, Job } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import SniperToggle from "@/components/SniperToggle";
import { getCompanyLogoUrl, getCompanyInitials } from "@/lib/company-logos";

function CompanyLogo({ company }: { company: string }) {
  const logoUrl = getCompanyLogoUrl(company);
  const initials = getCompanyInitials(company);
  const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700"];
  const colorClass = colors[company.charCodeAt(0) % colors.length];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={company} className="w-8 h-8 object-contain rounded-lg border border-gray-100 bg-white p-0.5"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
    );
  }
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${colorClass}`}>
      {initials}
    </div>
  );
}

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
  const sniperEnabled = !!profile?.preferences?.sniper_enabled;
  const gmailConnected = !!profile?.gmail_tokens;

  const statusColors: Record<string, string> = {
    sent: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };
  const statusLabel: Record<string, string> = {
    sent: "Enviada", pending: "Pendiente", failed: "Error",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de tus postulaciones</p>
        </div>
        <Link href="/jobs"
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700">
          Ver trabajos →
        </Link>
      </div>

      {/* Gmail Connect */}
      <div className={`rounded-2xl border-2 p-4 flex items-center justify-between gap-4 ${gmailConnected ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${gmailConnected ? "bg-green-500" : "bg-gray-100"}`}>
            <svg className={`w-5 h-5 ${gmailConnected ? "text-white" : "text-gray-400"}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {gmailConnected ? "Gmail conectado ✓" : "Conectar Gmail"}
            </p>
            <p className="text-xs text-gray-500">
              {gmailConnected
                ? "Los emails se envían desde tu Gmail directamente"
                : "Envía postulaciones desde tu propio Gmail"}
            </p>
          </div>
        </div>
        {!gmailConnected && (
          <a href="/api/auth/gmail"
            className="shrink-0 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700">
            Conectar →
          </a>
        )}
      </div>

      {/* Modo Sniper */}
      <SniperToggle initialEnabled={sniperEnabled} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total postuladas", value: apps.length, color: "text-primary-600" },
          { label: "Hoy", value: todayApps.length, color: "text-green-600" },
          { label: "Esta semana", value: weekApps.length, color: "text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Applications list */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Historial de postulaciones</h2>
          <span className="text-sm text-gray-400">{apps.length} total</span>
        </div>

        {apps.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">Aún no hay postulaciones</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Activa el Modo Sniper o postula manualmente desde la lista de trabajos.
            </p>
            <Link href="/jobs" className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700">
              Ver trabajos →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {apps.map((app) => (
              <div key={app.id} className="p-4 flex items-center gap-3 hover:bg-gray-50/50">
                <CompanyLogo company={app.job?.company || "?"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm truncate">{app.job?.title || "Trabajo eliminado"}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[app.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabel[app.status] || app.status}
                    </span>
                    {app.triggered_by === "sniper" && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-600 font-medium">⚡ Sniper</span>
                    )}
                    {app.triggered_by === "cron" && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">Auto</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{app.job?.company || "—"} · {app.job?.location || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {app.created_at ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true, locale: es }) : "—"}
                  </p>
                  {app.job?.apply_link && (
                    <a href={app.job.apply_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline">Ver oferta</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
