-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('PLANNED', 'PREPARING', 'APPLIED', 'INTERVIEW', 'OFFER_RECEIVED', 'REJECTED', 'VISA_PROCESSING', 'ENROLLED');

-- CreateEnum
CREATE TYPE "RealityCheckCategory" AS ENUM ('HOUSING', 'HIDDEN_COSTS', 'PART_TIME_JOBS', 'LANGUAGE_BARRIER', 'STUDENT_SATISFACTION', 'ACCOMMODATION', 'SAFETY', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "FundingGapStatus" AS ENUM ('SURPLUS', 'BALANCED', 'MINOR_GAP', 'MAJOR_GAP');

-- CreateTable
CREATE TABLE "ApplicationProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "events" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityRealityCheck" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "category" "RealityCheckCategory" NOT NULL,
    "headline" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 3,
    "monthlyCostUsd" DOUBLE PRECISION,
    "sourceLabel" TEXT,
    "sourceUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UniversityRealityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingGapAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBudgetUsd" DOUBLE PRECISION NOT NULL,
    "scholarshipUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL,
    "gapUsd" DOUBLE PRECISION NOT NULL,
    "status" "FundingGapStatus" NOT NULL,
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FundingGapAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingGapItem" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tuitionUsd" DOUBLE PRECISION NOT NULL,
    "livingCostUsd" DOUBLE PRECISION NOT NULL,
    "visaFeeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicationFeeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flightCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyFundUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "FundingGapItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationProgress_userId_stage_idx" ON "ApplicationProgress"("userId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationProgress_userId_programId_key" ON "ApplicationProgress"("userId", "programId");

-- CreateIndex
CREATE INDEX "UniversityRealityCheck_universityId_category_idx" ON "UniversityRealityCheck"("universityId", "category");

-- CreateIndex
CREATE INDEX "UniversityRealityCheck_isPublished_idx" ON "UniversityRealityCheck"("isPublished");

-- CreateIndex
CREATE INDEX "FundingGapAnalysis_userId_createdAt_idx" ON "FundingGapAnalysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FundingGapItem_analysisId_idx" ON "FundingGapItem"("analysisId");

-- CreateIndex
CREATE INDEX "FundingGapItem_programId_idx" ON "FundingGapItem"("programId");

-- AddForeignKey
ALTER TABLE "ApplicationProgress" ADD CONSTRAINT "ApplicationProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationProgress" ADD CONSTRAINT "ApplicationProgress_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityRealityCheck" ADD CONSTRAINT "UniversityRealityCheck_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingGapAnalysis" ADD CONSTRAINT "FundingGapAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingGapItem" ADD CONSTRAINT "FundingGapItem_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "FundingGapAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingGapItem" ADD CONSTRAINT "FundingGapItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
