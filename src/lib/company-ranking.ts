/**
 * Company prestige ranking for Chile.
 * Weights: well-known brand (50%) + match score (50%)
 * Companies are scored 1–100. Unknown = 30 (neutral).
 */

const COMPANY_SCORES: Record<string, number> = {
  // ── Big Tech / Global ──────────────────────────────────────────
  "google": 100, "apple": 100, "microsoft": 99, "amazon": 98, "meta": 97,
  "netflix": 96, "airbnb": 95, "stripe": 95, "cloudflare": 93,
  "gitlab": 90, "github": 90, "twilio": 88, "hashicorp": 87,

  // ── LATAM Tech Unicorns ────────────────────────────────────────
  "mercado libre": 95, "mercadolibre": 95,
  "nubank": 92, "rappi": 88, "kavak": 85, "bitso": 82,
  "conekta": 80, "clip": 79, "konfio": 78, "kushki": 82,

  // ── Chilean Startups (alta reputación) ────────────────────────
  "fintual": 88, "betterfly": 85, "buk": 84, "cornershop": 82,
  "notco": 80, "xepelin": 78, "xcala": 75, "cheki": 72,
  "jooycar": 70, "broota": 68, "u-planner": 72, "aptuno": 70,

  // ── Grandes Empresas Chile ────────────────────────────────────
  "falabella": 82, "cencosud": 78, "jumbo": 70, "ripley": 68,
  "sodimac": 70, "paris": 65,
  "banco santander": 85, "santander": 85,
  "banco chile": 83, "bci": 80, "scotiabank": 78,
  "banco estado": 75, "bice": 72, "itaú": 77, "itau": 77,
  "entel": 78, "movistar": 75, "wom": 70, "claro": 72,
  "codelco": 80, "bhp": 82, "antofagasta minerals": 78,
  "enel": 75, "colbún": 72, "enersis": 70,
  "cmpc": 72, "arauco": 70,
  "latam": 75, "sky airline": 70,
  "isapre": 65, "banmédica": 70, "banmedica": 70,
  "clínica alemana": 75, "clinica alemana": 75,
  "globant": 82, "endava": 80, "wizeline": 78, "encora": 75,

  // ── Consultoras ───────────────────────────────────────────────
  "accenture": 85, "deloitte": 84, "pwc": 83, "ey": 82,
  "kpmg": 81, "mckinsey": 88, "bain": 86, "bcg": 87,
  "ibm": 82, "oracle": 80, "sap": 79,

  // ── Retail / Consumo ──────────────────────────────────────────
  "walmart": 72, "lider": 70, "tottus": 68, "unimarc": 65,
  "coca-cola": 78, "unilever": 76, "nestlé": 74, "nestle": 74,
};

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCompanyScore(companyName: string): number {
  const norm = normalizeCompany(companyName);

  // Exact match
  if (COMPANY_SCORES[norm] !== undefined) return COMPANY_SCORES[norm];

  // Partial match (company name contains or is contained in known name)
  for (const [known, score] of Object.entries(COMPANY_SCORES)) {
    if (norm.includes(known) || known.includes(norm)) return score;
  }

  return 30; // Unknown company — neutral
}

/**
 * Combined ranking score:
 * - 50% company prestige
 * - 50% CV match score
 */
export function combinedScore(matchScore: number, companyName: string): number {
  const prestige = getCompanyScore(companyName);
  return Math.round(matchScore * 0.5 + prestige * 0.5);
}

export function sortJobsByRelevance<T extends { match: { score: number }; company: string }>(
  jobs: T[]
): T[] {
  return [...jobs].sort((a, b) => {
    const scoreA = combinedScore(a.match.score, a.company);
    const scoreB = combinedScore(b.match.score, b.company);
    return scoreB - scoreA;
  });
}
