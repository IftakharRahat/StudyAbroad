import type { StudentProfile } from "@prisma/client";

export type ReadinessResult = {
  tier: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

type TierConfig = {
  tier: string;
  cgpaTarget: number;
  englishTarget: number;
  standardizedTarget: number;
  researchTarget: number;
  workTarget: number;
  budgetTarget: number;
};

const tierConfigs: TierConfig[] = [
  {
    tier: "Top-tier",
    cgpaTarget: 3.75,
    englishTarget: 7.5,
    standardizedTarget: 320,
    researchTarget: 2,
    workTarget: 12,
    budgetTarget: 45000
  },
  {
    tier: "Mid-tier",
    cgpaTarget: 3.25,
    englishTarget: 6.5,
    standardizedTarget: 305,
    researchTarget: 1,
    workTarget: 6,
    budgetTarget: 25000
  },
  {
    tier: "Accessible-tier",
    cgpaTarget: 3,
    englishTarget: 6,
    standardizedTarget: 295,
    researchTarget: 0,
    workTarget: 0,
    budgetTarget: 15000
  }
];

export function generateReadinessScores(profile: StudentProfile): ReadinessResult[] {
  const normalizedCgpa = normalizeCgpa(profile.cgpa, profile.cgpaScale);
  const englishScore = getIeltsEquivalent(profile);

  return tierConfigs.map((config) => {
    const components = {
      cgpa: scoreRatio(normalizedCgpa, config.cgpaTarget) * 35,
      english: scoreRatio(englishScore, config.englishTarget) * 20,
      standardized: scoreStandardized(profile, config) * 15,
      research: scoreRatio(profile.researchPapers, config.researchTarget) * 15,
      work: scoreRatio(profile.workExperienceMonths, config.workTarget) * 10,
      budget: scoreRatio(profile.budgetUsd, config.budgetTarget) * 5
    };

    const score = clampScore(Math.round(Object.values(components).reduce((sum, value) => sum + value, 0)));

    return {
      tier: config.tier,
      score,
      strengths: buildStrengths(profile, config, normalizedCgpa, englishScore, components),
      weaknesses: buildWeaknesses(profile, config, normalizedCgpa, englishScore),
      recommendations: buildRecommendations(profile, config, normalizedCgpa, englishScore)
    };
  });
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

function scoreRatio(value: number, target: number) {
  if (target <= 0) {
    return 1;
  }

  return Math.min(value / target, 1);
}

function scoreStandardized(profile: StudentProfile, config: TierConfig) {
  const standardizedScore = profile.greScore ?? convertGmatToGre(profile.gmatScore);

  if (!standardizedScore) {
    return config.tier === "Accessible-tier" ? 0.8 : 0.45;
  }

  return scoreRatio(standardizedScore, config.standardizedTarget);
}

function convertGmatToGre(gmatScore: number | null) {
  if (!gmatScore) {
    return null;
  }

  return Math.round(260 + ((gmatScore - 200) / 600) * 80);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function buildStrengths(
  profile: StudentProfile,
  config: TierConfig,
  normalizedCgpa: number,
  englishScore: number,
  components: Record<string, number>
) {
  const strengths: string[] = [];

  if (normalizedCgpa >= config.cgpaTarget) {
    strengths.push("CGPA meets the expected academic level for this tier.");
  }

  if (englishScore >= config.englishTarget) {
    strengths.push("English proficiency is competitive for this tier.");
  }

  if (profile.researchPapers >= Math.max(1, config.researchTarget)) {
    strengths.push("Research experience strengthens the application profile.");
  }

  if (profile.workExperienceMonths >= Math.max(6, config.workTarget)) {
    strengths.push("Work experience adds practical strength to the profile.");
  }

  if (profile.budgetUsd >= config.budgetTarget) {
    strengths.push("Budget is likely enough for programs in this tier.");
  }

  if (components.standardized >= 12) {
    strengths.push("Standardized test score is a useful advantage.");
  }

  return strengths.length ? strengths : ["Profile has enough baseline data to evaluate this tier."];
}

function buildWeaknesses(profile: StudentProfile, config: TierConfig, normalizedCgpa: number, englishScore: number) {
  const weaknesses: string[] = [];

  if (normalizedCgpa < config.cgpaTarget) {
    weaknesses.push(`CGPA is below the ${config.cgpaTarget.toFixed(2)} target used for this tier.`);
  }

  if (englishScore < config.englishTarget) {
    weaknesses.push(`English score is below the ${config.englishTarget.toFixed(1)} IELTS-equivalent target.`);
  }

  if (!profile.greScore && !profile.gmatScore && config.tier !== "Accessible-tier") {
    weaknesses.push("No GRE or GMAT score is available for programs that may prefer it.");
  }

  if (profile.researchPapers < config.researchTarget) {
    weaknesses.push("Research output is lower than expected for this tier.");
  }

  if (profile.workExperienceMonths < config.workTarget) {
    weaknesses.push("Work experience is below the preferred level for this tier.");
  }

  if (profile.budgetUsd < config.budgetTarget) {
    weaknesses.push("Available budget may limit choices in this tier.");
  }

  return weaknesses.length ? weaknesses : ["No major weakness detected for this tier."];
}

function buildRecommendations(profile: StudentProfile, config: TierConfig, normalizedCgpa: number, englishScore: number) {
  const recommendations: string[] = [];

  if (normalizedCgpa < config.cgpaTarget) {
    recommendations.push("Prioritize programs with flexible GPA requirements or strengthen the profile with projects and research.");
  }

  if (englishScore < config.englishTarget) {
    recommendations.push("Improve IELTS/TOEFL before applying to this tier.");
  }

  if (!profile.greScore && !profile.gmatScore && config.tier !== "Accessible-tier") {
    recommendations.push("Consider taking GRE or GMAT if target programs mention standardized tests.");
  }

  if (profile.researchPapers < config.researchTarget) {
    recommendations.push("Add research, thesis, publication, or faculty-supervised project experience.");
  }

  if (profile.budgetUsd < config.budgetTarget) {
    recommendations.push("Pair this tier with scholarship searches and lower-cost country options.");
  }

  return recommendations.length ? recommendations : ["Proceed to university matching for this tier."];
}
