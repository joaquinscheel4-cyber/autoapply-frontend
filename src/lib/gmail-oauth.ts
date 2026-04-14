import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

export function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
    prompt: "consent",
  });
}

export async function sendViaGmail(tokens: object, {
  to,
  cc,
  replyTo,
  subject,
  html,
  candidateName,
  cvBase64,
  cvFileName,
}: {
  to: string;
  cc?: string;
  replyTo: string;
  subject: string;
  html: string;
  candidateName: string;
  cvBase64?: string;
  cvFileName?: string;
}) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build MIME message
  const boundary = "AutoApply_" + Date.now();
  const lines: string[] = [];

  lines.push(`From: ${candidateName} <me>`);
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Reply-To: ${replyTo}`);
  lines.push(`Subject: ${subject}`);
  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");

  // HTML body
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/html; charset="UTF-8"`);
  lines.push("");
  lines.push(html);

  // CV attachment
  if (cvBase64 && cvFileName) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: application/pdf`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push(`Content-Disposition: attachment; filename="${cvFileName}"`);
    lines.push("");
    lines.push(cvBase64);
  }

  lines.push(`--${boundary}--`);

  const raw = Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
