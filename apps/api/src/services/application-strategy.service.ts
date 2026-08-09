import {
  ApplicationRiskTolerance,
  type MatchCategory,
  Prisma,
  type StudentProfile
} from "@prisma/client";
import {
  studentProfileSchema,
  type ApplicationStrategyGenerateInput,
  type ApplicationStrategyItemUpdateInput
} from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { generateReadinessScores } from "./readiness.service.js";
import { generateUniversityMatches } from "./university-matching.service.js";

const universityMatchInclude = {
  program: {
    include: {
      university: {
        include: {
          country: true
        }
      }
    }
  }
} satisfies Prisma.UniversityMatchInclude;

const applicationStrategyPlanInclude = {
  items: {
    include: {
      program: {
        include: {
          university: {
            include: {
              country: true
            }
          }
        }
      },
      match: true
    },
    orderBy: {
      rank: "asc"
    }
  }
} satisfies Prisma.ApplicationStrategyPlanInclude;

type UniversityMatchWithProgram = Prisma.UniversityMatchGetPayload<{
  include: typeof universityMatchInclude;
}>;

type StrategyCategory = "SAFE" | "TARGET" | "REACH";

type StrategyTargets = Record<StrategyCategory, number> & {
  total: number;
  riskTolerance: ApplicationRiskTolerance;
};

type StrategyCandidate = {
  match: UniversityMatchWithProgram;
  category: StrategyCategory;
  baseStrategyScore: number;
  deadlineDays: number | null;
  overBudget: boolean;
  locked: boolean;
  rationale: string[];
};

type SelectionState = {
  selected: StrategyCandidate[];
  selectedProgramIds: Set<string>;
  selectedUniversityIds: Set<string>;
  countryCounts: Map<string, number>;
};

const categoryOrder: StrategyCategory[] = ["SAFE", "TARGET", "REACH"];
const fallbackOrder: Record<StrategyCategory, StrategyCategory[]> = {
  SAFE: ["TARGET", "REACH"],
  TARGET: ["SAFE", "REACH"],
  REACH: ["TARGET", "SAFE"]
};

export class ApplicationStrategyError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export async function generateApplicationStrategyForUser(
  userId: string,
  input: ApplicationStrategyGenerateInput
) {
  const profile = await getCompleteProfile(userId);
  const targets = resolveTargets(input);
  const matches = await ensureUniversityMatches(profile);
  const candidates = buildCandidates(profile, matches);
  const lockedProgramIds = await getLatestLockedProgramIds(profile.id);

  if (!candidates.length) {
    throw new ApplicationStrategyError(
      "No suitable university matches are available for a strategy plan",
      409
    );
  }

  const selected = selectCandidates(candidates, targets, lockedProgramIds);
  const actualCounts = countByCategory(selected);
  const warnings = buildWarnings(targets, selected, candidates);
  const summary = buildSummary(targets.riskTolerance, actualCounts, selected);

  return prisma.applicationStrategyPlan.create({
    data: {
      studentProfileId: profile.id,
      totalApplications: selected.length,
      safeCount: actualCounts.SAFE,
      targetCount: actualCounts.TARGET,
      reachCount: actualCounts.REACH,
      riskTolerance: targets.riskTolerance,
      summary,
      warnings,
      items: {
        create: selected.map((candidate, index) => ({
          programId: candidate.match.programId,
          matchId: candidate.match.id,
          category: candidate.category,
          rank: index + 1,
          score: candidate.match.score,
          rationale: candidate.rationale,
          isLocked: candidate.locked
        }))
      }
    },
    include: applicationStrategyPlanInclude
  });
}

