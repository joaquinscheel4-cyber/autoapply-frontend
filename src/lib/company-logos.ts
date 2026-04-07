/**
 * Maps company names to their domains for logo fetching via Clearbit.
 * Companies not in this list get a fallback avatar with initials.
 */
const COMPANY_DOMAINS: Record<string, string> = {
  // Big Tech
  "google": "google.com", "apple": "apple.com", "microsoft": "microsoft.com",
  "amazon": "amazon.com", "meta": "meta.com", "netflix": "netflix.com",
  "airbnb": "airbnb.com", "stripe": "stripe.com", "cloudflare": "cloudflare.com",
  "gitlab": "gitlab.com", "github": "github.com", "twilio": "twilio.com",

  // LATAM
  "mercado libre": "mercadolibre.com", "mercadolibre": "mercadolibre.com",
  "nubank": "nubank.com.br", "rappi": "rappi.com", "kavak": "kavak.com",
  "kushki": "kushki.com", "bitso": "bitso.com",

  // Chile startups
  "fintual": "fintual.com", "betterfly": "betterfly.com", "buk": "buk.cl",
  "cornershop": "cornershopapp.com", "notco": "notco.com", "xepelin": "xepelin.com",
  "houm": "houm.com", "hapi": "hapi.travel", "u-planner": "u-planner.com",
  "jooycar": "jooycar.com",

  // Grandes empresas Chile
  "falabella": "falabella.com", "cencosud": "cencosud.com", "ripley": "ripley.cl",
  "sodimac": "sodimac.com", "paris": "paris.cl",
  "banco santander": "santander.cl", "santander": "santander.cl",
  "banco chile": "bancochile.cl", "bci": "bci.cl", "scotiabank": "scotiabank.cl",
  "banco estado": "bancoestado.cl", "itaú": "itau.cl", "itau": "itau.cl",
  "entel": "entel.cl", "movistar": "movistar.cl", "wom": "wom.cl", "claro": "clarochile.cl",
  "codelco": "codelco.com", "bhp": "bhp.com",
  "latam": "latam.com", "latam airlines": "latam.com",
  "walmart": "walmart.cl", "lider": "lider.cl",
  "accenture": "accenture.com", "deloitte": "deloitte.com", "pwc": "pwc.com",
  "kpmg": "kpmg.com", "mckinsey": "mckinsey.com", "bain": "bain.com",
  "ibm": "ibm.com", "oracle": "oracle.com", "sap": "sap.com", "salesforce": "salesforce.com",
};

export function getCompanyLogoUrl(company: string): string | null {
  const key = company.toLowerCase().trim();
  const domain = COMPANY_DOMAINS[key];
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }
  // Try partial match
  for (const [name, d] of Object.entries(COMPANY_DOMAINS)) {
    if (key.includes(name) || name.includes(key)) {
      return `https://logo.clearbit.com/${d}`;
    }
  }
  return null;
}

export function getCompanyInitials(company: string): string {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}
