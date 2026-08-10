import { createHash } from "node:crypto";
import {
  type MonitorAlertSeverity,
  type MonitorAlertStatus,
  Prisma,
  type Program,
  type Scholarship,
  type StudentProfile
} from "@prisma/client";
import type { MonitorScanInput } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";

type RequirementValue = string | number | boolean | string[] | null;
type RequirementRecord = Record<string, RequirementValue>;

type ProgramWithContext = Program & {
  university: {
    name: string;
    city: string;
    country: {
      name: string;
    };
  };
};

type ScholarshipWithContext = Scholarship & {
  country: {
    name: string;
  } | null;
  university?: {
    name: string;
  } | null;
  program?: {
    title: string;
  } | null;
};

type ScholarshipWatch = {
  scholarship: ScholarshipWithContext;
  deadline: Date | null;
};

type RequirementChange = {
  field: string;
  label: string;
  previousValue: string;
  currentValue: string;
  currentRawValue: RequirementValue;
};

type AlertCreateParams = {
  userId: string;
  dedupeKey: string;
  type: "APPLICATION_DEADLINE" | "SCHOLARSHIP_DEADLINE" | "REQUIREMENT_CHANGE";
  severity: MonitorAlertSeverity;
  entityType: "PROGRAM" | "SCHOLARSHIP";
  programId?: string;
  scholarshipId?: string;
  title: string;
  message: string;
  dueDate?: Date | null;
  field?: string;
  previousValue?: string;
  currentValue?: string;
  metadata?: Prisma.InputJsonValue;
};

export class DeadlineRequirementMonitorError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export async function runDeadlineRequirementMonitorForUser(
  userId: string,
  input: MonitorScanInput
) {
  const profile = await getProfileOrThrow(userId);
  const [programs, scholarshipWatches] = await Promise.all([
    getWatchedPrograms(profile.id),
    getWatchedScholarships(userId)
  ]);

  let alertsCreated = 0;
  const requirementChanges: RequirementChange[] = [];

  for (const program of programs) {
    alertsCreated += await createDeadlineAlertForProgram(userId, program, input);
    const changes = await scanProgramRequirementChanges(userId, profile, program);
    requirementChanges.push(...changes);
    alertsCreated += changes.length;
  }

  for (const watch of scholarshipWatches) {
    alertsCreated += await createDeadlineAlertForScholarship(userId, watch.scholarship, watch.deadline, input);
    const changes = await scanScholarshipRequirementChanges(userId, profile, watch.scholarship, watch.deadline);
    requirementChanges.push(...changes);
    alertsCreated += changes.length;
  }

  const alertSummary = await getAlertSummaryForUser(userId);

  return {
    summary: {
      watchedPrograms: programs.length,
      watchedScholarships: scholarshipWatches.length,
      alertsCreated,
      requirementChanges: requirementChanges.length,
      unreadAlerts: alertSummary.unreadCount,
      criticalAlerts: alertSummary.criticalCount
    },
    alerts: alertSummary.alerts
  };
}

export async function getMonitorAlertsForUser(
  userId: string,
  query: Record<string, unknown> = {}
) {
  const status = typeof query.status === "string" ? query.status.toUpperCase() : "";
  const includeDismissed = query.includeDismissed === "true";

  return getAlertSummaryForUser(userId, isMonitorAlertStatus(status)
    ? status
    : includeDismissed
      ? undefined
      : "ACTIVE");
}

export async function updateMonitorAlertStatusForUser(
  userId: string,
  alertId: string,
  status: MonitorAlertStatus
) {
  const result = await prisma.monitorAlert.updateMany({
    where: {
      id: alertId,
      userId
    },
    data: {
      status
    }
  });

  if (result.count === 0) {
    throw new DeadlineRequirementMonitorError("Monitor alert was not found", 404);
  }

  return prisma.monitorAlert.findFirst({
    where: {
      id: alertId,
      userId
    },
    include: monitorAlertInclude
  });
}

