import { z } from "zod";

export const roleSchema = z.enum(["STUDENT", "CONTENT_MANAGER", "ADMIN"]);
export const applicationRiskToleranceSchema = z.enum(["CONSERVATIVE", "BALANCED", "AMBITIOUS", "CUSTOM"]);

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

export const studentProfileSchema = z.object({
  nationality: z.string().min(2, "Nationality is required"),
  currentDegree: z.string().optional().nullable(),
  bachelorDegreeName: z.string().optional().nullable(),
  universityName: z.string().optional().nullable(),
  departmentMajor: z.string().optional().nullable(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  targetDegree: z.string().min(2, "Target degree is required"),
  fieldOfStudy: z.string().min(2, "Field of study is required"),
  cgpa: z.coerce.number().min(0).max(5),
  cgpaScale: z.coerce.number().min(1).max(5),
  ieltsScore: z.coerce.number().min(0).max(9).optional().nullable(),
  toeflScore: z.coerce.number().min(0).max(120).optional().nullable(),
  greScore: z.coerce.number().min(260).max(340).optional().nullable(),
  gmatScore: z.coerce.number().min(200).max(800).optional().nullable(),
  duolingoScore: z.coerce.number().min(10).max(160).optional().nullable(),
  researchPapers: z.coerce.number().int().min(0).default(0),
  workExperienceMonths: z.coerce.number().int().min(0).default(0),
  preferredCountries: z.array(z.string().min(2)).min(1, "Select at least one preferred country"),
  preferredIntake: z.string().optional().nullable(),
  researchInterest: z.string().optional().nullable(),
  hasWorkExperience: z.boolean().default(false),
  recentJobTitle: z.string().optional().nullable(),
  industryField: z.string().optional().nullable(),
  budgetUsd: z.coerce.number().min(0),
  preferredTuitionMinUsd: z.coerce.number().min(0).optional().nullable(),
  preferredTuitionMaxUsd: z.coerce.number().min(0).optional().nullable(),
  needsScholarship: z.boolean().default(true),
  careerGoal: z.string().optional().nullable()
}).refine((data) => data.ieltsScore || data.toeflScore, {
  message: "IELTS or TOEFL score is required",
  path: ["ieltsScore"]
}).refine((data) => data.cgpa <= data.cgpaScale, {
  message: "CGPA cannot be greater than CGPA scale",
  path: ["cgpa"]
}).refine((data) => {
  if (data.preferredTuitionMinUsd == null || data.preferredTuitionMaxUsd == null) {
    return true;
  }

  return data.preferredTuitionMinUsd <= data.preferredTuitionMaxUsd;
}, {
  message: "Minimum tuition cannot be greater than maximum tuition",
  path: ["preferredTuitionMinUsd"]
});

export type Role = z.infer<typeof roleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
export const applicationStrategyGenerateSchema = z.object({
  totalApplications: z.coerce.number().int().min(3).max(15).default(9),
  safeCount: z.coerce.number().int().min(0).max(15).optional(),
  targetCount: z.coerce.number().int().min(0).max(15).optional(),
  reachCount: z.coerce.number().int().min(0).max(15).optional(),
  riskTolerance: applicationRiskToleranceSchema.default("BALANCED")
}).refine((data) => {
  const counts = [data.safeCount, data.targetCount, data.reachCount];
  const providedCount = counts.filter((value) => value !== undefined).length;

  if (providedCount === 0) {
    return true;
  }

  const totalCount = Number(data.safeCount) + Number(data.targetCount) + Number(data.reachCount);

  return providedCount === 3 && totalCount >= 3 && totalCount <= 15;
}, {
  message: "Provide all category counts or none, with three to fifteen total applications",
  path: ["totalApplications"]
});

export const applicationStrategyItemUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    rank: z.coerce.number().int().min(1).max(15).optional(),
    isLocked: z.boolean().optional()
  })).min(1, "At least one strategy item is required")
});

export const documentStatusSchema = z.enum(["PENDING", "PREPARED", "SUBMITTED"]);
export const documentChecklistItemUpdateSchema = z.object({
  status: documentStatusSchema
});

