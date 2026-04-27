import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JobsList from "@/components/jobs/JobsList";
import { buildApplicationProfile } from "@/lib/application-profile";
import { filterAndRankJobs } from "@/lib/job-matcher";
import { sortJobsByRelevance } from "@/lib/company-ranking";
import { Job } from "@/types";

export default async function JobsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile?.onboarding_completed) redirect("/profile/setup");

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("country", "CL")
    .order("fetched_at", { ascending: false })
    .limit(500);

  const { data: applications } = await supabase
    .from("applications")
    .select("job_id")
    .eq("user_id", user.id);

  const appliedJobIds = new Set((applications || []).map((a) => a.job_id));
  const appProfile = buildApplicationProfile(profile);

  const matched = appProfile
    ? filterAndRankJobs((jobs || []) as Job[], appProfile).map((j) => ({
        ...j,
        already_applied: appliedJobIds.has(j.id),
      }))
    : [];

  const ranked = sortJobsByRelevance(matched);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trabajos disponibles</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {ranked.length} trabajos ordenados por compatibilidad con tu perfil
        </p>
      </div>
      <JobsList initialJobs={ranked} />
    </div>
  );
}
