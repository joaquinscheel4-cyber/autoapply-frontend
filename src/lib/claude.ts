import Anthropic from "@anthropic-ai/sdk";
import { ParsedCV, ApplicationProfile, Job } from "@/types";

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function parseCVWithClaude(cvText: string): Promise<ParsedCV> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Analiza este CV y extrae la información estructurada. Responde SOLO con JSON válido, sin texto adicional.

CV:
${cvText}

Responde con este JSON exacto:
{
  "name": "nombre completo o null",
  "email": "email o null",
  "phone": "teléfono o null",
  "linkedin": "URL linkedin o null",
  "skills": ["skill1", "skill2"],
  "seniority": "junior|semi-senior|senior|lead|null",
  "years_experience": número o null,
  "current_role": "cargo actual o null",
  "education": ["Ingeniería Civil en ..., Universidad de Chile"],
  "languages": ["Español", "Inglés"],
  "summary": "resumen de 2-3 oraciones del perfil profesional",
  "confidence_score": número del 0 al 100 indicando qué tan completo está el CV
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Respuesta inesperada de Claude");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta");

  return JSON.parse(jsonMatch[0]) as ParsedCV;
}

export async function generateCoverLetter(
  profile: ApplicationProfile,
  job: Job
): Promise<string> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Eres ${profile.name}, un profesional chileno escribiendo directamente a un reclutador de ${job.company}. No eres un asistente ni redactor — eres la persona misma.

Tu perfil:
- Cargo actual: ${profile.current_role || "Sin información"}
- Años de experiencia: ${profile.years_experience}
- Nivel: ${profile.seniority}
- Skills: ${profile.skills.slice(0, 10).join(", ")}
- Idiomas: ${profile.languages.join(", ")}
- Resumen: ${profile.summary || "No disponible"}

Puesto al que postulas:
- Cargo: ${job.title}
- Empresa: ${job.company}
- Descripción: ${job.description.substring(0, 1000)}

Escribe el cuerpo del mail directamente — como si lo escribieras tú mismo desde Gmail ahora mismo.

REGLAS ESTRICTAS:
1. Tono natural, primera persona, como si le escribieras a alguien que no conoces pero con quien quieres causar buena impresión. Ni muy formal ni muy informal.
2. En el primer párrafo: por qué te interesa ESTE cargo en ESTA empresa específica (algo concreto, no genérico).
3. En el segundo párrafo: conecta 2-3 experiencias o logros concretos de tu perfil con lo que pide el puesto. Usa datos si tienes (años, tecnologías, resultados). Que se note que leíste la descripción.
4. Cierre breve: disponibilidad para conversar, sin frases de relleno.
5. Máximo 250 palabras. Sin saludos ("Estimado/a") ni despedidas ("Atentamente") — eso lo pone el sistema.
6. NUNCA uses: "me complace", "es un honor", "adjunto mi CV", "no dude en contactarme", "a quien corresponda", ni ninguna frase corporativa vacía.
7. Escribe como habla un profesional chileno: directo, sin vueltas, pero respetuoso.

Escribe SOLO el cuerpo del mail. Nada más.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Respuesta inesperada de Claude");
  return content.text;
}
