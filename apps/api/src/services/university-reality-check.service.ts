import { type RealityCheckCategory, Prisma } from "@prisma/client";
import type { RealityCheckCreateInput } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";

/**
 * Module 3 · Feature 2 — University Reality Check
 *
 * Practical, on-the-ground information official university pages rarely
 * highlight: housing difficulty, hidden costs, part-time job availability,
 * language barriers, student satisfaction and accommodation challenges.
 *
 * Students read only PUBLISHED entries. Content Managers / Admins can create
 * new entries (published or as drafts pending review).
 */

export class RealityCheckError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "RealityCheckError";
  }
}

const realityCheckSelect = {
  id: true,
  category: true,
  headline: true,
  detail: true,
  severity: true,
  monthlyCostUsd: true,
  sourceLabel: true,
  sourceUrl: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UniversityRealityCheckSelect;

// Human-friendly labels used when summarising by category.
const CATEGORY_LABELS: Record<RealityCheckCategory, string> = {
  HOUSING: "Housing",
  HIDDEN_COSTS: "Hidden costs",
  PART_TIME_JOBS: "Part-time jobs",
  LANGUAGE_BARRIER: "Language barrier",
  STUDENT_SATISFACTION: "Student satisfaction",
  ACCOMMODATION: "Accommodation",
  SAFETY: "Safety",
  TRANSPORT: "Transport"
};

/**
 * Reality checks for a single university. Students only ever see published
 * entries; content managers / admins can pass includeUnpublished to review
 * drafts.
 */
export async function getRealityCheckForUniversity(
  universityId: string,
  options: { includeUnpublished?: boolean } = {}
) {
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    include: { country: true }
  });

  if (!university) {
    throw new RealityCheckError("University not found", 404);
  }

  const checks = await prisma.universityRealityCheck.findMany({
    where: {
      universityId,
      ...(options.includeUnpublished ? {} : { isPublished: true })
    },
    select: realityCheckSelect,
    orderBy: [{ severity: "desc" }, { category: "asc" }]
  });

  const flaggedConcerns = checks.filter((check) => check.severity >= 4).length;
  const averageSeverity = checks.length
    ? Number((checks.reduce((sum, check) => sum + check.severity, 0) / checks.length).toFixed(1))
    : null;
  const estimatedExtraMonthlyCostUsd = checks.reduce(
    (sum, check) => sum + (check.monthlyCostUsd ?? 0),
    0
  );

  return {
    university: {
      id: university.id,
      name: university.name,
      city: university.city,
      country: university.country.name,
      rankingBand: university.rankingBand
    },
    checks: checks.map((check) => ({
      ...check,
      categoryLabel: CATEGORY_LABELS[check.category]
    })),
    summary: {
      totalInsights: checks.length,
      flaggedConcerns,
      averageSeverity,
      estimatedExtraMonthlyCostUsd
    }
  };
}

/**
 * Content Manager / Admin: publish a new reality-check insight for a
 * university.
 */
export async function createRealityCheck(input: RealityCheckCreateInput) {
  const university = await prisma.university.findUnique({
    where: { id: input.universityId },
    select: { id: true }
  });

  if (!university) {
    throw new RealityCheckError("University not found", 404);
  }

  return prisma.universityRealityCheck.create({
    data: {
      universityId: input.universityId,
      category: input.category,
      headline: input.headline,
      detail: input.detail,
      severity: input.severity,
      monthlyCostUsd: input.monthlyCostUsd ?? null,
      sourceLabel: input.sourceLabel ?? null,
      sourceUrl: input.sourceUrl ?? null,
      isPublished: input.isPublished ?? false
    },
    select: { ...realityCheckSelect, universityId: true }
  });
}
