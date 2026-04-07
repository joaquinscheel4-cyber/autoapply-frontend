import { Job } from "@/types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const JSEARCH_HOST = "jsearch.p.rapidapi.com";

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city: string | null;
  job_country: string;
  job_is_remote: boolean;
  job_description: string;
  job_apply_link: string;
  job_publisher: string;
  job_required_skills: string[] | null;
  job_required_experience: { required_experience_in_months: number } | null;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_posted_at_datetime_utc: string | null;
  job_employment_type: string | null;
  job_highlights: { Responsibilities?: string[]; Qualifications?: string[] } | null;
}

function mapModality(job: JSearchJob): "remote" | "hybrid" | "presencial" | null {
  if (job.job_is_remote) return "remote";
  const desc = (job.job_description || "").toLowerCase();
  if (desc.includes("híbrido") || desc.includes("hibrido") || desc.includes("hybrid")) return "hybrid";
  if (job.job_city) return "presencial";
  return null;
}

function extractSkillsFromDescription(description: string): string[] {
  const techSkills = [
    "python", "javascript", "typescript", "react", "node", "java", "sql", "excel",
    "power bi", "tableau", "aws", "azure", "docker", "kubernetes", "git",
    "django", "fastapi", "nextjs", "vue", "angular", "postgresql", "mongodb",
    "machine learning", "data science", "scrum", "agile", "sap", "salesforce",
    "figma", "photoshop", "autocad", "revit", "solidworks", "matlab",
  ];
  const desc = description.toLowerCase();
  return techSkills.filter((skill) => desc.includes(skill));
}

function mapToJob(j: JSearchJob): Job {
  const skills = j.job_required_skills?.length
    ? j.job_required_skills
    : extractSkillsFromDescription(j.job_description || "");

  return {
    id: crypto.randomUUID(),
    external_id: j.job_id,
    title: j.job_title,
    company: j.employer_name,
    location: j.job_city || "Chile",
    modality: mapModality(j),
    description: j.job_description || "",
    apply_email: null,
    apply_link: j.job_apply_link,
    source: "jsearch",
    country: "CL",
    skills,
    seniority: null,
    salary_min: j.job_min_salary,
    salary_max: j.job_max_salary,
    posted_at: j.job_posted_at_datetime_utc,
    fetched_at: new Date().toISOString(),
  };
}

// Genera variantes de búsqueda para maximizar resultados
function buildQueries(roles: string[]): string[] {
  const queries: string[] = [];

  for (const role of roles.slice(0, 3)) {
    // Búsqueda directa en Chile
    queries.push(`${role} Chile`);
    // Búsqueda en Santiago específicamente
    queries.push(`${role} Santiago`);
  }

  // Fallback genérico si los roles son muy específicos
  queries.push("trabajo Chile");

  return Array.from(new Set(queries)); // deduplicar
}

export async function searchJobsChile(roles: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  const seenIds = new Set<string>();

  const queries = buildQueries(roles);

  for (const query of queries.slice(0, 4)) { // máximo 4 llamadas API
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://${JSEARCH_HOST}/search?query=${encodedQuery}&num_pages=2&date_posted=week`;

      console.log(`JSearch query: "${query}"`);

      const response = await fetch(url, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": JSEARCH_HOST,
        },
      });

      if (!response.ok) {
        console.error(`JSearch error for "${query}": ${response.status} ${response.statusText}`);
        const body = await response.text();
        console.error("Response body:", body.substring(0, 200));
        continue;
      }

      const data = await response.json();
      const results: JSearchJob[] = data.data || [];

      console.log(`JSearch "${query}": ${results.length} resultados`);

      for (const j of results) {
        if (!seenIds.has(j.job_id)) {
          seenIds.add(j.job_id);
          allJobs.push(mapToJob(j));
        }
      }
    } catch (err) {
      console.error(`Error searching "${query}":`, err);
    }
  }

  console.log(`Total jobs found: ${allJobs.length}`);
  return allJobs;
}
