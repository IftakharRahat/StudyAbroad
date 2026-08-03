import { Router } from "express";
import { studentProfileSchema } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { generateReadinessScores } from "../services/readiness.service.js";

export const readinessRouter = Router();

readinessRouter.use(requireAuth, requireRole(["STUDENT"]));

readinessRouter.post("/generate", async (req, res) => {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId: req.user!.id
    }
  });

  if (!profile) {
    return res.status(409).json({
      message: "Complete your student profile before generating readiness scores"
    });
  }

  const validProfile = studentProfileSchema.safeParse(profile);

  if (!validProfile.success) {
    return res.status(409).json({
      message: "Complete the required profile fields before generating readiness scores",
      errors: validProfile.error.flatten().fieldErrors
    });
  }

  const generatedScores = generateReadinessScores(profile);

  await prisma.$transaction([
    prisma.readinessScore.deleteMany({
      where: {
        studentProfileId: profile.id
      }
    }),
    ...generatedScores.map((score) => prisma.readinessScore.create({
      data: {
        studentProfileId: profile.id,
        tier: score.tier,
        score: score.score,
        strengths: score.strengths,
        weaknesses: score.weaknesses,
        recommendations: score.recommendations
      }
    }))
  ]);

  const readinessScores = await getLatestScores(profile.id);

  return res.status(201).json({
    readinessScores
  });
});

readinessRouter.get("/latest", async (req, res) => {
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
      readinessScores: []
    });
  }

  const readinessScores = await getLatestScores(profile.id);

  return res.json({
    readinessScores
  });
});

function getLatestScores(studentProfileId: string) {
  return prisma.readinessScore.findMany({
    where: {
      studentProfileId
    },
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        tier: "asc"
      }
    ]
  });
}
