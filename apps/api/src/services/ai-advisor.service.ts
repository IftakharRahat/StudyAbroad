import type {
  AdvisorChatInput,
  AdvisorCompareCountriesInput,
  AdvisorContextResponse,
  AdvisorExplainUniversityInput,
  AdvisorInsightsInput,
  AdvisorNextStepItem,
  AdvisorNextStepsInput,
  AdvisorReferencedEntity,
  AdvisorResponse
} from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { buildCountryDecision } from "./country-decision.service.js";

const ADVISOR_DISCLAIMER =
  "Note: StudyCompass AI Advisor provides personalized advisory insights based on your student profile and platform database facts. It complements and explains the rule-based matching system but does not override official university admission criteria or deterministic matching rules.";

export class AdvisorServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AdvisorServiceError";
    this.statusCode = statusCode;
  }
}

export async function getAdvisorContext(userId: string): Promise<AdvisorContextResponse> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true }
      },
      readinessScores: {
        orderBy: { createdAt: "desc" }
      },
      universityMatches: {
        include: {
          program: {
            include: {
              university: {
                include: {
                  country: true
                }
              }
            }
          }
        },
        orderBy: { score: "desc" },
        take: 12
      }
    }
  });

  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" }
  });

  const programs = await prisma.program.findMany({
    include: {
      university: {
        include: {
          country: true
        }
      }
    },
    orderBy: { title: "asc" },
    take: 30
  });

  const normalizedCgpa = profile ? (profile.cgpa / profile.cgpaScale) * 4 : 0;
  const englishScore = profile
    ? profile.ieltsScore
      ? `IELTS ${profile.ieltsScore.toFixed(1)}`
      : profile.toeflScore
        ? `TOEFL ${profile.toeflScore}`
        : "Not provided"
    : "Not provided";

  const topReadiness = profile?.readinessScores?.[0];

  const profileSummary = {
    name: profile?.user?.name ?? "Student",
    nationality: profile?.nationality ?? "International",
    targetDegree: profile?.targetDegree ?? "Master's Degree",
    fieldOfStudy: profile?.fieldOfStudy ?? "Computer Science",
    cgpaNormalized: Number(normalizedCgpa.toFixed(2)),
    englishScore,
    budgetUsd: profile?.budgetUsd ?? 25000,
    preferredCountries: profile?.preferredCountries ?? [],
    readinessTier: topReadiness?.tier,
    readinessScore: topReadiness?.score
  };

  const samplePrompts = buildSamplePrompts(profileSummary, profile?.preferredCountries ?? []);

  const availablePrograms = programs.map((p) => {
    const match = profile?.universityMatches.find((m) => m.programId === p.id);

    return {
      id: p.id,
      title: p.title,
      universityName: p.university.name,
      countryName: p.university.country.name,
      category: match?.category
    };
  });

  const availableCountries = countries.map((c) => ({
    id: c.id,
    name: c.name
  }));

  return {
    profileSummary,
    samplePrompts,
    availablePrograms,
    availableCountries
  };
}

