import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Bookmark,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  UserRound,
  X,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { Country, ProfileResponse, Scholarship, ScholarshipDeadline, ScholarshipMatch, ScholarshipMatchesResponse } from "../types";

type ScholarshipView = "search" | "results";
type StatusFilter = "ALL" | "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_RECOMMENDED";
type FundingFilter = "ALL" | "FULL" | "PARTIAL";
type CoverageFilter = "ALL" | "FULL" | "PARTIAL" | "MAJOR";
type DeadlineFilter = "ALL" | "30" | "60" | "90";
type SortOption = "BEST_MATCH" | "DEADLINE" | "AMOUNT";

type ScholarshipBootstrapResponse = {
  profile: ProfileResponse["profile"];
  completeness: ProfileResponse["completeness"];
  countries: Country[];
  scholarshipMatches: ScholarshipMatch[];
  deadlines: ScholarshipDeadline[];
  scholarships: Scholarship[];
};

type MoreFilters = {
  fullyFunded: boolean;
  partiallyFunded: boolean;
  tuitionFeeWaiver: boolean;
  livingAllowance: boolean;
  researchOpportunities: boolean;
  internationalStudents: boolean;
  renewableScholarships: boolean;
  noApplicationFee: boolean;
};

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  {
    value: "ALL",
    label: "All"
  },
  {
    value: "ELIGIBLE",
    label: "Eligible"
  },
  {
    value: "ALMOST_ELIGIBLE",
    label: "Almost eligible"
  },
  {
    value: "NOT_RECOMMENDED",
    label: "Not recommended"
  }
];

const defaultMoreFilters: MoreFilters = {
  fullyFunded: true,
  partiallyFunded: false,
  tuitionFeeWaiver: false,
  livingAllowance: false,
  researchOpportunities: false,
  internationalStudents: true,
  renewableScholarships: false,
  noApplicationFee: false
};

