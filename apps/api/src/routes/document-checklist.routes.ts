import { Router } from "express";
import { documentChecklistItemUpdateSchema } from "@study-abroad/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getDocumentChecklist, updateDocumentStatus } from "../services/document-checklist.service.js";

export const documentChecklistRouter = Router();

documentChecklistRouter.use(requireAuth, requireRole(["STUDENT"]));

documentChecklistRouter.get("/", async (req, res) => {
  const items = await getDocumentChecklist(req.user!.id);
  return res.json({ items });
});

documentChecklistRouter.patch("/:id", async (req, res) => {
  const parsed = documentChecklistItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid document status" });

  const item = await updateDocumentStatus(req.user!.id, req.params.id, parsed.data.status).catch((error: { code?: string }) => {
    if (error.code === "P2025") return null;
    throw error;
  });

  return item ? res.json({ item }) : res.status(404).json({ message: "Checklist item not found" });
});
