import { Router, type Response } from "express";
import { studentProfileSchema } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getApprovedScholarshipSummariesCatalog,
  getApprovedScholarshipsCatalog,
  getCountriesCatalog
} from "../services/catalog.service.js";
import {
  addScholarshipDeadlineForUser,
  generateScholarshipMatchesForUser,
  getSavedScholarshipsForUser,
  getScholarshipDeadlinesForUser,
  getScholarshipDetailForUser,
  saveScholarshipForUser,
  ScholarshipWorkflowError
} from "../services/scholarship-workflow.service.js";

export const scholarshipRouter = Router();

scholarshipRouter.use(requireAuth);

scholarshipRouter.post("/match", requireRole(["STUDENT"]), async (req, res) => {
  try {
    const scholarshipMatches = await generateScholarshipMatchesForUser(req.user!.id, req.query);

    return res.status(201).json({
      scholarshipMatches
    });
  } catch (error) {
    return handleScholarshipWorkflowError(error, res);
  }
});

scholarshipRouter.post("/save", requireRole(["STUDENT"]), async (req, res) => {
  const scholarshipId = typeof req.body.scholarshipId === "string" ? req.body.scholarshipId : "";

  if (!scholarshipId) {
    return res.status(400).json({
      message: "scholarshipId is required"
    });
  }

  try {
    const result = await saveScholarshipForUser(req.user!.id, scholarshipId);

    return res.status(201).json(result);
  } catch (error) {
    return handleScholarshipWorkflowError(error, res);
  }
});

scholarshipRouter.get("/saved", requireRole(["STUDENT"]), async (req, res) => {
  const savedScholarships = await getSavedScholarshipsForUser(req.user!.id);

  return res.json({
    savedScholarships
  });
});

scholarshipRouter.get("/deadlines", requireRole(["STUDENT"]), async (req, res) => {
  const deadlines = await getScholarshipDeadlinesForUser(req.user!.id);

  return res.json({
    deadlines
  });
});

scholarshipRouter.get("/bootstrap", requireRole(["STUDENT"]), async (req, res) => {
  const [profile, countries, deadlines, scholarships] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: {
        userId: req.user!.id
      }
    }),
    getCountriesCatalog(),
    getScholarshipDeadlinesForUser(req.user!.id),
    getApprovedScholarshipSummariesCatalog()
  ]);

  return res.json({
    profile,
    completeness: getProfileCompleteness(profile),
    countries,
    scholarshipMatches: [],
    deadlines,
    scholarships
  });
});

scholarshipRouter.get("/search", async (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
  const field = typeof req.query.field === "string" ? req.query.field.trim() : "";
  const coverageType = typeof req.query.coverageType === "string" ? req.query.coverageType.trim() : "";
  const degreeLevel = typeof req.query.degreeLevel === "string" ? req.query.degreeLevel.trim() : "";
  const onlyOpen = req.query.open !== "false";

  const scholarships = await prisma.scholarship.findMany({
    where: {
      status: "APPROVED",
      name: search
        ? {
          contains: search,
          mode: "insensitive"
        }
        : undefined,
      eligibleFields: field
        ? {
          has: field
        }
        : undefined,
      coverageType: coverageType
        ? {
          contains: coverageType,
          mode: "insensitive"
        }
        : undefined,
      degreeLevel: degreeLevel
        ? {
          equals: degreeLevel,
          mode: "insensitive"
        }
        : undefined,
      OR: onlyOpen
        ? [
          {
            deadline: {
              gte: new Date()
            }
          },
          {
            deadline: null
          }
        ]
        : undefined,
      country: country
        ? {
          name: {
            equals: country,
            mode: "insensitive"
          }
        }
        : undefined
    },
    include: {
      country: true,
      university: true,
      program: true,
      eligibilityRule: true
    },
    orderBy: {
      deadline: "asc"
    }
  });

  return res.json({
    scholarships
  });
});

scholarshipRouter.post("/:id/deadline", requireRole(["STUDENT"]), async (req, res) => {
  try {
    const deadline = await addScholarshipDeadlineForUser(req.user!.id, req.params.id);

    return res.status(201).json({
      deadline
    });
  } catch (error) {
    return handleScholarshipWorkflowError(error, res);
  }
});

scholarshipRouter.get("/:id", requireRole(["STUDENT"]), async (req, res) => {
  try {
    const detail = await getScholarshipDetailForUser(req.user!.id, req.params.id);

    return res.json(detail);
  } catch (error) {
    return handleScholarshipWorkflowError(error, res);
  }
});

function handleScholarshipWorkflowError(error: unknown, res: Response) {
  if (error instanceof ScholarshipWorkflowError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}

function getProfileCompleteness(profile: unknown) {
  const parsed = studentProfileSchema.safeParse(profile);

  return {
    complete: parsed.success,
    missingFields: parsed.success ? [] : Object.keys(parsed.error.flatten().fieldErrors)
  };
}
