import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL;
const AGGREGATE_SECRET = process.env.AGGREGATE_SECRET || "autoapply-aggregate-secret";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "url requerido" }, { status: 400 });

    if (!RAILWAY_BACKEND) {
      return NextResponse.json({ error: "Backend no configurado" }, { status: 503 });
    }

    const res = await fetch(`${RAILWAY_BACKEND}/import-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AGGREGATE_SECRET}`,
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
      return NextResponse.json({ error: err.detail || "Error importando trabajo" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error importando" },
      { status: 500 }
    );
  }
}
