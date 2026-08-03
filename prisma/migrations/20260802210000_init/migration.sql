-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'CONTENT_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MatchCategory" AS ENUM ('SAFE', 'TARGET', 'REACH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "currentDegree" TEXT,
    "targetDegree" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "cgpa" DOUBLE PRECISION NOT NULL,
    "cgpaScale" DOUBLE PRECISION NOT NULL,
    "ieltsScore" DOUBLE PRECISION,
    "toeflScore" DOUBLE PRECISION,
    "greScore" INTEGER,
    "gmatScore" INTEGER,
    "researchPapers" INTEGER NOT NULL DEFAULT 0,
    "workExperienceMonths" INTEGER NOT NULL DEFAULT 0,
    "preferredCountries" TEXT[],
    "budgetUsd" DOUBLE PRECISION NOT NULL,
    "careerGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "averageLivingCostUsd" DOUBLE PRECISION NOT NULL,
    "postStudyWorkVisaMonths" INTEGER NOT NULL,
    "partTimeWorkHours" INTEGER NOT NULL,
    "visaDifficulty" TEXT NOT NULL,
    "languageRequirement" TEXT NOT NULL,
    "safetyScore" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "rankingBand" TEXT NOT NULL,
    "acceptanceDifficulty" INTEGER NOT NULL,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "degreeLevel" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "tuitionUsd" DOUBLE PRECISION NOT NULL,
    "minCgpa" DOUBLE PRECISION NOT NULL,
    "minIelts" DOUBLE PRECISION,
    "minToefl" DOUBLE PRECISION,
    "minGre" INTEGER,
    "researchPreferred" BOOLEAN NOT NULL DEFAULT false,
    "workExperiencePreferred" BOOLEAN NOT NULL DEFAULT false,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT,
    "universityId" TEXT,
    "programId" TEXT,
    "eligibleNationalities" TEXT[],
    "eligibleFields" TEXT[],
    "minCgpa" DOUBLE PRECISION,
    "minIelts" DOUBLE PRECISION,
    "researchRequired" BOOLEAN NOT NULL DEFAULT false,
    "amountUsd" DOUBLE PRECISION,
    "coverageType" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessScore" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityMatch" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "category" "MatchCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniversityMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipMatch" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "matchingPercentage" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScholarshipMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "University_name_countryId_key" ON "University"("name", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Program_universityId_title_key" ON "Program"("universityId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_name_key" ON "Scholarship"("name");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessScore" ADD CONSTRAINT "ReadinessScore_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityMatch" ADD CONSTRAINT "UniversityMatch_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityMatch" ADD CONSTRAINT "UniversityMatch_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipMatch" ADD CONSTRAINT "ScholarshipMatch_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipMatch" ADD CONSTRAINT "ScholarshipMatch_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