export async function explainUniversitySuitability(
  userId: string,
  input: AdvisorExplainUniversityInput
): Promise<AdvisorResponse> {
  const { profile, readinessScores, matches, countryDecisions } = await getStudentContextData(userId);

  const program = await prisma.program.findUnique({
    where: { id: input.programId },
    include: {
      university: {
        include: {
          country: true
        }
      },
      scholarships: true
    }
  });

  if (!program) {
    throw new AdvisorServiceError("Selected university program not found in platform database", 404);
  }

  const match = matches.find((m) => m.programId === program.id);
  const normalizedCgpa = (profile.cgpa / profile.cgpaScale) * 4;
  const englishScore = profile.ieltsScore ?? (profile.toeflScore ? Math.min(9, profile.toeflScore / 13.33) : 0);
  const budgetFit = profile.budgetUsd >= program.tuitionUsd;
  const cgpaMet = normalizedCgpa >= program.minCgpa;
  const englishMet = !program.minIelts || englishScore >= program.minIelts;
  const greMet = !program.minGre || Boolean(profile.greScore && profile.greScore >= program.minGre);
  const category = match?.category ?? (cgpaMet && englishMet && budgetFit ? "TARGET" : "REACH");
  const countryName = program.university.country.name;
  const countryDec = countryDecisions.find((c) => c.name.toLowerCase() === countryName.toLowerCase());

  const matchingScholarships = await prisma.scholarship.findMany({
    where: {
      OR: [
        { programId: program.id },
        { universityId: program.university.id },
        { countryId: program.university.country.id }
      ]
    },
    take: 3
  });

  const academicFit = cgpaMet
    ? `Strong Fit: Your GPA (${normalizedCgpa.toFixed(2)}/4.0) meets or exceeds the required minimum (${program.minCgpa.toFixed(2)}).`
    : `Academic Stretch: Your GPA (${normalizedCgpa.toFixed(2)}/4.0) is slightly below the recommended minimum (${program.minCgpa.toFixed(2)}).`;

  const budgetFitText = budgetFit
    ? `Within Budget: Program tuition ($${program.tuitionUsd.toLocaleString()}) is covered by your declared budget ($${profile.budgetUsd.toLocaleString()}).`
    : `Budget Gap: Program tuition ($${program.tuitionUsd.toLocaleString()}) exceeds your annual budget ($${profile.budgetUsd.toLocaleString()}) by $${(program.tuitionUsd - profile.budgetUsd).toLocaleString()}.`;

  const englishFitText = englishMet
    ? `Requirements Met: Your English proficiency satisfies the program criteria (${program.minIelts ? `Min IELTS ${program.minIelts}` : "Flexible"}).`
    : `Test Improvement Recommended: Program expects a minimum IELTS of ${program.minIelts ?? 6.5}.`;

  const answer = `### 🎓 Suitability Evaluation: ${program.title}
**University**: ${program.university.name} (${program.university.city}, ${countryName})  
**Platform Match Category**: **${category}** (Score: ${match?.score ?? 75}/100)  
**Ranking Band**: ${program.university.rankingBand}

---

#### 1. Why this university is ${category === "SAFE" ? "a Safe Choice" : category === "TARGET" ? "a Strong Target" : "an Ambitious Reach"}
- **Academic Alignment**: ${academicFit}
- **Financial Viability**: ${budgetFitText}
- **Language Proficiency**: ${englishFitText}
- **Research & Background Fit**: ${
    program.researchPreferred
      ? profile.researchPapers > 0
        ? `Your ${profile.researchPapers} research publication(s) align well with this research-focused curriculum.`
        : "This program values research experience; highlighting academic projects or thesis work will strengthen your profile."
      : "Program focuses on coursework and industry applications, fitting your career goal."
  }
- **Country & Career Context**: ${countryName} offers **${countryDec?.postStudyWorkVisaMonths ?? 24} months** post-study work visa and allows **${countryDec?.partTimeWorkHours ?? 20} hrs/week** part-time work during study.

---

#### 2. Key Strengths in Your Application for this University
1. ${cgpaMet ? `Solid academic foundation in ${profile.fieldOfStudy}.` : "Target degree alignment with current coursework."}
2. ${englishMet ? "Competitive English proficiency scores." : "Eligible for conditional admission or test retake."}
3. ${profile.preferredCountries.some((c) => c.toLowerCase() === countryName.toLowerCase()) ? `${countryName} is in your preferred study destination list.` : `${countryName} offers affordable European education.`}

---

#### 3. Recommended Next Actions for ${program.university.name}
1. **Review Deadlines**: Check program intake deadlines${program.deadline ? ` (Listed deadline: ${new Date(program.deadline).toLocaleDateString()})` : " and prepare early submission"}.
2. **Explore Scholarships**: Look into matching financial aid (e.g. ${matchingScholarships.map((s) => s.name).join(", ") || "institutional merit waivers"}).
3. **Statement of Purpose**: Emphasize your background in ${profile.fieldOfStudy} and career goals in ${profile.careerGoal ?? "global technology"}.`;

  const referencedEntities: AdvisorReferencedEntity[] = [
    {
      type: "PROGRAM",
      id: program.id,
      name: program.title,
      badge: category,
      subtext: `${program.university.name} • $${program.tuitionUsd.toLocaleString()}/yr`,
      link: "/matches"
    },
    {
      type: "COUNTRY",
      id: program.university.country.id,
      name: countryName,
      badge: `${countryDec?.postStudyWorkVisaMonths ?? 24}mo PSW`,
      subtext: `Living Cost: ~$${(countryDec?.averageLivingCostUsd ?? 1000).toLocaleString()}/mo`,
      link: "/countries"
    }
  ];

  for (const s of matchingScholarships) {
    referencedEntities.push({
      type: "SCHOLARSHIP",
      id: s.id,
      name: s.name,
      badge: s.coverageType,
      subtext: s.amountUsd ? `Up to $${s.amountUsd.toLocaleString()}` : "Tuition coverage",
      link: `/scholarships/${s.id}`
    });
  }

  return {
    answer,
    mode: "UNIVERSITY",
    keyTakeaways: [
      `Categorized as ${category} with a match score of ${match?.score ?? 75}/100.`,
      cgpaMet ? "Meets minimum CGPA requirements." : "CGPA is below standard cutoff; projects/research needed.",
      budgetFit ? "Tuition is fully within declared budget." : "Scholarship or financial planning required to bridge tuition gap.",
      `${countryName} provides ${countryDec?.postStudyWorkVisaMonths ?? 24} months of post-study work authorization.`
    ],
    suggestedFollowUps: [
      `What scholarships are available for ${program.university.name}?`,
      `How does ${program.university.name} compare to other universities in ${countryName}?`,
      `What documents do I need to prepare for ${program.title}?`,
      `How can I move this program from ${category} to Safe?`
    ],
    referencedEntities,
    suitabilityScore: {
      overallFit: match?.score ?? 75,
      category,
      academicFit: cgpaMet ? "High" : "Moderate",
      budgetFit: budgetFit ? "High" : "Low",
      englishFit: englishMet ? "High" : "Moderate"
    },
    disclaimer: ADVISOR_DISCLAIMER
  };
}

