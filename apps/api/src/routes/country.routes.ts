import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getApprovedScholarshipsCatalog,
  getCountriesCatalog,
  getProgramsCatalog
} from "../services/catalog.service.js";
import {
  buildCountryDecision,
  buildCountryDecisionDashboard
} from "../services/country-decision.service.js";

export const countryRouter = Router();

countryRouter.use(requireAuth, requireRole(["STUDENT"]));

const compareSchema = z.object({
  countryIds: z.array(z.string()).min(2).max(4),
  priorities: z.object({
    affordability: z.number().min(0).max(100).optional(),
    jobMarket: z.number().min(0).max(100).optional(),
    scholarships: z.number().min(0).max(100).optional(),
    postStudyWork: z.number().min(0).max(100).optional(),
    visaFriendliness: z.number().min(0).max(100).optional()
  }).optional()
});

const saveCountrySchema = z.object({
  countryId: z.string()
});

countryRouter.get("/", async (req, res) => {
  const context = await getCountryDecisionContext(req.user!.id);

  return res.json({
    profile: context.profile,
    countries: buildCountryDecisionDashboard(
      context.countries,
      context.profile,
      context.programs,
      context.scholarships
    )
  });
});

countryRouter.get("/dashboard", async (req, res) => {
  const context = await getCountryDecisionContext(req.user!.id);
  const countries = buildCountryDecisionDashboard(
    context.countries,
    context.profile,
    context.programs,
    context.scholarships
  );

  return res.json({
    profile: context.profile,
    stats: {
      countriesAvailable: context.countries.length,
      universitiesWorldwide: context.programs
        .map((program) => program.universityId)
        .filter((id, index, ids) => ids.indexOf(id) === index).length,
      scholarshipsAvailable: context.scholarships.length,
      studentsGuided: 2000000,
      dataFreshness: "Monthly"
    },
    selectedCountryIds: countries
      .filter((country) => country.decision.preferred)
      .slice(0, 4)
      .map((country) => country.id),
    countries
  });
});

countryRouter.get("/compare", async (req, res) => {
  const ids = typeof req.query.ids === "string"
    ? req.query.ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 4)
    : [];

  const context = await getCountryDecisionContext(req.user!.id);
  const countriesToCompare = ids.length
    ? context.countries.filter((country) => ids.includes(country.id))
    : context.countries.slice(0, 4);

  return res.json(buildComparisonPayload(context, countriesToCompare));
});

countryRouter.post("/compare", async (req, res) => {
  const parsed = compareSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Select between 2 and 4 countries to compare"
    });
  }

  const context = await getCountryDecisionContext(req.user!.id);
  const countriesToCompare = context.countries.filter((country) => parsed.data.countryIds.includes(country.id));

  if (countriesToCompare.length < 2) {
    return res.status(400).json({
      message: "At least two valid countries are required"
    });
  }

  return res.json(buildComparisonPayload(context, countriesToCompare, parsed.data.priorities));
});

countryRouter.post("/save", async (req, res) => {
  const parsed = saveCountrySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "A valid country is required"
    });
  }

  const [country, profile] = await Promise.all([
    prisma.country.findUnique({
      where: {
        id: parsed.data.countryId
      }
    }),
    prisma.studentProfile.findUnique({
      where: {
        userId: req.user!.id
      }
    })
  ]);

  if (!country) {
    return res.status(404).json({
      message: "Country not found"
    });
  }

  if (!profile) {
    return res.status(400).json({
      message: "Complete your profile before saving a preferred country"
    });
  }

  const preferredCountries = [
    country.name,
    ...profile.preferredCountries.filter((name) => normalizeCountryName(name) !== normalizeCountryName(country.name))
  ].slice(0, 4);

  const updatedProfile = await prisma.studentProfile.update({
    where: {
      userId: req.user!.id
    },
    data: {
      preferredCountries
    }
  });

  return res.json({
    country,
    preferredCountries,
    profile: updatedProfile
  });
});

countryRouter.get("/:id", async (req, res) => {
  const context = await getCountryDecisionContext(req.user!.id);
  const country = context.countries.find((item) => item.id === req.params.id);

  if (!country) {
    return res.status(404).json({
      message: "Country not found"
    });
  }

  return res.json({
    profile: context.profile,
    country: buildCountryDecision(
      country,
      context.profile,
      context.programs,
      context.scholarships
    )
  });
});

async function getCountryDecisionContext(userId: string) {
  const [profile, countries, programs, scholarships] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: {
        userId
      }
    }),
    getCountriesCatalog(),
    getProgramsCatalog(),
    getApprovedScholarshipsCatalog()
  ]);

  return {
    profile,
    countries,
    programs,
    scholarships
  };
}

function buildComparisonPayload(
  context: Awaited<ReturnType<typeof getCountryDecisionContext>>,
  countriesToCompare: typeof context.countries,
  priorities?: {
    affordability?: number;
    jobMarket?: number;
    scholarships?: number;
    postStudyWork?: number;
    visaFriendliness?: number;
  }
) {
  const countries = buildCountryDecisionDashboard(
    countriesToCompare,
    context.profile,
    context.programs,
    context.scholarships,
    priorities
      ? {
        affordability: priorities.affordability ?? 30,
        jobMarket: priorities.jobMarket ?? 25,
        scholarships: priorities.scholarships ?? 20,
        postStudyWork: priorities.postStudyWork ?? 15,
        visaFriendliness: priorities.visaFriendliness ?? 10
      }
      : undefined
  ).sort((left, right) => right.decision.decisionScore - left.decision.decisionScore);

  const bestCountry = countries[0];

  return {
    profile: context.profile,
    countries,
    ranking: countries.map((country, index) => ({
      rank: index + 1,
      id: country.id,
      name: country.name,
      score: country.decision.decisionScore,
      region: country.meta.region
    })),
    recommendations: bestCountry
      ? {
        bestOverall: bestCountry.name,
        bestBudget: [...countries].sort((left, right) => left.decision.estimatedAnnualCostUsd - right.decision.estimatedAnnualCostUsd)[0]?.name,
        bestCareer: [...countries].sort((left, right) => right.decision.breakdown.jobMarket - left.decision.breakdown.jobMarket)[0]?.name,
        bestScholarships: [...countries].sort((left, right) => right.decision.breakdown.scholarships - left.decision.breakdown.scholarships)[0]?.name
      }
      : null
  };
}

function normalizeCountryName(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["uk", "u.k.", "england", "britain", "great britain"].includes(normalized)) {
    return "united kingdom";
  }

  if (["usa", "u.s.a.", "us", "u.s.", "america"].includes(normalized)) {
    return "united states";
  }

  return normalized;
}