export async function markAllMonitorAlertsReadForUser(userId: string) {
  await prisma.monitorAlert.updateMany({
    where: {
      userId,
      status: "UNREAD"
    },
    data: {
      status: "READ"
    }
  });

  return getAlertSummaryForUser(userId);
}

const monitorAlertInclude = {
  program: {
    include: {
      university: {
        include: {
          country: true
        }
      }
    }
  },
  scholarship: {
    include: {
      country: true,
      university: true,
      program: true
    }
  }
} satisfies Prisma.MonitorAlertInclude;

async function getProfileOrThrow(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId
    }
  });

  if (!profile) {
    throw new DeadlineRequirementMonitorError(
      "Complete your student profile before running the deadline and requirement monitor",
      409
    );
  }

  return profile;
}

async function getWatchedPrograms(studentProfileId: string): Promise<ProgramWithContext[]> {
  const latestPlan = await prisma.applicationStrategyPlan.findFirst({
    where: {
      studentProfileId
    },
    include: {
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
          }
        },
        orderBy: {
          rank: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (latestPlan?.items.length) {
    return uniquePrograms(latestPlan.items.map((item) => item.program));
  }

  const matches = await prisma.universityMatch.findMany({
    where: {
      studentProfileId
    },
    include: {
      program: {
        include: {
          university: {
            include: {
              country: true
            }
          }
        }
      }
    },
    orderBy: {
      score: "desc"
    },
    take: 15
  });

  return uniquePrograms(matches.map((match) => match.program));
}

async function getWatchedScholarships(userId: string): Promise<ScholarshipWatch[]> {
  const [savedScholarships, trackedDeadlines] = await Promise.all([
    prisma.studentSavedScholarship.findMany({
      where: {
        userId
      },
      include: {
        scholarship: {
          include: {
            country: true,
            university: true,
            program: true
          }
        }
      }
    }),
    prisma.scholarshipDeadline.findMany({
      where: {
        userId
      },
      include: {
        scholarship: {
          include: {
            country: true,
            university: true,
            program: true
          }
        }
      }
    })
  ]);

  const byScholarshipId = new Map<string, ScholarshipWatch>();

  for (const saved of savedScholarships) {
    byScholarshipId.set(saved.scholarshipId, {
      scholarship: saved.scholarship,
      deadline: saved.scholarship.deadline
    });
  }

  for (const tracked of trackedDeadlines) {
    byScholarshipId.set(tracked.scholarshipId, {
      scholarship: tracked.scholarship,
      deadline: tracked.deadline
    });
  }

  return [...byScholarshipId.values()];
}

async function createDeadlineAlertForProgram(
  userId: string,
  program: ProgramWithContext,
  input: MonitorScanInput
) {
  if (!program.deadline) {
    return 0;
  }

  const deadlineState = getDeadlineState(program.deadline, input);

  if (!deadlineState) {
    return 0;
  }

  return createAlertIfMissing({
    userId,
    dedupeKey: [
      "deadline",
      "program",
      program.id,
      deadlineState.bucket,
      toDateKey(program.deadline)
    ].join(":"),
    type: "APPLICATION_DEADLINE",
    severity: deadlineState.severity,
    entityType: "PROGRAM",
    programId: program.id,
    title: deadlineState.bucket === "passed" ? "Application deadline passed" : "Application deadline approaching",
    message: `${program.title} at ${program.university.name} is ${deadlineState.message}.`,
    dueDate: program.deadline,
    metadata: {
      daysUntil: deadlineState.daysUntil,
      universityName: program.university.name,
      countryName: program.university.country.name
    }
  });
}

async function createDeadlineAlertForScholarship(
  userId: string,
  scholarship: ScholarshipWithContext,
  deadline: Date | null,
  input: MonitorScanInput
) {
  if (!deadline) {
    return 0;
  }

  const deadlineState = getDeadlineState(deadline, input);

  if (!deadlineState) {
    return 0;
  }

  return createAlertIfMissing({
    userId,
    dedupeKey: [
      "deadline",
      "scholarship",
      scholarship.id,
      deadlineState.bucket,
      toDateKey(deadline)
    ].join(":"),
    type: "SCHOLARSHIP_DEADLINE",
    severity: deadlineState.severity,
    entityType: "SCHOLARSHIP",
    scholarshipId: scholarship.id,
    title: deadlineState.bucket === "passed" ? "Scholarship deadline passed" : "Scholarship deadline approaching",
    message: `${scholarship.name} is ${deadlineState.message}.`,
    dueDate: deadline,
    metadata: {
      daysUntil: deadlineState.daysUntil,
      countryName: scholarship.country?.name ?? null
    }
  });
}

async function scanProgramRequirementChanges(
  userId: string,
  profile: StudentProfile,
  program: ProgramWithContext
) {
  const currentRequirements = getProgramRequirements(program);
  const snapshot = await prisma.requirementSnapshot.findUnique({
    where: {
      studentProfileId_entityType_programId: {
        studentProfileId: profile.id,
        entityType: "PROGRAM",
        programId: program.id
      }
    }
  });
  const changes = snapshot
    ? diffRequirements(snapshot.requirements as RequirementRecord, currentRequirements, programRequirementLabels)
    : [];

  for (const change of changes) {
    await createRequirementChangeAlert({
      userId,
      profile,
      entityType: "PROGRAM",
      programId: program.id,
      entityName: `${program.title} at ${program.university.name}`,
      change
    });
  }

  await upsertProgramRequirementSnapshot(profile.id, program.id, currentRequirements);

  return changes;
}

async function scanScholarshipRequirementChanges(
  userId: string,
  profile: StudentProfile,
  scholarship: ScholarshipWithContext,
  deadline: Date | null
) {
  const currentRequirements = getScholarshipRequirements(scholarship, deadline);
  const snapshot = await prisma.requirementSnapshot.findUnique({
    where: {
      studentProfileId_entityType_scholarshipId: {
        studentProfileId: profile.id,
        entityType: "SCHOLARSHIP",
        scholarshipId: scholarship.id
      }
    }
  });
  const changes = snapshot
    ? diffRequirements(snapshot.requirements as RequirementRecord, currentRequirements, scholarshipRequirementLabels)
    : [];

  for (const change of changes) {
    await createRequirementChangeAlert({
      userId,
      profile,
      entityType: "SCHOLARSHIP",
      scholarshipId: scholarship.id,
      entityName: scholarship.name,
      change
    });
  }

  await upsertScholarshipRequirementSnapshot(profile.id, scholarship.id, currentRequirements);

  return changes;
}

async function createRequirementChangeAlert({
  userId,
  profile,
  entityType,
  programId,
  scholarshipId,
  entityName,
  change
}: {
  userId: string;
  profile: StudentProfile;
  entityType: "PROGRAM" | "SCHOLARSHIP";
  programId?: string;
  scholarshipId?: string;
  entityName: string;
  change: RequirementChange;
}) {
  const severity = getRequirementChangeSeverity(profile, change);

  return createAlertIfMissing({
    userId,
    dedupeKey: [
      "requirement",
      entityType.toLowerCase(),
      programId ?? scholarshipId,
      change.field,
      change.previousValue,
      change.currentValue
    ].join(":"),
    type: "REQUIREMENT_CHANGE",
    severity,
    entityType,
    programId,
    scholarshipId,
    title: entityType === "PROGRAM" ? "Admission requirement changed" : "Scholarship requirement changed",
    message: `${entityName}: ${change.label} changed from ${change.previousValue} to ${change.currentValue}.`,
    field: change.field,
    previousValue: change.previousValue,
    currentValue: change.currentValue,
    metadata: {
      requirementLabel: change.label
    }
  });
}

async function upsertProgramRequirementSnapshot(
  studentProfileId: string,
  programId: string,
  requirements: RequirementRecord
) {
  await prisma.requirementSnapshot.upsert({
    where: {
      studentProfileId_entityType_programId: {
        studentProfileId,
        entityType: "PROGRAM",
        programId
      }
    },
    update: {
      requirements,
      requirementHash: hashRequirements(requirements)
    },
    create: {
      studentProfileId,
      entityType: "PROGRAM",
      programId,
      requirements,
      requirementHash: hashRequirements(requirements)
    }
  });
}

async function upsertScholarshipRequirementSnapshot(
  studentProfileId: string,
  scholarshipId: string,
  requirements: RequirementRecord
) {
  await prisma.requirementSnapshot.upsert({
    where: {
      studentProfileId_entityType_scholarshipId: {
        studentProfileId,
        entityType: "SCHOLARSHIP",
        scholarshipId
      }
    },
    update: {
      requirements,
      requirementHash: hashRequirements(requirements)
    },
    create: {
      studentProfileId,
      entityType: "SCHOLARSHIP",
      scholarshipId,
      requirements,
      requirementHash: hashRequirements(requirements)
    }
  });
}

async function createAlertIfMissing(params: AlertCreateParams) {
  try {
    await prisma.monitorAlert.create({
      data: {
        userId: params.userId,
        dedupeKey: params.dedupeKey,
        type: params.type,
        severity: params.severity,
        entityType: params.entityType,
        programId: params.programId,
        scholarshipId: params.scholarshipId,
        title: params.title,
        message: params.message,
        dueDate: params.dueDate,
        field: params.field,
        previousValue: params.previousValue,
        currentValue: params.currentValue,
        metadata: params.metadata
      }
    });

    return 1;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return 0;
    }

    throw error;
  }
}

async function getAlertSummaryForUser(userId: string, status: MonitorAlertStatus | "ACTIVE" | undefined = "ACTIVE") {
  const statusFilter = status === "ACTIVE"
    ? {
      not: "DISMISSED" as const
    }
    : status;
  const [alerts, unreadCount, criticalCount] = await Promise.all([
    prisma.monitorAlert.findMany({
      where: {
        userId,
        status: statusFilter
      },
      include: monitorAlertInclude,
      orderBy: [
        {
          status: "desc"
        },
        {
          severity: "asc"
        },
        {
          dueDate: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 60
    }),
    prisma.monitorAlert.count({
      where: {
        userId,
        status: "UNREAD"
      }
    }),
    prisma.monitorAlert.count({
      where: {
        userId,
        severity: "CRITICAL",
        status: {
          not: "DISMISSED"
        }
      }
    })
  ]);

  return {
    alerts,
    unreadCount,
    criticalCount
  };
}

const programRequirementLabels: Record<string, string> = {
  degreeLevel: "Degree level",
  field: "Program field",
  tuitionUsd: "Tuition",
  minCgpa: "CGPA minimum",
  minIelts: "IELTS minimum",
  minToefl: "TOEFL minimum",
  minGre: "GRE minimum",
  researchPreferred: "Research preference",
  workExperiencePreferred: "Work experience preference",
  deadline: "Application deadline"
};

const scholarshipRequirementLabels: Record<string, string> = {
  degreeLevel: "Degree level",
  eligibleNationalities: "Eligible nationalities",
  eligibleFields: "Eligible fields",
  minCgpa: "CGPA minimum",
  minIelts: "IELTS minimum",
  researchRequired: "Research requirement",
  amountUsd: "Award amount",
  coverageType: "Coverage type",
  deadline: "Scholarship deadline"
};

function getProgramRequirements(program: ProgramWithContext): RequirementRecord {
  return {
    degreeLevel: program.degreeLevel,
    field: program.field,
    tuitionUsd: program.tuitionUsd,
    minCgpa: program.minCgpa,
    minIelts: program.minIelts,
    minToefl: program.minToefl,
    minGre: program.minGre,
    researchPreferred: program.researchPreferred,
    workExperiencePreferred: program.workExperiencePreferred,
    deadline: program.deadline ? toDateKey(program.deadline) : null
  };
}

function getScholarshipRequirements(scholarship: ScholarshipWithContext, deadline: Date | null): RequirementRecord {
  return {
    degreeLevel: scholarship.degreeLevel,
    eligibleNationalities: sortTextArray(scholarship.eligibleNationalities),
    eligibleFields: sortTextArray(scholarship.eligibleFields),
    minCgpa: scholarship.minCgpa,
    minIelts: scholarship.minIelts,
    researchRequired: scholarship.researchRequired,
    amountUsd: scholarship.amountUsd,
    coverageType: scholarship.coverageType,
    deadline: deadline ? toDateKey(deadline) : null
  };
}

function diffRequirements(
  previous: RequirementRecord,
  current: RequirementRecord,
  labels: Record<string, string>
) {
  const changes: RequirementChange[] = [];

  for (const [field, label] of Object.entries(labels)) {
    const previousValue = normalizeRequirementValue(previous[field]);
    const currentValue = normalizeRequirementValue(current[field]);

    if (previousValue !== currentValue) {
      changes.push({
        field,
        label,
        previousValue,
        currentValue,
        currentRawValue: current[field]
      });
    }
  }

  return changes;
}

function getRequirementChangeSeverity(profile: StudentProfile, change: RequirementChange): MonitorAlertSeverity {
  if (change.field === "minIelts") {
    const current = toNumber(change.currentRawValue);

    return current !== null && (!profile.ieltsScore || profile.ieltsScore < current) ? "CRITICAL" : "WARNING";
  }

  if (change.field === "minToefl") {
    const current = toNumber(change.currentRawValue);

    return current !== null && (!profile.toeflScore || profile.toeflScore < current) ? "CRITICAL" : "WARNING";
  }

  if (change.field === "minGre") {
    const current = toNumber(change.currentRawValue);

    return current !== null && (!profile.greScore || profile.greScore < current) ? "CRITICAL" : "WARNING";
  }

  if (change.field === "minCgpa") {
    const current = toNumber(change.currentRawValue);
    const normalizedCgpa = profile.cgpaScale > 0 ? (profile.cgpa / profile.cgpaScale) * 4 : 0;

    return current !== null && normalizedCgpa < current ? "CRITICAL" : "WARNING";
  }

  if (change.field === "tuitionUsd") {
    const current = toNumber(change.currentRawValue);

    return current !== null && profile.budgetUsd > 0 && current > profile.budgetUsd ? "CRITICAL" : "WARNING";
  }

  if (change.field === "deadline") {
    const daysUntil = typeof change.currentRawValue === "string"
      ? getDaysUntil(new Date(change.currentRawValue))
      : null;

    return daysUntil !== null && daysUntil <= 14 ? "CRITICAL" : "WARNING";
  }

  return "WARNING";
}

function getDeadlineState(deadline: Date, input: MonitorScanInput) {
  const daysUntil = getDaysUntil(deadline);

  if (daysUntil < 0) {
    return {
      bucket: "passed",
      severity: "CRITICAL" as const,
      daysUntil,
      message: `past due by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`
    };
  }

  if (daysUntil <= input.criticalDays) {
    return {
      bucket: "critical",
      severity: "CRITICAL" as const,
      daysUntil,
      message: daysUntil === 0 ? "due today" : `due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
    };
  }

  if (daysUntil <= input.horizonDays) {
    return {
      bucket: "near",
      severity: "WARNING" as const,
      daysUntil,
      message: `due in ${daysUntil} days`
    };
  }

  return null;
}

function getDaysUntil(deadline: Date) {
  return Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
}

function uniquePrograms(programs: ProgramWithContext[]) {
  const byId = new Map<string, ProgramWithContext>();

  for (const program of programs) {
    byId.set(program.id, program);
  }

  return [...byId.values()];
}

function normalizeRequirementValue(value: RequirementValue | undefined) {
  if (value === undefined || value === null || value === "") {
    return "Not listed";
  }

  if (Array.isArray(value)) {
    return sortTextArray(value).join(", ") || "Not listed";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  return value;
}

function hashRequirements(requirements: RequirementRecord) {
  return createHash("sha256")
    .update(JSON.stringify(sortObject(requirements)))
    .digest("hex");
}

function sortObject(value: RequirementRecord) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function sortTextArray(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: RequirementValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isMonitorAlertStatus(value: string): value is MonitorAlertStatus {
  return ["UNREAD", "READ", "DISMISSED"].includes(value);
}
