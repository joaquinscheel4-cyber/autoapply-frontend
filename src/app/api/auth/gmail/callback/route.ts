// Handles Google OAuth callback — stores tokens in Supabase profile
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOAuthClient } from "@/lib/gmail-oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/profile/setup?gmail=error", request.url)
    );
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

    // Store tokens in profile
    await supabase
      .from("profiles")
      .update({ gmail_tokens: tokens })
      .eq("user_id", user.id);

    return NextResponse.redirect(
      new URL("/dashboard?gmail=connected", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?gmail=error", request.url)
    );
  }
}
