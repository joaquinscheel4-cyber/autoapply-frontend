export interface UserPreferences {
  target_roles: string[];
  salary_expectation: number | null;
  preferred_locations: string[];
  remote_preference: "remote" | "hybrid" | "presencial" | "cualquiera";
  industries_of_interest: string[];
  excluded_companies: string[];
  years_experience: number;
  job_search_mode: "conservative" | "moderate" | "aggressive";
  auto_apply_enabled: boolean;
}

export interface ParsedCV {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  skills: string[];
  seniority: "junior" | "semi-senior" | "senior" | "lead" | null;
  years_experience: number | null;
  current_role: string | null;
  education: string[];
  languages: string[];
  summary: string | null;
  confidence_score: number; // 0-100
}

export interface Profile {
  id: string;
  user_id: string;
  cv_url: string | null;
  cv_text: string | null;
  parsed_cv: ParsedCV | null;
  preferences: UserPreferences | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  modality: "remote" | "hybrid" | "presencial" | null;
  description: string;
  apply_email: string | null;
  apply_link: string | null;
  source: string;
  country: string;
  skills: string[];
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  fetched_at: string;
  // Recruiter contact enriched via Apollo
  recruiter_email: string | null;
  recruiter_name: string | null;
  recruiter_title: string | null;
  email_source: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  job?: Job;
  cover_letter_text: string;
  status: "pending" | "sent" | "failed" | "sin_contacto";
  sent_at: string | null;
  email_message_id: string | null;
  triggered_by: "cron" | "manual" | "sniper";
  created_at: string;
  recruiter_email: string | null;
  recruiter_name: string | null;
  recruiter_title: string | null;
  email_source: string | null;
}

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  gaps: string[];
}

export interface JobWithMatch extends Job {
  match: MatchResult;
  already_applied: boolean;
}

export interface ApplicationProfile {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  skills: string[];
  seniority: string;
  years_experience: number;
  current_role: string | null;
  education: string[];
  languages: string[];
  summary: string | null;
  target_roles: string[];
  preferred_locations: string[];
  remote_preference: string;
  salary_expectation: number | null;
  industries: string[];
}
