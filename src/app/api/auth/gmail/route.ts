// Redirects user to Google OAuth consent screen
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail-oauth";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
