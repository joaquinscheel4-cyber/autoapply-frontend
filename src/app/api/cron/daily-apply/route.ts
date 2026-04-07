import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchJobsChile } from "@/lib/jsearch";
import { searchGetOnBoard } from "@/lib/getonboard";
import { generateCoverLetter } from "@/lib/claude";
import { sendApplicationEmail } from "@/lib/resend";
import { buildApplicationProfile } from "@/lib/application-profile";
import { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Security: verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = { sent: 0, failed: 0, skipped: 0, users: 0 };

  try {
    // Get all users with completed profiles and auto_apply enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("onboarding_completed", true);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No hay usuarios con perfiles completados", ...results });
    }

    results.users = profiles.length;

    for (const profile of profiles) {
      // Check auto_apply_enabled
      if (!profile.preferences?.auto_apply_enabled) {
        results.skipped++;
        continue;
      }

      const appProfile = buildApplicationProfile(profile);
      if (!appProfile || !appProfile.email) {
        results.skipped++;
        continue;
      }

      try {
        // Search jobs for this user — GetOnBoard + JSearch
        const [gobJobs, jJobs] = await Promise.allSettled([
          searchGetOnBoard(appProfile.target_roles),
          searchJobsChile(appProfile.target_roles),
        ]);
        const jobs: Job[] = [
          ...(gobJobs.status === "fulfilled" ? gobJobs.value : []),
          ...(jJobs.status === "fulfilled" ? jJobs.value : []),
        ];

        // Upsert jobs to DB
        const jobIds: string[] = [];
        for (const job of jobs) {
          const { data: savedJob } = await supabase
            .from("jobs")
            .upsert(
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
            )
            .select("id")
            .single();

          if (savedJob) jobIds.push(savedJob.id);
        }

        // Check which jobs user hasn't applied to yet
        const { data: existingApps } = await supabase
          .from("applications")
          .select("job_id")
          .eq("user_id", profile.user_id)
          .in("job_id", jobIds);

        const appliedIds = new Set((existingApps || []).map((a: { job_id: string }) => a.job_id));
        const newJobIds = jobIds.filter((id) => !appliedIds.has(id));

        if (newJobIds.length === 0) {
          results.skipped++;
          continue;
        }

        // Apply to first 5 new jobs max per user per day
        const toApply = newJobIds.slice(0, 5);

        for (const jobId of toApply) {
          const { data: jobData } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", jobId)
            .single();

          if (!jobData) continue;

          try {
            const coverLetter = await generateCoverLetter(appProfile, jobData as Job);

            let messageId: string | null = null;
            let status: "sent" | "pending" = "pending";

            // Only send email if job has an apply_email
            if ((jobData as Job).apply_email) {
              // Download CV
              const cvPath = `${profile.user_id}/cv.pdf`;
              const { data: cvData } = await supabase.storage
                .from("cvs")
                .download(cvPath);

              if (cvData) {
                const cvBuffer = Buffer.from(await cvData.arrayBuffer());
                messageId = await sendApplicationEmail({
                  to: (jobData as Job).apply_email!,
                  candidateName: appProfile.name,
                  candidateEmail: appProfile.email,
                  candidatePhone: appProfile.phone,
                  jobTitle: jobData.title,
                  company: jobData.company,
                  coverLetter,
                  cvBase64: cvBuffer.toString("base64"),
                  cvFileName: `CV_${appProfile.name.replace(/\s+/g, "_")}.pdf`,
                });
                status = "sent";
                results.sent++;
              }
            } else {
              // No email — save as pending with cover letter for user to send manually
              status = "pending";
              results.skipped++;
            }

            await supabase.from("applications").insert({
              user_id: profile.user_id,
              job_id: jobId,
              cover_letter_text: coverLetter,
              status,
              sent_at: status === "sent" ? new Date().toISOString() : null,
              email_message_id: messageId,
              triggered_by: "cron",
            });
          } catch (appError) {
            console.error(`Error applying to job ${jobId}:`, appError);
            results.failed++;

            // Save failed application
            await supabase.from("applications").insert({
              user_id: profile.user_id,
              job_id: jobId,
              cover_letter_text: "",
              status: "failed",
              triggered_by: "cron",
            });
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError);
        results.failed++;
      }
    }

    return NextResponse.json({
      message: "Cron completado",
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error: unknown) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en cron job" },
      { status: 500 }
    );
  }
}