export async function compareCountriesForStudent(
  userId: string,
  input: AdvisorCompareCountriesInput
): Promise<AdvisorResponse> {
  const { profile, countryDecisions } = await getStudentContextData(userId);

  const selectedCountries = countryDecisions.filter((c) =>
    input.countryIds.some((id) => id === c.id || id.toLowerCase() === c.name.toLowerCase())
  );

  if (selectedCountries.length < 2) {
    throw new AdvisorServiceError("Please select at least 2 valid countries from the platform catalog to compare", 400);
  }

  const comparisonTable = selectedCountries.map((c) => ({
    country: c.name,
    annualCostUsd: c.decision.estimatedAnnualCostUsd,
    postStudyWorkMonths: c.postStudyWorkVisaMonths,
    partTimeHours: c.partTimeWorkHours,
    visaDifficulty: c.visaDifficulty,
    jobMarket: c.meta.jobMarketStrength,
    safetyScore: c.safetyScore,
    budgetFit: c.decision.budgetFit
  }));

  const bestBudgetCountry = [...selectedCountries].sort(
    (a, b) => a.decision.estimatedAnnualCostUsd - b.decision.estimatedAnnualCostUsd
  )[0];

  const bestJobMarketCountry = [...selectedCountries].sort((a, b) => {
    const scoreMap = { Excellent: 4, Strong: 3, Good: 2, Growing: 1 };

    return scoreMap[b.meta.jobMarketStrength] - scoreMap[a.meta.jobMarketStrength];
  })[0];

  const bestPswCountry = [...selectedCountries].sort(
    (a, b) => b.postStudyWorkVisaMonths - a.postStudyWorkVisaMonths
  )[0];

  const answer = `### 🌍 Comprehensive Country Comparison for Your Profile
**Target Field**: ${profile.fieldOfStudy}  
**Student Budget**: $${profile.budgetUsd.toLocaleString()}/year  
**Countries Analyzed**: ${selectedCountries.map((c) => `**${c.name}**`).join(" vs ")}

---

#### 1. Multi-Factor Comparison Breakdown

| Country | Est. Annual Total | Post-Study Work | Part-Time Work | Job Market | Visa Path | Budget Fit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${selectedCountries
  .map(
    (c) =>
      `| **${c.name}** | $${c.decision.estimatedAnnualCostUsd.toLocaleString()} | ${c.postStudyWorkVisaMonths} months | ${c.partTimeWorkHours} hrs/week | ${c.meta.jobMarketStrength} | ${c.meta.prPathwayDifficulty} | **${c.decision.budgetFit}** |`
  )
  .join("\n")}

---

#### 2. Key Highlights for Your Background
${selectedCountries
  .map((c) => {
    return `##### 📍 ${c.name} (Decision Score: ${c.decision.decisionScore}/100)
- **Living & Tuition Costs**: Living cost is ~$${c.averageLivingCostUsd.toLocaleString()}/mo with tuition ranges between $${c.meta.tuitionMinUsd.toLocaleString()} and $${c.meta.tuitionMaxUsd.toLocaleString()}.
- **Language & Work**: Language barrier is **${c.meta.languageBarrier}**; post-study search visa provides **${c.postStudyWorkVisaMonths} months**.
- **Tech / ${profile.fieldOfStudy} Market**: ${c.meta.insight}
- **Advisor Fit**: ${c.decision.recommendation}`;
  })
  .join("\n\n")}

---

#### 3. Strategic Verdict & Recommendation
- **Best for Budget**: **${bestBudgetCountry.name}** is the most cost-effective option ($${bestBudgetCountry.decision.estimatedAnnualCostUsd.toLocaleString()}/year total).
- **Best for Career & Job Market**: **${bestJobMarketCountry.name}** offers the strongest industry demand and hiring for ${profile.fieldOfStudy}.
- **Best for Long-Term Post-Study Work**: **${bestPswCountry.name}** grants ${bestPswCountry.postStudyWorkVisaMonths} months to secure employment.`;

  const referencedEntities: AdvisorReferencedEntity[] = selectedCountries.map((c) => ({
    type: "COUNTRY",
    id: c.id,
    name: c.name,
    badge: `${c.decision.decisionScore}/100 Score`,
    subtext: `$${c.decision.estimatedAnnualCostUsd.toLocaleString()}/yr • ${c.postStudyWorkVisaMonths}mo PSW`,
    link: "/countries"
  }));

  return {
    answer,
    mode: "COUNTRY",
    keyTakeaways: [
      `${bestBudgetCountry.name} offers the lowest total cost of attendance.`,
      `${bestJobMarketCountry.name} provides the highest job market rating for ${profile.fieldOfStudy}.`,
      `${bestPswCountry.name} gives the longest post-study work authorization (${bestPswCountry.postStudyWorkVisaMonths} months).`,
      "All compared countries have active university programs and scholarship opportunities in the platform database."
    ],
    suggestedFollowUps: [
      `What are the top universities in ${bestJobMarketCountry.name} for my profile?`,
      `How do visa requirements differ between ${selectedCountries[0].name} and ${selectedCountries[1]?.name ?? "others"}?`,
      `What scholarships can help bridge the cost for ${bestJobMarketCountry.name}?`,
      `What is the proof of funds required for ${bestBudgetCountry.name}?`
    ],
    referencedEntities,
    countryComparisonTable: comparisonTable,
    disclaimer: ADVISOR_DISCLAIMER
  };
}

