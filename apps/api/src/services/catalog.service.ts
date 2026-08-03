import { prisma } from "../lib/prisma.js";

const catalogTtlMs = 5 * 60_000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

let countriesCache: CacheEntry<Awaited<ReturnType<typeof loadCountries>>> | null = null;
let universitiesCache: CacheEntry<Awaited<ReturnType<typeof loadUniversities>>> | null = null;
let programsCache: CacheEntry<Awaited<ReturnType<typeof loadPrograms>>> | null = null;
let scholarshipsCache: CacheEntry<Awaited<ReturnType<typeof loadApprovedScholarships>>> | null = null;
let scholarshipSummariesCache: CacheEntry<Awaited<ReturnType<typeof loadApprovedScholarshipSummaries>>> | null = null;

export async function getCountriesCatalog() {
  countriesCache = await getCached(countriesCache, loadCountries);

  return countriesCache.data;
}

export async function getUniversitiesCatalog() {
  universitiesCache = await getCached(universitiesCache, loadUniversities);

  return universitiesCache.data;
}

export async function getProgramsCatalog() {
  programsCache = await getCached(programsCache, loadPrograms);

  return programsCache.data;
}

export async function getApprovedScholarshipsCatalog() {
  scholarshipsCache = await getCached(scholarshipsCache, loadApprovedScholarships);

  return scholarshipsCache.data;
}

export async function getApprovedScholarshipSummariesCatalog() {
  scholarshipSummariesCache = await getCached(scholarshipSummariesCache, loadApprovedScholarshipSummaries);

  return scholarshipSummariesCache.data;
}

async function getCached<T>(entry: CacheEntry<T> | null, loader: () => Promise<T>) {
  if (entry && entry.expiresAt > Date.now()) {
    return entry;
  }

  return {
    expiresAt: Date.now() + catalogTtlMs,
    data: await loader()
  };
}

function loadCountries() {
  return prisma.country.findMany({
    orderBy: {
      name: "asc"
    }
  });
}

function loadUniversities() {
  return prisma.university.findMany({
    include: {
      country: true
    },
    orderBy: {
      name: "asc"
    }
  });
}

function loadPrograms() {
  return prisma.program.findMany({
    include: {
      university: {
        include: {
          country: true
        }
      }
    },
    orderBy: {
      title: "asc"
    }
  });
}

function loadApprovedScholarships() {
  return prisma.scholarship.findMany({
    where: {
      status: "APPROVED"
    },
    include: {
      country: true,
      university: true,
      program: true,
      eligibilityRule: true
    },
    orderBy: {
      deadline: "asc"
    }
  });
}

function loadApprovedScholarshipSummaries() {
  return prisma.scholarship.findMany({
    where: {
      status: "APPROVED"
    },
    select: {
      id: true,
      name: true,
      degreeLevel: true,
      amountUsd: true,
      coverageType: true,
      deadline: true,
      sourceUrl: true,
      eligibleFields: true,
      eligibleNationalities: true,
      requiredDocuments: true,
      researchRequired: true,
      minCgpa: true,
      minIelts: true,
      status: true,
      country: true,
      university: true,
      program: true
    },
    orderBy: {
      deadline: "asc"
    }
  });
}
