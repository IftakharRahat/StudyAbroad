import { Router, type Response } from "express";
import { realityCheckCreateSchema } from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  RealityCheckError,
  createRealityCheck,
  getRealityCheckForUniversity
} from "../services/university-reality-check.service.js";

/**
 * Module 3 · Feature 2 — University Reality Check
 *
 *   GET  /api/reality-check/university/:universityId   Read published insights
 *                                                      (managers/admins also
 *                                                      see drafts)
 *   POST /api/reality-check                            Create insight
 *                                                      (CONTENT_MANAGER / ADMIN)
 */
export const universityRealityCheckRouter = Router();

universityRealityCheckRouter.use(requireAuth);

universityRealityCheckRouter.get("/university/:universityId", async (req, res) => {
  const includeUnpublished =
    req.user!.role === "ADMIN" || req.user!.role === "CONTENT_MANAGER";

  try {
    const result = await getRealityCheckForUniversity(req.params.universityId, {
      includeUnpublished
    });
    return res.json(result);
  } catch (error) {
    return handleRealityCheckError(error, res);
  }
});

universityRealityCheckRouter.post(
  "/",
  requireRole(["CONTENT_MANAGER", "ADMIN"]),
  async (req, res) => {
    const parsed = realityCheckCreateSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid reality check payload",
        errors: parsed.error.flatten().fieldErrors
      });
    }

    try {
      const realityCheck = await createRealityCheck(parsed.data);
      return res.status(201).json({ realityCheck });
    } catch (error) {
      return handleRealityCheckError(error, res);
    }
  }
);

function handleRealityCheckError(error: unknown, res: Response) {
  if (error instanceof RealityCheckError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}