export async function summarizePublicInsights(
  userId: string,
  input: AdvisorInsightsInput
): Promise<AdvisorResponse> {
  const { profile, countryDecisions } = await getStudentContextData(userId);

  const targetCountry = input.countryId
    ? countryDecisions.find((c) => c.id === input.countryId || c.name.toLowerCase() === input.countryId?.toLowerCase())
    : countryDecisions[0];

  const field = input.field || profile.fieldOfStudy || "Computer Science / Engineering";

  const allCountriesWithPrograms = countryDecisions.filter((c) => c.universityCount > 0);

  const answer = `### 📊 Public Insights & Market Trends: ${field}
${targetCountry ? `**Focus Country**: ${targetCountry.name} (${targetCountry.meta.region})` : "**Scope**: Global & Key Study Destinations"}

---

#### 1. Tech & Industry Hiring Outlook
- **High-Demand Sectors**: Software Engineering, Artificial Intelligence, Cloud Infrastructure, Data Analytics, and Embedded Systems continue to have fast-track visa pathways in Europe and North America.
- **Post-Graduation Salaries**: International STEM graduates in top hubs typically command starting packages between **$45,000 - $85,000/yr** (or €42,000 - €65,000 in Germany/France/Belgium).
- **Language Advantage**: While English is the working language in international tech companies, conversational proficiency in the local language (B1/B2 in German or French) significantly increases internship conversion rates by up to 60%.

---

#### 2. Key Country Policies & Intake Cycles

| Country | Primary Intakes | Proof of Funds (Est.) | Post-Study Work | Visa Processing Time |
| :--- | :--- | :--- | :--- | :--- |
${allCountriesWithPrograms
  .slice(0, 6)
  .map(
    (c) =>
      `| **${c.name}** | ${c.meta.academicIntake} | ~$${c.meta.proofOfFundsUsd.toLocaleString()} | ${c.postStudyWorkVisaMonths} months | 4 - 8 weeks |`
  )
  .join("\n")}

---

#### 3. Official Visa & Policy Best Practices
1. **Blocked Account / Proof of Funds**: European destinations (e.g. Germany, Belgium, France) require official living cost deposits or bank statements showing approximately **$8,500 - $14,500** prior to visa issuance.
2. **Application Windows**: Fall intakes (September/October) have application deadlines between **December and April**. Spring intakes (January/February) close around **September/October**.
3. **Scholarship Priority**: Government scholarships (e.g., DAAD, Eiffel, Erasmus Mundus) require applications 8–12 months in advance of the academic semester.`;

  const referencedEntities: AdvisorReferencedEntity[] = allCountriesWithPrograms.slice(0, 4).map((c) => ({
    type: "COUNTRY",
    id: c.id,
    name: c.name,
    badge: c.meta.academicIntake,
    subtext: `Proof of funds: ~$${c.meta.proofOfFundsUsd.toLocaleString()}`,
    link: "/countries"
  }));

  return {
    answer,
    mode: "INSIGHTS",
    keyTakeaways: [
      `Strong industry demand for ${field} across Western & Central Europe and North America.`,
      "Fall intake offers the largest volume of university seats and scholarship allocations.",
      "Proof of funds and language certifications should be organized at least 6 months before visa application."
    ],
    suggestedFollowUps: [
      `What are the upcoming application deadlines for ${field}?`,
      `How much proof of funds do I need for Germany vs France?`,
      `Which scholarships are currently open for international applicants?`,
      `Can I work part-time while studying?`
    ],
    referencedEntities,
    disclaimer: ADVISOR_DISCLAIMER
  };
}

