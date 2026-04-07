import { Job, MatchResult, ApplicationProfile } from "@/types";

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/[.\s]+/g, "");
}

export function calculateMatch(profile: ApplicationProfile, job: Job): MatchResult {
  const profileSkills = profile.skills.map(normalizeSkill);
  const jobSkills = (job.skills || []).map(normalizeSkill);

  // Skills score (60%)
  let skillScore = 0;
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  if (jobSkills.length > 0) {
    for (const jobSkill of jobSkills) {
      if (profileSkills.some((ps) => ps.includes(jobSkill) || jobSkill.includes(ps))) {
        matchedSkills.push(jobSkill);
      } else {
        missingSkills.push(jobSkill);
      }
    }
    skillScore = (matchedSkills.length / jobSkills.length) * 60;
  } else {
    skillScore = 40; // No skill requirements = moderate match
  }

  // Role match score (25%)
  let roleScore = 0;
  const jobTitleNorm = job.title.toLowerCase();
  for (const targetRole of profile.target_roles) {
    const roleNorm = targetRole.toLowerCase();
    if (jobTitleNorm.includes(roleNorm) || roleNorm.includes(jobTitleNorm)) {
      roleScore = 25;
      break;
    }
    // Partial match
    const roleWords = roleNorm.split(" ");
    const matchingWords = roleWords.filter((w) => jobTitleNorm.includes(w));
    if (matchingWords.length >= roleWords.length * 0.5) {
      roleScore = Math.max(roleScore, 15);
    }
  }

  // Seniority match (15%)
  let seniorityScore = 0;
  if (!job.seniority || job.seniority === profile.seniority) {
    seniorityScore = 15;
  } else {
    const levels = ["junior", "semi-senior", "senior", "lead"];
    const profileIdx = levels.indexOf(profile.seniority);
    const jobIdx = levels.indexOf(job.seniority);
    if (Math.abs(profileIdx - jobIdx) === 1) seniorityScore = 8;
  }

  const totalScore = Math.round(skillScore + roleScore + seniorityScore);

  const reasons: string[] = [];
  if (matchedSkills.length > 0) {
    reasons.push(`Tienes ${matchedSkills.length} de ${jobSkills.length} skills requeridos`);
  }
  if (roleScore >= 25) {
    reasons.push("El cargo coincide con tu perfil");
  }
  if (profile.preferred_locations.some((loc) =>
    job.location.toLowerCase().includes(loc.toLowerCase())
  )) {
    reasons.push("Ubicación preferida");
  }

  const gaps: string[] = missingSkills.slice(0, 3).map((s) => `Falta: ${s}`);

  return {
    score: Math.min(100, totalScore),
    matchedSkills,
    missingSkills,
    reasons,
    gaps,
  };
}

export function filterAndRankJobs(
  jobs: Job[],
  profile: ApplicationProfile
): Array<Job & { match: MatchResult }> {
  const excluded = (profile.target_roles || []).map((r) => r.toLowerCase());
  const excludedCompanies: string[] = []; // Could add from preferences

  return jobs
    .filter((job) => {
      if (excludedCompanies.includes(job.company.toLowerCase())) return false;
      return true;
    })
    .map((job) => ({ ...job, match: calculateMatch(profile, job) }))
    .filter((j) => j.match.score >= 20) // Minimum threshold
    .sort((a, b) => b.match.score - a.match.score);
}
