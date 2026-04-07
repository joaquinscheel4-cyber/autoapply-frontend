import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, textQualityScore } from "@/lib/cv-parser";
import { parseCVWithClaude } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("cv") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);

    const quality = textQualityScore(text);
    if (quality < 20) {
      return NextResponse.json(
        { error: "No se pudo leer el PDF. Asegúrate de que no esté escaneado o protegido." },
        { status: 422 }
      );
    }

    const parsed = await parseCVWithClaude(text);

    return NextResponse.json({ parsed, text, quality });
  } catch (error: unknown) {
    console.error("CV parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error procesando CV" },
      { status: 500 }
    );
  }
}
