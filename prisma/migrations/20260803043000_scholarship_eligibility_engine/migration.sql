CREATE TYPE "ScholarshipStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED');

ALTER TABLE "Scholarship"
ADD COLUMN "degreeLevel" TEXT NOT NULL DEFAULT 'Master''s Degree',
ADD COLUMN "requiredDocuments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "status" "ScholarshipStatus" NOT NULL DEFAULT 'APPROVED';

ALTER TABLE "ScholarshipMatch"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NOT_RECOMMENDED',
ADD COLUMN "missingRequirements" JSONB;

CREATE TABLE "ScholarshipEligibilityRule" (
  "id" TEXT NOT NULL,
  "scholarshipId" TEXT NOT NULL,
  "degreeLevel" TEXT NOT NULL,
  "eligibleNationalities" TEXT[] NOT NULL,
  "eligibleSubjects" TEXT[] NOT NULL,
  "minCgpa" DOUBLE PRECISION,
  "minIelts" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScholarshipEligibilityRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentSavedScholarship" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scholarshipId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentSavedScholarship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipDeadline" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scholarshipId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "deadline" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TRACKED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScholarshipDeadline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScholarshipEligibilityRule_scholarshipId_key" ON "ScholarshipEligibilityRule"("scholarshipId");
CREATE UNIQUE INDEX "StudentSavedScholarship_userId_scholarshipId_key" ON "StudentSavedScholarship"("userId", "scholarshipId");
CREATE UNIQUE INDEX "ScholarshipDeadline_userId_scholarshipId_key" ON "ScholarshipDeadline"("userId", "scholarshipId");
CREATE UNIQUE INDEX "ScholarshipMatch_studentProfileId_scholarshipId_key" ON "ScholarshipMatch"("studentProfileId", "scholarshipId");

ALTER TABLE "ScholarshipEligibilityRule" ADD CONSTRAINT "ScholarshipEligibilityRule_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSavedScholarship" ADD CONSTRAINT "StudentSavedScholarship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSavedScholarship" ADD CONSTRAINT "StudentSavedScholarship_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipDeadline" ADD CONSTRAINT "ScholarshipDeadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipDeadline" ADD CONSTRAINT "ScholarshipDeadline_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