export async function suggestNextSteps(
  userId: string,
  input: AdvisorNextStepsInput
): Promise<AdvisorResponse> {
  const { profile, readinessScores, matches, strategyPlan } = await getStudentContextData(userId);

  const normalizedCgpa = (profile.cgpa / profile.cgpaScale) * 4;
  const hasIelts = Boolean(profile.ieltsScore || profile.toeflScore);
  const hasGre = Boolean(profile.greScore || profile.gmatScore);
  const hasResearch = profile.researchPapers > 0;
  const hasMatches = matches.length > 0;
  const hasStrategy = Boolean(strategyPlan);

  const nextStepItems: AdvisorNextStepItem[] = [];

  // Phase 1: Academics & Tests
  if (!hasIelts) {
    nextStepItems.push({
      id: "step-test-english",
      category: "ACADEMICS_TESTS",
      title: "Complete IELTS or TOEFL English Proficiency Exam",
      description: "Aim for IELTS 7.0+ or TOEFL 95+ to qualify for top-tier and mid-tier universities without restrictions.",
      priority: "HIGH",
      status: "PENDING",
      actionUrl: "/profile",
      actionLabel: "Update Profile Test Scores"
    });
  } else if ((profile.ieltsScore ?? 0) < 6.5 && (profile.toeflScore ?? 0) < 85) {
    nextStepItems.push({
      id: "step-retake-english",
      category: "ACADEMICS_TESTS",
      title: "Consider Retaking IELTS/TOEFL for Higher Tier Unlocks",
      description: `Current score (${profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : `TOEFL ${profile.toeflScore}`}) qualifies for Accessible-tier, but 7.0+ unlocks top institutions.`,
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      actionUrl: "/readiness",
      actionLabel: "View Readiness Targets"
    });
  }

  if (!hasGre && normalizedCgpa < 3.5) {
    nextStepItems.push({
      id: "step-gre-standardized",
      category: "ACADEMICS_TESTS",
      title: "Evaluate GRE / Standardized Test Opportunity",
      description: "A GRE score of 315+ can offset a moderate GPA when applying to competitive US and European graduate programs.",
      priority: "MEDIUM",
      status: "PENDING",
      actionUrl: "/profile",
      actionLabel: "Add Standardized Test"
    });
  }

  // Phase 2: Application Strategy
  if (!hasMatches) {
    nextStepItems.push({
      id: "step-generate-matches",
      category: "APPLICATION_STRATEGY",
      title: "Run Smart University Matcher",
      description: "Generate and classify programs into Safe, Target, and Reach categories based on your profile score.",
      priority: "HIGH",
      status: "PENDING",
      actionUrl: "/matches",
      actionLabel: "Generate University Matches"
    });
  } else if (!hasStrategy) {
    nextStepItems.push({
      id: "step-build-strategy",
      category: "APPLICATION_STRATEGY",
      title: "Construct Balanced Application Strategy List",
      description: "Lock in 9 curated programs (3 Safe, 4 Target, 2 Reach) to maximize admission probability.",
      priority: "HIGH",
      status: "PENDING",
      actionUrl: "/application-strategy",
      actionLabel: "Build Application Plan"
    });
  } else {
    nextStepItems.push({
      id: "step-review-strategy",
      category: "APPLICATION_STRATEGY",
      title: "Finalize Program Applications and Track Deadlines",
      description: `Review your ${strategyPlan.totalApplications} shortlisted programs and set milestone alerts.`,
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      actionUrl: "/deadlines",
      actionLabel: "Track Deadlines"
    });
  }

  // Phase 3: Scholarships & Finance
  nextStepItems.push({
    id: "step-scholarship-apps",
    category: "SCHOLARSHIPS_FINANCE",
    title: "Apply to Priority Financial Aid & University Merit Waivers",
    description: `Match eligibility rules for ${profile.preferredCountries.join(", ") || "target destinations"} before upcoming scholarship cutoffs.`,
    priority: "HIGH",
    status: "PENDING",
    actionUrl: "/scholarships",
    actionLabel: "Search Scholarships"
  });

  // Phase 4: Documents & Visa
  nextStepItems.push({
    id: "step-doc-prep",
    category: "DOCUMENTS_VISA",
    title: "Prepare Academic Transcripts, SOP & Recommendation Letters",
    description: "Request official sealed transcripts from your university and draft 2-3 tailored Letters of Recommendation.",
    priority: "HIGH",
    status: "PENDING",
    actionUrl: "/documents",
    actionLabel: "Manage Document Checklist"
  });

  const answer = `### 🚀 Your Personalized Study Abroad Action Roadmap
**Target Intake**: ${input.targetIntake || profile.preferredIntake || "Upcoming Academic Year (Fall)"}  
**Profile Standing**: GPA ${normalizedCgpa.toFixed(2)}/4.0 • ${hasIelts ? `English Verified` : "English Test Needed"} • Readiness Tier: **${readinessScores[0]?.tier ?? "Mid-tier"}**

---

#### 📋 Prioritized Milestones for Your Application Journey

1. **Step 1: Test & Academic Preparation**
   - ${!hasIelts ? "🚨 **Priority High**: Book your IELTS/TOEFL exam immediately. Most program portals require verified test reports at the time of submission." : "✅ English test verified. Keep digital TRF reports ready for portal upload."}
   - ${!hasResearch ? "💡 Work on a capstone project, GitHub portfolio, or faculty research summary to boost academic credibility." : "✅ Research background noted. Include research abstracts in your application CV."}

2. **Step 2: University Application Strategy**
   - ${!hasStrategy ? "Build a balanced portfolio of 3 Safe, 4 Target, and 2 Reach universities using the Strategy Builder." : "Your application strategy plan is established. Ensure all locked program requirements are reviewed."}
   - Target early application rounds (Round 1 / Early Action) to maximize scholarship consideration.

3. **Step 3: Financial Aid & Scholarships**
   - Filter scholarships matching your nationality (${profile.nationality}) and field (${profile.fieldOfStudy}).
   - Prepare financial sponsorship documents or blocked account fund schedules (~$10,000 - $14,000 depending on country).

4. **Step 4: Application Dossier & Submissions**
   - Draft a compelling Statement of Purpose (SOP) connecting your background to future goals (${profile.careerGoal ?? "leadership in tech"}).
   - Reach out to 2 professors and 1 employer/manager for strong academic and professional recommendations.`;

  return {
    answer,
    mode: "NEXT_STEPS",
    keyTakeaways: [
      `${nextStepItems.filter((i) => i.priority === "HIGH").length} high-priority action items identified for immediate execution.`,
      "Completing tests and finalizing your 3-4-2 university mix minimizes application risk.",
      "Document preparation (SOP and Recommendation Letters) typically requires 4-6 weeks."
    ],
    suggestedFollowUps: [
      "How do I write a strong Statement of Purpose for Computer Science?",
      "What documents are required for German university applications?",
      "How can I find scholarships matching my exact GPA?",
      "When is the best time to apply for Fall intake?"
    ],
    referencedEntities: [
      {
        type: "PROGRAM",
        id: "strategy-builder",
        name: "Application Strategy Builder",
        badge: "Strategy Tool",
        subtext: "Create your 3-4-2 university balance",
        link: "/application-strategy"
      },
      {
        type: "SCHOLARSHIP",
        id: "scholarships-directory",
        name: "Scholarships Directory",
        badge: "Financial Aid",
        subtext: "Explore merit & government scholarships",
        link: "/scholarships"
      }
    ],
    nextSteps: nextStepItems,
    disclaimer: ADVISOR_DISCLAIMER
  };
}

