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
        content: `Eres un experto en redacción de cartas de presentación para el mercado laboral chileno.

Escribe una carta de presentación profesional en español para la siguiente postulación:

CANDIDATO:
- Nombre: ${profile.name}
- Cargo actual: ${profile.current_role || "Sin información"}
- Años de experiencia: ${profile.years_experience}
- Nivel: ${profile.seniority}
- Skills principales: ${profile.skills.slice(0, 8).join(", ")}
- Idiomas: ${profile.languages.join(", ")}
- Resumen: ${profile.summary || "No disponible"}

TRABAJO AL QUE POSTULA:
- Cargo: ${job.title}
- Empresa: ${job.company}
- Ubicación: ${job.location}
- Descripción: ${job.description.substring(0, 800)}

INSTRUCCIONES:
1. Escribe en tono profesional pero cercano, apropiado para Chile
2. Menciona específicamente la empresa y el cargo
3. Destaca 2-3 skills relevantes para ESTE trabajo
4. Máximo 3 párrafos, entre 200-300 palabras
5. Cierra con disposición a conversar
6. NO uses frases genéricas como "me complace postular"
7. Sé directo y muestra valor real

Escribe SOLO la carta, sin encabezado ni firma (eso se agrega automáticamente).`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Respuesta inesperada de Claude");
  return content.text;
}
