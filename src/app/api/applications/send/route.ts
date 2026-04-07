import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCoverLetter } from "@/lib/claude";
import { buildApplicationProfile } from "@/lib/application-profile";
import { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL;
const AGGREGATE_SECRET = process.env.AGGREGATE_SECRET || "autoapply-aggregate-secret";

function detectATS(applyLink: string): string {
  if (!applyLink) return "unknown";
  const url = applyLink.toLowerCase();
  if (url.includes("greenhouse.io") || url.includes("job-boards.greenhouse")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("myworkdayjobs.com")) return "workday";
  if (url.includes("smartrecruiters.com")) return "smartrecruiters";
  return "generic";
}

export async function POST(request: NextRequest) {
  try {
    const { job_id } = await request.json();
    if (!job_id) return NextResponse.json({ error: "job_id requerido" }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Check not already applied
    const { data: existing } = await supabase
      .from("applications").select("id").eq("user_id", user.id).eq("job_id", job_id).single();
    if (existing) return NextResponse.json({ error: "Ya postulaste a este trabajo" }, { status: 409 });

    // Fetch job
    const { data: job } = await supabase.from("jobs").select("*").eq("id", job_id).single();
    if (!job) return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });

    // Fetch profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!profile?.parsed_cv) return NextResponse.json({ error: "Completa tu perfil primero" }, { status: 400 });

    const appProfile = buildApplicationProfile(profile);
    if (!appProfile) return NextResponse.json({ error: "Perfil incompleto" }, { status: 400 });

    // Generate cover letter with Claude
    const coverLetter = await generateCoverLetter(appProfile, job as Job);

    // Download CV from Supabase Storage
    const cvPath = `${user.id}/cv.pdf`;
    const { data: cvData, error: cvError } = await supabase.storage.from("cvs").download(cvPath);
    if (cvError || !cvData) return NextResponse.json({ error: "No se encontró tu CV" }, { status: 404 });

    const cvBuffer = Buffer.from(await cvData.arrayBuffer());
    const cvBase64 = cvBuffer.toString("base64");

    const ats = detectATS(job.apply_link || "");

    let applyResult: { success: boolean; message: string; ats: string; action?: string; apply_link?: string } = {
      success: false,
      message: "Sin método de postulación disponible",
      ats,
    };

    // ── Método 1: Railway Backend (Playwright auto-apply) ──────────
    if (RAILWAY_BACKEND && job.apply_link) {
      try {
        const res = await fetch(`${RAILWAY_BACKEND}/auto-apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AGGREGATE_SECRET}`,
          },
          body: JSON.stringify({
            job: { id: job.id, title: job.title, company: job.company, apply_link: job.apply_link, description: job.description },
            parsed_cv: profile.parsed_cv,
            cv_base64: cvBase64,
            user_preferences: profile.preferences || {},
            existing_answers: profile.preferences?.standard_answers || {},
            cover_letter: coverLetter,
          }),
          signal: AbortSignal.timeout(90000),
        });

        if (res.ok) {
          const data = await res.json();
          applyResult = {
            success: data.success,
            message: data.message,
            ats: data.ats || ats,
            ...(data.action === "redirect" && { action: "redirect", apply_link: data.apply_link }),
          };
        }
      } catch (err) {
        console.error("Railway auto-apply error:", err);
        applyResult = { success: false, message: "Error en auto-apply: " + String(err), ats };
      }
    }

    // ── Método 2: Email directo (si el trabajo tiene email) ────────
    if (!applyResult.success && (job as Job).apply_email) {
      try {
        const { sendApplicationEmail } = await import("@/lib/resend");
        const messageId = await sendApplicationEmail({
          to: (job as Job).apply_email!,
          candidateName: appProfile.name,
          candidateEmail: appProfile.email,
          candidatePhone: appProfile.phone,
          jobTitle: job.title,
          company: job.company,
          coverLetter,
          cvBase64,
          cvFileName: `CV_${appProfile.name.replace(/\s+/g, "_")}.pdf`,
        });
        applyResult = { success: true, message: "Email enviado al reclutador", ats: "email" };
      } catch (err) {
        console.error("Email apply error:", err);
      }
    }

    // ── Determinar status final ────────────────────────────────────
    const status = applyResult.success ? "sent" : "pending";

    // Save application
    const { data: application } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_id,
        cover_letter_text: coverLetter,
        status,
        sent_at: applyResult.success ? new Date().toISOString() : null,
        triggered_by: "manual",
      })
      .select().single();

    return NextResponse.json({
      success: applyResult.success,
      cover_letter: coverLetter,
      application_id: application!.id,
      method: applyResult.ats,
      message: applyResult.message,
      apply_link: applyResult.apply_link || job.apply_link,
      action: applyResult.action,
    });

  } catch (error: unknown) {
    console.error("Application send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error enviando postulación" },
      { status: 500 }
    );
  }
}