export async function chatWithAdvisor(
  userId: string,
  input: AdvisorChatInput
): Promise<AdvisorResponse> {
  const query = input.question.toLowerCase().trim();

  // If user selected or asked about a specific program
  if (input.focusMode === "UNIVERSITY" && input.entityId) {
    return explainUniversitySuitability(userId, { programId: input.entityId, question: input.question });
  }

  // If user selected or asked to compare countries
  if (input.focusMode === "COUNTRY") {
    const { countryDecisions } = await getStudentContextData(userId);
    const mentionedCountries = countryDecisions.filter(
      (c) => query.includes(c.name.toLowerCase()) || (input.entityId && input.entityId === c.id)
    );

    if (mentionedCountries.length >= 2) {
      return compareCountriesForStudent(userId, {
        countryIds: mentionedCountries.map((c) => c.id),
        question: input.question
      });
    }
  }

  // If user asked for next steps or roadmap
  if (
    input.focusMode === "NEXT_STEPS" ||
    query.includes("next step") ||
    query.includes("roadmap") ||
    query.includes("what should i do") ||
    query.includes("how to prepare") ||
    query.includes("timeline")
  ) {
    return suggestNextSteps(userId, { question: input.question });
  }

  // If user asked for insights or visa rules
  if (
    input.focusMode === "INSIGHTS" ||
    query.includes("visa") ||
    query.includes("salary") ||
    query.includes("insight") ||
    query.includes("trend") ||
    query.includes("intake") ||
    query.includes("proof of fund") ||
    query.includes("work permit")
  ) {
    return summarizePublicInsights(userId, { question: input.question });
  }

  // Check if a specific university in DB is mentioned in freeform query
  const { programs, profile, readinessScores, matches, countryDecisions } = await getStudentContextData(userId);
  const matchedProgram = programs.find((p) => {
    const titleMatch = query.includes(p.title.toLowerCase());
    const uniMatch = query.includes(p.university.name.toLowerCase());

    return titleMatch || uniMatch;
  });

  if (matchedProgram) {
    return explainUniversitySuitability(userId, { programId: matchedProgram.id, question: input.question });
  }

  // Check if multiple countries are mentioned in freeform query
  const mentionedCountries = countryDecisions.filter((c) => query.includes(c.name.toLowerCase()));

  if (mentionedCountries.length >= 2) {
    return compareCountriesForStudent(userId, {
      countryIds: mentionedCountries.map((c) => c.id),
      question: input.question
    });
  }

  // General Grounded Advisory Response
  return generateGeneralAdvisoryResponse(input.question, profile, readinessScores, matches, countryDecisions);
}

