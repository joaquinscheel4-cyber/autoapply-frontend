import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { scrapeComputrabajoJobs } from "@/lib/computrabajo";
import { buildApplicationProfile } from "@/lib/application-profile";
import { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL;
const AGGREGATE_SECRET = process.env.AGGREGATE_SECRET || "autoapply-aggregate-secret";

async function upsertJobs(jobs: Job[], serviceSupabase: ReturnType<typeof createServiceClient>) {
  let saved = 0;
  for (const job of jobs) {
    const { error } = await serviceSupabase.from("jobs").upsert(
      {
        external_id: job.external_id,
        title: job.title,
        company: job.company,
        location: job.location,
        modality: job.modality,
        description: job.description,
        apply_link: job.apply_link,
        apply_email: job.apply_email,
        source: job.source,
        country: "CL",
        skills: job.skills,
        seniority: job.seniority,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        posted_at: job.posted_at,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    );
    if (!error) saved++;
    else console.error("Upsert error:", error.message);
  }
  return saved;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).single();

    const appProfile = buildApplicationProfile(profile);
    const roles = appProfile?.target_roles?.length
      ? appProfile.target_roles
      : ["desarrollador", "ingeniero", "analista"];

    const sources: string[] = [];
    let totalSaved = 0;
    const serviceSupabase = createServiceClient();

    // Opción 1: Llamar al backend de Railway (motor completo con 6 fuentes)
    if (RAILWAY_BACKEND) {
      try {
        const res = await fetch(`${RAILWAY_BACKEND}/aggregate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AGGREGATE_SECRET}`,
          },
          body: JSON.stringify({ roles, fast_mode: true, sync: true }),
          signal: AbortSignal.timeout(55000),
        });

        if (res.ok) {
          const data = await res.json();
          sources.push(`Railway (${Object.entries(data.sources || {}).map(([k,v]) => `${k}:${v}`).join(", ")})`);
          totalSaved = data.inserted || 0;

          return NextResponse.json({
            found: totalSaved,
            sources,
            message: `${totalSaved} trabajos guardados desde ${sources.join(", ")}`,
          });
        }
      } catch (err) {
        console.error("Railway backend error:", err);
        // Fall through to local scraping
      }
    }

    // Opción 2: Scraping local (Computrabajo directo desde Next.js)
    try {
      const jobs = await scrapeComputrabajoJobs(roles);
      if (jobs.length > 0) {
        const saved = await upsertJobs(jobs, serviceSupabase);
        totalSaved += saved;
        sources.push(`Computrabajo: ${saved}`);
      }
    } catch (err) {
      console.error("Computrabajo error:", err);
    }

    return NextResponse.json({
      found: totalSaved,
      sources,
      message: totalSaved > 0
        ? `${totalSaved} trabajos guardados desde ${sources.join(", ")}`
        : "No se encontraron trabajos. Intenta ajustando tus roles en el perfil.",
    });
  } catch (error: unknown) {
    console.error("Job search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error buscando trabajos" },
      { status: 500 }
    );
  }
}
