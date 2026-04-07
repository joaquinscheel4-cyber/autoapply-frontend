/**
 * Modo Sniper — cron diario que postula automáticamente
 * a los top 10 matches de cada usuario con auto_apply_enabled.
 *
 * Vercel cron: runs daily at 9:00 AM UTC (6:00 AM Santiago)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateCoverLetter } from "@/lib/claude";
import { buildApplicationProfile } from "@/lib/application-profile";
import { filterAndRankJobs } from "@/lib/job-matcher";
import { sortJobsByRelevance } from "@/lib/company-ranking";
import { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL;
const AGGREGATE_SECRET = process.env.AGGREGATE_SECRET || "autoapply-aggregate-secret";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

async function sendSniperSummary(
  userEmail: string,
  userName: string,
  applied: { title: string; company: string; success: boolean; apply_link: string }[]
) {
  if (!RESEND_API_KEY) return;

  const successCount = applied.filter(a => a.success).length;
  const rows = applied.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
        <strong>${a.company}</strong><br/>
        <span style="color:#6b7280;font-size:13px;">${a.title}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">
        ${a.success
          ? '<span style="color:#059669;font-weight:600;">✅ Enviada</span>'
          : `<a href="${a.apply_link}" style="color:#2563eb;font-size:13px;">Postular →</a>`
        }
      </td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#2563eb;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">⚡ Modo Sniper — Resumen del día</h1>
        <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">Hola ${userName}, postulé por ti a ${applied.length} trabajos hoy</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#374151;margin:0 0 16px;">
          <strong style="color:#059669;">${successCount} postulaciones enviadas automáticamente</strong>
          ${applied.length - successCount > 0 ? ` · ${applied.length - successCount} requieren click manual` : ""}
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Empresa / Cargo</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
          <p style="margin:0;font-size:13px;color:#15803d;">
            💡 Las postulaciones con "Postular →" no pudieron hacerse automáticamente.
            Haz click para completarlas — tu carta ya está lista.
          </p>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center;">
          AutoApply Chile · <a href="#" style="color:#9ca3af;">Desactivar Modo Sniper</a>
        </p>
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AutoApply Chile <onboarding@resend.dev>",
      to: [userEmail],
      subject: `⚡ Postulé por ti a ${applied.length} trabajos hoy`,
      html,
    }),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = { processed: 0, applied: 0, failed: 0, skipped: 0 };

  // 1. Fetch all users with sniper mode enabled
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_completed", true)
    .eq("preferences->sniper_enabled", true);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No hay usuarios con Modo Sniper activo", ...results });
  }

  // 2. Fetch all available jobs
  const { data: allJobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("country", "CL")
    .order("fetched_at", { ascending: false })
    .limit(500);

  for (const profile of profiles) {
    results.processed++;
    const appProfile = buildApplicationProfile(profile);
    if (!appProfile?.email || !profile.parsed_cv) {
      results.skipped++;
      continue;
    }

    // 3. Get jobs already applied to
    const { data: existing } = await supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", profile.user_id);
    const appliedIds = new Set((existing || []).map((a: { job_id: string }) => a.job_id));

    // 4. Rank jobs and pick top 10 not yet applied
    const ranked = sortJobsByRelevance(
      filterAndRankJobs((allJobs || []) as Job[], appProfile)
    ).filter(j => !appliedIds.has(j.id)).slice(0, 10);

    if (ranked.length === 0) {
      results.skipped++;
      continue;
    }

    // 5. Download CV once
    const cvPath = `${profile.user_id}/cv.pdf`;
    const { data: cvData } = await supabase.storage.from("cvs").download(cvPath);
    if (!cvData) { results.skipped++; continue; }
    const cvBase64 = Buffer.from(await cvData.arrayBuffer()).toString("base64");

    // 6. Apply to each job
    const summaryItems: { title: string; company: string; success: boolean; apply_link: string }[] = [];

    for (const job of ranked) {
      try {
        const coverLetter = await generateCoverLetter(appProfile, job as Job);

        let success = false;
        let message = "";

        // Try Browserless auto-apply
        if (RAILWAY_BACKEND && job.apply_link) {
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
            signal: AbortSignal.timeout(60000),
          }).catch(() => null);

          if (res?.ok) {
            const data = await res.json();
            success = data.success;
            message = data.message;
          }
        }

        // Save application
        await supabase.from("applications").insert({
          user_id: profile.user_id,
          job_id: job.id,
          cover_letter_text: coverLetter,
          status: success ? "sent" : "pending",
          sent_at: success ? new Date().toISOString() : null,
          triggered_by: "sniper",
        });

        summaryItems.push({
          title: job.title,
          company: job.company,
          success,
          apply_link: job.apply_link || "",
        });

        if (success) results.applied++;
        else results.failed++;

      } catch (e) {
        console.error(`Error applying to ${job.id}:`, e);
        results.failed++;
      }
    }

    // 7. Send summary email
    if (summaryItems.length > 0) {
      await sendSniperSummary(appProfile.email, appProfile.name, summaryItems).catch(console.error);
    }
  }

  return NextResponse.json({
    message: "Modo Sniper completado",
    timestamp: new Date().toISOString(),
    ...results,
  });
}
