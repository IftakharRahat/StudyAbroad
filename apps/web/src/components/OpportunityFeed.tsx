import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  Globe2,
  Landmark,
  RefreshCw,
  Sparkles,
  UserRound,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOpportunityFeed, type OpportunityFeedItem, type OpportunityFeedItemType } from "../api/opportunityFeed";
import { useAuth } from "../state/AuthContext";

// ─── Icon & colour config per type ──────────────────────────────────────────

type TypeConfig = {
  icon: React.FC<{ className?: string }>;
  label: string;
  bg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
};

const typeConfig: Record<OpportunityFeedItemType, TypeConfig> = {
  NEW_SCHOLARSHIP: {
    icon: Landmark,
    label: "Scholarship",
    bg: "bg-[#f0fdf4]",
    iconColor: "text-[#16a34a]",
    badgeBg: "bg-[#dcfce7]",
    badgeText: "text-[#15803d]"
  },
  UPCOMING_DEADLINE: {
    icon: CalendarClock,
    label: "Deadline",
    bg: "bg-[#fff7ed]",
    iconColor: "text-[#ea580c]",
    badgeBg: "bg-[#ffedd5]",
    badgeText: "text-[#c2410c]"
  },
  MATCHING_UNIVERSITY: {
    icon: Building2,
    label: "University",
    bg: "bg-[#f0f4ff]",
    iconColor: "text-[#4f46e5]",
    badgeBg: "bg-[#e0e7ff]",
    badgeText: "text-[#4338ca]"
  },
  VISA_UPDATE: {
    icon: Globe2,
    label: "Visa",
    bg: "bg-[#f0fdfa]",
    iconColor: "text-[#0d9488]",
    badgeBg: "bg-[#ccfbf1]",
    badgeText: "text-[#0f766e]"
  },
  REQUIREMENT_CHANGE: {
    icon: AlertTriangle,
    label: "Requirement Change",
    bg: "bg-[#fefce8]",
    iconColor: "text-[#ca8a04]",
    badgeBg: "bg-[#fef9c3]",
    badgeText: "text-[#a16207]"
  },
  COUNTRY_INSIGHT: {
    icon: Globe2,
    label: "Country Insight",
    bg: "bg-[#fdf4ff]",
    iconColor: "text-[#9333ea]",
    badgeBg: "bg-[#f3e8ff]",
    badgeText: "text-[#7e22ce]"
  },
  PROFILE_NUDGE: {
    icon: UserRound,
    label: "Profile",
    bg: "bg-[#f8faff]",
    iconColor: "text-[#6d3df4]",
    badgeBg: "bg-[#ede9fe]",
    badgeText: "text-[#5b21b6]"
  },
  READINESS_ALERT: {
    icon: Zap,
    label: "Readiness",
    bg: "bg-[#fff1f2]",
    iconColor: "text-[#e11d48]",
    badgeBg: "bg-[#ffe4e6]",
    badgeText: "text-[#be123c]"
  }
};

const priorityConfig = {
  HIGH: { dot: "bg-[#ef4444]", label: "High", text: "text-[#ef4444]" },
  MEDIUM: { dot: "bg-[#f59e0b]", label: "Medium", text: "text-[#f59e0b]" },
  LOW: { dot: "bg-[#6b7280]", label: "Low", text: "text-[#6b7280]" }
};