export type ApplicationRiskTolerance = z.infer<typeof applicationRiskToleranceSchema>;
export type ApplicationStrategyGenerateInput = z.infer<typeof applicationStrategyGenerateSchema>;
export type ApplicationStrategyItemUpdateInput = z.infer<typeof applicationStrategyItemUpdateSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const monitorScanSchema = z.object({
  horizonDays: z.coerce.number().int().min(1).max(365).default(180),
  criticalDays: z.coerce.number().int().min(0).max(90).default(30)
}).refine((data) => data.criticalDays <= data.horizonDays, {
  message: "Critical window cannot be larger than the monitor horizon",
  path: ["criticalDays"]
});

export const monitorAlertStatusSchema = z.object({
  status: z.enum(["UNREAD", "READ", "DISMISSED"])
});

export type MonitorScanInput = z.infer<typeof monitorScanSchema>;
export type MonitorAlertStatusInput = z.infer<typeof monitorAlertStatusSchema>;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const advisorMessageRoleSchema = z.enum(["user", "assistant", "system"]);

export const advisorMessageSchema = z.object({
  role: advisorMessageRoleSchema,
  content: z.string().min(1, "Message content cannot be empty"),
  timestamp: z.string().optional()
});

export const advisorChatSchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
  history: z.array(advisorMessageSchema).optional().default([]),
  focusMode: z.enum(["GENERAL", "UNIVERSITY", "COUNTRY", "INSIGHTS", "NEXT_STEPS"]).optional().default("GENERAL"),
  entityId: z.string().optional()
});

export const advisorExplainUniversitySchema = z.object({
  programId: z.string().min(1, "Program ID is required"),
  question: z.string().optional()
});

export const advisorCompareCountriesSchema = z.object({
  countryIds: z.array(z.string().min(1)).min(2, "Select at least 2 countries to compare").max(5, "You can compare up to 5 countries"),
  question: z.string().optional()
});

export const advisorInsightsSchema = z.object({
  countryId: z.string().optional(),
  field: z.string().optional(),
  question: z.string().optional()
});

export const advisorNextStepsSchema = z.object({
  targetIntake: z.string().optional(),
  question: z.string().optional()
});

export type AdvisorMessageRole = z.infer<typeof advisorMessageRoleSchema>;
export type AdvisorMessage = z.infer<typeof advisorMessageSchema>;
export type AdvisorChatInput = z.infer<typeof advisorChatSchema>;
export type AdvisorExplainUniversityInput = z.infer<typeof advisorExplainUniversitySchema>;
export type AdvisorCompareCountriesInput = z.infer<typeof advisorCompareCountriesSchema>;
export type AdvisorInsightsInput = z.infer<typeof advisorInsightsSchema>;
export type AdvisorNextStepsInput = z.infer<typeof advisorNextStepsSchema>;

export type AdvisorReferencedEntity = {
  type: "PROGRAM" | "UNIVERSITY" | "COUNTRY" | "SCHOLARSHIP";
  id: string;
  name: string;
  badge?: string;
  subtext?: string;
  link?: string;
};

export type AdvisorNextStepItem = {
  id: string;
  category: "ACADEMICS_TESTS" | "APPLICATION_STRATEGY" | "SCHOLARSHIPS_FINANCE" | "DOCUMENTS_VISA";
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  actionUrl?: string;
  actionLabel?: string;
};

export type AdvisorResponse = {
  answer: string;
  mode: "GENERAL" | "UNIVERSITY" | "COUNTRY" | "INSIGHTS" | "NEXT_STEPS";
  keyTakeaways: string[];
  suggestedFollowUps: string[];
  referencedEntities: AdvisorReferencedEntity[];
  nextSteps?: AdvisorNextStepItem[];
  suitabilityScore?: {
    overallFit: number;
    category: "SAFE" | "TARGET" | "REACH";
    academicFit: string;
    budgetFit: string;
    englishFit: string;
  };
  countryComparisonTable?: Array<{
    country: string;
    annualCostUsd: number;
    postStudyWorkMonths: number;
    partTimeHours: number;
    visaDifficulty: string;
    jobMarket: string;
    safetyScore: number;
    budgetFit: string;
  }>;
  disclaimer: string;
};

