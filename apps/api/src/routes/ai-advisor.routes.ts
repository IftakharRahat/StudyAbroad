import { Router, type Response } from "express";
import {
  advisorChatSchema,
  advisorCompareCountriesSchema,
  advisorExplainUniversitySchema,
  advisorInsightsSchema,
  advisorNextStepsSchema
} from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  AdvisorServiceError,
  chatWithAdvisor,
  compareCountriesForStudent,
  explainUniversitySuitability,
  getAdvisorContext,
  suggestNextSteps,
  summarizePublicInsights
} from "../services/ai-advisor.service.js";

export const aiAdvisorRouter = Router();

aiAdvisorRouter.use(requireAuth, requireRole(["STUDENT"]));

aiAdvisorRouter.get("/context", async (req, res) => {
  try {
    const context = await getAdvisorContext(req.user!.id);

    return res.json(context);
  } catch (error) {
    return handleAdvisorError(error, res);
  }
});

aiAdvisorRouter.post("/chat", async (req, res) => {
  const parsed = advisorChatSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid advisor chat input",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const response = await chatWithAdvisor(req.user!.id, parsed.data);

    return res.json(response);
  } catch (error) {
    return handleAdvisorError(error, res);
  }
});

aiAdvisorRouter.post("/explain-university", async (req, res) => {
  const parsed = advisorExplainUniversitySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid university explanation request",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const response = await explainUniversitySuitability(req.user!.id, parsed.data);

    return res.json(response);
  } catch (error) {
    return handleAdvisorError(error, res);
  }
});

aiAdvisorRouter.post("/compare-countries", async (req, res) => {
  const parsed = advisorCompareCountriesSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid country comparison request",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const response = await compareCountriesForStudent(req.user!.id, parsed.data);

    return res.json(response);
  } catch (error) {
    return handleAdvisorError(error, res);
  }
});

aiAdvisorRouter.post("/insights", async (req, res) => {
  const parsed = advisorInsightsSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid public insights request",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const response = await summarizePublicInsights(req.user!.id, parsed.data);

    return res.json(response);
  } catch (error) {
    return handleAdvisorError(error, res);
  }
});

aiAdvisorRouter.post("/next-steps", async (req, res) => {
  const parsed = advisorNextStepsSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid next steps request",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const response = await suggestNextSteps(req.user!.id, parsed.data);

    return res.json(response);
  } catch (error) {
    return handleAdvisorError(error, res);
  }
});

function handleAdvisorError(error: unknown, res: Response) {
  if (error instanceof AdvisorServiceError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("AI Advisor error:", error);

  return res.status(500).json({
    message: "An error occurred while processing your AI advisor request"
  });
}