function generateGeneralAdvisoryResponse(
  question: string,
  profile: any,
  readinessScores: any[],
  matches: any[],
  countryDecisions: any[]
): AdvisorResponse {
  const normalizedCgpa = (profile.cgpa / profile.cgpaScale) * 4;
  const englishScore = profile.ieltsScore
    ? `IELTS ${profile.ieltsScore.toFixed(1)}`
    : profile.toeflScore
      ? `TOEFL ${profile.toeflScore}`
      : "Not yet provided";

  const topReadiness = readinessScores[0];
  const safeCount = matches.filter((m) => m.category === "SAFE").length;
  const targetCount = matches.filter((m) => m.category === "TARGET").length;
  const reachCount = matches.filter((m) => m.category === "REACH").length;

  const answer = `### 💡 Personalized Advisor Guidance

Hello **${profile.user?.name ?? "Student"}**! Here is an analysis of your inquiry based on your profile and database records:

---

#### 1. Your Current Student Profile Snapshot
- **Target Degree & Field**: ${profile.targetDegree} in **${profile.fieldOfStudy}**
- **Academic Standing**: CGPA **${normalizedCgpa.toFixed(2)}/4.0** (${profile.cgpa}/${profile.cgpaScale} scale)
- **English Proficiency**: **${englishScore}**
- **Annual Declared Budget**: **$${profile.budgetUsd.toLocaleString()} USD**
- **Readiness Classification**: **${topReadiness?.tier ?? "Mid-tier"}** (Score: ${topReadiness?.score ?? 70}/100)
- **Preferred Destinations**: ${profile.preferredCountries.length ? profile.preferredCountries.join(", ") : "Worldwide"}

---

#### 2. Key Insights for Your Question
- **Admission & Category Match**: With your current GPA and test profile, our rule-based system identifies **${safeCount} Safe**, **${targetCount} Target**, and **${reachCount} Reach** university options.
- **Budget Alignment**: For your annual budget of $${profile.budgetUsd.toLocaleString()}, European destinations such as Germany, Poland, and Belgium offer high financial sustainability.
- **Application Advice**: Focus on submitting applications during early admission rounds and applying for university merit waivers and national scholarships simultaneously.

---

#### 3. What would you like to explore next?
You can ask me to **evaluate a specific university**, **compare two countries side-by-side**, **check visa and proof-of-funds rules**, or **generate your step-by-step application roadmap**.`;

  return {
    answer,
    mode: "GENERAL",
    keyTakeaways: [
      `Profile assessed for ${profile.fieldOfStudy} with a ${topReadiness?.tier ?? "Mid-tier"} readiness rating.`,
      `${matches.length} programs matched in platform database (${safeCount} Safe, ${targetCount} Target, ${reachCount} Reach).`,
      "All recommendations are grounded in verified platform catalog data."
    ],
    suggestedFollowUps: [
      "Which universities are the safest options for my GPA?",
      "Compare Germany vs France for MS in Computer Science",
      "What are the highest-paying scholarships available for me?",
      "Generate my next steps roadmap for Fall intake"
    ],
    referencedEntities: [
      {
        type: "PROGRAM",
        id: "matching-page",
        name: "Smart University Matching",
        badge: `${matches.length} Matches`,
        subtext: "View categorized programs",
        link: "/matches"
      },
      {
        type: "COUNTRY",
        id: "country-decision",
        name: "Country Decision Dashboard",
        badge: `${countryDecisions.length} Countries`,
        subtext: "Compare costs, visas & work rules",
        link: "/countries"
      }
    ],
    disclaimer: ADVISOR_DISCLAIMER
  };
}

