import { Profile, ApplicationProfile } from "@/types";

export function buildApplicationProfile(profile: Profile): ApplicationProfile | null {
  const cv = profile.parsed_cv;
  const prefs = profile.preferences;

  if (!cv || !prefs) return null;

  return {
    name: cv.name || "Sin nombre",
    email: cv.email || "",
    phone: cv.phone,
    linkedin: cv.linkedin,
    skills: cv.skills || [],
    seniority: cv.seniority || "semi-senior",
    years_experience: cv.years_experience || prefs.years_experience || 0,
    current_role: cv.current_role,
    education: cv.education || [],
    languages: cv.languages || ["Español"],
    summary: cv.summary,
    target_roles: prefs.target_roles || [],
    preferred_locations: prefs.preferred_locations || ["Santiago"],
    remote_preference: prefs.remote_preference || "cualquiera",
    salary_expectation: prefs.salary_expectation,
    industries: prefs.industries_of_interest || [],
  };
}
