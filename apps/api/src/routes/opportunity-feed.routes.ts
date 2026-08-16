import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getOpportunityFeedForUser } from "../services/opportunity-feed.service.js";

export const opportunityFeedRouter = Router();

opportunityFeedRouter.use(requireAuth, requireRole(["STUDENT"]));

opportunityFeedRouter.get("/", async (req, res) => {
  const result = await getOpportunityFeedForUser(req.user!.id);
  return res.json(result);
});
