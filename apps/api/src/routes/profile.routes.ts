import { Router } from "express";
import { studentProfileSchema } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(requireAuth, requireRole(["STUDENT"]));

profileRouter.get("/", async (req, res) => {
  const profile = await prisma.studentProfile.findUnique({
    where: {
      userId: req.user!.id
    }
  });

  return res.json({
    profile,
    completeness: getProfileCompleteness(profile)
  });
});

profileRouter.post("/", async (req, res) => {
  const parsed = studentProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid profile data",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const profile = await prisma.studentProfile.create({
    data: {
      userId: req.user!.id,
      ...parsed.data
    }
  }).catch(async (error: { code?: string }) => {
    if (error.code !== "P2002") {
      throw error;
    }

    return prisma.studentProfile.update({
      where: {
        userId: req.user!.id
      },
      data: parsed.data
    });
  });

  return res.status(201).json({
    profile,
    completeness: getProfileCompleteness(profile)
  });
});

profileRouter.put("/", async (req, res) => {
  const parsed = studentProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid profile data",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const profile = await prisma.studentProfile.upsert({
    where: {
      userId: req.user!.id
    },
    create: {
      userId: req.user!.id,
      ...parsed.data
    },
    update: parsed.data
  });

  return res.json({
    profile,
    completeness: getProfileCompleteness(profile)
  });
});

function getProfileCompleteness(profile: unknown) {
  const parsed = studentProfileSchema.safeParse(profile);

  return {
    complete: parsed.success,
    missingFields: parsed.success ? [] : Object.keys(parsed.error.flatten().fieldErrors)
  };
}