export type AdvisorContextResponse = {
  profileSummary: {
    name: string;
    nationality: string;
    targetDegree: string;
    fieldOfStudy: string;
    cgpaNormalized: number;
    englishScore: string;
    budgetUsd: number;
    preferredCountries: string[];
    readinessTier?: string;
    readinessScore?: number;
  };
  samplePrompts: Array<{
    id: string;
    title: string;
    prompt: string;
    category: "UNIVERSITY" | "COUNTRY" | "INSIGHTS" | "NEXT_STEPS" | "GENERAL";
  }>;
  availablePrograms: Array<{
    id: string;
    title: string;
    universityName: string;
    countryName: string;
    category?: "SAFE" | "TARGET" | "REACH";
  }>;
  availableCountries: Array<{
    id: string;
    name: string;
  }>;
};

export type OpportunityFeedItemType = "SCHOLARSHIP" | "DEADLINE" | "UNIVERSITY" | "VISA_INSIGHT" | "REQUIREMENT_CHANGE";

export type OpportunityFeedItem = {
  id: string;
  type: OpportunityFeedItemType;
  title: string;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  createdAt: string;
  actionUrl: string;
  actionLabel: string;
  meta?: Record<string, any>;
};

export type OpportunityFeedResponse = {
  feedItems: OpportunityFeedItem[];
  profileComplete: boolean;
  missingFields: string[];
};

// ---------------------------------------------------------------------------
// Module 2 · Feature 3 — Application Progress Tracker
// ---------------------------------------------------------------------------
export const applicationStageSchema = z.enum([
  "PLANNED",
  "PREPARING",
  "APPLIED",
  "INTERVIEW",
  "OFFER_RECEIVED",
  "REJECTED",
  "VISA_PROCESSING",
  "ENROLLED"
]);

export const applicationProgressCreateSchema = z.object({
  programId: z.string().min(1, "programId is required"),
  stage: applicationStageSchema.optional().default("PLANNED"),
  notes: z.string().max(1000).optional().nullable()
});

export const applicationProgressUpdateSchema = z.object({
  stage: applicationStageSchema.optional(),
  notes: z.string().max(1000).optional().nullable()
}).refine((data) => data.stage !== undefined || data.notes !== undefined, {
  message: "Provide a stage and/or notes to update"
});

export type ApplicationStage = z.infer<typeof applicationStageSchema>;
export type ApplicationProgressCreateInput = z.infer<typeof applicationProgressCreateSchema>;
export type ApplicationProgressUpdateInput = z.infer<typeof applicationProgressUpdateSchema>;

// ---------------------------------------------------------------------------
// Module 3 · Feature 2 — University Reality Check
// ---------------------------------------------------------------------------
export const realityCheckCategorySchema = z.enum([
  "HOUSING",
  "HIDDEN_COSTS",
  "PART_TIME_JOBS",
  "LANGUAGE_BARRIER",
  "STUDENT_SATISFACTION",
  "ACCOMMODATION",
  "SAFETY",
  "TRANSPORT"
]);

export const realityCheckCreateSchema = z.object({
  universityId: z.string().min(1, "universityId is required"),
  category: realityCheckCategorySchema,
  headline: z.string().min(3).max(160),
  detail: z.string().min(10).max(2000),
  severity: z.coerce.number().int().min(1).max(5).default(3),
  monthlyCostUsd: z.coerce.number().min(0).optional().nullable(),
  sourceLabel: z.string().max(160).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional().default(false)
});

export type RealityCheckCategory = z.infer<typeof realityCheckCategorySchema>;
export type RealityCheckCreateInput = z.infer<typeof realityCheckCreateSchema>;

// ---------------------------------------------------------------------------
// Module 4 · Feature 2 — Funding Gap Analyzer
// ---------------------------------------------------------------------------
export const fundingGapStatusSchema = z.enum(["SURPLUS", "BALANCED", "MINOR_GAP", "MAJOR_GAP"]);

export const fundingGapAnalyzeSchema = z.object({
  availableBudgetUsd: z.coerce.number().min(0).optional(),
  scholarshipUsd: z.coerce.number().min(0).default(0),
  programIds: z.array(z.string().min(1)).max(15).optional(),
  visaFeeUsd: z.coerce.number().min(0).optional(),
  insuranceUsd: z.coerce.number().min(0).optional(),
  applicationFeeUsd: z.coerce.number().min(0).optional(),
  flightCostUsd: z.coerce.number().min(0).optional(),
  emergencyFundUsd: z.coerce.number().min(0).optional()
});

export type FundingGapStatus = z.infer<typeof fundingGapStatusSchema>;
export type FundingGapAnalyzeInput = z.infer<typeof fundingGapAnalyzeSchema>;


