import type { Country, Program, ReadinessScore, StudentProfile, University } from "@prisma/client";

type ProgramWithUniversity = Program & {
  university: University & {
    country: Country;
  };
};

export type UniversityMatchResult = {
  programId: string;
  category: "SAFE" | "TARGET" | "REACH";
  score: number;
  reasons: string[];
};

export function generateUniversityMatches(
  profile: StudentProfile,
  programs: ProgramWithUniversity[],
  readinessScores: ReadinessScore[]
): UniversityMatchResult[] {
  return programs
    .map((program) => scoreProgram(profile, program, readinessScores))
    .sort((left, right) => right.score - left.score);
}

function scoreProgram(
  profile: StudentProfile,
  program: ProgramWithUniversity,
  readinessScores: ReadinessScore[]
): UniversityMatchResult {
  const normalizedCgpa = normalizeCgpa(profile.cgpa, profile.cgpaScale);
  const englishScore = getIeltsEquivalent(profile);
  const readinessScore = getReadinessScore(program.university.rankingBand, readinessScores);
  const preferredCountry = profile.preferredCountries.some((country) => sameText(country, program.university.country.name));
  const fieldMatch = sameText(profile.fieldOfStudy, program.field) || includesEither(profile.fieldOfStudy, program.field);
  const budgetFit = profile.budgetUsd >= program.tuitionUsd;
  const cgpaMet = normalizedCgpa >= program.minCgpa;
  const englishMet = meetsEnglishRequirement(profile, englishScore, program);
  const greMet = !program.minGre || Boolean(profile.greScore && profile.greScore >= program.minGre);

  let score = 0;
  const reasons: string[] = [];

  score += component(cgpaMet, 20, 8);
  reasons.push(cgpaMet
    ? `CGPA ${normalizedCgpa.toFixed(2)} meets the program minimum of ${program.minCgpa.toFixed(2)}.`
    : `CGPA ${normalizedCgpa.toFixed(2)} is below the program minimum of ${program.minCgpa.toFixed(2)}.`);

  score += component(englishMet, 15, 5);
  reasons.push(englishMet
    ? "English test score meets the listed requirement."
    : "English test score is below or missing for the listed requirement.");

  score += component(greMet, 10, program.minGre ? 3 : 8);
  if (program.minGre) {
    reasons.push(greMet
      ? `GRE score meets the listed minimum of ${program.minGre}.`
      : `GRE minimum is ${program.minGre}, but the profile does not meet it yet.`);
  } else {
    reasons.push("GRE is not listed as a hard requirement.");
  }

  score += Math.round(readinessScore * 0.25);
  reasons.push(`Readiness score for ${program.university.rankingBand} programs is ${readinessScore}/100.`);

  score += component(fieldMatch, 10, 3);
  reasons.push(fieldMatch
    ? "Program field matches the student's target field."
    : "Program field is related but not an exact target-field match.");

  score += component(preferredCountry, 10, 4);
  reasons.push(preferredCountry
    ? `${program.university.country.name} is in the student's preferred country list.`
    : `${program.university.country.name} is outside the current preferred country list.`);

  score += component(budgetFit, 10, 2);
  reasons.push(budgetFit
    ? "Tuition is within the student's declared budget."
    : "Tuition is above the student's declared budget.");

  if (program.researchPreferred) {
    const researchFit = profile.researchPapers > 0;
    score += component(researchFit, 5, 1);
    reasons.push(researchFit
      ? "Research experience supports this research-oriented program."
      : "Research experience would improve fit for this program.");
  } else {
    score += 4;
  }

  if (program.workExperiencePreferred) {
    const workFit = profile.workExperienceMonths >= 6;
    score += component(workFit, 5, 1);
    reasons.push(workFit
      ? "Work experience supports this professionally oriented program."
      : "More work experience would improve fit for this program.");
  } else {
    score += 4;
  }

  const finalScore = clamp(score);

  return {
    programId: program.id,
    category: categorize(finalScore, cgpaMet, englishMet, greMet),
    score: finalScore,
    reasons
  };
}

function component(condition: boolean, full: number, partial: number) {
  return condition ? full : partial;
}

function categorize(score: number, cgpaMet: boolean, englishMet: boolean, greMet: boolean): "SAFE" | "TARGET" | "REACH" {
  const coreRequirementsMet = cgpaMet && englishMet && greMet;

  if (score >= 82 && coreRequirementsMet) {
    return "SAFE";
  }

  if (score >= 68 || (coreRequirementsMet && score >= 60)) {
    return "TARGET";
  }

  return "REACH";
}

function getReadinessScore(rankingBand: string, readinessScores: ReadinessScore[]) {
  const exact = readinessScores.find((score) => sameText(score.tier, rankingBand));

  if (exact) {
    return exact.score;
  }

  if (rankingBand.toLowerCase().includes("top")) {
    return readinessScores.find((score) => sameText(score.tier, "Top-tier"))?.score ?? 50;
  }

  if (rankingBand.toLowerCase().includes("accessible")) {
    return readinessScores.find((score) => sameText(score.tier, "Accessible-tier"))?.score ?? 50;
  }

  return readinessScores.find((score) => sameText(score.tier, "Mid-tier"))?.score ?? 50;
}

function normalizeCgpa(cgpa: number, cgpaScale: number) {
  if (cgpaScale <= 0) {
    return 0;
  }

  return (cgpa / cgpaScale) * 4;
}

function getIeltsEquivalent(profile: StudentProfile) {
  if (profile.ieltsScore) {
    return profile.ieltsScore;
  }

  if (profile.toeflScore) {
    return Math.min(9, profile.toeflScore / 13.33);
  }

  return 0;
}

function meetsEnglishRequirement(profile: StudentProfile, englishScore: number, program: ProgramWithUniversity) {
  if (program.minIelts && englishScore < program.minIelts) {
    return false;
  }

  if (program.minToefl && (!profile.toeflScore || profile.toeflScore < program.minToefl)) {
    return false;
  }

  return true;
}

function sameText(left: string, right: string) {
  return normalizeText(left) === normalizeText(right);
}

function includesEither(left: string, right: string) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

function normalizeText(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["uk", "u.k.", "england", "britain", "great britain"].includes(normalized)) {
    return "united kingdom";
  }

  if (["usa", "u.s.a.", "us", "u.s.", "america"].includes(normalized)) {
    return "united states";
  }

  return normalized;
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
