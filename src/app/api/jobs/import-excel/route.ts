import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL;
const AGGREGATE_SECRET = process.env.AGGREGATE_SECRET || "autoapply-aggregate-secret";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!RAILWAY_BACKEND) {
    return NextResponse.json({ error: "Backend no configurado" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

    // Forward to Railway backend
    const backendForm = new FormData();
    backendForm.append("file", file);

    const res = await fetch(`${RAILWAY_BACKEND}/import-excel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${AGGREGATE_SECRET}` },
      body: backendForm,
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.detail || "Error importando" }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
