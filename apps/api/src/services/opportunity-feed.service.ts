import { prisma } from "../lib/prisma.js";
import { getCountriesCatalog } from "./catalog.service.js";
import { buildCountryDecisionDashboard } from "./country-decision.service.js";

export type OpportunityFeedItemType =
  | "NEW_SCHOLARSHIP"
  | "UPCOMING_DEADLINE"
  | "MATCHING_UNIVERSITY"
  | "VISA_UPDATE"
  | "REQUIREMENT_CHANGE"
  | "COUNTRY_INSIGHT"
  | "PROFILE_NUDGE"
  | "READINESS_ALERT";

export type OpportunityFeedItemPriority = "HIGH" | "MEDIUM" | "LOW";

export type OpportunityFeedItem = {
  id: string;
  type: OpportunityFeedItemType;
  priority: OpportunityFeedItemPriority;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  actionLabel?: string;
  actionHref?: string;
  createdAt: string;
};

export type OpportunityFeedResponse = {
  items: OpportunityFeedItem[];
  totalCount: number;
  hasProfile: boolean;
  profileComplete: boolean;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function deadlinePriority(days: number): OpportunityFeedItemPriority {
  if (days <= 7) return "HIGH";
  if (days <= 30) return "MEDIUM";
  return "LOW";
}

function uid(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

// ─── main function ────────────────────────────────────────────────────────────

export async function getOpportunityFeedForUser(userId: string): Promise<OpportunityFeedResponse> {
  const items: OpportunityFeedItem[] = [];

  // 1. Load student profile
  const profile = await prisma.studentProfile.findUnique({
    where: { userId }
  });

  const profileComplete = Boolean(
    profile &&
    profile.nationality &&
    profile.fieldOfStudy &&
    profile.targetDegree &&
    profile.cgpa &&
    profile.budgetUsd
  );

  // 2. Profile nudge — if incomplete
  if (!profile || !profileComplete) {
    items.push({
      id: uid("nudge", "profile"),
      type: "PROFILE_NUDGE",
      priority: "HIGH",
      title: "Complete your student profile",
      body: "A complete profile unlocks personalised scholarship matches, university recommendations, and country insights tailored to you.",
      actionLabel: "Go to Profile",
      actionHref: "/profile",
      createdAt: new Date().toISOString()
    });
  }

  // 3. Upcoming scholarship deadlines (tracked)
  const trackedDeadlines = await prisma.scholarshipDeadline.findMany({
    where: {
      userId,
      deadline: { gte: new Date() }
    },
    include: {
      scholarship: {
        include: { country: true }
      }
    },
    orderBy: { deadline: "asc" },
    take: 5
  });

  for (const td of trackedDeadlines) {
    const days = daysUntil(new Date(td.deadline));
    items.push({
      id: uid("deadline", td.id),
      type: "UPCOMING_DEADLINE",
      priority: deadlinePriority(days),
      title: `Deadline in ${days} day${days === 1 ? "" : "s"}: ${td.scholarship.name}`,
      body: days <= 7
        ? `Only ${days} day${days === 1 ? "" : "s"} left to submit your application for ${td.scholarship.name}.`
        : `Your tracked deadline for "${td.scholarship.name}" is coming up on ${new Date(td.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
      meta: {
        scholarshipId: td.scholarshipId,
        deadline: td.deadline,
        country: td.scholarship.country?.name
      },
      actionLabel: "View Scholarship",
      actionHref: `/scholarships/${td.scholarshipId}`,
      createdAt: td.createdAt.toISOString()
    });
  }

  // 4. Scholarship matches — top eligible ones not yet saved
  if (profile) {
    const savedIds = (await prisma.studentSavedScholarship.findMany({
      where: { userId },
      select: { scholarshipId: true }
    })).map((s: { scholarshipId: string }) => s.scholarshipId);

    const scholarshipMatches = await prisma.scholarshipMatch.findMany({
      where: {
        studentProfile: { userId },
        status: { in: ["ELIGIBLE", "ALMOST_ELIGIBLE"] },
        scholarshipId: { notIn: savedIds }
      },
      include: {
        scholarship: {
          include: { country: true }
        }
      },
      orderBy: { matchingPercentage: "desc" },
      take: 4
    });

    for (const m of scholarshipMatches) {
      const s = m.scholarship;
      const deadlineText = s.deadline
        ? ` — closes ${new Date(s.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
        : "";

      items.push({
        id: uid("scholarship", m.id),
        type: "NEW_SCHOLARSHIP",
        priority: m.status === "ELIGIBLE" ? "HIGH" : "MEDIUM",
        title: `${m.matchingPercentage}% match: ${s.name}`,
        body: `You are ${m.status === "ELIGIBLE" ? "eligible" : "almost eligible"} for "${s.name}"${s.country ? ` in ${s.country.name}` : ""}${deadlineText}. Coverage: ${s.coverageType}.`,
        meta: {
          scholarshipId: s.id,
          matchingPercentage: m.matchingPercentage,
          coverageType: s.coverageType,
          amountUsd: s.amountUsd,
          country: s.country?.name
        },
        actionLabel: "View Details",
        actionHref: `/scholarships/${s.id}`,
        createdAt: m.createdAt.toISOString()
      });
    }
  }

  // 5. University matches — top ones
  if (profile) {
    const universityMatches = await prisma.universityMatch.findMany({
      where: {
        studentProfile: { userId }
      },
      include: {
        program: {
          include: {
            university: {
              include: { country: true }
            }
          }
        }
      },
      orderBy: { score: "desc" },
      take: 3
    });

    for (const m of universityMatches) {
      const p = m.program;
      const u = p.university;
      items.push({
        id: uid("university", m.id),
        type: "MATCHING_UNIVERSITY",
        priority: "MEDIUM",
        title: `${m.category} pick: ${u.name}`,
        body: `${u.name} (${u.country.name}) — ${p.title} · ${p.degreeLevel} · Tuition: $${p.tuitionUsd.toLocaleString()}/yr. Match score: ${Math.round(m.score)}.`,
        meta: {
          programId: p.id,
          universityId: u.id,
          category: m.category,
          score: m.score,
          country: u.country.name
        },
        actionLabel: "Explore Match",
        actionHref: "/matches",
        createdAt: m.createdAt.toISOString()
      });
    }
  }

  // 6. Monitor alerts — unread ones
  const monitorAlerts = await prisma.monitorAlert.findMany({
    where: {
      userId,
      status: "UNREAD"
    },
    include: {
      program: {
        include: {
          university: { include: { country: true } }
        }
      },
      scholarship: true
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 4
  });

  for (const alert of monitorAlerts) {
    const isRequirementChange = alert.type === "REQUIREMENT_CHANGE";
    items.push({
      id: uid("monitor", alert.id),
      type: isRequirementChange ? "REQUIREMENT_CHANGE" : "UPCOMING_DEADLINE",
      priority: alert.severity === "CRITICAL" ? "HIGH" : alert.severity === "WARNING" ? "MEDIUM" : "LOW",
      title: alert.title,
      body: alert.message,
      meta: {
        alertId: alert.id,
        severity: alert.severity,
        entityType: alert.entityType,
        programId: alert.programId,
        scholarshipId: alert.scholarshipId,
        field: alert.field,
        previousValue: alert.previousValue,
        currentValue: alert.currentValue,
        dueDate: alert.dueDate
      },
      actionLabel: alert.scholarshipId
        ? "View Scholarship"
        : alert.programId
          ? "View Matches"
          : "View Deadlines",
      actionHref: alert.scholarshipId
        ? `/scholarships/${alert.scholarshipId}`
        : alert.programId
          ? "/matches"
          : "/deadlines",
      createdAt: alert.createdAt.toISOString()
    });
  }

  // 7. Country insights — for preferred countries in profile
  if (profile && profile.preferredCountries && profile.preferredCountries.length > 0) {
    try {
      const allCountries = await getCountriesCatalog();
      const programs = await prisma.program.findMany({
        include: { university: { include: { country: true } } }
      });
      const scholarships = await prisma.scholarship.findMany({
        where: { status: "APPROVED" },
        include: { country: true, university: true }
      });

      const countryDecisions = buildCountryDecisionDashboard(allCountries, profile, programs, scholarships);

      const preferredCountryNames = profile.preferredCountries.map((c: string) => c.toLowerCase());
      const preferredDecisions = countryDecisions
        .filter((c) => preferredCountryNames.some((n: string) => c.name.toLowerCase().includes(n)))
        .slice(0, 2);

      for (const c of preferredDecisions) {
        const decision = (c as { decision?: { decisionScore?: number; budgetFit?: string; recommendation?: string } }).decision;
        const score = decision?.decisionScore ?? 0;
        const fit = decision?.budgetFit ?? "Unknown";

        items.push({
          id: uid("country", c.id),
          type: "COUNTRY_INSIGHT",
          priority: score >= 75 ? "HIGH" : "MEDIUM",
          title: `${c.name} — ${fit} budget fit`,
          body: decision?.recommendation ?? `${c.name} is one of your preferred destinations. Visa difficulty: ${c.visaDifficulty}. Living cost: ~$${c.averageLivingCostUsd.toLocaleString()}/yr.`,
          meta: {
            countryId: c.id,
            decisionScore: score,
            budgetFit: fit,
            visaDifficulty: c.visaDifficulty
          },
          actionLabel: "View Country",
          actionHref: "/countries",
          createdAt: new Date().toISOString()
        });
      }

      // Visa insights for top-scored country student hasn't selected
      const topUnselected = countryDecisions
        .filter((c) => !preferredCountryNames.some((n: string) => c.name.toLowerCase().includes(n)))
        .slice(0, 1);

      for (const c of topUnselected) {
        items.push({
          id: uid("visa", c.id),
          type: "VISA_UPDATE",
          priority: "LOW",
          title: `${c.name} — highly rated for your profile`,
          body: `Based on your profile, ${c.name} ranks well for your field and budget. Post-study work: ${c.postStudyWorkVisaMonths} months. Part-time hours: ${c.partTimeWorkHours}/week.`,
          meta: {
            countryId: c.id,
            postStudyWorkVisaMonths: c.postStudyWorkVisaMonths,
            partTimeWorkHours: c.partTimeWorkHours
          },
          actionLabel: "Explore Country",
          actionHref: "/countries",
          createdAt: new Date().toISOString()
        });
      }
    } catch {
      // Country insight generation is non-critical; skip on error
    }
  }

  // 8. Readiness alert — if low score exists
  if (profile) {
    const readinessScores = await prisma.readinessScore.findMany({
      where: { studentProfile: { userId } },
      orderBy: { createdAt: "desc" }
    });

    if (readinessScores.length > 0) {
      const overallScore = readinessScores.reduce((sum, s) => sum + s.score, 0) / readinessScores.length;

      if (overallScore < 60) {
        const weakest = [...readinessScores].sort((a, b) => a.score - b.score)[0];
        const recs = Array.isArray(weakest.recommendations) ? weakest.recommendations as string[] : [];
        const weaks = Array.isArray(weakest.weaknesses) ? weakest.weaknesses as string[] : [];
        items.push({
          id: uid("readiness", weakest.id),
          type: "READINESS_ALERT",
          priority: overallScore < 40 ? "HIGH" : "MEDIUM",
          title: `Readiness alert: ${weakest.tier} tier needs attention`,
          body: recs.length > 0
            ? `Your ${weakest.tier} readiness score is ${Math.round(weakest.score)}%. Recommendation: ${recs[0]}`
            : `Your overall readiness is ${Math.round(overallScore)}%. Visit your scorecard for improvement steps.`,
          meta: {
            tier: weakest.tier,
            score: weakest.score,
            overallScore,
            weaknesses: weaks
          },
          actionLabel: "View Scorecard",
          actionHref: "/readiness",
          createdAt: weakest.createdAt.toISOString()
        });
      }
    }
  }

  // Sort: HIGH priority first, then by date descending
  const priorityOrder: Record<OpportunityFeedItemPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  items.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    items,
    totalCount: items.length,
    hasProfile: Boolean(profile),
    profileComplete
  };
}
