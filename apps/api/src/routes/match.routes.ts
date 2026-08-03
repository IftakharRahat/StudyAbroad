import { Router, type Response } from "express";
import { studentProfileSchema } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { generateReadinessScores } from "../services/readiness.service.js";
import {
  generateScholarshipMatchesForUser,
  getScholarshipMatchesForUser,
  ScholarshipWorkflowError
} from "../services/scholarship-workflow.service.js";
import { generateUniversityMatches } from "../services/university-matching.service.js";

export const matchRouter = Router();

matchRouter.use(requireAuth, requireRole(["STUDENT"]));

matchRouter.post("/universities/generate", async (req, res) => {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId: req.user!.id
    }
  });

  if (!profile) {
    return res.status(409).json({
      message: "Complete your student profile before generating university matches"
    });
  }

  const validProfile = studentProfileSchema.safeParse(profile);

  if (!validProfile.success) {
    return res.status(409).json({
      message: "Complete the required profile fields before generating university matches",
      errors: validProfile.error.flatten().fieldErrors
    });
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

  await prisma.$transaction([
    prisma.universityMatch.deleteMany({
      where: {
        studentProfileId: profile.id
      }
    }),
    ...generatedMatches.map((match) => prisma.universityMatch.create({
      data: {
        studentProfileId: profile.id,
        programId: match.programId,
        category: match.category,
        score: match.score,
        reasons: match.reasons
      }
    }))
  ]);

  const universityMatches = await getUniversityMatches(profile.id, req.query);

  return res.status(201).json({
    universityMatches
  });
});

matchRouter.get("/universities", async (req, res) => {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId: req.user!.id
    },
    select: {
      id: true
    }
  });

  if (!profile) {
    return res.json({
      universityMatches: []
    });
  }

  const universityMatches = await getUniversityMatches(profile.id, req.query);

  return res.json({
    universityMatches
  });
});

matchRouter.post("/scholarships/generate", async (req, res) => {
  try {
    const scholarshipMatches = await generateScholarshipMatchesForUser(req.user!.id, req.query);

    return res.status(201).json({
      scholarshipMatches
    });
  } catch (error) {
    return handleScholarshipWorkflowError(error, res);
  }
});

matchRouter.get("/scholarships", async (req, res) => {
  const scholarshipMatches = await getScholarshipMatchesForUser(req.user!.id, req.query);

  return res.json({
    scholarshipMatches
  });
});

async function ensureReadinessScores(profile: NonNullable<Awaited<ReturnType<typeof prisma.studentProfile.findUnique>>>) {
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

function getUniversityMatches(studentProfileId: string, query: Record<string, unknown>) {
  const category = typeof query.category === "string" ? query.category.toUpperCase() : undefined;

  return prisma.universityMatch.findMany({
    where: {
      studentProfileId,
      category: category && ["SAFE", "TARGET", "REACH"].includes(category)
        ? category as "SAFE" | "TARGET" | "REACH"
        : undefined
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

function handleScholarshipWorkflowError(error: unknown, res: Response) {
  if (error instanceof ScholarshipWorkflowError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}
