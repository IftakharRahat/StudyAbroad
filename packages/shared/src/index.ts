import { z } from "zod";

export const roleSchema = z.enum(["STUDENT", "CONTENT_MANAGER", "ADMIN"]);

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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
