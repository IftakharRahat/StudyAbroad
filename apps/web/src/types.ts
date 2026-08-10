import type { AuthUser, StudentProfileInput } from "@study-abroad/shared";

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ProfileResponse = {
  profile: (StudentProfileInput & {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }) | null;
  completeness: {
    complete: boolean;
    missingFields: string[];
  };
};

export type ReadinessScore = {
  id: string;
  studentProfileId: string;
  tier: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  createdAt: string;
};

export type ReadinessResponse = {
  readinessScores: ReadinessScore[];
};

export type Country = {
  id: string;
  name: string;
  averageLivingCostUsd: number;
  postStudyWorkVisaMonths: number;
  partTimeWorkHours: number;
  visaDifficulty: string;
  languageRequirement: string;
  safetyScore: number;
  notes?: string | null;
  decision?: {
    decisionScore: number;
    annualLivingCostUsd: number;
    estimatedAnnualCostUsd: number;
    budgetFit: string;
    preferred: boolean;
    summary: string;
    recommendation: string;
    breakdown: {
      affordability: number;
      jobMarket: number;
      visaFriendliness: number;
      scholarships: number;
      postStudyWork: number;
      language: number;
      preference: number;
    };
  };
  meta?: {
    region: string;
    currency: string;
    tuitionMinUsd: number;
    tuitionMaxUsd: number;
    visaFeeUsd: number;
    insuranceCostUsd: number;
    proofOfFundsUsd: number;
    languageBarrier: "Low" | "Medium" | "High";
    jobMarketStrength: "Growing" | "Good" | "Strong" | "Excellent";
    scholarshipAvailability: "Low" | "Medium" | "High";
    prPathwayDifficulty: "Easy" | "Moderate" | "Hard";
    studentFriendliness: "Medium" | "High";
    capital: string;
    population: string;
    officialLanguages: string;
    academicIntake: string;
    popularCities: string[];
    officialVisaUrl: string;
    imageTone: string;
    highlights: string[];
    considerations: string[];
    insight: string;
  };
  universityCount?: number;
  scholarshipCount?: number;
  topUniversities?: Array<{
    id: string;
    name: string;
    city: string;
    rankingBand: string;
  }>;
  matchingScholarships?: Array<{
    id: string;
    name: string;
    coverageType: string;
    amountUsd?: number | null;
  }>;
};

export type CountriesResponse = {
  profile?: ProfileResponse["profile"];
  stats?: {
    countriesAvailable: number;
    universitiesWorldwide: number;
    scholarshipsAvailable: number;
    studentsGuided: number;
    dataFreshness: string;
  };
  selectedCountryIds?: string[];
  countries: Country[];
};

export type CountryCompareResponse = {
  profile: ProfileResponse["profile"];
  countries: Country[];
  ranking: Array<{
    rank: number;
    id: string;
    name: string;
    score: number;
    region: string;
  }>;
  recommendations: {
    bestOverall: string;
    bestBudget?: string;
    bestCareer?: string;
    bestScholarships?: string;
  } | null;
};

export type CountryDetailResponse = {
  profile: ProfileResponse["profile"];
  country: Country;
};

export type University = {
  id: string;
  name: string;
  city: string;
  rankingBand: string;
  acceptanceDifficulty: number;
  websiteUrl?: string | null;
  country: Country;
};

export type Program = {
  id: string;
  title: string;
  degreeLevel: string;
  field: string;
  tuitionUsd: number;
  minCgpa: number;
  minIelts?: number | null;
  minToefl?: number | null;
  minGre?: number | null;
  researchPreferred: boolean;
  workExperiencePreferred: boolean;
  deadline?: string | null;
  university: University;
};

export type UniversityMatch = {
  id: string;
  studentProfileId: string;
  programId: string;
  category: "SAFE" | "TARGET" | "REACH";
  score: number;
  reasons: string[];
  createdAt: string;
  program: Program;
};

export type UniversityMatchesResponse = {
  universityMatches: UniversityMatch[];
};

export type ApplicationRiskTolerance = "CONSERVATIVE" | "BALANCED" | "AMBITIOUS" | "CUSTOM";

export type ApplicationStrategyItem = {
  id: string;
  planId: string;
  programId: string;
  matchId?: string | null;
  category: "SAFE" | "TARGET" | "REACH";
  rank: number;
  score: number;
  rationale: string[];
  isLocked: boolean;
  createdAt: string;
  program: Program;
};

export type ApplicationStrategyPlan = {
  id: string;
  studentProfileId: string;
  totalApplications: number;
  safeCount: number;
  targetCount: number;
  reachCount: number;
  riskTolerance: ApplicationRiskTolerance;
  summary: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  items: ApplicationStrategyItem[];
};

export type ApplicationStrategyResponse = {
  applicationStrategyPlan: ApplicationStrategyPlan | null;
};

export type DocumentStatus = "PENDING" | "PREPARED" | "SUBMITTED";

export type DocumentChecklistItem = {
  id: string;
  programId: string;
  title: string;
  category: string;
  status: DocumentStatus;
  updatedAt: string;
  program: Program;
};

export type Scholarship = {
  id: string;
  name: string;
  country?: Country | null;
  university?: University | null;
  program?: Program | null;
  degreeLevel: string;
  eligibleNationalities: string[];
  eligibleFields: string[];
  minCgpa?: number | null;
  minIelts?: number | null;
  researchRequired: boolean;
  amountUsd?: number | null;
  coverageType: string;
  deadline?: string | null;
  requiredDocuments: string[];
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "ARCHIVED";
  sourceUrl?: string | null;
  eligibilityRule?: {
    id: string;
    scholarshipId: string;
    degreeLevel: string;
    eligibleNationalities: string[];
    eligibleSubjects: string[];
    minCgpa?: number | null;
    minIelts?: number | null;
  } | null;
  isSaved?: boolean;
  deadlineTracked?: boolean;
  deadlineId?: string | null;
};

export type ScholarshipMatch = {
  id: string;
  studentProfileId: string;
  scholarshipId: string;
  matchingPercentage: number;
  status: "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_RECOMMENDED";
  reasons: string[];
  missingRequirements?: string[] | null;
  createdAt: string;
  scholarship: Scholarship;
};

export type ScholarshipMatchesResponse = {
  scholarshipMatches: ScholarshipMatch[];
};

export type SavedScholarship = {
  id: string;
  userId: string;
  scholarshipId: string;
  notes?: string | null;
  createdAt: string;
  scholarship: Scholarship & {
    deadlines?: ScholarshipDeadline[];
  };
};

export type ScholarshipDeadline = {
  id: string;
  userId: string;
  scholarshipId: string;
  title: string;
  deadline: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scholarship: Scholarship;
};

export type ScholarshipDetailResponse = {
  scholarship: Scholarship;
  match: (Omit<ScholarshipMatch, "scholarship"> & {
    scholarship?: Scholarship;
  }) | null;
};
