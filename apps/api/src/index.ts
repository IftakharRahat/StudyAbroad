import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.routes.js";
import { applicationStrategyRouter } from "./routes/application-strategy.routes.js";
import { catalogRouter } from "./routes/catalog.routes.js";
import { countryRouter } from "./routes/country.routes.js";
import { documentChecklistRouter } from "./routes/document-checklist.routes.js";
import { matchRouter } from "./routes/match.routes.js";
import { monitorRouter } from "./routes/monitor.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { programRouter } from "./routes/program.routes.js";
import { readinessRouter } from "./routes/readiness.routes.js";
import { scholarshipRouter } from "./routes/scholarship.routes.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { prisma } from "./lib/prisma.js";
import { getApprovedScholarshipSummariesCatalog, getCountriesCatalog } from "./services/catalog.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env")
});

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

void prisma.$connect()
  .then(() => Promise.all([
    getCountriesCatalog(),
    getApprovedScholarshipSummariesCatalog()
  ]))
  .catch((error) => {
    console.error("Could not warm database/catalog connection", error);
  });

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "study-abroad-api"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/application-strategy", applicationStrategyRouter);
app.use("/api/student/profile", profileRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/countries", countryRouter);
app.use("/api/documents", documentChecklistRouter);
app.use("/api/readiness", readinessRouter);
app.use("/api/matches", matchRouter);
app.use("/api/monitor", monitorRouter);
app.use("/api/programs", programRouter);
app.use("/api/scholarships", scholarshipRouter);

app.get("/api/admin/health", requireAuth, requireRole(["ADMIN", "CONTENT_MANAGER"]), (_req, res) => {
  res.json({
    ok: true,
    message: "Admin/content manager access confirmed"
  });
});

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
