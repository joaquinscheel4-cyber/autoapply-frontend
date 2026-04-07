import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendApplicationEmail({
  to,
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  company,
  coverLetter,
  cvBase64,
  cvFileName,
}: {
  to: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  jobTitle: string;
  company: string;
  coverLetter: string;
  cvBase64: string;
  cvFileName: string;
}): Promise<string> {
  const paragraphs = coverLetter
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #1d4ed8; padding: 24px 32px;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Postulación: ${jobTitle}</h1>
  </div>
  <div style="padding: 32px;">
    <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 14px;">
      Estimado equipo de ${company},
    </p>
    ${paragraphs}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px;">${candidateName}</p>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">${candidateEmail}</p>
      ${candidatePhone ? `<p style="margin: 4px 0 0; color: #4b5563; font-size: 14px;">${candidatePhone}</p>` : ""}
    </div>
    <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af;">
      CV adjunto a este correo · Enviado vía AutoApply Chile
    </p>
  </div>
</body>
</html>`;

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    reply_to: candidateEmail,
    subject: `Postulación: ${jobTitle} — ${candidateName}`,
    html,
    attachments: [
      {
        filename: cvFileName,
        content: cvBase64,
      },
    ],
  });

  if (error) throw new Error(`Error Resend: ${error.message}`);
  return data!.id;
}