// ─── Feed card ───────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: OpportunityFeedItem }) {
  const cfg = typeConfig[item.type];
  const pri = priorityConfig[item.priority];
  const Icon = cfg.icon;

  return (
    <div className="group flex gap-4 rounded-xl border border-stone-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-[#c7b8ff] hover:shadow-md">
      {/* Icon */}
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
        <Icon className={`h-5 w-5 ${cfg.iconColor}`} aria-hidden="true" />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {/* Type badge */}
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
            {cfg.label}
          </span>
          {/* Priority dot */}
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${pri.dot}`} />
            <span className={`text-[11px] font-medium ${pri.text}`}>{pri.label}</span>
          </span>
          {/* Time */}
          <span className="ml-auto text-[11px] text-slate-400">
            {formatTimeAgo(item.createdAt)}
          </span>
        </div>

        <p className="text-sm font-semibold leading-5 text-[#1a2236]">{item.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{item.body}</p>

        {item.actionLabel && item.actionHref && (
          <Link
            to={item.actionHref}
            className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6d3df4] transition-colors hover:text-[#5f3bd7]"
          >
            {item.actionLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function FeedEmpty({ hasProfile }: { hasProfile: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3efff]">
        <BookOpen className="h-6 w-6 text-[#6d3df4]" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[#1a2236]">
        {hasProfile ? "You're all caught up!" : "No opportunities yet"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {hasProfile
          ? "We'll surface personalised updates as new scholarships, matches, and deadlines appear."
          : "Complete your profile to start seeing personalised scholarships, university matches, and deadlines."}
      </p>
      {!hasProfile && (
        <Link
          to="/profile"
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#6d3df4] px-4 text-sm font-semibold text-white hover:bg-[#5f3bd7]"
        >
          <UserRound className="h-4 w-4" aria-hidden="true" />
          Complete Profile
        </Link>
      )}
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading opportunity feed">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 rounded-xl border border-stone-100 bg-white p-4">
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-stone-100" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-20 rounded-md bg-stone-100" />
              <div className="h-4 w-14 rounded-md bg-stone-100" />
            </div>
            <div className="h-4 w-3/4 rounded bg-stone-100" />
            <div className="h-3 w-full rounded bg-stone-50" />
            <div className="h-3 w-4/5 rounded bg-stone-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type FilterKey = "ALL" | "HIGH" | OpportunityFeedItemType;

const filterTabs: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "HIGH", label: "🔴 Urgent" },
  { key: "NEW_SCHOLARSHIP", label: "Scholarships" },
  { key: "UPCOMING_DEADLINE", label: "Deadlines" },
  { key: "MATCHING_UNIVERSITY", label: "Universities" },
  { key: "COUNTRY_INSIGHT", label: "Countries" }
];

// ─── Main component ───────────────────────────────────────────────────────────

export function OpportunityFeed() {
  const { token } = useAuth();
  const [data, setData] = useState<{ items: OpportunityFeedItem[]; hasProfile: boolean; profileComplete: boolean; totalCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = await fetchOpportunityFeed(token);
      setData(result);
    } catch {
      setError("Could not load your opportunity feed. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  // Filter items
  const filteredItems = data?.items.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "HIGH") return item.priority === "HIGH";
    return item.type === activeFilter;
  }) ?? [];

  const highCount = data?.items.filter((i) => i.priority === "HIGH").length ?? 0;

  return (
    <section aria-labelledby="feed-heading" className="mt-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3efff]">
            <Sparkles className="h-4 w-4 text-[#6d3df4]" aria-hidden="true" />
          </div>
          <div>
            <h2 id="feed-heading" className="text-lg font-semibold text-[#1a2236]">
              Personalised Opportunity Feed
            </h2>
          </div>
          {highCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[11px] font-bold text-white">
              {highCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#c7b8ff] hover:text-[#6d3df4] disabled:opacity-50"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      {!loading && !error && data && data.items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter opportunities">
          {filterTabs.map((tab) => {
            const count = tab.key === "ALL"
              ? data.items.length
              : tab.key === "HIGH"
                ? data.items.filter((i) => i.priority === "HIGH").length
                : data.items.filter((i) => i.type === tab.key).length;

            if (count === 0 && tab.key !== "ALL") return null;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  activeFilter === tab.key
                    ? "border-[#6d3df4] bg-[#6d3df4] text-white"
                    : "border-stone-200 bg-white text-slate-600 hover:border-[#c7b8ff] hover:text-[#6d3df4]"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeFilter === tab.key ? "bg-white/20 text-white" : "bg-stone-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <Bell className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
          <button
            type="button"
            onClick={() => load()}
            className="ml-auto font-semibold underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <FeedEmpty hasProfile={data?.hasProfile ?? false} />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && !error && data && data.items.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Showing {filteredItems.length} of {data.totalCount} personalised update{data.totalCount !== 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
