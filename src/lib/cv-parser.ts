// Server-only: PDF text extraction
// This module must only be imported in Server Components or API Routes

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to ensure this runs server-side only
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export function textQualityScore(text: string): number {
  if (!text || text.length < 100) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 20) return 10;

  let score = 0;
  // Has common CV sections
  const sections = ["experiencia", "education", "skills", "educación", "habilidades", "trabajo"];
  const found = sections.filter((s) => text.toLowerCase().includes(s));
  score += found.length * 10;

  // Length bonus
  if (text.length > 500) score += 20;
  if (text.length > 1000) score += 20;

  // Has email
  if (/[\w.]+@[\w.]+/.test(text)) score += 10;

  return Math.min(100, score);
}
