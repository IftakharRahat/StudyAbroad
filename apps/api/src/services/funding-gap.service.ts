import { type FundingGapStatus, Prisma } from "@prisma/client";
import type { FundingGapAnalyzeInput } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";

/**
 * Module 4 · Feature 2 — Funding Gap Analyzer
 *
 * Compares the student's available budget (+ any scholarship funding) against
 * the estimated total cost of the programs they intend to apply to. If a gap
 * exists it suggests scholarships, cheaper universities / countries and other
 * options to close it.
 *
 * Estimated total cost per program =
 *   tuition + (living cost for one academic year) + visa fee + insurance
 *   + application fee + flight + emergency fund.
 */

export class FundingGapError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "FundingGapError";
  }
}

// Reasonable default one-off costs (USD) when the caller does not override.
const DEFAULTS = {
  visaFeeUsd: 350,
  insuranceUsd: 800,
  applicationFeeUsd: 120,
  flightCostUsd: 1200,
  emergencyFundUsd: 2000,
  livingMonths: 12
};

const programInclude = {
  university: {
    include: { country: true }
  }
} satisfies Prisma.ProgramInclude;

type ProgramWithContext = Prisma.ProgramGetPayload<{ include: typeof programInclude }>;

function classifyGap(gapUsd: number, estimatedCostUsd: number): FundingGapStatus {
  if (gapUsd <= 0) {
    // Budget covers cost. Treat a small remaining margin as BALANCED.
    return Math.abs(gapUsd) <= estimatedCostUsd * 0.05 ? "BALANCED" : "SURPLUS";
  }
  return gapUsd <= estimatedCostUsd * 0.2 ? "MINOR_GAP" : "MAJOR_GAP";
}

/**
 * Resolve the programs to cost. Priority:
 *   1. Explicit programIds from the request.
 *   2. Programs in the student's latest application strategy plan.
 */
async function resolvePrograms(
  studentProfileId: string,
  programIds?: string[]
): Promise<ProgramWithContext[]> {
  if (programIds && programIds.length > 0) {
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds } },
      include: programInclude
    });

    if (programs.length === 0) {
      throw new FundingGapError("None of the provided programs were found", 404);
    }

    return programs;
  }

  const latestPlan = await prisma.applicationStrategyPlan.findFirst({
    where: { studentProfileId },
    orderBy: { createdAt: "desc" },
    select: {
      items: {
        select: {
          program: { include: programInclude }
        }
      }
    }
  });

  const programs = latestPlan?.items.map((item) => item.program) ?? [];

  if (programs.length === 0) {
    throw new FundingGapError(
      "No programs to analyze. Provide programIds or build an application strategy first.",
      422
    );
  }

  return programs;
}

function buildSuggestions(
  status: FundingGapStatus,
  gapUsd: number,
  items: Array<{ label: string; totalCostUsd: number; countryName: string }>
): string[] {
  if (status === "SURPLUS" || status === "BALANCED") {
    return [
      "Your budget covers the estimated cost. Keep an emergency buffer aside for currency fluctuations."
    ];
  }

  const suggestions: string[] = [
    `You have an estimated funding gap of about $${Math.round(gapUsd).toLocaleString()}.`
  ];

  const cheapest = [...items].sort((a, b) => a.totalCostUsd - b.totalCostUsd)[0];
  const priciest = [...items].sort((a, b) => b.totalCostUsd - a.totalCostUsd)[0];

  if (cheapest && priciest && cheapest.label !== priciest.label) {
    suggestions.push(
      `Dropping the most expensive option (${priciest.label}) and favouring lower-cost choices like ${cheapest.label} would reduce your total outlay.`
    );
  }

  suggestions.push(
    "Apply to scholarships you are eligible for — even partial funding lowers the gap.",
    "Consider countries with lower living costs or stronger post-study work rights to offset expenses.",
    "Look for programs that allow more part-time work hours to supplement your budget."
  );

  return suggestions;
}

/**
 * Run a funding gap analysis for the student and persist the result.
 */
export async function analyzeFundingGap(userId: string, input: FundingGapAnalyzeInput) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true, budgetUsd: true }
  });

  if (!profile) {
    throw new FundingGapError("Complete your student profile before analyzing funding.", 422);
  }

  const programs = await resolvePrograms(profile.id, input.programIds);

  const perProgramOneOff = {
    visaFeeUsd: input.visaFeeUsd ?? DEFAULTS.visaFeeUsd,
    insuranceUsd: input.insuranceUsd ?? DEFAULTS.insuranceUsd,
    applicationFeeUsd: input.applicationFeeUsd ?? DEFAULTS.applicationFeeUsd,
    flightCostUsd: input.flightCostUsd ?? DEFAULTS.flightCostUsd,
    emergencyFundUsd: input.emergencyFundUsd ?? DEFAULTS.emergencyFundUsd
  };

  const items = programs.map((program) => {
    const livingCostUsd = program.university.country.averageLivingCostUsd * DEFAULTS.livingMonths;
    const totalCostUsd =
      program.tuitionUsd +
      livingCostUsd +
      perProgramOneOff.visaFeeUsd +
      perProgramOneOff.insuranceUsd +
      perProgramOneOff.applicationFeeUsd +
      perProgramOneOff.flightCostUsd +
      perProgramOneOff.emergencyFundUsd;

    return {
      programId: program.id,
      label: `${program.title} — ${program.university.name}`,
      countryName: program.university.country.name,
      tuitionUsd: program.tuitionUsd,
      livingCostUsd,
      visaFeeUsd: perProgramOneOff.visaFeeUsd,
      insuranceUsd: perProgramOneOff.insuranceUsd,
      applicationFeeUsd: perProgramOneOff.applicationFeeUsd,
      flightCostUsd: perProgramOneOff.flightCostUsd,
      emergencyFundUsd: perProgramOneOff.emergencyFundUsd,
      totalCostUsd: Number(totalCostUsd.toFixed(2))
    };
  });

  const estimatedCostUsd = Number(
    items.reduce((sum, item) => sum + item.totalCostUsd, 0).toFixed(2)
  );
  const availableBudgetUsd = input.availableBudgetUsd ?? profile.budgetUsd;
  const scholarshipUsd = input.scholarshipUsd ?? 0;
  const gapUsd = Number((estimatedCostUsd - availableBudgetUsd - scholarshipUsd).toFixed(2));
  const status = classifyGap(gapUsd, estimatedCostUsd);
  const suggestions = buildSuggestions(status, gapUsd, items);

  const analysis = await prisma.fundingGapAnalysis.create({
    data: {
      userId,
      availableBudgetUsd,
      scholarshipUsd,
      estimatedCostUsd,
      gapUsd,
      status,
      suggestions: suggestions as unknown as Prisma.InputJsonValue,
      items: {
        create: items.map((item) => ({
          programId: item.programId,
          label: item.label,
          tuitionUsd: item.tuitionUsd,
          livingCostUsd: item.livingCostUsd,
          visaFeeUsd: item.visaFeeUsd,
          insuranceUsd: item.insuranceUsd,
          applicationFeeUsd: item.applicationFeeUsd,
          flightCostUsd: item.flightCostUsd,
          emergencyFundUsd: item.emergencyFundUsd,
          totalCostUsd: item.totalCostUsd
        }))
      }
    },
    include: { items: true }
  });

  return analysis;
}

/**
 * Return the most recent funding gap analysis for the student.
 */
export async function getLatestFundingGapForUser(userId: string) {
  return prisma.fundingGapAnalysis.findFirst({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
}