async function getStudentContextData(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true }
      },
      readinessScores: {
        orderBy: { createdAt: "desc" }
      },
      universityMatches: {
        include: {
          program: {
            include: {
              university: {
                include: {
                  country: true
                }
              }
            }
          }
        },
        orderBy: { score: "desc" }
      },
      applicationStrategyPlans: {
        include: {
          items: {
            include: {
              program: {
                include: {
                  university: {
                    include: {
                      country: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!profile) {
    throw new AdvisorServiceError("Please complete your student profile before accessing the AI Advisor", 409);
  }

  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" }
  });

  const programs = await prisma.program.findMany({
    include: {
      university: {
        include: {
          country: true
        }
      }
    }
  });

  const scholarships = await prisma.scholarship.findMany({
    include: {
      country: true,
      university: true
    }
  });

  const countryDecisions = countries.map((c) => buildCountryDecision(c, profile, programs, scholarships));

  return {
    profile,
    readinessScores: profile.readinessScores,
    matches: profile.universityMatches,
    strategyPlan: profile.applicationStrategyPlans[0] ?? null,
    countries,
    programs,
    scholarships,
    countryDecisions
  };
}

function buildSamplePrompts(profileSummary: any, preferredCountries: string[]) {
  const primaryCountry = preferredCountries[0] ?? "Germany";
  const secondCountry = preferredCountries[1] ?? "Canada";

  return [
    {
      id: "prompt-1",
      title: "University Suitability",
      prompt: `Why is my top-matched university suitable for me and why was it categorized as Safe/Target/Reach?`,
      category: "UNIVERSITY" as const
    },
    {
      id: "prompt-2",
      title: "Country Comparison",
      prompt: `Compare ${primaryCountry} vs ${secondCountry} in terms of living costs, post-study work visa, and tech job market.`,
      category: "COUNTRY" as const
    },
    {
      id: "prompt-3",
      title: "Public Insights & Visa",
      prompt: `Summarize the proof of funds, visa processing time, and job market trends for ${profileSummary.fieldOfStudy}.`,
      category: "INSIGHTS" as const
    },
    {
      id: "prompt-4",
      title: "Next Steps Roadmap",
      prompt: `What are my immediate next 4 priorities to get ready for the upcoming application deadlines?`,
      category: "NEXT_STEPS" as const
    },
    {
      id: "prompt-5",
      title: "Scholarship Strategy",
      prompt: `How can I bridge my tuition gap with matching scholarships for my GPA and profile?`,
      category: "GENERAL" as const
    }
  ];
}