export function ScholarshipsPage() {
  const { token } = useAuth();
  const [view, setView] = useState<ScholarshipView>("search");
  const [profile, setProfile] = useState<ProfileResponse["profile"]>(null);
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [catalogScholarships, setCatalogScholarships] = useState<Scholarship[]>([]);
  const [deadlines, setDeadlines] = useState<ScholarshipDeadline[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countryPick, setCountryPick] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [funding, setFunding] = useState<FundingFilter>("ALL");
  const [coverage, setCoverage] = useState<CoverageFilter>("ALL");
  const [scholarshipNeed, setScholarshipNeed] = useState("Need Based & Merit Based");
  const [deadlineWindow, setDeadlineWindow] = useState<DeadlineFilter>("ALL");
  const [minIelts, setMinIelts] = useState(0);
  const [minCgpa, setMinCgpa] = useState(0);
  const [moreFilters, setMoreFilters] = useState<MoreFilters>(defaultMoreFilters);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("BEST_MATCH");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [deadlineIds, setDeadlineIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const profileCompleteness = profile ? 90 : 0;

  const degreeOptions = useMemo(() => {
    const values = new Set([
      profile?.targetDegree,
      ...catalogScholarships.map((scholarship) => scholarship.degreeLevel)
    ].filter(Boolean) as string[]);

    return Array.from(values).sort();
  }, [catalogScholarships, profile]);

  const popularScholarships = useMemo(() => [...catalogScholarships]
    .sort((left, right) => (right.amountUsd ?? 0) - (left.amountUsd ?? 0))
    .slice(0, 3), [catalogScholarships]);

  const upcomingDeadlines = useMemo(() => {
    if (deadlines.length) {
      return deadlines.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        country: item.scholarship.country?.name ?? "Scholarship",
        deadline: item.deadline
      }));
    }

    return [...catalogScholarships]
      .filter((scholarship) => scholarship.deadline && new Date(scholarship.deadline).getTime() >= Date.now())
      .sort((left, right) => new Date(left.deadline ?? 0).getTime() - new Date(right.deadline ?? 0).getTime())
      .slice(0, 3)
      .map((scholarship) => ({
        id: scholarship.id,
        title: scholarship.name,
        country: scholarship.country?.name ?? "Scholarship",
        deadline: scholarship.deadline
      }));
  }, [catalogScholarships, deadlines]);

  const filteredMatches = useMemo(() => {
    const sorted = [...matches].filter((match) => {
      const scholarship = match.scholarship;
      const countryMatch = selectedCountries.length ? selectedCountries.some((country) => countryMatches(country, scholarship.country?.name ?? "")) : true;
      const degreeMatch = degreeLevel ? scholarship.degreeLevel === degreeLevel : true;
      const subjectMatch = subject
        ? scholarship.eligibleFields.some((field) => field.toLowerCase().includes(subject.toLowerCase()))
          || scholarship.name.toLowerCase().includes(subject.toLowerCase())
        : true;
      const fundingMatch = matchesFunding(scholarship.coverageType, funding);
      const coverageMatch = matchesCoverage(scholarship.coverageType, coverage);
      const deadlineMatch = matchesDeadlineWindow(scholarship.deadline, deadlineWindow);
      const ieltsMatch = minIelts ? (scholarship.minIelts ?? 0) <= minIelts : true;
      const cgpaMatch = minCgpa ? (scholarship.minCgpa ?? 0) <= minCgpa : true;
      const statusMatch = status === "ALL" ? true : match.status === status;
      const moreMatch = matchesMoreFilters(scholarship, moreFilters);

      return countryMatch && degreeMatch && subjectMatch && fundingMatch && coverageMatch && deadlineMatch && ieltsMatch && cgpaMatch && statusMatch && moreMatch;
    });

    if (sortBy === "DEADLINE") {
      sorted.sort((left, right) => new Date(left.scholarship.deadline ?? "2999-12-31").getTime() - new Date(right.scholarship.deadline ?? "2999-12-31").getTime());
    } else if (sortBy === "AMOUNT") {
      sorted.sort((left, right) => (right.scholarship.amountUsd ?? 0) - (left.scholarship.amountUsd ?? 0));
    } else {
      sorted.sort((left, right) => right.matchingPercentage - left.matchingPercentage);
    }

    return sorted;
  }, [coverage, deadlineWindow, degreeLevel, funding, matches, minCgpa, minIelts, moreFilters, selectedCountries, sortBy, status, subject]);

  const counts = useMemo(() => ({
    eligible: filteredMatches.filter((match) => match.status === "ELIGIBLE").length,
    almost: filteredMatches.filter((match) => match.status === "ALMOST_ELIGIBLE").length,
    notRecommended: filteredMatches.filter((match) => match.status === "NOT_RECOMMENDED").length,
    total: filteredMatches.length
  }), [filteredMatches]);

  async function loadInitialData() {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest<ScholarshipBootstrapResponse>("/scholarships/bootstrap", {
        token,
        cacheTtlMs: 45_000
      });

      setProfile(response.profile);
      setCountryOptions(response.countries.map((item) => item.name));
      setCatalogScholarships(response.scholarships);
      setMatches(response.scholarshipMatches);
      setDeadlines(response.deadlines);

      if (response.profile) {
        setSelectedCountries(response.profile.preferredCountries);
        setDegreeLevel(response.profile.targetDegree);
        setSubject(response.profile.fieldOfStudy);
        setMinIelts(response.profile.ieltsScore ?? 0);
        setMinCgpa(response.profile.cgpa ?? 0);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load scholarships");
    } finally {
      setLoading(false);
    }
  }

  async function generateMatches() {
    setGenerating(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest<ScholarshipMatchesResponse>("/scholarships/match", {
        method: "POST",
        token
      });
      setMatches(response.scholarshipMatches);
      setStatus("ALL");
      setView("results");
      setMessage("Scholarship matches generated");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate scholarship matches");
    } finally {
      setGenerating(false);
    }
  }

  async function saveScholarship(scholarshipId: string) {
    setSavingIds((current) => [...current, scholarshipId]);
    setMessage("");
    setError("");

    try {
      await apiRequest("/scholarships/save", {
        method: "POST",
        token,
        body: JSON.stringify({
          scholarshipId
        })
      });
      updateScholarshipFlags(scholarshipId, {
        isSaved: true,
        deadlineTracked: true
      });
      setMessage("Scholarship saved and deadline added to tracker");
      await refreshDeadlines();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save scholarship");
    } finally {
      setSavingIds((current) => current.filter((id) => id !== scholarshipId));
    }
  }

  async function addDeadline(scholarshipId: string) {
    setDeadlineIds((current) => [...current, scholarshipId]);
    setMessage("");
    setError("");

    try {
      await apiRequest(`/scholarships/${scholarshipId}/deadline`, {
        method: "POST",
        token
      });
      updateScholarshipFlags(scholarshipId, {
        deadlineTracked: true
      });
      setMessage("Deadline added to tracker");
      await refreshDeadlines();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not add deadline");
    } finally {
      setDeadlineIds((current) => current.filter((id) => id !== scholarshipId));
    }
  }

  async function refreshDeadlines() {
    if (!token) {
      return;
    }

    const response = await apiRequest<{ deadlines: ScholarshipDeadline[] }>("/scholarships/deadlines", {
      token
    });
    setDeadlines(response.deadlines);
  }

  function updateScholarshipFlags(scholarshipId: string, flags: { isSaved?: boolean; deadlineTracked?: boolean }) {
    setMatches((current) => current.map((match) => match.scholarshipId === scholarshipId
      ? {
        ...match,
        scholarship: {
          ...match.scholarship,
          ...flags
        }
      }
      : match));
  }

  function addSelectedCountry(value: string) {
    if (!value || selectedCountries.includes(value)) {
      setCountryPick("");
      return;
    }

    setSelectedCountries((current) => [...current, value]);
    setCountryPick("");
  }

  function resetFilters() {
    setSelectedCountries(profile?.preferredCountries ?? []);
    setDegreeLevel(profile?.targetDegree ?? "");
    setSubject(profile?.fieldOfStudy ?? "");
    setFunding("ALL");
    setCoverage("ALL");
    setScholarshipNeed("Need Based & Merit Based");
    setDeadlineWindow("ALL");
    setMinIelts(profile?.ieltsScore ?? 0);
    setMinCgpa(profile?.cgpa ?? 0);
    setMoreFilters(defaultMoreFilters);
    setStatus("ALL");
    setSortBy("BEST_MATCH");
  }

  if (loading) {
    return <div className="text-sm font-medium text-[#667085]">Loading scholarships</div>;
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      {message ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {error ? <ErrorNotice message={error} /> : null}

      {view === "search" ? (
        <SearchStep
          profile={profile}
          profileCompleteness={profileCompleteness}
          selectedCountries={selectedCountries}
          countryOptions={countryOptions}
          countryPick={countryPick}
          degreeLevel={degreeLevel}
          degreeOptions={degreeOptions}
          subject={subject}
          funding={funding}
          coverage={coverage}
          scholarshipNeed={scholarshipNeed}
          deadlineWindow={deadlineWindow}
          minIelts={minIelts}
          minCgpa={minCgpa}
          moreFilters={moreFilters}
          upcomingDeadlines={upcomingDeadlines}
          popularScholarships={popularScholarships}
          generating={generating}
          onCountryPick={addSelectedCountry}
          onCountryPickValue={setCountryPick}
          onRemoveCountry={(value) => setSelectedCountries((current) => current.filter((country) => country !== value))}
          onDegreeLevel={setDegreeLevel}
          onSubject={setSubject}
          onFunding={(value) => setFunding(value as FundingFilter)}
          onCoverage={(value) => setCoverage(value as CoverageFilter)}
          onScholarshipNeed={setScholarshipNeed}
          onDeadlineWindow={(value) => setDeadlineWindow(value as DeadlineFilter)}
          onMinIelts={setMinIelts}
          onMinCgpa={setMinCgpa}
          onMoreFilters={setMoreFilters}
          onReset={resetFilters}
          onGenerate={generateMatches}
        />
      ) : (
        <ResultsStep
          matches={filteredMatches}
          counts={counts}
          selectedCountries={selectedCountries}
          countryOptions={countryOptions}
          funding={funding}
          coverage={coverage}
          deadlineWindow={deadlineWindow}
          status={status}
          sortBy={sortBy}
          generating={generating}
          savingIds={savingIds}
          deadlineIds={deadlineIds}
          onBack={() => setView("search")}
          onSaveSearch={() => setMessage("Search preferences saved for this session")}
          onModify={() => setView("search")}
          onCountryChange={(value) => setSelectedCountries(value ? [value] : [])}
          onFunding={(value) => setFunding(value as FundingFilter)}
          onCoverage={(value) => setCoverage(value as CoverageFilter)}
          onDeadlineWindow={(value) => setDeadlineWindow(value as DeadlineFilter)}
          onStatus={setStatus}
          onSort={(value) => setSortBy(value as SortOption)}
          onClear={resetFilters}
          onGenerate={generateMatches}
          onSave={saveScholarship}
          onAddDeadline={addDeadline}
        />
      )}
    </div>
  );
}

