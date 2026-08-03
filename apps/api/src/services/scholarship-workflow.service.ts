import { studentProfileSchema } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { generateScholarshipMatches } from "./scholarship-matching.service.js";

export class ScholarshipWorkflowError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function generateScholarshipMatchesForUser(userId: string, query: Record<string, unknown> = {}) {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId
    }
  });

  if (!profile) {
    throw new ScholarshipWorkflowError(409, "Complete your student profile before generating scholarship matches");
  }

  const validProfile = studentProfileSchema.safeParse(profile);

  if (!validProfile.success) {
    throw new ScholarshipWorkflowError(409, "Complete the required profile fields before generating scholarship matches", validProfile.error.flatten().fieldErrors);
  }

  const scholarships = await prisma.scholarship.findMany({
    where: {
      status: "APPROVED"
    },
    include: {
      country: true,
      eligibilityRule: true
    }
  });

  const generatedMatches = generateScholarshipMatches(profile, scholarships);

  await prisma.$transaction([
    prisma.scholarshipMatch.deleteMany({
      where: {
        studentProfileId: profile.id
      }
    }),
    ...generatedMatches.map((match) => prisma.scholarshipMatch.create({
      data: {
        studentProfileId: profile.id,
        scholarshipId: match.scholarshipId,
        matchingPercentage: match.matchingPercentage,
        status: match.status,
        reasons: match.reasons,
        missingRequirements: match.missingRequirements
      }
    }))
  ]);

  return getScholarshipMatchesForUser(userId, query);
}

export async function getScholarshipMatchesForUser(userId: string, query: Record<string, unknown> = {}) {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId
    },
    select: {
      id: true
    }
  });

  if (!profile) {
    return [];
  }

  const country = typeof query.country === "string" ? query.country.trim() : "";
  const minMatch = typeof query.minMatch === "string" ? Number(query.minMatch) : undefined;
  const status = typeof query.status === "string" ? query.status.trim().toUpperCase() : "";

  const scholarshipMatches = await prisma.scholarshipMatch.findMany({
    where: {
      studentProfileId: profile.id,
      status: isScholarshipMatchStatus(status) ? status : undefined,
      matchingPercentage: Number.isFinite(minMatch)
        ? {
          gte: minMatch
        }
        : undefined,
      scholarship: {
        status: "APPROVED",
        country: country
          ? {
            name: {
              equals: country,
              mode: "insensitive"
            }
          }
          : undefined
      }
    },
    include: {
      scholarship: {
        include: {
          country: true,
          university: true,
          program: true,
          eligibilityRule: true,
          savedBy: {
            where: {
              userId
            },
            take: 1
          },
          deadlines: {
            where: {
              userId
            },
            take: 1
          }
        }
      }
    },
    orderBy: [
      {
        matchingPercentage: "desc"
      },
      {
        createdAt: "desc"
      }
    ]
  });

  return scholarshipMatches.map((match) => ({
    ...match,
    scholarship: withStudentFlags(match.scholarship)
  }));
}

export async function getScholarshipDetailForUser(userId: string, scholarshipId: string) {
  const [profile, scholarship] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: {
        userId
      },
      select: {
        id: true
      }
    }),
    prisma.scholarship.findFirst({
      where: {
        id: scholarshipId,
        status: "APPROVED"
      },
      include: {
        country: true,
        university: true,
        program: true,
        eligibilityRule: true,
        savedBy: {
          where: {
            userId
          },
          take: 1
        },
        deadlines: {
          where: {
            userId
          },
          take: 1
        }
      }
    })
  ]);

  if (!scholarship) {
    throw new ScholarshipWorkflowError(404, "Scholarship not found");
  }

  const match = profile
    ? await prisma.scholarshipMatch.findFirst({
      where: {
        studentProfileId: profile.id,
        scholarshipId
      }
    })
    : null;

  return {
    scholarship: withStudentFlags(scholarship),
    match
  };
}

export async function saveScholarshipForUser(userId: string, scholarshipId: string) {
  const scholarship = await getApprovedScholarshipOrThrow(scholarshipId);

  const savedScholarship = await prisma.studentSavedScholarship.upsert({
    where: {
      userId_scholarshipId: {
        userId,
        scholarshipId
      }
    },
    update: {},
    create: {
      userId,
      scholarshipId
    },
    include: {
      scholarship: {
        include: {
          country: true,
          university: true,
          program: true,
          eligibilityRule: true
        }
      }
    }
  });

  const deadline = scholarship.deadline
    ? await addScholarshipDeadlineForUser(userId, scholarshipId)
    : null;

  return {
    savedScholarship,
    deadline
  };
}

export async function addScholarshipDeadlineForUser(userId: string, scholarshipId: string) {
  const scholarship = await getApprovedScholarshipOrThrow(scholarshipId);

  if (!scholarship.deadline) {
    throw new ScholarshipWorkflowError(409, "This scholarship does not have a fixed deadline in the catalog");
  }

  return prisma.scholarshipDeadline.upsert({
    where: {
      userId_scholarshipId: {
        userId,
        scholarshipId
      }
    },
    update: {
      title: scholarship.name,
      deadline: scholarship.deadline
    },
    create: {
      userId,
      scholarshipId,
      title: scholarship.name,
      deadline: scholarship.deadline
    },
    include: {
      scholarship: {
        include: {
          country: true
        }
      }
    }
  });
}

export async function getSavedScholarshipsForUser(userId: string) {
  return prisma.studentSavedScholarship.findMany({
    where: {
      userId
    },
    include: {
      scholarship: {
        include: {
          country: true,
          university: true,
          program: true,
          eligibilityRule: true,
          deadlines: {
            where: {
              userId
            },
            take: 1
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getScholarshipDeadlinesForUser(userId: string) {
  return prisma.scholarshipDeadline.findMany({
    where: {
      userId
    },
    include: {
      scholarship: {
        include: {
          country: true
        }
      }
    },
    orderBy: {
      deadline: "asc"
    }
  });
}

function withStudentFlags<T extends { savedBy?: unknown[]; deadlines?: Array<{ id: string }> }>(scholarship: T) {
  const { savedBy, deadlines, ...rest } = scholarship;
  const firstDeadline = deadlines?.[0] ?? null;

  return {
    ...rest,
    isSaved: Boolean(savedBy?.length),
    deadlineTracked: Boolean(firstDeadline),
    deadlineId: firstDeadline?.id ?? null
  };
}

async function getApprovedScholarshipOrThrow(scholarshipId: string) {
  const scholarship = await prisma.scholarship.findFirst({
    where: {
      id: scholarshipId,
      status: "APPROVED"
    }
  });

  if (!scholarship) {
    throw new ScholarshipWorkflowError(404, "Scholarship not found");
  }

  return scholarship;
}

function isScholarshipMatchStatus(value: string): value is "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_RECOMMENDED" {
  return ["ELIGIBLE", "ALMOST_ELIGIBLE", "NOT_RECOMMENDED"].includes(value);
}
