import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const programRouter = Router();

programRouter.use(requireAuth);

programRouter.get("/search", async (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
  const field = typeof req.query.field === "string" ? req.query.field.trim() : "";
  const degreeLevel = typeof req.query.degreeLevel === "string" ? req.query.degreeLevel.trim() : "";
  const maxTuition = typeof req.query.maxTuition === "string" ? Number(req.query.maxTuition) : undefined;

  const programs = await prisma.program.findMany({
    where: {
      title: search
        ? {
          contains: search,
          mode: "insensitive"
        }
        : undefined,
      field: field
        ? {
          contains: field,
          mode: "insensitive"
        }
        : undefined,
      degreeLevel: degreeLevel
        ? {
          equals: degreeLevel,
          mode: "insensitive"
        }
        : undefined,
      tuitionUsd: Number.isFinite(maxTuition)
        ? {
          lte: maxTuition
        }
        : undefined,
      university: country
        ? {
          country: {
            name: {
              equals: country,
              mode: "insensitive"
            }
          }
        }
        : undefined
    },
    include: {
      university: {
        include: {
          country: true
        }
      }
    },
    orderBy: {
      title: "asc"
    }
  });

  return res.json({
    programs
  });
});
