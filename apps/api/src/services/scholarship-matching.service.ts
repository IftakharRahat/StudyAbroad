import type { Country, Scholarship, ScholarshipEligibilityRule, StudentProfile } from "@prisma/client";

type ScholarshipWithCountry = Scholarship & {
  country: Country | null;
  eligibilityRule?: ScholarshipEligibilityRule | null;
};

export type ScholarshipMatchResult = {
  scholarshipId: string;
  matchingPercentage: number;
  status: "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_RECOMMENDED";
  reasons: string[];
  missingRequirements: string[];
};

export function generateScholarshipMatches(
  profile: StudentProfile,
  scholarships: ScholarshipWithCountry[]
): ScholarshipMatchResult[] {
  return scholarships
    .map((scholarship) => scoreScholarship(profile, scholarship))
    .filter((match): match is ScholarshipMatchResult => Boolean(match))
    .filter((match) => match.matchingPercentage >= 65)
    .sort((left, right) => {
      if (right.matchingPercentage !== left.matchingPercentage) {
        return right.matchingPercentage - left.matchingPercentage;
      }

      return left.status.localeCompare(right.status);
    });
}

function scoreScholarship(profile: StudentProfile, scholarship: ScholarshipWithCountry): ScholarshipMatchResult | null {
  if (scholarship.status !== "APPROVED") {
    return null;
  }

  if (scholarship.deadline && scholarship.deadline < new Date()) {
    return null;
  }

  const rule = scholarship.eligibilityRule;
  const degreeLevel = rule?.degreeLevel ?? scholarship.degreeLevel;
  const eligibleNationalities = rule?.eligibleNationalities ?? scholarship.eligibleNationalities;
  const eligibleSubjects = rule?.eligibleSubjects ?? scholarship.eligibleFields;
  const minCgpa = rule?.minCgpa ?? scholarship.minCgpa;
  const minIelts = rule?.minIelts ?? scholarship.minIelts;
  const normalizedCgpa = normalizeCgpa(profile.cgpa, profile.cgpaScale);
  const englishScore = getIeltsEquivalent(profile);
  const reasons: string[] = [];
  const missingRequirements: string[] = [];
  let score = 0;

  const nationalityMatch = matchesList(eligibleNationalities, profile.nationality, {
    allowDevelopingCountries: true
  });
  if (!nationalityMatch) {
    return null;
  }
  score += 20;
  reasons.push(`${profile.nationality} is eligible based on the nationality rule.`);

  const degreeMatch = matchesDegree(profile.targetDegree, degreeLevel);
  if (!degreeMatch) {
    return null;
  }
  score += 20;
  reasons.push(`${profile.targetDegree} matches the scholarship degree level.`);

  const subjectMatch = getSubjectMatch(profile.fieldOfStudy, eligibleSubjects);
  if (subjectMatch === "NONE") {
    return null;
  }
  score += subjectMatch === "EXACT" ? 20 : 14;
  reasons.push(subjectMatch === "EXACT"
    ? `${profile.fieldOfStudy} is listed as an eligible subject.`
    : `${profile.fieldOfStudy} is related to the eligible subject group.`);

  const cgpaResult = compareAcademicRequirement(normalizedCgpa, minCgpa, 0.2);
  if (cgpaResult === "MISS") {
    return null;
  }
  score += cgpaResult === "MEET" ? 15 : 8;
  if (cgpaResult === "MEET" || minCgpa == null) {
    reasons.push(`CGPA ${normalizedCgpa.toFixed(2)} meets the minimum requirement.`);
  } else {
    reasons.push(`CGPA ${normalizedCgpa.toFixed(2)} is close to the minimum requirement.`);
    missingRequirements.push(`Raise CGPA toward ${minCgpa.toFixed(2)} if the scholarship office applies the minimum strictly.`);
  }

  const englishResult = compareAcademicRequirement(englishScore, minIelts, 0.5);
  if (englishResult === "MISS") {
    return null;
  }
  score += englishResult === "MEET" ? 15 : 8;
  if (englishResult === "MEET" || minIelts == null) {
    reasons.push("English test score meets the listed language requirement.");
  } else {
    reasons.push("English test score is close to the listed language requirement.");
    missingRequirements.push(`Improve IELTS-equivalent score toward ${minIelts.toFixed(1)}.`);
  }

  const countryMatch = scholarship.country
    ? profile.preferredCountries.some((country) => matchesText(country, scholarship.country!.name))
    : true;
  reasons.push(countryMatch
    ? "Scholarship country aligns with the preferred country list."
    : "Scholarship country is outside the preferred list, so it is lower priority.");

  const deadlineScore = getDeadlineSafetyScore(scholarship.deadline);
  score += deadlineScore.score;
  reasons.push(deadlineScore.reason);
  if (deadlineScore.warning) {
    missingRequirements.push(deadlineScore.warning);
  }

  if (scholarship.researchRequired && profile.researchPapers <= 0) {
    missingRequirements.push("Prepare research evidence or supervisor-fit material before applying.");
  }

  const rawScore = clamp(score);
  const matchingPercentage = missingRequirements.length ? Math.min(rawScore, 84) : rawScore;

  return {
    scholarshipId: scholarship.id,
    matchingPercentage,
    status: matchingPercentage >= 85 && missingRequirements.length === 0 ? "ELIGIBLE" : matchingPercentage >= 65 ? "ALMOST_ELIGIBLE" : "NOT_RECOMMENDED",
    reasons,
    missingRequirements
  };
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

function matchesList(values: string[], target: string, options: { allowDevelopingCountries?: boolean } = {}) {
  return values.some((value) => {
    if (options.allowDevelopingCountries && isDevelopingCountryGroup(value) && isDevelopingCountryNationality(target)) {
      return true;
    }

    return matchesText(value, target);
  });
}

function matchesText(left: string, right: string) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  return normalizedLeft === "any"
    || normalizedRight === "any"
    || normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
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

function matchesDegree(left: string, right: string) {
  const normalizedLeft = normalizeText(left).replace(/'s/g, "").replace(/degree/g, "").trim();
  const normalizedRight = normalizeText(right).replace(/'s/g, "").replace(/degree/g, "").trim();

  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

function getSubjectMatch(fieldOfStudy: string, eligibleSubjects: string[]) {
  if (eligibleSubjects.some((subject) => matchesText(subject, fieldOfStudy))) {
    return "EXACT";
  }

  const profileGroups = getSubjectGroups(fieldOfStudy);
  const eligibleGroups = eligibleSubjects.flatMap((subject) => getSubjectGroups(subject));
  const related = profileGroups.some((group) => eligibleGroups.includes(group));

  return related ? "RELATED" : "NONE";
}

function getSubjectGroups(value: string) {
  const normalized = normalizeText(value);
  const groups: string[] = [];

  if (["computer science", "cse", "software engineering", "data science", "artificial intelligence", "machine learning", "cyber security", "cybersecurity", "informatics"].some((item) => normalized.includes(item))) {
    groups.push("computing", "stem");
  }

  if (["engineering", "mathematics", "statistics", "stem"].some((item) => normalized.includes(item))) {
    groups.push("stem");
  }

  if (["business", "management", "finance"].some((item) => normalized.includes(item))) {
    groups.push("business");
  }

  if (["development", "public policy"].some((item) => normalized.includes(item))) {
    groups.push("development");
  }

  return groups;
}

function compareAcademicRequirement(value: number, minimum: number | null | undefined, almostWindow: number) {
  if (minimum == null) {
    return "MEET";
  }

  if (value >= minimum) {
    return "MEET";
  }

  if (value >= minimum - almostWindow) {
    return "ALMOST";
  }

  return "MISS";
}

function getDeadlineSafetyScore(deadline: Date | null) {
  if (!deadline) {
    return {
      score: 10,
      reason: "Deadline is rolling or not fixed in the catalog."
    };
  }

  const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);

  if (daysRemaining >= 60) {
    return {
      score: 10,
      reason: `${daysRemaining} days remain before the scholarship deadline.`
    };
  }

  if (daysRemaining >= 30) {
    return {
      score: 7,
      reason: `${daysRemaining} days remain before the scholarship deadline.`,
      warning: "Deadline is approaching; prepare documents soon."
    };
  }

  return {
    score: 4,
    reason: `${Math.max(daysRemaining, 0)} days remain before the scholarship deadline.`,
    warning: "Deadline is very close; apply only if documents are ready."
  };
}

function isDevelopingCountryGroup(value: string) {
  const normalized = normalizeText(value);

  return normalized === "developing countries" || normalized === "developing country";
}

function isDevelopingCountryNationality(value: string) {
  const normalized = normalizeText(value);

  return ["bangladesh", "bangladeshi", "india", "indian", "pakistan", "pakistani", "nepal", "nepali", "sri lanka", "sri lankan"].includes(normalized);
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