function SearchStep({
  profile,
  profileCompleteness,
  selectedCountries,
  countryOptions,
  countryPick,
  degreeLevel,
  degreeOptions,
  subject,
  funding,
  coverage,
  scholarshipNeed,
  deadlineWindow,
  minIelts,
  minCgpa,
  moreFilters,
  upcomingDeadlines,
  popularScholarships,
  generating,
  onCountryPick,
  onCountryPickValue,
  onRemoveCountry,
  onDegreeLevel,
  onSubject,
  onFunding,
  onCoverage,
  onScholarshipNeed,
  onDeadlineWindow,
  onMinIelts,
  onMinCgpa,
  onMoreFilters,
  onReset,
  onGenerate
}: {
  profile: ProfileResponse["profile"];
  profileCompleteness: number;
  selectedCountries: string[];
  countryOptions: string[];
  countryPick: string;
  degreeLevel: string;
  degreeOptions: string[];
  subject: string;
  funding: FundingFilter;
  coverage: CoverageFilter;
  scholarshipNeed: string;
  deadlineWindow: DeadlineFilter;
  minIelts: number;
  minCgpa: number;
  moreFilters: MoreFilters;
  upcomingDeadlines: Array<{ id: string; title: string; country: string; deadline?: string | null }>;
  popularScholarships: Scholarship[];
  generating: boolean;
  onCountryPick: (value: string) => void;
  onCountryPickValue: (value: string) => void;
  onRemoveCountry: (value: string) => void;
  onDegreeLevel: (value: string) => void;
  onSubject: (value: string) => void;
  onFunding: (value: string) => void;
  onCoverage: (value: string) => void;
  onScholarshipNeed: (value: string) => void;
  onDeadlineWindow: (value: string) => void;
  onMinIelts: (value: number) => void;
  onMinCgpa: (value: number) => void;
  onMoreFilters: (value: MoreFilters) => void;
  onReset: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div>
        <header className="mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#151b2d]">Find Scholarships</h1>
            <span className="rounded-full bg-[#f0eaff] px-3 py-1 text-xs font-semibold text-[#6d3df4]">Step 1 of 3</span>
          </div>
          <p className="mt-2 text-sm text-[#667085]">We will find scholarships you are eligible for based on your profile</p>
        </header>

        <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#6d3df4]">
                <UserRound className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[#151b2d]">Your Profile Summary</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Complete ({profileCompleteness}%)</span>
              </div>
            </div>
            <Link to="/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6d3df4]">
              View / Edit Profile
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ProfileMetric icon={FlagIcon} label="Nationality" value={profile ? friendlyNationality(profile.nationality) : "Not set"} tone="red" />
            <ProfileMetric icon={GraduationCap} label="Degree Level" value={profile?.targetDegree ?? "Not set"} tone="purple" />
            <ProfileMetric icon={Monitor} label="Subject" value={profile?.fieldOfStudy ?? "Not set"} tone="blue" />
            <ProfileMetric icon={BarChart3} label="CGPA" value={profile ? `${profile.cgpa.toFixed(2)} / ${profile.cgpaScale.toFixed(2)}` : "Not set"} tone="green" />
            <ProfileMetric icon={BarChart3} label="IELTS Overall" value={profile?.ieltsScore ? profile.ieltsScore.toFixed(1) : "Not set"} tone="blue" />
          </div>
        </section>

        <section className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#6d3df4]">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h2 className="text-base font-semibold text-[#151b2d]">Find Scholarships That Match Your Profile</h2>
            </div>
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d3df4]">
              Clear All
              <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <FieldLabel label="Preferred Countries" />
              <div className="relative">
                <select value={countryPick} onChange={(event) => onCountryPick(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-[#dfe4ef] bg-white px-3 pr-9 text-sm text-[#344054] outline-none focus:border-[#6d3df4] focus:ring-2 focus:ring-[#6d3df4]/10">
                  <option value="">Select countries</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#8b92a7]" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="mt-2 flex min-h-7 flex-wrap gap-2">
                {selectedCountries.map((country) => (
                  <button key={country} type="button" onClick={() => onRemoveCountry(country)} className="inline-flex h-7 items-center gap-1 rounded-md bg-[#f0eaff] px-2.5 text-xs font-medium text-[#6d3df4]">
                    {country}
                    <X className="h-3 w-3" strokeWidth={1.9} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#8b92a7]">You can select multiple countries</p>
            </div>

            <SelectField label="Degree Level" value={degreeLevel} onChange={onDegreeLevel} options={degreeOptions} />
            <SelectField label="Subject / Field of Study" value={subject} onChange={onSubject} options={["Computer Science", "Data Science", "Artificial Intelligence", "Engineering", "Business"]} />
            <SelectField label="Funding Type" value={funding} onChange={onFunding} options={["ALL", "FULL", "PARTIAL"]} labels={{ ALL: "All Funding Types", FULL: "Fully Funded", PARTIAL: "Partial Funding" }} />
            <SelectField label="Coverage Type" value={coverage} onChange={onCoverage} options={["ALL", "FULL", "MAJOR", "PARTIAL"]} labels={{ ALL: "All Coverage Types", FULL: "Full Funding", MAJOR: "Major Funding", PARTIAL: "Partial Funding" }} />
            <SelectField label="Scholarship Need" value={scholarshipNeed} onChange={onScholarshipNeed} options={["Need Based & Merit Based", "Need Based", "Merit Based"]} />
            <SelectField label="Deadline" value={deadlineWindow} onChange={onDeadlineWindow} options={["ALL", "30", "60", "90"]} labels={{ ALL: "All Deadlines", "30": "Next 30 days", "60": "Next 60 days", "90": "Next 90 days" }} />
            <RangeField label="IELTS" value={minIelts} min={0} max={8} step={0.5} left="Any" right="8.0+" display={minIelts ? minIelts.toFixed(1) : "Any"} onChange={onMinIelts} />
            <RangeField label="CGPA" value={minCgpa} min={0} max={4} step={0.1} left="Any" right="4.0" display={minCgpa ? minCgpa.toFixed(1) : "Any"} onChange={onMinCgpa} />
          </div>

          <div className="mt-5 border-t border-[#edf0f6] pt-5">
            <p className="mb-3 text-sm font-semibold text-[#344054]">More Filters</p>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <CheckOption label="Fully Funded" checked={moreFilters.fullyFunded} onChange={(checked) => onMoreFilters({ ...moreFilters, fullyFunded: checked })} />
              <CheckOption label="Living Allowance" checked={moreFilters.livingAllowance} onChange={(checked) => onMoreFilters({ ...moreFilters, livingAllowance: checked })} />
              <CheckOption label="Renewable Scholarships" checked={moreFilters.renewableScholarships} onChange={(checked) => onMoreFilters({ ...moreFilters, renewableScholarships: checked })} />
              <CheckOption label="Partially Funded" checked={moreFilters.partiallyFunded} onChange={(checked) => onMoreFilters({ ...moreFilters, partiallyFunded: checked })} />
              <CheckOption label="Research Opportunities" checked={moreFilters.researchOpportunities} onChange={(checked) => onMoreFilters({ ...moreFilters, researchOpportunities: checked })} />
              <CheckOption label="No Application Fee" checked={moreFilters.noApplicationFee} onChange={(checked) => onMoreFilters({ ...moreFilters, noApplicationFee: checked })} />
              <CheckOption label="Tuition Fee Waiver" checked={moreFilters.tuitionFeeWaiver} onChange={(checked) => onMoreFilters({ ...moreFilters, tuitionFeeWaiver: checked })} />
              <CheckOption label="For International Students" checked={moreFilters.internationalStudents} onChange={(checked) => onMoreFilters({ ...moreFilters, internationalStudents: checked })} />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0f6] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={onReset} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] px-5 text-sm font-semibold text-[#344054] hover:bg-[#f8f8fb]">
              <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Reset Filters
            </button>
            <div className="text-right">
              <button type="button" onClick={onGenerate} disabled={generating} className="inline-flex h-11 min-w-[250px] items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#5f35d8] disabled:opacity-60">
                <span>{generating ? "Finding scholarships" : "Find My Eligible Scholarships"}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <p className="mt-2 text-xs text-[#667085]">We never share your information with anyone.</p>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <SidePanel tone="purple" title="Tips to get better results" icon={Lightbulb}>
          <TipList items={["Keep your profile updated", "Add your target countries", "Higher IELTS & CGPA increases matches", "Apply early for more opportunities"]} />
        </SidePanel>

        <SidePanel tone="amber" title="Upcoming Deadlines" icon={CalendarDays} action={<Link to="/deadlines">View All</Link>}>
          <div className="space-y-3">
            {upcomingDeadlines.map((item) => (
              <DeadlineMini key={item.id} item={item} />
            ))}
          </div>
        </SidePanel>

        <SidePanel tone="green" title="Popular Scholarships" icon={Award} action={<Link to="/scholarships">View All</Link>}>
          <div className="space-y-3">
            {popularScholarships.map((scholarship) => (
              <PopularMini key={scholarship.id} scholarship={scholarship} />
            ))}
          </div>
          <button type="button" onClick={onGenerate} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6d3df4]">
            Browse all scholarships
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </SidePanel>
      </aside>
    </div>
  );
}

function ResultsStep({
  matches,
  counts,
  selectedCountries,
  countryOptions,
  funding,
  coverage,
  deadlineWindow,
  status,
  sortBy,
  generating,
  savingIds,
  deadlineIds,
  onBack,
  onSaveSearch,
  onModify,
  onCountryChange,
  onFunding,
  onCoverage,
  onDeadlineWindow,
  onStatus,
  onSort,
  onClear,
  onGenerate,
  onSave,
  onAddDeadline
}: {
  matches: ScholarshipMatch[];
  counts: { eligible: number; almost: number; notRecommended: number; total: number };
  selectedCountries: string[];
  countryOptions: string[];
  funding: FundingFilter;
  coverage: CoverageFilter;
  deadlineWindow: DeadlineFilter;
  status: StatusFilter;
  sortBy: SortOption;
  generating: boolean;
  savingIds: string[];
  deadlineIds: string[];
  onBack: () => void;
  onSaveSearch: () => void;
  onModify: () => void;
  onCountryChange: (value: string) => void;
  onFunding: (value: string) => void;
  onCoverage: (value: string) => void;
  onDeadlineWindow: (value: string) => void;
  onStatus: (value: StatusFilter) => void;
  onSort: (value: string) => void;
  onClear: () => void;
  onGenerate: () => void;
  onSave: (scholarshipId: string) => void;
  onAddDeadline: (scholarshipId: string) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <div>
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#6d3df4]">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Back to Search
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#151b2d]">Scholarship Matches</h1>
              <span className="rounded-full bg-[#f0eaff] px-3 py-1 text-xs font-semibold text-[#6d3df4]">Step 2 of 3</span>
            </div>
            <p className="mt-2 text-sm text-[#667085]">We found {counts.total} scholarships you are eligible or almost eligible for</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onSaveSearch} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8f8fb]">
              <Bookmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Save Search
            </button>
            <button type="button" onClick={onModify} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8f8fb]">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Modify Search
            </button>
          </div>
        </header>

        <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResultStat icon={ShieldCheck} value={counts.eligible} label="Eligible" detail="High chance of success" tone="green" active={status === "ELIGIBLE"} onClick={() => onStatus(status === "ELIGIBLE" ? "ALL" : "ELIGIBLE")} />
          <ResultStat icon={Clock3} value={counts.almost} label="Almost Eligible" detail="You can still apply" tone="amber" active={status === "ALMOST_ELIGIBLE"} onClick={() => onStatus(status === "ALMOST_ELIGIBLE" ? "ALL" : "ALMOST_ELIGIBLE")} />
          <ResultStat icon={XCircle} value={counts.notRecommended} label="Not Recommended" detail="Does not match profile" tone="red" active={status === "NOT_RECOMMENDED"} onClick={() => onStatus(status === "NOT_RECOMMENDED" ? "ALL" : "NOT_RECOMMENDED")} />
          <ResultStat icon={SlidersHorizontal} value={counts.total} label="Total Found" detail="After applying filters" tone="purple" active={status === "ALL"} onClick={() => onStatus("ALL")} />
        </section>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SelectInline label="Sort by:" value={sortBy} onChange={onSort} options={[
            ["BEST_MATCH", "Best Match"],
            ["DEADLINE", "Deadline"],
            ["AMOUNT", "Coverage Amount"]
          ]} />
          <div className="flex items-center gap-2 text-sm text-[#667085]">
            <span>View:</span>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#6d3df4] bg-[#f4f1ff] px-3 font-semibold text-[#6d3df4]">
              <LayoutGrid className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Card View
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-3 font-semibold text-[#667085]">
              <Table2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Table View
            </button>
          </div>
        </div>

        {matches.length ? (
          <section className="grid gap-4">
            {matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                saving={savingIds.includes(match.scholarshipId)}
                addingDeadline={deadlineIds.includes(match.scholarshipId)}
                onSave={onSave}
                onAddDeadline={onAddDeadline}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-[#d6dbe8] bg-white p-8 text-center">
            <Award className="mx-auto h-8 w-8 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-[#151b2d]">No scholarship matches in this view</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">Clear filters or run the eligibility engine again after updating your profile.</p>
            <button type="button" onClick={onGenerate} disabled={generating} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-5 text-sm font-semibold text-white hover:bg-[#5f35d8] disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} strokeWidth={1.8} aria-hidden="true" />
              <span>{generating ? "Finding" : "Find scholarships"}</span>
            </button>
          </section>
        )}
      </div>

      <aside className="space-y-5">
        <section className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#151b2d]">Refine Results</h2>
            <button type="button" onClick={onClear} className="text-xs font-semibold text-[#6d3df4]">Clear All</button>
          </div>
          <div className="space-y-4">
            <SelectField label="Country" value={selectedCountries[0] ?? ""} onChange={onCountryChange} options={["", ...countryOptions]} labels={{ "": "All Countries" }} />
            <SelectField label="Funding Type" value={funding} onChange={onFunding} options={["ALL", "FULL", "PARTIAL"]} labels={{ ALL: "All Funding Types", FULL: "Fully Funded", PARTIAL: "Partial Funding" }} />
            <SelectField label="Coverage Type" value={coverage} onChange={onCoverage} options={["ALL", "FULL", "MAJOR", "PARTIAL"]} labels={{ ALL: "All Coverage Types", FULL: "Full Funding", MAJOR: "Major Funding", PARTIAL: "Partial Funding" }} />
            <SelectField label="Deadline" value={deadlineWindow} onChange={onDeadlineWindow} options={["ALL", "30", "60", "90"]} labels={{ ALL: "All Deadlines", "30": "Next 30 days", "60": "Next 60 days", "90": "Next 90 days" }} />
            <button type="button" onClick={onGenerate} disabled={generating} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#6d3df4] text-sm font-semibold text-white hover:bg-[#5f35d8] disabled:opacity-60">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Apply Filters
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <h2 className="text-base font-semibold text-emerald-800">Match Insights</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-900">Great news! You have {counts.eligible} scholarships you are eligible for.</p>
          <p className="mt-3 text-sm leading-6 text-emerald-900">Improve your IELTS score to unlock more scholarships.</p>
          <Link to="/readiness" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700">
            See How to Improve
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </section>

        <section className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="text-base font-semibold text-amber-800">Need Help?</h2>
          <p className="mt-3 text-sm leading-6 text-amber-900">Ask our AI Advisor to find more scholarships that fit your profile.</p>
          <Link to="/readiness" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-700">
            Ask AI Advisor
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </section>
      </aside>
    </div>
  );
}

function MatchRow({
  match,
  saving,
  addingDeadline,
  onSave,
  onAddDeadline
}: {
  match: ScholarshipMatch;
  saving: boolean;
  addingDeadline: boolean;
  onSave: (scholarshipId: string) => void;
  onAddDeadline: (scholarshipId: string) => void;
}) {
  const scholarship = match.scholarship;
  const tone = getStatusTone(match.status);

  return (
    <article className="grid gap-4 rounded-xl border border-[#e6e9f2] bg-white p-4 shadow-sm lg:grid-cols-[1fr_120px_150px]">
      <div className="flex min-w-0 gap-4">
        <ScholarshipLogo scholarship={scholarship} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-[#151b2d]">{scholarship.name}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>{formatStatus(match.status)}</span>
          </div>
          <p className="mt-1 text-sm text-[#667085]">{scholarship.country?.name ?? "Multiple countries"} / {scholarship.degreeLevel}</p>
          <p className="mt-2 line-clamp-1 text-sm text-[#344054]">{match.reasons[0] ?? "Matched against your academic profile."}</p>
          <div className="mt-4 grid gap-3 text-xs text-[#667085] sm:grid-cols-4">
            <MiniMeta icon={CalendarDays} label="Deadline" value={formatDate(scholarship.deadline)} />
            <MiniMeta icon={CircleDollarSign} label="Coverage" value={scholarship.amountUsd ? `USD ${formatNumber(scholarship.amountUsd)}` : "Varies"} />
            <MiniMeta icon={GraduationCap} label="Degree Level" value={shortDegree(scholarship.degreeLevel)} />
            <MiniMeta icon={FileText} label="Subjects" value={scholarship.eligibleFields[0] ?? "All fields"} />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start justify-center lg:items-center">
        <ScoreRing value={match.matchingPercentage} status={match.status} />
        <p className="mt-2 text-xs font-semibold text-[#344054]">Match Score</p>
        <Link to={`/scholarships/${scholarship.id}`} className="mt-1 text-xs font-semibold text-[#6d3df4]">Why this match?</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:justify-center">
        <button type="button" onClick={() => onSave(scholarship.id)} disabled={saving || scholarship.isSaved} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-transparent px-3 text-sm font-semibold text-[#6d3df4] hover:bg-[#f4f1ff] disabled:opacity-60">
          <Bookmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {scholarship.isSaved ? "Saved" : saving ? "Saving" : "Save"}
        </button>
        <button type="button" onClick={() => onAddDeadline(scholarship.id)} disabled={addingDeadline || scholarship.deadlineTracked || !scholarship.deadline} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-transparent px-3 text-sm font-semibold text-[#344054] hover:bg-[#f8f8fb] disabled:opacity-60">
          <CalendarPlus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {scholarship.deadlineTracked ? "Tracked" : "Add to Tracker"}
        </button>
        <Link to={`/scholarships/${scholarship.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] px-4 text-sm font-semibold text-[#6d3df4] hover:bg-[#f4f1ff]">
          View Details
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <div>
          <p className="font-medium">{message}</p>
          <Link to="/profile" className="mt-1 inline-block font-semibold underline">Review profile</Link>
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: string; tone: "red" | "purple" | "blue" | "green" }) {
  const colors = {
    red: "bg-red-50 text-red-600",
    purple: "bg-[#f4f1ff] text-[#6d3df4]",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600"
  };

  return (
    <div className="flex items-center gap-3 border-r border-[#edf0f6] last:border-r-0">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}>
        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#8b92a7]">{label}</p>
        <p className="truncate text-sm font-semibold text-[#27314f]">{value}</p>
      </div>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#344054]">
      {label}
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#b7bfd0] text-[10px] text-[#8b92a7]">i</span>
    </label>
  );
}

function SelectField({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-[#dfe4ef] bg-white px-3 pr-9 text-sm text-[#344054] outline-none focus:border-[#6d3df4] focus:ring-2 focus:ring-[#6d3df4]/10">
          {options.map((option) => (
            <option key={option} value={option}>{labels[option] ?? option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#8b92a7]" strokeWidth={1.8} aria-hidden="true" />
      </div>
    </div>
  );
}

function RangeField({ label, value, min, max, step, left, right, display, onChange }: { label: string; value: number; min: number; max: number; step: number; left: string; right: string; display: string; onChange: (value: number) => void }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="flex h-11 items-center gap-3">
        <span className="text-xs text-[#667085]">{left}</span>
        <input value={value} min={min} max={max} step={step} type="range" onChange={(event) => onChange(Number(event.target.value))} className="h-2 flex-1 accent-[#6d3df4]" />
        <span className="text-xs text-[#667085]">{right}</span>
      </div>
      <p className="text-center text-xs font-semibold text-[#6d3df4]">{display}</p>
    </div>
  );
}

function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[#344054]">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#c9d1e4] accent-[#6d3df4]" />
      {label}
    </label>
  );
}

function SidePanel({ title, icon: Icon, tone, action, children }: { title: string; icon: ElementType; tone: "purple" | "amber" | "green"; action?: React.ReactNode; children: React.ReactNode }) {
  const tones = {
    purple: "border-[#eadfff] bg-[#fbf9ff] text-[#6d3df4]",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700"
  };

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {action ? <div className="text-xs font-semibold text-[#6d3df4]">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function TipList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm font-medium text-[#344054]">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function DeadlineMini({ item }: { item: { title: string; country: string; deadline?: string | null } }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/80 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#344054]">{item.title}</p>
        <p className="mt-1 text-xs text-[#667085]">{item.country}</p>
      </div>
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-[#ead6a8] bg-white text-amber-700">
        <span className="text-sm font-semibold">{formatDay(item.deadline)}</span>
        <span className="text-[10px] font-semibold uppercase">{formatMonth(item.deadline)}</span>
      </div>
    </div>
  );
}

function PopularMini({ scholarship }: { scholarship: Scholarship }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/80 p-3">
      <ScholarshipLogo scholarship={scholarship} small />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#344054]">{scholarship.name}</p>
        <p className="mt-1 text-xs text-[#667085]">{scholarship.country?.name ?? "Scholarship"} / {shortDegree(scholarship.degreeLevel)}</p>
        <span className="mt-1 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{scholarship.amountUsd ? `USD ${formatNumber(scholarship.amountUsd)}` : "Funding"}</span>
      </div>
      <Bookmark className="h-4 w-4 text-[#667085]" strokeWidth={1.8} aria-hidden="true" />
    </div>
  );
}

function ResultStat({ icon: Icon, value, label, detail, tone, active, onClick }: { icon: ElementType; value: number; label: string; detail: string; tone: "green" | "amber" | "red" | "purple"; active: boolean; onClick: () => void }) {
  const tones = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    red: "border-red-100 bg-red-50 text-red-700",
    purple: "border-[#e5dcff] bg-[#f4f1ff] text-[#6d3df4]"
  };

  return (
    <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left shadow-sm transition ${active ? tones[tone] : "border-[#e6e9f2] bg-white text-[#344054] hover:bg-[#f8f8fb]"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm font-semibold">{label}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#667085]">{detail}</p>
    </button>
  );
}

function SelectInline({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="flex items-center gap-3 text-sm font-semibold text-[#344054]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-[#dfe4ef] bg-white px-3 text-sm font-medium text-[#344054] outline-none focus:border-[#6d3df4]">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function MiniMeta({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-medium text-[#8b92a7]">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-[#344054]">{value}</p>
    </div>
  );
}

function ScoreRing({ value, status }: { value: number; status: ScholarshipMatch["status"] }) {
  const color = status === "ELIGIBLE" ? "#12a66a" : status === "ALMOST_ELIGIBLE" ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-[72px] w-[72px] items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="30" fill="none" stroke="#eef1f7" strokeWidth="6" />
        <circle cx="36" cy="36" r="30" fill="none" stroke={color} strokeDasharray={`${(value / 100) * 188.5} 188.5`} strokeLinecap="round" strokeWidth="6" />
      </svg>
      <span className="text-lg font-semibold" style={{ color }}>{value}%</span>
    </div>
  );
}

function ScholarshipLogo({ scholarship, small = false }: { scholarship: Scholarship; small?: boolean }) {
  const initials = scholarship.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  const tone = getLogoTone(scholarship.country?.name ?? scholarship.name);

  return (
    <div className={`${small ? "h-11 w-14 text-xs" : "h-[62px] w-[86px] text-sm"} flex shrink-0 items-center justify-center rounded-md font-bold ${tone}`}>
      {initials || "SC"}
    </div>
  );
}

function FlagIcon({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return <span className={className} style={{ fontSize: 16, lineHeight: 1 }} data-stroke-width={strokeWidth}>BD</span>;
}

function matchesFunding(coverageType: string, funding: FundingFilter) {
  if (funding === "ALL") {
    return true;
  }

  const normalized = coverageType.toLowerCase();

  if (funding === "FULL") {
    return normalized.includes("full") || normalized.includes("major");
  }

  return normalized.includes("partial");
}

function matchesCoverage(coverageType: string, coverage: CoverageFilter) {
  if (coverage === "ALL") {
    return true;
  }

  const normalized = coverageType.toLowerCase();

  if (coverage === "FULL") {
    return normalized.includes("full");
  }

  if (coverage === "MAJOR") {
    return normalized.includes("major");
  }

  return normalized.includes("partial");
}

function matchesDeadlineWindow(deadline: string | null | undefined, window: DeadlineFilter) {
  if (window === "ALL" || !deadline) {
    return true;
  }

  const daysRemaining = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);

  return daysRemaining >= 0 && daysRemaining <= Number(window);
}

function matchesMoreFilters(scholarship: Scholarship, filters: MoreFilters) {
  const coverageType = scholarship.coverageType.toLowerCase();

  if (filters.fullyFunded && !(coverageType.includes("full") || coverageType.includes("major"))) {
    return false;
  }

  if (filters.partiallyFunded && !coverageType.includes("partial")) {
    return false;
  }

  if (filters.tuitionFeeWaiver && !(coverageType.includes("tuition") || coverageType.includes("full") || coverageType.includes("major"))) {
    return false;
  }

  if (filters.livingAllowance && !(coverageType.includes("full") || coverageType.includes("major"))) {
    return false;
  }

  if (filters.researchOpportunities && !scholarship.researchRequired) {
    return false;
  }

  if (filters.internationalStudents && !scholarship.eligibleNationalities.some((item) => ["any", "bangladeshi", "developing countries"].includes(item.toLowerCase()))) {
    return false;
  }

  return true;
}

function getStatusTone(status: ScholarshipMatch["status"]) {
  if (status === "ELIGIBLE") {
    return {
      badge: "bg-emerald-50 text-emerald-700"
    };
  }

  if (status === "ALMOST_ELIGIBLE") {
    return {
      badge: "bg-amber-50 text-amber-700"
    };
  }

  return {
    badge: "bg-red-50 text-red-700"
  };
}

function getLogoTone(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("belgium") || normalized.includes("leuven")) {
    return "bg-[#0054a6] text-white";
  }

  if (normalized.includes("united kingdom") || normalized.includes("great")) {
    return "bg-[#133b7a] text-white";
  }

  if (normalized.includes("germany") || normalized.includes("daad")) {
    return "bg-[#111827] text-white";
  }

  if (normalized.includes("australia")) {
    return "bg-[#0f766e] text-white";
  }

  if (normalized.includes("united states")) {
    return "bg-[#b91c1c] text-white";
  }

  return "bg-[#f0eaff] text-[#6d3df4]";
}

function friendlyNationality(value: string) {
  return value.toLowerCase().includes("bangladesh") || value.toLowerCase().includes("bangladeshi") ? "Bangladesh" : value;
}

function countryMatches(left: string, right: string) {
  return normalizeCountry(left) === normalizeCountry(right);
}

function normalizeCountry(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["uk", "u.k.", "england", "britain", "great britain"].includes(normalized)) {
    return "united kingdom";
  }

  if (["usa", "u.s.a.", "us", "u.s.", "america"].includes(normalized)) {
    return "united states";
  }

  return normalized;
}

function shortDegree(value: string) {
  return value.replace(" Degree", "");
}

function formatStatus(status: ScholarshipMatch["status"]) {
  return status.split("_").map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");
}

function formatDay(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit"
  });
}

function formatMonth(value?: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short"
  });
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Rolling";
  }

  return new Date(value).toLocaleDateString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}
