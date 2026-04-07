import { Job } from "@/types";

// GetOnBoard es la principal plataforma de empleos tech en Chile
// API pública y gratuita: https://www.getonbrd.com/api/v0
const BASE_URL = "https://www.getonbrd.com/api/v0";

interface GoBJob {
  id: string;
  type: string;
  attributes: {
    title: string;
    description: string;
    functions: string;
    desirable: string;
    benefits: string;
    remote: boolean;
    remote_modality: string | null;
    min_salary: number | null;
    max_salary: number | null;
    country: string;
    city: string | null;
    published_at: string;
    applications_count: number;
    perks: string[];
    seniority: string | null;
    modality: string | null;
  };
  relationships: {
    company: { data: { id: string } };
    category: { data: { id: string } };
    tags: { data: { id: string; attributes: { name: string } }[] };
  };
}

interface GoBCompany {
  id: string;
  attributes: {
    name: string;
    description: string;
    logo_url: string | null;
  };
}

interface GoBResponse {
  data: GoBJob[];
  included?: (GoBCompany & { type: string })[];
}

function mapSeniority(s: string | null): string | null {
  if (!s) return null;
  const map: Record<string, string> = {
    trainee: "junior",
    junior: "junior",
    mid: "semi-senior",
    senior: "senior",
    lead: "lead",
    principal: "lead",
  };
  return map[s.toLowerCase()] || s;
}

function mapModality(job: GoBJob): "remote" | "hybrid" | "presencial" | null {
  if (job.attributes.remote) {
    if (job.attributes.remote_modality === "partial") return "hybrid";
    return "remote";
  }
  return "presencial";
}

function buildApplyLink(jobId: string): string {
  return `https://www.getonbrd.com/jobs/${jobId}`;
}

function extractTags(job: GoBJob): string[] {
  return (job.relationships?.tags?.data || [])
    .map((t) => t.attributes?.name)
    .filter(Boolean);
}

export async function searchGetOnBoard(roles: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  const seenIds = new Set<string>();

  // 1. Buscar por cada rol
  for (const role of roles.slice(0, 4)) {
    try {
      const query = encodeURIComponent(role);
      const url = `${BASE_URL}/search/jobs?q=${query}&expand[]=company&expand[]=tags&per_page=20`;

      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 1800 },
      });

      if (!res.ok) {
        console.error(`GetOnBoard search error: ${res.status}`);
        continue;
      }

      const data: GoBResponse = await res.json();
      const jobs = data.data || [];
      const included = data.included || [];

      // Mapear companies incluidas
      const companyMap: Record<string, string> = {};
      for (const item of included) {
        if (item.type === "company") {
          companyMap[item.id] = item.attributes.name;
        }
      }

      for (const j of jobs) {
        if (seenIds.has(j.id)) continue;
        seenIds.add(j.id);

        const companyId = j.relationships?.company?.data?.id;
        const companyName = companyMap[companyId] || "Empresa";
        const tags = extractTags(j);

        allJobs.push({
          id: crypto.randomUUID(),
          external_id: `gob_${j.id}`,
          title: j.attributes.title,
          company: companyName,
          location: j.attributes.city || "Chile",
          modality: mapModality(j),
          description: [
            j.attributes.description,
            j.attributes.functions,
            j.attributes.desirable,
          ]
            .filter(Boolean)
            .join("\n\n")
            .substring(0, 3000),
          apply_email: null,
          apply_link: buildApplyLink(j.id),
          source: "getonboard",
          country: "CL",
          skills: tags,
          seniority: mapSeniority(j.attributes.seniority),
          salary_min: j.attributes.min_salary,
          salary_max: j.attributes.max_salary,
          posted_at: j.attributes.published_at,
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`GetOnBoard error for "${role}":`, err);
    }
  }

  // 2. También cargar los más recientes de todas las categorías
  try {
    const url = `${BASE_URL}/jobs?expand[]=company&expand[]=tags&per_page=30&min_salary=1`;
    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (res.ok) {
      const data: GoBResponse = await res.json();
      const included = data.included || [];

      const companyMap: Record<string, string> = {};
      for (const item of included) {
        if (item.type === "company") {
          companyMap[item.id] = item.attributes.name;
        }
      }

      for (const j of data.data || []) {
        if (seenIds.has(j.id)) continue;
        seenIds.add(j.id);

        const companyId = j.relationships?.company?.data?.id;
        const companyName = companyMap[companyId] || "Empresa";

        allJobs.push({
          id: crypto.randomUUID(),
          external_id: `gob_${j.id}`,
          title: j.attributes.title,
          company: companyName,
          location: j.attributes.city || "Chile",
          modality: mapModality(j),
          description: [j.attributes.description, j.attributes.functions]
            .filter(Boolean)
            .join("\n\n")
            .substring(0, 3000),
          apply_email: null,
          apply_link: buildApplyLink(j.id),
          source: "getonboard",
          country: "CL",
          skills: extractTags(j),
          seniority: mapSeniority(j.attributes.seniority),
          salary_min: j.attributes.min_salary,
          salary_max: j.attributes.max_salary,
          posted_at: j.attributes.published_at,
          fetched_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error("GetOnBoard latest jobs error:", err);
  }

  console.log(`GetOnBoard: ${allJobs.length} trabajos encontrados`);
  return allJobs;
}
