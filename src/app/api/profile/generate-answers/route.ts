import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { parsed_cv } = await request.json();
    if (!parsed_cv) return NextResponse.json({ error: "parsed_cv requerido" }, { status: 400 });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Eres un asistente que ayuda a completar formularios de postulación laboral para el mercado chileno.

PERFIL DEL CANDIDATO (extraído de su CV):
${JSON.stringify(parsed_cv, null, 2)}

Genera respuestas para las siguientes preguntas estándar de postulación.
Responde SOLO con JSON válido. Si no puedes deducir algo del CV, usa un valor razonable.

{
  "greatest_strength": "2-3 oraciones sobre la mayor fortaleza profesional, específica a sus skills y experiencia",
  "why_role": "2-3 oraciones genéricas sobre por qué le interesan roles de su tipo (se personalizará por empresa después)",
  "biggest_achievement": "1-2 oraciones sobre un logro profesional destacado, inferido de su experiencia",
  "preferred_stack": "descripción del stack tecnológico preferido basado en sus skills",
  "open_source": "${parsed_cv.linkedin?.includes('github') ? 'Sí' : 'No'}",
  "highest_education": "nivel educacional más alto inferido",
  "university": "institución educacional si se menciona en el CV",
  "degree": "carrera o título si se menciona",
  "remote_experience": "Sí"
}`,
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Respuesta inesperada");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se encontró JSON");

    const answers = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ answers });
  } catch (error: unknown) {
    console.error("Generate answers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generando respuestas" },
      { status: 500 }
    );
  }
}
