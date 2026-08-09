import { Router, type Response } from "express";
import {
  applicationStrategyGenerateSchema,
  applicationStrategyItemUpdateSchema
} from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  ApplicationStrategyError,
  generateApplicationStrategyForUser,
  getLatestApplicationStrategyForUser,
  updateApplicationStrategyItemsForUser
} from "../services/application-strategy.service.js";

export const applicationStrategyRouter = Router();

applicationStrategyRouter.use(requireAuth, requireRole(["STUDENT"]));

applicationStrategyRouter.post("/generate", async (req, res) => {
  const parsed = applicationStrategyGenerateSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid application strategy settings",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const applicationStrategyPlan = await generateApplicationStrategyForUser(req.user!.id, parsed.data);

    return res.status(201).json({
      applicationStrategyPlan
    });
  } catch (error) {
    return handleApplicationStrategyError(error, res);
  }
});

applicationStrategyRouter.get("/latest", async (req, res) => {
  const applicationStrategyPlan = await getLatestApplicationStrategyForUser(req.user!.id);

  return res.json({
    applicationStrategyPlan
  });
});

applicationStrategyRouter.patch("/:planId/items", async (req, res) => {
  const parsed = applicationStrategyItemUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid application strategy item update",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const applicationStrategyPlan = await updateApplicationStrategyItemsForUser(
      req.user!.id,
      req.params.planId,
      parsed.data
    );

    return res.json({
      applicationStrategyPlan
    });
  } catch (error) {
    return handleApplicationStrategyError(error, res);
  }
});

function handleApplicationStrategyError(error: unknown, res: Response) {
  if (error instanceof ApplicationStrategyError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}
