import { type ApplicationStage, Prisma } from "@prisma/client";
import type {
  ApplicationProgressCreateInput,
  ApplicationProgressUpdateInput
} from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";

/**
 * Module 2 · Feature 3 — Application Progress Tracker
 *
 * Lets a student track every university application from planning to
 * enrollment. Stages: PLANNED, PREPARING, APPLIED, INTERVIEW, OFFER_RECEIVED,
 * REJECTED, VISA_PROCESSING, ENROLLED.
 */

export class ApplicationProgressError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApplicationProgressError";
  }
}

const progressInclude = {
  program: {
    include: {
      university: {
        include: { country: true }
      }
    }
  }
} satisfies Prisma.ApplicationProgressInclude;

// The pipeline order used to compute a coarse completion percentage.
const STAGE_ORDER: ApplicationStage[] = [
  "PLANNED",
  "PREPARING",
  "APPLIED",
  "INTERVIEW",
  "OFFER_RECEIVED",
  "VISA_PROCESSING",
  "ENROLLED"
];

type TrackedEvent = {
  stage: ApplicationStage;
  at: string;
  note?: string;
};

function stageProgressPercent(stage: ApplicationStage): number {
  if (stage === "REJECTED") return 100;
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0) return 0;
  return Math.round((index / (STAGE_ORDER.length - 1)) * 100);
}

function appendEvent(existing: unknown, event: TrackedEvent): TrackedEvent[] {
  const events = Array.isArray(existing) ? (existing as TrackedEvent[]) : [];
  return [...events, event];
}

/**
 * Return every application the student is tracking, newest activity first,
 * plus a small summary that the dashboard can render directly.
 */
export async function getApplicationProgressForUser(userId: string) {
  const applications = await prisma.applicationProgress.findMany({
    where: { userId },
    include: progressInclude,
    orderBy: { updatedAt: "desc" }
  });

  const summary = {
    total: applications.length,
    byStage: {} as Record<ApplicationStage, number>,
    offers: applications.filter((a) => a.stage === "OFFER_RECEIVED" || a.stage === "ENROLLED").length,
    enrolled: applications.filter((a) => a.stage === "ENROLLED").length
  };

  for (const application of applications) {
    summary.byStage[application.stage] = (summary.byStage[application.stage] ?? 0) + 1;
  }

  return {
    applications: applications.map((application) => ({
      ...application,
      progressPercent: stageProgressPercent(application.stage)
    })),
    summary
  };
}

/**
 * Start tracking an application for a program. One row per (user, program).
 */
export async function createApplicationProgress(
  userId: string,
  input: ApplicationProgressCreateInput
) {
  const program = await prisma.program.findUnique({
    where: { id: input.programId },
    select: { id: true }
  });

  if (!program) {
    throw new ApplicationProgressError("Program not found", 404);
  }

  const existing = await prisma.applicationProgress.findUnique({
    where: { userId_programId: { userId, programId: input.programId } },
    select: { id: true }
  });

  if (existing) {
    throw new ApplicationProgressError("You are already tracking this application", 409);
  }

  const stage = input.stage ?? "PLANNED";

  return prisma.applicationProgress.create({
    data: {
      userId,
      programId: input.programId,
      stage,
      notes: input.notes ?? null,
      appliedAt: stage === "APPLIED" ? new Date() : null,
      events: appendEvent([], { stage, at: new Date().toISOString(), note: "Tracking started" }) as unknown as Prisma.InputJsonValue
    },
    include: progressInclude
  });
}

/**
 * Move an application to a new stage and/or update notes. Records a timeline
 * event and stamps appliedAt / decisionAt when the relevant stage is reached.
 */
export async function updateApplicationProgress(
  userId: string,
  id: string,
  input: ApplicationProgressUpdateInput
) {
  const current = await prisma.applicationProgress.findFirst({
    where: { id, userId },
    select: { id: true, stage: true, events: true, appliedAt: true, decisionAt: true }
  });

  if (!current) {
    throw new ApplicationProgressError("Tracked application not found", 404);
  }

  const data: Prisma.ApplicationProgressUpdateInput = {};

  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  if (input.stage && input.stage !== current.stage) {
    data.stage = input.stage;

    if (input.stage === "APPLIED" && !current.appliedAt) {
      data.appliedAt = new Date();
    }

    if (
      (input.stage === "OFFER_RECEIVED" || input.stage === "REJECTED") &&
      !current.decisionAt
    ) {
      data.decisionAt = new Date();
    }

    data.events = appendEvent(current.events, {
      stage: input.stage,
      at: new Date().toISOString(),
      note: input.notes ?? undefined
    }) as unknown as Prisma.InputJsonValue;
  }

  return prisma.applicationProgress.update({
    where: { id },
    data,
    include: progressInclude
  });
}

/**
 * Stop tracking an application.
 */
export async function deleteApplicationProgress(userId: string, id: string) {
  const current = await prisma.applicationProgress.findFirst({
    where: { id, userId },
    select: { id: true }
  });

  if (!current) {
    throw new ApplicationProgressError("Tracked application not found", 404);
  }

  await prisma.applicationProgress.delete({ where: { id } });
  return { id };
}
