import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Application, Job } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, parsed_cv, preferences")
    .eq("user_id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect("/profile/setup");
  }

  // Fetch applications
  const { data: applications } = await supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const apps = (applications || []) as (Application & { job: Job })[];

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const todayApps = apps.filter((a) => a.created_at?.startsWith(today));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekApps = apps.filter((a) => a.created_at > weekAgo);

  const statusColors: Record<string, string> = {
    sent: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };

  const statusLabel: Record<string, string> = {
    sent: "Enviada",
    pending: "Pendiente",
    failed: "Error",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de tus postulaciones automáticas</p>
        </div>
        <Link
          href="/jobs"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          Ver trabajos →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total enviadas", value: apps.length, color: "text-primary-600" },
          { label: "Hoy", value: todayApps.length, color: "text-green-600" },
          { label: "Esta semana", value: weekApps.length, color: "text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Applications table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Historial de postulaciones</h2>
          <span className="text-sm text-gray-400">{apps.length} total</span>
        </div>

        {apps.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">Aún no hay postulaciones</p>
            <p className="text-gray-400 text-sm mt-1">
              El cron job se ejecuta todos los días a las 9:00 AM, o puedes postular manualmente.
            </p>
            <Link href="/jobs" className="text-primary-600 text-sm font-medium mt-3 inline-block">
              Ver trabajos disponibles →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {apps.map((app) => (
              <div key={app.id} className="p-4 flex items-start gap-4 hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {app.job?.title || "Trabajo eliminado"}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[app.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {statusLabel[app.status] || app.status}
                    </span>
                    {app.triggered_by === "cron" && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {app.job?.company || "—"} · {app.job?.location || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {app.created_at
                      ? formatDistanceToNow(new Date(app.created_at), {
                          addSuffix: true,
                          locale: es,
                        })
                      : "—"}
                  </p>
                  {app.job?.apply_link && (
                    <a
                      href={app.job.apply_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Ver oferta
                    </a>
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
