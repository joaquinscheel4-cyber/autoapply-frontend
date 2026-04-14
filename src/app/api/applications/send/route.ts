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
    const cvFileName = `CV_${appProfile.name.replace(/\s+/g, "_")}.pdf`;

    let applyResult: { success: boolean; message: string; ats: string; apply_link?: string } = {
      success: false,
      message: "Sin método de postulación disponible",
      ats,
    };

    // ── Método 1: Gmail OAuth (si el usuario conectó su Gmail) ────
    if (profile.gmail_tokens) {
      try {
        const { sendViaGmail } = await import("@/lib/gmail-oauth");
        const { getOAuthClient } = await import("@/lib/gmail-oauth");

        // Refresh token if needed
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(profile.gmail_tokens);
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Save refreshed tokens
        await supabase.from("profiles").update({ gmail_tokens: credentials }).eq("user_id", user.id);

        const recruiterEmail = (job as Job).apply_email || null;
        if (!recruiterEmail) throw new Error("No hay email del reclutador");

        const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;">
  <p style="font-size:14px;color:#374151;white-space:pre-line;line-height:1.6;">${coverLetter}</p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0;">
  <p style="font-size:12px;color:#9ca3af;">${appProfile.name} · ${appProfile.email} · ${appProfile.phone || ""}</p>
</div>`;

        await sendViaGmail(credentials, {
          to: recruiterEmail,
          cc: appProfile.email,
          replyTo: appProfile.email,
          subject: `Postulación: ${job.title} — ${appProfile.name}`,
          html,
          candidateName: appProfile.name,
          cvBase64,
          cvFileName,
        });

        applyResult = { success: true, message: "Email enviado desde tu Gmail", ats: "gmail" };
      } catch (err) {
        console.error("Gmail send error:", err);
        // Fall through to Railway
      }
    }

    // ── Método 2: Email via Railway backend ────────────────────────
    if (!applyResult.success && RAILWAY_BACKEND) {
      try {
        const res = await fetch(`${RAILWAY_BACKEND}/auto-apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AGGREGATE_SECRET}`,
          },
          body: JSON.stringify({
            job: {
              id: job.id,
              title: job.title,
              company: job.company,
              apply_link: job.apply_link || "",
              apply_email: (job as Job).apply_email || null,
              description: job.description,
            },
            parsed_cv: profile.parsed_cv,
            cv_base64: cvBase64,
            cover_letter: coverLetter,
            user_preferences: profile.preferences || {},
            existing_answers: profile.preferences?.standard_answers || {},
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (res.ok) {
          const data = await res.json();
          applyResult = {
            success: data.success,
            message: data.message,
            ats: data.method === "email" ? "email" : ats,
            apply_link: data.apply_link || job.apply_link,
          };
        }
      } catch (err) {
        console.error("Railway auto-apply error:", err);
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
