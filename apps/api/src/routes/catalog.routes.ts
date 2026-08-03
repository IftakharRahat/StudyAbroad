import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getApprovedScholarshipsCatalog,
  getCountriesCatalog,
  getProgramsCatalog,
  getUniversitiesCatalog
} from "../services/catalog.service.js";

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get("/countries", async (_req, res) => {
  const countries = await getCountriesCatalog();

  return res.json({
    countries
  });
});

catalogRouter.get("/universities", async (_req, res) => {
  const universities = await getUniversitiesCatalog();

  return res.json({
    universities
  });
});

catalogRouter.get("/programs", async (_req, res) => {
  const programs = await getProgramsCatalog();

  return res.json({
    programs
  });
});

catalogRouter.get("/scholarships", async (_req, res) => {
  const scholarships = await getApprovedScholarshipsCatalog();

  return res.json({
    scholarships
  });
});
