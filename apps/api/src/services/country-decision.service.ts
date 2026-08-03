import type { Country, Program, Scholarship, StudentProfile, University } from "@prisma/client";

type ProgramWithUniversity = Program & {
  university: University & {
    country: Country;
  };
};

type ScholarshipWithCountry = Scholarship & {
  country: Country | null;
  university: University | null;
};

type CountryProfile = Pick<StudentProfile, "budgetUsd" | "targetDegree" | "fieldOfStudy" | "preferredCountries" | "careerGoal" | "needsScholarship" | "preferredIntake" | "ieltsScore" | "toeflScore"> | null;

type PriorityWeights = {
  affordability: number;
  jobMarket: number;
  scholarships: number;
  postStudyWork: number;
  visaFriendliness: number;
};

export type CountryDecisionResult = Country & {
  decision: {
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
  meta: CountryMeta;
  universityCount: number;
  scholarshipCount: number;
  topUniversities: Array<{
    id: string;
    name: string;
    city: string;
    rankingBand: string;
  }>;
  matchingScholarships: Array<{
    id: string;
    name: string;
    coverageType: string;
    amountUsd: number | null;
  }>;
};

type CountryMeta = {
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

const defaultWeights: PriorityWeights = {
  affordability: 30,
  jobMarket: 25,
  scholarships: 20,
  postStudyWork: 15,
  visaFriendliness: 10
};

const countryMetaByName: Record<string, CountryMeta> = {
  belgium: {
    region: "Western Europe",
    currency: "Euro",
    tuitionMinUsd: 6000,
    tuitionMaxUsd: 9000,
    visaFeeUsd: 195,
    insuranceCostUsd: 450,
    proofOfFundsUsd: 10500,
    languageBarrier: "Medium",
    jobMarketStrength: "Strong",
    scholarshipAvailability: "Medium",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "High",
    capital: "Brussels",
    population: "11.7 Million",
    officialLanguages: "Dutch, French, German",
    academicIntake: "Feb / Sep",
    popularCities: ["Leuven", "Brussels", "Ghent", "Antwerp"],
    officialVisaUrl: "https://dofi.ibz.be",
    imageTone: "from-[#111827] via-[#facc15] to-[#dc2626]",
    highlights: ["Affordable education compared to other Western European countries", "Strong focus on research and innovation", "Gateway to the EU job market", "High quality of life and safety"],
    considerations: ["Living cost is higher than Poland", "Some programs may require Dutch or French language skills"],
    insight: "Belgium offers strong research universities and manageable costs for students targeting Europe."
  },
  poland: {
    region: "Central Europe",
    currency: "Zloty",
    tuitionMinUsd: 2000,
    tuitionMaxUsd: 4500,
    visaFeeUsd: 90,
    insuranceCostUsd: 300,
    proofOfFundsUsd: 6500,
    languageBarrier: "High",
    jobMarketStrength: "Good",
    scholarshipAvailability: "Low",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "Medium",
    capital: "Warsaw",
    population: "37.6 Million",
    officialLanguages: "Polish",
    academicIntake: "Feb / Oct",
    popularCities: ["Warsaw", "Krakow", "Wroclaw", "Gdansk"],
    officialVisaUrl: "https://www.gov.pl/web/diplomacy/visas",
    imageTone: "from-[#f8fafc] via-[#f1f5f9] to-[#dc2626]",
    highlights: ["Very affordable tuition and living cost", "Growing IT and business-service market", "Central European location"],
    considerations: ["Polish language can matter for part-time jobs", "Scholarship availability is lower than Western Europe"],
    insight: "Poland is strongest when budget is the main priority and the student can manage language barriers."
  },
  france: {
    region: "Western Europe",
    currency: "Euro",
    tuitionMinUsd: 3000,
    tuitionMaxUsd: 6000,
    visaFeeUsd: 110,
    insuranceCostUsd: 350,
    proofOfFundsUsd: 8500,
    languageBarrier: "Medium",
    jobMarketStrength: "Strong",
    scholarshipAvailability: "High",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "High",
    capital: "Paris",
    population: "68 Million",
    officialLanguages: "French",
    academicIntake: "Jan / Sep",
    popularCities: ["Paris", "Lyon", "Toulouse", "Nice", "Montpellier"],
    officialVisaUrl: "https://france-visas.gouv.fr",
    imageTone: "from-[#2563eb] via-white to-[#ef4444]",
    highlights: ["Strong scholarship availability", "High research output", "Good post-study search period", "Large tech and engineering market"],
    considerations: ["French language improves internships and jobs", "Paris can be expensive"],
    insight: "France balances moderate tuition with strong scholarships and excellent research opportunities."
  },
  germany: {
    region: "Western Europe",
    currency: "Euro",
    tuitionMinUsd: 2500,
    tuitionMaxUsd: 6500,
    visaFeeUsd: 85,
    insuranceCostUsd: 1200,
    proofOfFundsUsd: 12500,
    languageBarrier: "Medium",
    jobMarketStrength: "Excellent",
    scholarshipAvailability: "Medium",
    prPathwayDifficulty: "Easy",
    studentFriendliness: "High",
    capital: "Berlin",
    population: "84 Million",
    officialLanguages: "German",
    academicIntake: "Apr / Oct",
    popularCities: ["Munich", "Berlin", "Aachen", "Bonn"],
    officialVisaUrl: "https://www.make-it-in-germany.com",
    imageTone: "from-[#111827] via-[#ef4444] to-[#facc15]",
    highlights: ["Low tuition options", "Excellent engineering and IT market", "Strong post-study work route"],
    considerations: ["German language can matter for jobs", "Blocked-account proof of funds is required"],
    insight: "Germany is a strong long-term career option, especially for software, AI, and engineering students."
  },
  netherlands: {
    region: "Western Europe",
    currency: "Euro",
    tuitionMinUsd: 10000,
    tuitionMaxUsd: 18000,
    visaFeeUsd: 250,
    insuranceCostUsd: 650,
    proofOfFundsUsd: 14500,
    languageBarrier: "Low",
    jobMarketStrength: "Strong",
    scholarshipAvailability: "Medium",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "High",
    capital: "Amsterdam",
    population: "17.9 Million",
    officialLanguages: "Dutch",
    academicIntake: "Feb / Sep",
    popularCities: ["Amsterdam", "Delft", "Eindhoven", "Utrecht"],
    officialVisaUrl: "https://ind.nl/en/residence-permits/study",
    imageTone: "from-[#ef4444] via-white to-[#2563eb]",
    highlights: ["Very English-friendly", "Strong employability", "Excellent innovation ecosystem"],
    considerations: ["Higher tuition than Belgium and Germany", "Housing can be difficult in major cities"],
    insight: "The Netherlands is attractive for English-taught programs and tech jobs, but costs need planning."
  },
  canada: {
    region: "North America",
    currency: "Canadian Dollar",
    tuitionMinUsd: 18000,
    tuitionMaxUsd: 36000,
    visaFeeUsd: 110,
    insuranceCostUsd: 700,
    proofOfFundsUsd: 15500,
    languageBarrier: "Low",
    jobMarketStrength: "Strong",
    scholarshipAvailability: "High",
    prPathwayDifficulty: "Easy",
    studentFriendliness: "High",
    capital: "Ottawa",
    population: "40 Million",
    officialLanguages: "English, French",
    academicIntake: "Jan / May / Sep",
    popularCities: ["Toronto", "Vancouver", "Montreal", "Waterloo"],
    officialVisaUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
    imageTone: "from-[#dc2626] via-white to-[#dc2626]",
    highlights: ["Strong PR pathway", "Large international student community", "Excellent CS and data science programs"],
    considerations: ["Tuition and living cost can be high", "Scholarships are competitive"],
    insight: "Canada is excellent for students prioritizing PR and post-study work, if the budget works."
  },
  australia: {
    region: "Oceania",
    currency: "Australian Dollar",
    tuitionMinUsd: 24000,
    tuitionMaxUsd: 39000,
    visaFeeUsd: 1050,
    insuranceCostUsd: 650,
    proofOfFundsUsd: 18500,
    languageBarrier: "Low",
    jobMarketStrength: "Good",
    scholarshipAvailability: "High",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "High",
    capital: "Canberra",
    population: "26.8 Million",
    officialLanguages: "English",
    academicIntake: "Feb / Jul",
    popularCities: ["Melbourne", "Sydney", "Brisbane", "Adelaide"],
    officialVisaUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    imageTone: "from-[#1d4ed8] via-[#0f766e] to-[#facc15]",
    highlights: ["Work while studying", "Strong post-study work options", "High quality of life"],
    considerations: ["High visa and tuition costs", "Major cities are expensive"],
    insight: "Australia fits students who want English-speaking programs and strong work rights with a higher budget."
  },
  sweden: {
    region: "Northern Europe",
    currency: "Swedish Krona",
    tuitionMinUsd: 9000,
    tuitionMaxUsd: 17000,
    visaFeeUsd: 140,
    insuranceCostUsd: 550,
    proofOfFundsUsd: 10500,
    languageBarrier: "Low",
    jobMarketStrength: "Good",
    scholarshipAvailability: "Medium",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "High",
    capital: "Stockholm",
    population: "10.5 Million",
    officialLanguages: "Swedish",
    academicIntake: "Jan / Aug",
    popularCities: ["Stockholm", "Gothenburg", "Lund", "Uppsala"],
    officialVisaUrl: "https://www.migrationsverket.se",
    imageTone: "from-[#2563eb] via-[#facc15] to-[#2563eb]",
    highlights: ["Innovation and research culture", "English-friendly universities", "Strong sustainability and tech sector"],
    considerations: ["Living cost is high", "Scholarships are competitive"],
    insight: "Sweden is strongest for research-minded students who value innovation and student life."
  },
  ireland: {
    region: "Western Europe",
    currency: "Euro",
    tuitionMinUsd: 12000,
    tuitionMaxUsd: 22000,
    visaFeeUsd: 70,
    insuranceCostUsd: 600,
    proofOfFundsUsd: 11500,
    languageBarrier: "Low",
    jobMarketStrength: "Strong",
    scholarshipAvailability: "Medium",
    prPathwayDifficulty: "Moderate",
    studentFriendliness: "High",
    capital: "Dublin",
    population: "5.3 Million",
    officialLanguages: "English, Irish",
    academicIntake: "Jan / Sep",
    popularCities: ["Dublin", "Cork", "Galway", "Limerick"],
    officialVisaUrl: "https://www.irishimmigration.ie",
    imageTone: "from-[#16a34a] via-white to-[#f97316]",
    highlights: ["English-speaking country", "Strong tech sector", "Good graduate route"],
    considerations: ["Dublin living cost is high", "Housing availability can be difficult"],
    insight: "Ireland is a practical option for CS students who want English-speaking tech jobs in Europe."
  },
  "united kingdom": {
    region: "Western Europe",
    currency: "Pound Sterling",
    tuitionMinUsd: 21000,
    tuitionMaxUsd: 43000,
    visaFeeUsd: 650,
    insuranceCostUsd: 1200,
    proofOfFundsUsd: 15000,
    languageBarrier: "Low",
    jobMarketStrength: "Strong",
    scholarshipAvailability: "High",
    prPathwayDifficulty: "Hard",
    studentFriendliness: "High",
    capital: "London",
    population: "67 Million",
    officialLanguages: "English",
    academicIntake: "Jan / Sep",
    popularCities: ["London", "Manchester", "Edinburgh", "Birmingham"],
    officialVisaUrl: "https://www.gov.uk/student-visa",
    imageTone: "from-[#1d4ed8] via-[#ef4444] to-white",
    highlights: ["One-year master's options", "Strong graduate route", "Many scholarships"],
    considerations: ["Tuition is high", "PR pathway is harder than Canada or Germany"],
    insight: "The UK is strong for short programs and brand-name universities, but budget planning is important."
  },
  "united states": {
    region: "North America",
    currency: "US Dollar",
    tuitionMinUsd: 24000,
    tuitionMaxUsd: 61000,
    visaFeeUsd: 535,
    insuranceCostUsd: 1800,
    proofOfFundsUsd: 30000,
    languageBarrier: "Low",
    jobMarketStrength: "Excellent",
    scholarshipAvailability: "High",
    prPathwayDifficulty: "Hard",
    studentFriendliness: "Medium",
    capital: "Washington, DC",
    population: "335 Million",
    officialLanguages: "English",
    academicIntake: "Jan / Aug",
    popularCities: ["Boston", "San Jose", "Austin", "New York"],
    officialVisaUrl: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
    imageTone: "from-[#1d4ed8] via-white to-[#dc2626]",
    highlights: ["Top-ranked universities", "Strong tech salaries", "STEM OPT pathway"],
    considerations: ["High cost and competitive admissions", "Visa and long-term immigration path can be uncertain"],
    insight: "The United States offers the strongest tech-market upside, but it needs scholarship or high budget planning."
  }
};

export function buildCountryDecisionDashboard(
  countries: Country[],
  profile: CountryProfile,
  programs: ProgramWithUniversity[],
  scholarships: ScholarshipWithCountry[],
  priorityWeights = defaultWeights
) {
  return countries.map((country) => buildCountryDecision(country, profile, programs, scholarships, priorityWeights));
}

export function buildCountryDecision(
  country: Country,
  profile: CountryProfile,
  programs: ProgramWithUniversity[],
  scholarships: ScholarshipWithCountry[],
  priorityWeights = defaultWeights
): CountryDecisionResult {
  const meta = getCountryMeta(country);
  const countryPrograms = programs.filter((program) => normalize(program.university.country.name) === normalize(country.name));
  const countryScholarships = scholarships.filter((scholarship) => scholarship.country && normalize(scholarship.country.name) === normalize(country.name));
  const tuitionMin = countryPrograms.length ? Math.min(...countryPrograms.map((program) => program.tuitionUsd)) : meta.tuitionMinUsd;
  const tuitionMax = countryPrograms.length ? Math.max(...countryPrograms.map((program) => program.tuitionUsd)) : meta.tuitionMaxUsd;
  const averageTuition = (tuitionMin + tuitionMax) / 2;
  const annualLivingCost = country.averageLivingCostUsd * 12;
  const estimatedAnnualCost = Math.round(averageTuition + annualLivingCost + meta.insuranceCostUsd + meta.visaFeeUsd);
  const budgetUsd = profile?.budgetUsd ?? 0;
  const budgetFit = budgetUsd >= estimatedAnnualCost
    ? "Comfortable"
    : budgetUsd >= estimatedAnnualCost * 0.72
      ? "Stretch"
      : "Tight";
  const preferred = profile?.preferredCountries.some((name) => normalize(name) === normalize(country.name)) ?? false;

  const breakdown = {
    affordability: scoreAffordability(estimatedAnnualCost, budgetUsd),
    jobMarket: scoreJobMarket(meta.jobMarketStrength, profile?.careerGoal, profile?.fieldOfStudy),
    visaFriendliness: scoreVisa(country.visaDifficulty, meta.prPathwayDifficulty),
    scholarships: scoreScholarships(meta.scholarshipAvailability, countryScholarships.length, Boolean(profile?.needsScholarship)),
    postStudyWork: scorePostStudy(country.postStudyWorkVisaMonths),
    language: scoreLanguage(meta.languageBarrier, country.languageRequirement),
    preference: preferred ? 5 : 0
  };

  const rawScore = applyPriorityWeights(breakdown, priorityWeights);
  const decisionScore = Math.max(45, Math.min(96, Math.round(rawScore)));

  return {
    ...country,
    decision: {
      decisionScore,
      annualLivingCostUsd: annualLivingCost,
      estimatedAnnualCostUsd: estimatedAnnualCost,
      budgetFit,
      preferred,
      summary: `${budgetFit} budget fit, ${country.postStudyWorkVisaMonths} month post-study work option, ${country.partTimeWorkHours} part-time work hours.`,
      recommendation: buildRecommendation(country.name, budgetFit, meta),
      breakdown
    },
    meta: {
      ...meta,
      tuitionMinUsd: tuitionMin,
      tuitionMaxUsd: tuitionMax
    },
    universityCount: countryPrograms.length,
    scholarshipCount: countryScholarships.length,
    topUniversities: countryPrograms
      .map((program) => program.university)
      .filter((university, index, universities) => universities.findIndex((item) => item.id === university.id) === index)
      .slice(0, 4)
      .map((university) => ({
        id: university.id,
        name: university.name,
        city: university.city,
        rankingBand: university.rankingBand
      })),
    matchingScholarships: countryScholarships.slice(0, 3).map((scholarship) => ({
      id: scholarship.id,
      name: scholarship.name,
      coverageType: scholarship.coverageType,
      amountUsd: scholarship.amountUsd
    }))
  };
}

function getCountryMeta(country: Country) {
  return countryMetaByName[normalize(country.name)] ?? {
    region: "Global",
    currency: "Local currency",
    tuitionMinUsd: Math.round(country.averageLivingCostUsd * 4),
    tuitionMaxUsd: Math.round(country.averageLivingCostUsd * 10),
    visaFeeUsd: 150,
    insuranceCostUsd: 500,
    proofOfFundsUsd: Math.round(country.averageLivingCostUsd * 10),
    languageBarrier: country.languageRequirement.toLowerCase().includes("english") ? "Low" : "Medium",
    jobMarketStrength: country.postStudyWorkVisaMonths >= 24 ? "Strong" : "Good",
    scholarshipAvailability: "Medium",
    prPathwayDifficulty: country.visaDifficulty === "High" ? "Hard" : "Moderate",
    studentFriendliness: country.safetyScore >= 8 ? "High" : "Medium",
    capital: "Capital city",
    population: "Varies",
    officialLanguages: country.languageRequirement,
    academicIntake: "Fall / Spring",
    popularCities: [],
    officialVisaUrl: "#",
    imageTone: "from-[#6d3df4] via-[#60a5fa] to-[#10b981]",
    highlights: ["Good study options", "International student pathways"],
    considerations: ["Verify official visa and cost requirements before applying"],
    insight: country.notes ?? "A practical study destination for international students."
  } satisfies CountryMeta;
}

function scoreAffordability(estimatedAnnualCost: number, budgetUsd: number) {
  if (!budgetUsd) {
    return 15;
  }

  if (estimatedAnnualCost <= budgetUsd) {
    return 25;
  }

  if (estimatedAnnualCost <= budgetUsd * 1.35) {
    return 18;
  }

  if (estimatedAnnualCost <= budgetUsd * 1.8) {
    return 12;
  }

  return 6;
}

function scoreJobMarket(strength: CountryMeta["jobMarketStrength"], careerGoal?: string | null, fieldOfStudy?: string | null) {
  const base = strength === "Excellent" ? 20 : strength === "Strong" ? 17 : strength === "Good" ? 14 : 11;
  const fieldBoost = [careerGoal, fieldOfStudy].some((value) => value && /(software|computer|data|ai|machine|engineer|it)/i.test(value)) ? 2 : 0;

  return Math.min(20, base + fieldBoost);
}

function scoreVisa(visaDifficulty: string, prDifficulty: CountryMeta["prPathwayDifficulty"]) {
  const visaScore = visaDifficulty.toLowerCase() === "low" ? 10 : visaDifficulty.toLowerCase() === "medium" ? 7 : 4;
  const prScore = prDifficulty === "Easy" ? 5 : prDifficulty === "Moderate" ? 3 : 1;

  return visaScore + prScore;
}

function scoreScholarships(availability: CountryMeta["scholarshipAvailability"], scholarshipCount: number, needsScholarship: boolean) {
  const base = availability === "High" ? 12 : availability === "Medium" ? 9 : 5;
  const countBoost = scholarshipCount >= 8 ? 3 : scholarshipCount >= 4 ? 2 : scholarshipCount >= 1 ? 1 : 0;
  const needPenalty = needsScholarship && availability === "Low" ? 2 : 0;

  return Math.max(0, Math.min(15, base + countBoost - needPenalty));
}

function scorePostStudy(months: number) {
  if (months >= 36) {
    return 10;
  }

  if (months >= 24) {
    return 8;
  }

  if (months >= 12) {
    return 6;
  }

  return 4;
}

function scoreLanguage(languageBarrier: CountryMeta["languageBarrier"], languageRequirement: string) {
  if (languageBarrier === "Low" || languageRequirement.toLowerCase() === "english") {
    return 10;
  }

  if (languageBarrier === "Medium" || languageRequirement.toLowerCase().includes("english")) {
    return 7;
  }

  return 4;
}

function applyPriorityWeights(
  breakdown: CountryDecisionResult["decision"]["breakdown"],
  priorityWeights: PriorityWeights
) {
  const weighted =
    (breakdown.affordability / 25) * priorityWeights.affordability
    + (breakdown.jobMarket / 20) * priorityWeights.jobMarket
    + (breakdown.scholarships / 15) * priorityWeights.scholarships
    + (breakdown.postStudyWork / 10) * priorityWeights.postStudyWork
    + (breakdown.visaFriendliness / 15) * priorityWeights.visaFriendliness
    + breakdown.language
    + breakdown.preference;

  return weighted;
}

function buildRecommendation(countryName: string, budgetFit: string, meta: CountryMeta) {
  if (budgetFit === "Comfortable" && meta.jobMarketStrength === "Excellent") {
    return `${countryName} is a strong career option with good affordability for your profile.`;
  }

  if (budgetFit === "Tight" && meta.scholarshipAvailability === "High") {
    return `${countryName} can work if you target scholarships early and manage total cost carefully.`;
  }

  if (meta.languageBarrier === "High") {
    return `${countryName} is budget-friendly, but language preparation matters for jobs and daily life.`;
  }

  return `${countryName} offers a balanced option across study cost, work rules, and student opportunities.`;
}

function normalize(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["uk", "u.k.", "england", "britain", "great britain"].includes(normalized)) {
    return "united kingdom";
  }

  if (["usa", "u.s.a.", "us", "u.s.", "america"].includes(normalized)) {
    return "united states";
  }

  return normalized;
}
