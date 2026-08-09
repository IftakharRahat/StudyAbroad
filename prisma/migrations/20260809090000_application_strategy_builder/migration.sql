CREATE TYPE "ApplicationRiskTolerance" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AMBITIOUS', 'CUSTOM');

CREATE TABLE "ApplicationStrategyPlan" (
  "id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "totalApplications" INTEGER NOT NULL,
  "safeCount" INTEGER NOT NULL,
  "targetCount" INTEGER NOT NULL,
  "reachCount" INTEGER NOT NULL,
  "riskTolerance" "ApplicationRiskTolerance" NOT NULL DEFAULT 'BALANCED',
  "summary" TEXT NOT NULL,
  "warnings" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationStrategyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationStrategyItem" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "matchId" TEXT,
  "category" "MatchCategory" NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "rationale" JSONB NOT NULL,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationStrategyItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationStrategyPlan_studentProfileId_createdAt_idx" ON "ApplicationStrategyPlan"("studentProfileId", "createdAt");
CREATE INDEX "ApplicationStrategyItem_planId_category_idx" ON "ApplicationStrategyItem"("planId", "category");
CREATE INDEX "ApplicationStrategyItem_programId_idx" ON "ApplicationStrategyItem"("programId");
CREATE INDEX "ApplicationStrategyItem_matchId_idx" ON "ApplicationStrategyItem"("matchId");

ALTER TABLE "ApplicationStrategyPlan" ADD CONSTRAINT "ApplicationStrategyPlan_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationStrategyItem" ADD CONSTRAINT "ApplicationStrategyItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ApplicationStrategyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationStrategyItem" ADD CONSTRAINT "ApplicationStrategyItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationStrategyItem" ADD CONSTRAINT "ApplicationStrategyItem_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "UniversityMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