export async function getLatestApplicationStrategyForUser(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId
    },
    select: {
      id: true
    }
  });

  if (!profile) {
    return null;
  }

  return prisma.applicationStrategyPlan.findFirst({
    where: {
      studentProfileId: profile.id
    },
    include: applicationStrategyPlanInclude,
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function getLatestLockedProgramIds(studentProfileId: string) {
  const latestPlan = await prisma.applicationStrategyPlan.findFirst({
    where: {
      studentProfileId
    },
    select: {
      items: {
        where: {
          isLocked: true
        },
        select: {
          programId: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return new Set((latestPlan?.items ?? []).map((item) => item.programId));
}

export async function updateApplicationStrategyItemsForUser(
  userId: string,
  planId: string,
  input: ApplicationStrategyItemUpdateInput
) {
  const plan = await prisma.applicationStrategyPlan.findFirst({
    where: {
      id: planId,
      studentProfile: {
        userId
      }
    },
    select: {
      id: true
    }
  });

  if (!plan) {
    throw new ApplicationStrategyError("Application strategy plan was not found", 404);
  }

  await prisma.$transaction(input.items.map((item) => prisma.applicationStrategyItem.updateMany({
    where: {
      id: item.id,
      planId
    },
    data: {
      rank: item.rank,
      isLocked: item.isLocked
    }
  })));

  return prisma.applicationStrategyPlan.findUnique({
    where: {
      id: planId
    },
    include: applicationStrategyPlanInclude
  });
}

async function getCompleteProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId
    }
  });

  if (!profile) {
    throw new ApplicationStrategyError(
      "Complete your student profile before building an application strategy",
      409
    );
  }

  const validProfile = studentProfileSchema.safeParse(profile);

  if (!validProfile.success) {
    throw new ApplicationStrategyError(
      "Complete the required profile fields before building an application strategy",
      409,
      validProfile.error.flatten().fieldErrors
    );
  }

  return profile;
}

async function ensureUniversityMatches(profile: StudentProfile) {
  const existingMatches = await getUniversityMatches(profile.id);

  if (existingMatches.length) {
    return existingMatches;
  }

  const readinessScores = await ensureReadinessScores(profile);
  const programs = await prisma.program.findMany({
    include: {
      university: {
        include: {
          country: true
        }
      }
    }
  });

  const generatedMatches = generateUniversityMatches(profile, programs, readinessScores);

  await prisma.$transaction(generatedMatches.map((match) => prisma.universityMatch.create({
    data: {
      studentProfileId: profile.id,
      programId: match.programId,
      category: match.category,
      score: match.score,
      reasons: match.reasons
    }
  })));

  return getUniversityMatches(profile.id);
}

function getUniversityMatches(studentProfileId: string) {
  return prisma.universityMatch.findMany({
    where: {
      studentProfileId
    },
    include: universityMatchInclude,
    orderBy: [
      {
        score: "desc"
      },
      {
        createdAt: "desc"
      }
    ]
  });
}

async function ensureReadinessScores(profile: StudentProfile) {
  const existingScores = await prisma.readinessScore.findMany({
    where: {
      studentProfileId: profile.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existingScores.length) {
    return existingScores;
  }

  const generatedScores = generateReadinessScores(profile);

  await prisma.$transaction(generatedScores.map((score) => prisma.readinessScore.create({
    data: {
      studentProfileId: profile.id,
      tier: score.tier,
      score: score.score,
      strengths: score.strengths,
      weaknesses: score.weaknesses,
      recommendations: score.recommendations
    }
  })));

  return prisma.readinessScore.findMany({
    where: {
      studentProfileId: profile.id
    }
  });
}

function resolveTargets(input: ApplicationStrategyGenerateInput): StrategyTargets {
  const customCountsProvided = input.safeCount !== undefined
    && input.targetCount !== undefined
    && input.reachCount !== undefined;

  if (customCountsProvided) {
    const safe = input.safeCount ?? 0;
    const target = input.targetCount ?? 0;
    const reach = input.reachCount ?? 0;

    return {
      SAFE: safe,
      TARGET: target,
      REACH: reach,
      total: safe + target + reach,
      riskTolerance: input.riskTolerance
    };
  }

  const total = clamp(input.totalApplications, 3, 15);
  const allocated = allocateByRisk(total, input.riskTolerance);

  return {
    ...allocated,
    total,
    riskTolerance: input.riskTolerance
  };
}

function allocateByRisk(total: number, riskTolerance: ApplicationRiskTolerance) {
  const ratios = {
    [ApplicationRiskTolerance.CONSERVATIVE]: {
      SAFE: 0.45,
      TARGET: 0.44,
      REACH: 0.11
    },
    [ApplicationRiskTolerance.BALANCED]: {
      SAFE: 0.34,
      TARGET: 0.44,
      REACH: 0.22
    },
    [ApplicationRiskTolerance.AMBITIOUS]: {
      SAFE: 0.22,
      TARGET: 0.45,
      REACH: 0.33
    },
    [ApplicationRiskTolerance.CUSTOM]: {
      SAFE: 0.34,
      TARGET: 0.44,
      REACH: 0.22
    }
  }[riskTolerance];

  const rawCounts = categoryOrder.map((category) => ({
    category,
    exact: total * ratios[category],
    count: Math.floor(total * ratios[category])
  }));

  for (const item of rawCounts) {
    if (item.count === 0 && total >= categoryOrder.length) {
      item.count = 1;
    }
  }

  while (sumCounts(rawCounts) > total) {
    const item = [...rawCounts]
      .filter((candidate) => candidate.count > 1)
      .sort((left, right) => right.count - left.count)[0];

    if (!item) {
      break;
    }

    item.count -= 1;
  }

  while (sumCounts(rawCounts) < total) {
    const item = [...rawCounts].sort((left, right) => {
      const rightRemainder = right.exact - Math.floor(right.exact);
      const leftRemainder = left.exact - Math.floor(left.exact);

      return rightRemainder - leftRemainder;
    })[0];

    item.count += 1;
  }

  return rawCounts.reduce((counts, item) => ({
    ...counts,
    [item.category]: item.count
  }), {
    SAFE: 0,
    TARGET: 0,
    REACH: 0
  } as Record<StrategyCategory, number>);
}

function sumCounts(counts: Array<{ count: number }>) {
  return counts.reduce((sum, item) => sum + item.count, 0);
}

function buildCandidates(profile: StudentProfile, matches: UniversityMatchWithProgram[]) {
  return matches
    .filter((match) => !isPastDeadline(match.program.deadline))
    .filter((match) => degreeFits(profile.targetDegree, match.program.degreeLevel))
    .filter((match) => fieldFits(profile.fieldOfStudy, match.program.field) || match.score >= 70)
    .filter((match) => !isFarAboveBudget(profile.budgetUsd, match.program.tuitionUsd, match.category))
    .map((match) => buildCandidate(profile, match));
}

function buildCandidate(profile: StudentProfile, match: UniversityMatchWithProgram): StrategyCandidate {
  const program = match.program;
  const countryName = program.university.country.name;
  const budgetScore = scoreBudget(profile.budgetUsd, program.tuitionUsd);
  const preferredCountry = profile.preferredCountries.some((country) => sameText(country, countryName));
  const countryScore = preferredCountry ? 15 : 7;
  const deadlineDays = getDaysUntil(program.deadline);
  const deadlineScore = scoreDeadline(deadlineDays);
  const fieldMatch = fieldFits(profile.fieldOfStudy, program.field);
  const baseStrategyScore = Math.round((match.score * 0.45) + budgetScore + countryScore + deadlineScore);

  return {
    match,
    category: match.category,
    baseStrategyScore,
    deadlineDays,
    overBudget: profile.budgetUsd > 0 && program.tuitionUsd > profile.budgetUsd,
    locked: false,
    rationale: [
      `${formatCategory(match.category)} option with a ${match.score}/100 university match score.`,
      budgetScore >= 18
        ? "Tuition fits comfortably within the declared budget."
        : budgetScore >= 12
          ? "Tuition is close to the declared budget and should be reviewed carefully."
          : "Tuition is above the declared budget, so funding or scholarships matter here.",
      preferredCountry
        ? `${countryName} is already on the preferred country list.`
        : `${countryName} adds geographic diversification beyond the preferred country list.`,
      deadlineDays == null
        ? "No application deadline is listed yet."
        : deadlineDays <= 45
          ? `Deadline is approaching in ${deadlineDays} days.`
          : `Deadline has ${deadlineDays} days remaining.`,
      fieldMatch
        ? "Program field aligns with the target field of study."
        : "Program field is adjacent to the target field and ranked here because the overall fit is still strong."
    ]
  };
}

function selectCandidates(
  candidates: StrategyCandidate[],
  targets: StrategyTargets,
  lockedProgramIds: Set<string>
) {
  const state: SelectionState = {
    selected: [],
    selectedProgramIds: new Set<string>(),
    selectedUniversityIds: new Set<string>(),
    countryCounts: new Map<string, number>()
  };

  for (const candidate of candidates
    .filter((item) => lockedProgramIds.has(item.match.programId))
    .sort((left, right) => right.match.score - left.match.score)) {
    addCandidate(state, {
      ...candidate,
      locked: true
    }, targets.total);
  }

  for (const category of categoryOrder) {
    const currentCount = state.selected.filter((candidate) => candidate.category === category).length;
    pickCandidates(state, candidates, [category], Math.max(0, targets[category] - currentCount), targets.total);
  }

  const initialCounts = countByCategory(state.selected);

  for (const category of categoryOrder) {
    const shortage = Math.max(0, targets[category] - initialCounts[category]);

    if (shortage > 0) {
      pickCandidates(state, candidates, fallbackOrder[category], shortage, targets.total);
    }
  }

  if (state.selected.length < targets.total) {
    pickCandidates(state, candidates, categoryOrder, targets.total - state.selected.length, targets.total);
  }

  return state.selected
    .sort((left, right) => {
      const categoryComparison = categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return right.match.score - left.match.score;
    });
}

function pickCandidates(
  state: SelectionState,
  candidates: StrategyCandidate[],
  categories: StrategyCategory[],
  count: number,
  totalLimit: number
) {
  for (let index = 0; index < count && state.selected.length < totalLimit; index += 1) {
    const bestCandidate = candidates
      .filter((candidate) => categories.includes(candidate.category))
      .filter((candidate) => !state.selectedProgramIds.has(candidate.match.programId))
      .sort((left, right) => scoreCandidate(right, state) - scoreCandidate(left, state))[0];

    if (!bestCandidate) {
      return;
    }

    addCandidate(state, bestCandidate, totalLimit);
  }
}

function addCandidate(state: SelectionState, candidate: StrategyCandidate, totalLimit: number) {
  if (state.selected.length >= totalLimit || state.selectedProgramIds.has(candidate.match.programId)) {
    return;
  }

  state.selected.push(candidate);
  state.selectedProgramIds.add(candidate.match.programId);
  state.selectedUniversityIds.add(candidate.match.program.universityId);

  const countryName = candidate.match.program.university.country.name;
  state.countryCounts.set(countryName, (state.countryCounts.get(countryName) ?? 0) + 1);
}

function scoreCandidate(candidate: StrategyCandidate, state: SelectionState) {
  const universityId = candidate.match.program.universityId;
  const countryName = candidate.match.program.university.country.name;
  const countryCount = state.countryCounts.get(countryName) ?? 0;
  let diversityScore = 0;

  diversityScore += state.selectedUniversityIds.has(universityId) ? -8 : 5;

  if (countryCount === 0) {
    diversityScore += 5;
  } else if (countryCount === 1) {
    diversityScore += 2;
  } else {
    diversityScore -= countryCount * 3;
  }

  return candidate.baseStrategyScore + diversityScore;
}

function buildWarnings(
  targets: StrategyTargets,
  selected: StrategyCandidate[],
  candidates: StrategyCandidate[]
) {
  const warnings: string[] = [];
  const actualCounts = countByCategory(selected);

  for (const category of categoryOrder) {
    if (actualCounts[category] < targets[category]) {
      warnings.push(`Only ${actualCounts[category]} ${formatCategory(category)} options were available for the requested ${targets[category]}.`);
    }
  }

  if (selected.length < targets.total) {
    warnings.push(`The plan includes ${selected.length} applications because only ${candidates.length} suitable matches were available.`);
  }

  const overBudgetCount = selected.filter((candidate) => candidate.overBudget).length;

  if (overBudgetCount > 0) {
    warnings.push(`${overBudgetCount} selected program${overBudgetCount === 1 ? " is" : "s are"} above the declared budget.`);
  }

  const reachCount = actualCounts.REACH;

  if (reachCount > actualCounts.SAFE) {
    warnings.push("Reach applications outnumber Safe applications, so admission risk is elevated.");
  }

  const countryCounts = countByCountry(selected);
  const highestCountryCount = Math.max(0, ...countryCounts.values());

  if (selected.length > 0 && highestCountryCount / selected.length > 0.6) {
    warnings.push("The plan is concentrated in one country; consider adding another destination for risk balance.");
  }

  const urgentDeadlineCount = selected.filter((candidate) => candidate.deadlineDays !== null && candidate.deadlineDays <= 45).length;

  if (urgentDeadlineCount > 0) {
    warnings.push(`${urgentDeadlineCount} selected deadline${urgentDeadlineCount === 1 ? " is" : "s are"} within 45 days.`);
  }

  return warnings;
}

function buildSummary(
  riskTolerance: ApplicationRiskTolerance,
  counts: Record<StrategyCategory, number>,
  selected: StrategyCandidate[]
) {
  const countries = new Set(selected.map((candidate) => candidate.match.program.university.country.name));
  const riskLabel = riskTolerance === ApplicationRiskTolerance.CUSTOM
    ? "Custom"
    : formatRiskTolerance(riskTolerance);

  return `${riskLabel} plan recommends ${counts.SAFE} Safe, ${counts.TARGET} Target, and ${counts.REACH} Reach applications across ${countries.size} countr${countries.size === 1 ? "y" : "ies"}.`;
}

function countByCategory(candidates: StrategyCandidate[]) {
  return candidates.reduce((counts, candidate) => {
    counts[candidate.category] += 1;

    return counts;
  }, {
    SAFE: 0,
    TARGET: 0,
    REACH: 0
  } as Record<StrategyCategory, number>);
}

function countByCountry(candidates: StrategyCandidate[]) {
  return candidates.reduce((counts, candidate) => {
    const countryName = candidate.match.program.university.country.name;
    counts.set(countryName, (counts.get(countryName) ?? 0) + 1);

    return counts;
  }, new Map<string, number>());
}

function scoreBudget(budgetUsd: number, tuitionUsd: number) {
  if (budgetUsd <= 0) {
    return 8;
  }

  if (tuitionUsd <= budgetUsd * 0.85) {
    return 20;
  }

  if (tuitionUsd <= budgetUsd) {
    return 18;
  }

  if (tuitionUsd <= budgetUsd * 1.15) {
    return 12;
  }

  if (tuitionUsd <= budgetUsd * 1.35) {
    return 7;
  }

  return 2;
}

function scoreDeadline(deadlineDays: number | null) {
  if (deadlineDays === null) {
    return 7;
  }

  if (deadlineDays < 30) {
    return 5;
  }

  if (deadlineDays < 60) {
    return 8;
  }

  return 10;
}

function getDaysUntil(deadline: Date | null) {
  if (!deadline) {
    return null;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.ceil((deadline.getTime() - Date.now()) / millisecondsPerDay);
}

function isPastDeadline(deadline: Date | null) {
  const daysUntil = getDaysUntil(deadline);

  return daysUntil !== null && daysUntil < 0;
}

function isFarAboveBudget(budgetUsd: number, tuitionUsd: number, category: MatchCategory) {
  if (budgetUsd <= 0) {
    return false;
  }

  const limit = category === "SAFE" ? 1.5 : 1.4;

  return tuitionUsd > budgetUsd * limit;
}

function degreeFits(targetDegree: string, programDegree: string) {
  return sameText(targetDegree, programDegree) || includesEither(targetDegree, programDegree);
}

function fieldFits(targetField: string, programField: string) {
  return sameText(targetField, programField) || includesEither(targetField, programField);
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

  if (["ms", "msc", "master", "masters"].includes(normalized)) {
    return "master's degree";
  }

  if (["bs", "bsc", "bachelor", "bachelors"].includes(normalized)) {
    return "bachelor's degree";
  }

  if (["uk", "u.k.", "england", "britain", "great britain"].includes(normalized)) {
    return "united kingdom";
  }

  if (["usa", "u.s.a.", "us", "u.s.", "america"].includes(normalized)) {
    return "united states";
  }

  return normalized;
}

function formatCategory(category: StrategyCategory) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function formatRiskTolerance(riskTolerance: ApplicationRiskTolerance) {
  return riskTolerance.charAt(0) + riskTolerance.slice(1).toLowerCase();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
