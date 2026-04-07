import * as cheerio from "cheerio";
import { Job } from "@/types";

const BASE_URL = "https://www.computrabajo.cl";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "es-CL,es;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// Convierte slug de role a URL de Computrabajo
function roleToSlug(role: string): string {
  return role
    .toLowerCase()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Extrae URLs de ofertas de una página de listado
function extractJobUrls(html: string): string[] {
  const urls: string[] = [];
  const $ = cheerio.load(html);

  // JSON-LD ItemList
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      const graph = data["@graph"] || (Array.isArray(data) ? data : [data]);
      for (const item of graph) {
        if (item["@type"] === "ItemList") {
          for (const entry of item.itemListElement || []) {
            if (entry.url) urls.push(entry.url);
          }
        }
      }
    } catch {}
  });

  // Fallback: buscar links de oferta en el HTML
  if (urls.length === 0) {
    $("a[href*='oferta-de-trabajo']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        urls.push(href.startsWith("http") ? href : `https://cl.computrabajo.com${href}`);
      }
    });
  }

  return Array.from(new Set(urls));
}

// Extrae datos de una oferta individual
async function scrapeJobDetail(url: string): Promise<Job | null> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Título
    const title =
      $("h1").first().text().trim() ||
      $('[class*="title"]').first().text().trim();

    if (!title) return null;

    // Empresa
    let company = "";
    $('[class*="company"], [class*="empresa"], [data-id="company"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 100 && !company) company = text;
    });
    if (!company) {
      // Buscar en JSON-LD
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const d = JSON.parse($(el).html() || "");
          if (d["@type"] === "JobPosting" && d.hiringOrganization?.name) {
            company = d.hiringOrganization.name;
          }
        } catch {}
      });
    }

    // Descripción
    let description = "";
    const descEl = $("#job_description, [class*='description'], [class*='descripcion']")
      .first();
    if (descEl.length) {
      description = descEl.text().replace(/\s+/g, " ").trim().substring(0, 3000);
    }
    if (!description) {
      description = $("main, article, .content").first().text()
        .replace(/\s+/g, " ").trim().substring(0, 3000);
    }

    // Ubicación
    let location = "Chile";
    $('[class*="location"], [class*="ubicacion"], [class*="ciudad"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 80 && !text.includes("http")) location = text;
    });

    // Modalidad
    const fullText = html.toLowerCase();
    let modality: "remote" | "hybrid" | "presencial" | null = null;
    if (fullText.includes("teletrabajo") || fullText.includes("remoto") || fullText.includes("trabajo remoto")) {
      modality = fullText.includes("híbrido") || fullText.includes("hibrido") ? "hybrid" : "remote";
    } else if (fullText.includes("presencial")) {
      modality = "presencial";
    }

    // Extraer hash único de la URL
    const idMatch = url.match(/[A-F0-9]{32}/i);
    const externalId = idMatch ? `ct_${idMatch[0]}` : `ct_${Buffer.from(url).toString("base64").substring(0, 32)}`;

    // Salario si está disponible
    const salaryMatch = fullText.match(/\$\s*([\d.,]+)\s*[-–]\s*\$?\s*([\d.,]+)/);
    const salaryMin = salaryMatch ? parseInt(salaryMatch[1].replace(/[.,]/g, "")) : null;
    const salaryMax = salaryMatch ? parseInt(salaryMatch[2].replace(/[.,]/g, "")) : null;

    return {
      id: crypto.randomUUID(),
      external_id: externalId,
      title,
      company: company || "Empresa confidencial",
      location,
      modality,
      description: description || "Ver descripción en el link",
      apply_email: null,
      apply_link: url,
      source: "computrabajo",
      country: "CL",
      skills: [],
      seniority: null,
      salary_min: salaryMin,
      salary_max: salaryMax,
      posted_at: null,
      fetched_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return null;
  }
}

export async function scrapeComputrabajoJobs(roles: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  const seenIds = new Set<string>();

  for (const role of roles.slice(0, 3)) {
    try {
      const slug = roleToSlug(role);
      const listUrl = `${BASE_URL}/trabajo-de-${slug}`;

      console.log(`Computrabajo scraping: ${listUrl}`);

      const res = await fetch(listUrl, { headers: HEADERS });
      if (!res.ok) {
        console.error(`Computrabajo list error: ${res.status} for ${role}`);
        continue;
      }

      const html = await res.text();
      const jobUrls = extractJobUrls(html);

      console.log(`Computrabajo: ${jobUrls.length} URLs encontradas para "${role}"`);

      // Scrapear máximo 8 ofertas por rol en paralelo
      const urlsToScrape = jobUrls.slice(0, 8);
      const results = await Promise.allSettled(
        urlsToScrape.map((url) => scrapeJobDetail(url))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const job = result.value;
          if (!seenIds.has(job.external_id)) {
            seenIds.add(job.external_id);
            allJobs.push(job);
          }
        }
      }

      // Pequeña pausa entre roles para no sobrecargar el servidor
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`Error for role "${role}":`, err);
    }
  }

  console.log(`Computrabajo total: ${allJobs.length} trabajos`);
  return allJobs;
}
