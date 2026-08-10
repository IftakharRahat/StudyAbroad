import { Router, type Response } from "express";
import { monitorAlertStatusSchema, monitorScanSchema } from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  DeadlineRequirementMonitorError,
  getMonitorAlertsForUser,
  markAllMonitorAlertsReadForUser,
  runDeadlineRequirementMonitorForUser,
  updateMonitorAlertStatusForUser
} from "../services/deadline-requirement-monitor.service.js";

export const monitorRouter = Router();

monitorRouter.use(requireAuth, requireRole(["STUDENT"]));

monitorRouter.post("/scan", async (req, res) => {
  const parsed = monitorScanSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid monitor settings",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const result = await runDeadlineRequirementMonitorForUser(req.user!.id, parsed.data);

    return res.status(201).json(result);
  } catch (error) {
    return handleMonitorError(error, res);
  }
});

monitorRouter.get("/alerts", async (req, res) => {
  const result = await getMonitorAlertsForUser(req.user!.id, req.query);

  return res.json(result);
});

monitorRouter.patch("/alerts/read-all", async (req, res) => {
  const result = await markAllMonitorAlertsReadForUser(req.user!.id);

  return res.json(result);
});

monitorRouter.patch("/alerts/:alertId", async (req, res) => {
  const parsed = monitorAlertStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid alert status",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const alert = await updateMonitorAlertStatusForUser(req.user!.id, req.params.alertId, parsed.data.status);

    return res.json({
      alert
    });
  } catch (error) {
    return handleMonitorError(error, res);
  }
});

function handleMonitorError(error: unknown, res: Response) {
  if (error instanceof DeadlineRequirementMonitorError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.details
    });
  }

  throw error;
}
