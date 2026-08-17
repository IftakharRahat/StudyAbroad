import { Router, type Response } from "express";
import {
  applicationProgressCreateSchema,
  applicationProgressUpdateSchema
} from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  ApplicationProgressError,
  createApplicationProgress,
  deleteApplicationProgress,
  getApplicationProgressForUser,
  updateApplicationProgress
} from "../services/application-progress.service.js";

/**
 * Module 2 · Feature 3 — Application Progress Tracker
 *
 *   GET    /api/application-progress        List tracked applications + summary
 *   POST   /api/application-progress        Start tracking a program
 *   PATCH  /api/application-progress/:id     Update stage / notes
 *   DELETE /api/application-progress/:id     Stop tracking
 */
export const applicationProgressRouter = Router();

applicationProgressRouter.use(requireAuth, requireRole(["STUDENT"]));

applicationProgressRouter.get("/", async (req, res) => {
  const result = await getApplicationProgressForUser(req.user!.id);
  return res.json(result);
});

applicationProgressRouter.post("/", async (req, res) => {
  const parsed = applicationProgressCreateSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid application progress payload",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const application = await createApplicationProgress(req.user!.id, parsed.data);
    return res.status(201).json({ application });
  } catch (error) {
    return handleApplicationProgressError(error, res);
  }
});

applicationProgressRouter.patch("/:id", async (req, res) => {
  const parsed = applicationProgressUpdateSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid application progress update",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const application = await updateApplicationProgress(req.user!.id, req.params.id, parsed.data);
    return res.json({ application });
  } catch (error) {
    return handleApplicationProgressError(error, res);
  }
});

applicationProgressRouter.delete("/:id", async (req, res) => {
  try {
    const result = await deleteApplicationProgress(req.user!.id, req.params.id);
    return res.json(result);
  } catch (error) {
    return handleApplicationProgressError(error, res);
  }
});

function handleApplicationProgressError(error: unknown, res: Response) {
  if (error instanceof ApplicationProgressError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}
