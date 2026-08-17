import { Router, type Response } from "express";
import { fundingGapAnalyzeSchema } from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  FundingGapError,
  analyzeFundingGap,
  getLatestFundingGapForUser
} from "../services/funding-gap.service.js";

/**
 * Module 4 · Feature 2 — Funding Gap Analyzer
 *
 *   POST /api/funding-gap/analyze   Run a fresh analysis (budget vs. cost)
 *   GET  /api/funding-gap/latest    Fetch the most recent analysis
 */
export const fundingGapRouter = Router();

fundingGapRouter.use(requireAuth, requireRole(["STUDENT"]));

fundingGapRouter.post("/analyze", async (req, res) => {
  const parsed = fundingGapAnalyzeSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid funding gap payload",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const analysis = await analyzeFundingGap(req.user!.id, parsed.data);
    return res.status(201).json({ analysis });
  } catch (error) {
    return handleFundingGapError(error, res);
  }
});

fundingGapRouter.get("/latest", async (req, res) => {
  const analysis = await getLatestFundingGapForUser(req.user!.id);
  return res.json({ analysis });
});

function handleFundingGapError(error: unknown, res: Response) {
  if (error instanceof FundingGapError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}
