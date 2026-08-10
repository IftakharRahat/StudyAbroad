CREATE TYPE "MonitorAlertType" AS ENUM ('APPLICATION_DEADLINE', 'SCHOLARSHIP_DEADLINE', 'REQUIREMENT_CHANGE');
CREATE TYPE "MonitorAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "MonitorAlertStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');
CREATE TYPE "MonitoredRequirementType" AS ENUM ('PROGRAM', 'SCHOLARSHIP');

CREATE TABLE "MonitorAlert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MonitorAlertType" NOT NULL,
  "severity" "MonitorAlertSeverity" NOT NULL,
  "status" "MonitorAlertStatus" NOT NULL DEFAULT 'UNREAD',
  "entityType" "MonitoredRequirementType" NOT NULL,
  "programId" TEXT,
  "scholarshipId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "field" TEXT,
  "previousValue" TEXT,
  "currentValue" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonitorAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequirementSnapshot" (
  "id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "entityType" "MonitoredRequirementType" NOT NULL,
  "programId" TEXT,
  "scholarshipId" TEXT,
  "requirements" JSONB NOT NULL,
  "requirementHash" TEXT NOT NULL,
  "lastCheckedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequirementSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonitorAlert_userId_dedupeKey_key" ON "MonitorAlert"("userId", "dedupeKey");
CREATE INDEX "MonitorAlert_userId_status_createdAt_idx" ON "MonitorAlert"("userId", "status", "createdAt");
CREATE INDEX "MonitorAlert_programId_idx" ON "MonitorAlert"("programId");
CREATE INDEX "MonitorAlert_scholarshipId_idx" ON "MonitorAlert"("scholarshipId");

CREATE UNIQUE INDEX "RequirementSnapshot_studentProfileId_entityType_programId_key" ON "RequirementSnapshot"("studentProfileId", "entityType", "programId");
CREATE UNIQUE INDEX "RequirementSnapshot_studentProfileId_entityType_scholarshipId_key" ON "RequirementSnapshot"("studentProfileId", "entityType", "scholarshipId");
CREATE INDEX "RequirementSnapshot_studentProfileId_entityType_idx" ON "RequirementSnapshot"("studentProfileId", "entityType");

ALTER TABLE "MonitorAlert" ADD CONSTRAINT "MonitorAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitorAlert" ADD CONSTRAINT "MonitorAlert_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonitorAlert" ADD CONSTRAINT "MonitorAlert_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequirementSnapshot" ADD CONSTRAINT "RequirementSnapshot_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementSnapshot" ADD CONSTRAINT "RequirementSnapshot_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequirementSnapshot" ADD CONSTRAINT "RequirementSnapshot_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
