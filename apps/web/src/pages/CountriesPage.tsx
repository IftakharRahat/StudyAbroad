import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe2,
  GraduationCap,
  Heart,
  Languages,
  Landmark,
  Lightbulb,
  MapPin,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trophy,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { CountriesResponse, Country, CountryCompareResponse, ProfileResponse } from "../types";

type CountryView = "explorer" | "compare" | "detail" | "summary";
type TuitionFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";
type LivingFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";
type ScholarshipFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";
type JobMarketFilter = "ALL" | "GOOD" | "STRONG" | "EXCELLENT";
type PostStudyFilter = "ALL" | "12" | "24" | "36";
type LanguageFilter = "ALL" | "LOW" | "ENGLISH";
type PriorityKey = "affordability" | "jobMarket" | "scholarships" | "postStudyWork" | "visaFriendliness";

type Filters = {
  search: string;
  region: string;
  tuition: TuitionFilter;
  living: LivingFilter;
  scholarships: ScholarshipFilter;
  jobMarket: JobMarketFilter;
  postStudy: PostStudyFilter;
  language: LanguageFilter;
  fullyFunded: boolean;
  englishFriendly: boolean;
  lowVisaDifficulty: boolean;
  strongPrPathway: boolean;
};

type SaveCountryResponse = {
  preferredCountries: string[];
  profile: ProfileResponse["profile"];
};

const defaultFilters: Filters = {
  search: "",
  region: "ALL",
  tuition: "ALL",
  living: "ALL",
  scholarships: "ALL",
  jobMarket: "ALL",
  postStudy: "ALL",
  language: "ALL",
  fullyFunded: false,
  englishFriendly: false,
  lowVisaDifficulty: false,
  strongPrPathway: false
};

const defaultPriorities: Record<PriorityKey, number> = {
  affordability: 30,
  jobMarket: 25,
  scholarships: 20,
  postStudyWork: 15,
  visaFriendliness: 10
};

const priorityLabels: Record<PriorityKey, string> = {
  affordability: "Affordability",
  jobMarket: "Job opportunities",
  scholarships: "Scholarships",
  postStudyWork: "Post-study work",
  visaFriendliness: "Visa friendliness"
};

const detailTabs = ["Overview", "Cost of Study", "Visa", "Work", "Scholarships", "Job Market", "Cities", "Student Life"] as const;

export function CountriesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [view, setView] = useState<CountryView>("explorer");
  const [countries, setCountries] = useState<Country[]>([]);
  const [profile, setProfile] = useState<ProfileResponse["profile"]>(null);
  const [stats, setStats] = useState<CountriesResponse["stats"]>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [priorities, setPriorities] = useState(defaultPriorities);
  const [compareResponse, setCompareResponse] = useState<CountryCompareResponse | null>(null);
  const [detailCountry, setDetailCountry] = useState<Country | null>(null);
  const [detailTab, setDetailTab] = useState<(typeof detailTabs)[number]>("Overview");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [countryToAdd, setCountryToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [savingCountryId, setSavingCountryId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCountries() {
      if (!token) {
        return;
      }

      try {
        const response = await apiRequest<CountriesResponse>("/countries/dashboard", {
          token,
          cacheTtlMs: 60_000
        });
        const sortedCountries = [...response.countries].sort((left, right) => scoreOf(right) - scoreOf(left));
        const preferredIds = response.selectedCountryIds?.filter((id) => response.countries.some((country) => country.id === id)) ?? [];
        const starterIds = preferredIds.length
          ? preferredIds
          : sortedCountries.slice(0, 3).map((country) => country.id);

        setCountries(sortedCountries);
        setProfile(response.profile ?? null);
        setStats(response.stats);
        setSelectedIds(starterIds.slice(0, 4));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not load country dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadCountries();
  }, [token]);

  const regions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(countries.map((country) => country.meta?.region).filter(Boolean) as string[])).sort()];
  }, [countries]);

  const selectedCountries = useMemo(() => {
    return selectedIds
      .map((id) => countries.find((country) => country.id === id))
      .filter(Boolean) as Country[];
  }, [countries, selectedIds]);

  const filteredCountries = useMemo(() => {
    return countries.filter((country) => matchesFilters(country, filters));
  }, [countries, filters]);

  const rankedCountries = compareResponse?.countries ?? selectedCountries;
  const recommendedCountry = rankedCountries[0] ?? selectedCountries[0] ?? countries[0];
  const profileCompletion = profile ? 90 : 0;

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleCountry(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 4) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  }

  function addCountryFromSelect(id: string) {
    if (!id) {
      return;
    }

    setCountryToAdd("");
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current;
      }

      if (current.length >= 4) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  }

  async function runCompare(nextView: CountryView = "compare") {
    if (!token || selectedIds.length < 2) {
      setError("Select at least two countries to compare");
      return;
    }

    try {
      setComparing(true);
      setError("");
      const response = await apiRequest<CountryCompareResponse>("/countries/compare", {
        method: "POST",
        token,
        body: JSON.stringify({
          countryIds: selectedIds,
          priorities
        })
      });
      setCompareResponse(response);
      setView(nextView);
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not compare countries");
    } finally {
      setComparing(false);
    }
  }

  async function savePreferredCountry(country: Country) {
    if (!token) {
      return;
    }

    try {
      setSavingCountryId(country.id);
      const response = await apiRequest<SaveCountryResponse>("/countries/save", {
        method: "POST",
        token,
        body: JSON.stringify({
          countryId: country.id
        })
      });
      const preferredSet = new Set(response.preferredCountries.map((name) => normalizeCountryName(name)));
      setProfile(response.profile);
      setCountries((current) => current.map((item) => ({
        ...item,
        decision: item.decision
          ? {
            ...item.decision,
            preferred: preferredSet.has(normalizeCountryName(item.name))
          }
          : item.decision
      })));
      setStatusMessage(`${country.name} is saved as a preferred country`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save preferred country");
    } finally {
      setSavingCountryId(null);
    }
  }

  function openDetail(country: Country) {
    setDetailCountry(country);
    setDetailTab("Overview");
    setView("detail");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function saveComparison() {
    localStorage.setItem("studycompass_country_comparison", JSON.stringify({
      savedAt: new Date().toISOString(),
      countryIds: selectedIds,
      priorities
    }));
    setStatusMessage("Comparison saved in this browser");
  }

  async function shareComparison() {
    const names = selectedCountries.map((country) => country.name).join(", ");
    const text = `StudyCompass country comparison: ${names}`;

    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage("Comparison copied to clipboard");
    } catch {
      setStatusMessage(text);
    }
  }

  function exportReport() {
    const countriesForReport = rankedCountries.length ? rankedCountries : selectedCountries;
    const lines = [
      "StudyCompass Country Decision Report",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      ...countriesForReport.map((country, index) => [
        `${index + 1}. ${country.name} - ${scoreOf(country)}/100`,
        `Region: ${country.meta?.region ?? "Global"}`,
        `Estimated yearly cost: USD ${formatNumber(country.decision?.estimatedAnnualCostUsd ?? 0)}`,
        `Recommendation: ${country.decision?.recommendation ?? country.notes ?? ""}`
      ].join("\n"))
    ];
    const blob = new Blob([lines.join("\n\n")], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "studycompass-country-decision-report.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Report exported");
  }

  if (loading) {
    return <CountryLoading />;
  }

  return (
    <div className="mx-auto max-w-[1220px]">
      {error ? (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-red-700">
            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {statusMessage ? (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage("")} className="text-emerald-700">
            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {view === "explorer" ? (
        <ExplorerView
          countries={countries}
          filteredCountries={filteredCountries}
          filters={filters}
          regions={regions}
          selectedCountries={selectedCountries}
          selectedIds={selectedIds}
          stats={stats}
          profile={profile}
          profileCompletion={profileCompletion}
          advancedOpen={advancedOpen}
          countryToAdd={countryToAdd}
          comparing={comparing}
          onUpdateFilter={updateFilter}
          onResetFilters={() => setFilters(defaultFilters)}
          onToggleCountry={toggleCountry}
          onSetAdvancedOpen={setAdvancedOpen}
          onSetCountryToAdd={setCountryToAdd}
          onAddCountry={addCountryFromSelect}
          onCompare={() => void runCompare("compare")}
          onOpenDetail={openDetail}
        />
      ) : null}

      {view === "compare" ? (
        <CompareView
          countries={rankedCountries}
          allCountries={countries}
          selectedIds={selectedIds}
          comparing={comparing}
          countryToAdd={countryToAdd}
          recommendations={compareResponse?.recommendations ?? null}
          onBack={() => setView("explorer")}
          onToggleCountry={toggleCountry}
          onSetCountryToAdd={setCountryToAdd}
          onAddCountry={addCountryFromSelect}
          onCompare={() => void runCompare("compare")}
          onOpenDetail={openDetail}
          onSaveComparison={saveComparison}
          onShareComparison={() => void shareComparison()}
          onSummary={() => {
            if (!compareResponse) {
              void runCompare("summary");
            } else {
              setView("summary");
              window.scrollTo({
                top: 0,
                behavior: "smooth"
              });
            }
          }}
        />
      ) : null}

      {view === "detail" && detailCountry ? (
        <DetailView
          country={detailCountry}
          selectedIds={selectedIds}
          activeTab={detailTab}
          saving={savingCountryId === detailCountry.id}
          onBack={() => setView(compareResponse ? "compare" : "explorer")}
          onSetTab={setDetailTab}
          onToggleCountry={toggleCountry}
          onSaveCountry={() => void savePreferredCountry(detailCountry)}
          onViewUniversities={() => navigate("/matches")}
        />
      ) : null}

      {view === "summary" && recommendedCountry ? (
        <SummaryView
          countries={rankedCountries}
          profile={profile}
          priorities={priorities}
          savingCountryId={savingCountryId}
          onBack={() => setView("compare")}
          onUpdatePriority={(key, value) => setPriorities((current) => ({
            ...current,
            [key]: value
          }))}
          onRecalculate={() => void runCompare("summary")}
          onSaveCountry={() => void savePreferredCountry(recommendedCountry)}
          onExport={exportReport}
          onFindUniversities={() => navigate("/matches")}
          onFindScholarships={() => navigate("/scholarships")}
          onDashboard={() => navigate("/")}
        />
      ) : null}
    </div>
  );
}

function ExplorerView({
  countries,
  filteredCountries,
  filters,
  regions,
  selectedCountries,
  selectedIds,
  stats,
  profile,
  profileCompletion,
  advancedOpen,
  countryToAdd,
  comparing,
  onUpdateFilter,
  onResetFilters,
  onToggleCountry,
  onSetAdvancedOpen,
  onSetCountryToAdd,
  onAddCountry,
  onCompare,
  onOpenDetail
}: {
  countries: Country[];
  filteredCountries: Country[];
  filters: Filters;
  regions: string[];
  selectedCountries: Country[];
  selectedIds: string[];
  stats: CountriesResponse["stats"];
  profile: ProfileResponse["profile"];
  profileCompletion: number;
  advancedOpen: boolean;
  countryToAdd: string;
  comparing: boolean;
  onUpdateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onResetFilters: () => void;
  onToggleCountry: (id: string) => void;
  onSetAdvancedOpen: (open: boolean) => void;
  onSetCountryToAdd: (id: string) => void;
  onAddCountry: (id: string) => void;
  onCompare: () => void;
  onOpenDetail: (country: Country) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#111827]">Country Explorer</h1>
                <StepBadge label="Step 1 of 4" />
              </div>
              <p className="mt-1 text-sm text-[#667085]">Explore and select countries to compare based on your study and career priorities.</p>
            </div>
            <button
              type="button"
              onClick={() => onSetAdvancedOpen(!advancedOpen)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white px-4 text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]"
            >
              <Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              How it works
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile icon={GraduationCap} label="Countries" value={`${stats?.countriesAvailable ?? countries.length}+`} accent="green" />
          <StatTile icon={Landmark} label="Universities" value={`${stats?.universitiesWorldwide ?? 0}+`} accent="purple" />
          <StatTile icon={CircleDollarSign} label="Scholarships" value={`${stats?.scholarshipsAvailable ?? 0}+`} accent="orange" />
          <StatTile icon={Users} label="Students guided" value="2M+" accent="blue" />
          <StatTile icon={Globe2} label={`${stats?.dataFreshness ?? "Monthly"} data`} value="Updated" accent="pink" />
        </section>

        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3efff] text-[#6d3df4]">
                <Filter className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h2 className="text-base font-semibold text-[#182033]">Filter countries</h2>
            </div>
            <button type="button" onClick={onResetFilters} className="text-sm font-semibold text-[#6d3df4] hover:text-[#4f2fca]">
              Clear all
            </button>
          </div>

          <div className="mb-4 flex h-11 items-center gap-2 rounded-lg border border-[#dce3f0] bg-white px-3">
            <Search className="h-4 w-4 text-[#8b95aa]" strokeWidth={1.8} aria-hidden="true" />
            <input
              value={filters.search}
              onChange={(event) => onUpdateFilter("search", event.target.value)}
              placeholder="Search countries, cities, visa paths..."
              className="w-full border-0 bg-transparent text-sm text-[#27314f] outline-none placeholder:text-[#98a2b3]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="Region" value={filters.region} onChange={(value) => onUpdateFilter("region", value)} options={regions.map((region) => ({
              value: region,
              label: region === "ALL" ? "All regions" : region
            }))} />
            <FilterSelect label="Tuition range" value={filters.tuition} onChange={(value) => onUpdateFilter("tuition", value as TuitionFilter)} options={[
              { value: "ALL", label: "Any range" },
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" }
            ]} />
            <FilterSelect label="Living cost" value={filters.living} onChange={(value) => onUpdateFilter("living", value as LivingFilter)} options={[
              { value: "ALL", label: "Any range" },
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" }
            ]} />
            <FilterSelect label="Scholarship availability" value={filters.scholarships} onChange={(value) => onUpdateFilter("scholarships", value as ScholarshipFilter)} options={[
              { value: "ALL", label: "All" },
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" }
            ]} />
            <FilterSelect label="Job market strength" value={filters.jobMarket} onChange={(value) => onUpdateFilter("jobMarket", value as JobMarketFilter)} options={[
              { value: "ALL", label: "All" },
              { value: "GOOD", label: "Good or better" },
              { value: "STRONG", label: "Strong or better" },
              { value: "EXCELLENT", label: "Excellent" }
            ]} />
            <FilterSelect label="Post-study work" value={filters.postStudy} onChange={(value) => onUpdateFilter("postStudy", value as PostStudyFilter)} options={[
              { value: "ALL", label: "All" },
              { value: "12", label: "12+ months" },
              { value: "24", label: "24+ months" },
              { value: "36", label: "36+ months" }
            ]} />
            <FilterSelect label="Language of instruction" value={filters.language} onChange={(value) => onUpdateFilter("language", value as LanguageFilter)} options={[
              { value: "ALL", label: "All" },
              { value: "LOW", label: "Low barrier" },
              { value: "ENGLISH", label: "English-friendly" }
            ]} />
            <button
              type="button"
              onClick={() => onSetAdvancedOpen(!advancedOpen)}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white px-4 text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Advanced filters
            </button>
          </div>

          {advancedOpen ? (
            <div className="mt-4 grid gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <CheckFilter label="Fully funded scholarships" checked={filters.fullyFunded} onChange={(checked) => onUpdateFilter("fullyFunded", checked)} />
              <CheckFilter label="English-friendly" checked={filters.englishFriendly} onChange={(checked) => onUpdateFilter("englishFriendly", checked)} />
              <CheckFilter label="Lower visa difficulty" checked={filters.lowVisaDifficulty} onChange={(checked) => onUpdateFilter("lowVisaDifficulty", checked)} />
              <CheckFilter label="PR-friendly pathway" checked={filters.strongPrPathway} onChange={(checked) => onUpdateFilter("strongPrPathway", checked)} />
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#182033]">Popular countries</h2>
            <span className="text-sm font-semibold text-[#6d3df4]">{filteredCountries.length} shown</span>
          </div>

          {filteredCountries.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCountries.map((country) => (
                <CountryExplorerCard
                  key={country.id}
                  country={country}
                  selected={selectedIds.includes(country.id)}
                  onToggle={() => onToggleCountry(country.id)}
                  onOpenDetail={() => onOpenDetail(country)}
                />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No countries match these filters"
              description="Adjust the country filters or clear them to see more destination options."
              actionLabel="Reset filters"
              onAction={onResetFilters}
            />
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <SelectionPanel
          countries={countries}
          selectedCountries={selectedCountries}
          countryToAdd={countryToAdd}
          comparing={comparing}
          onSetCountryToAdd={onSetCountryToAdd}
          onAddCountry={onAddCountry}
          onRemoveCountry={onToggleCountry}
          onCompare={onCompare}
        />
        <ProfileSummaryPanel profile={profile} profileCompletion={profileCompletion} />
        <TipPanel />
      </aside>
    </div>
  );
}

function CompareView({
  countries,
  allCountries,
  selectedIds,
  comparing,
  countryToAdd,
  recommendations,
  onBack,
  onToggleCountry,
  onSetCountryToAdd,
  onAddCountry,
  onCompare,
  onOpenDetail,
  onSaveComparison,
  onShareComparison,
  onSummary
}: {
  countries: Country[];
  allCountries: Country[];
  selectedIds: string[];
  comparing: boolean;
  countryToAdd: string;
  recommendations: CountryCompareResponse["recommendations"];
  onBack: () => void;
  onToggleCountry: (id: string) => void;
  onSetCountryToAdd: (id: string) => void;
  onAddCountry: (id: string) => void;
  onCompare: () => void;
  onOpenDetail: (country: Country) => void;
  onSaveComparison: () => void;
  onShareComparison: () => void;
  onSummary: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#5f3bd7]">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Back to Country Explorer
              </button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#111827]">Country Comparison Dashboard</h1>
                <StepBadge label="Step 2 of 4" />
              </div>
              <p className="mt-1 text-sm text-[#667085]">Compare key factors side by side to choose the best study destination.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onSaveComparison} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce3f0] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                <Bookmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Save comparison
              </button>
              <button type="button" onClick={onShareComparison} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce3f0] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                <Share2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Share
              </button>
              <button type="button" onClick={onSummary} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#5f3bd7] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#4f2fca]">
                Next: View Insights
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#182033]">Comparing {countries.length} countries</h2>
              <p className="mt-1 text-sm text-[#667085]">You can compare up to 4 countries at a time.</p>
            </div>
            <div className="flex gap-2">
              <select
                value={countryToAdd}
                onChange={(event) => {
                  onSetCountryToAdd(event.target.value);
                  onAddCountry(event.target.value);
                }}
                className="h-10 rounded-lg border border-[#dce3f0] bg-white px-3 text-sm font-medium text-[#27314f] outline-none"
              >
                <option value="">Add country</option>
                {allCountries.filter((country) => !selectedIds.includes(country.id)).map((country) => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
              <button type="button" onClick={onCompare} disabled={comparing} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ff] bg-white px-4 text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${comparing ? "animate-spin" : ""}`} strokeWidth={1.8} aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {countries.map((country, index) => (
              <div key={country.id} className="flex items-center justify-between rounded-lg border border-[#e7eaf3] bg-[#fbfcff] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FlagMark countryName={country.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#182033]">{country.name}</p>
                    <p className="text-xs font-medium text-[#7a8194]">{country.meta?.region ?? "Global"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#eef8f2] px-2 py-1 text-[11px] font-semibold text-[#12805c]">{index === 0 ? "Top match" : `${scoreOf(country)}/100`}</span>
                  <button type="button" onClick={() => onToggleCountry(country.id)} title={`Remove ${country.name}`} className="text-[#8b95aa] hover:text-[#344054]">
                    <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e3e8f4] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#f8f9fc] text-xs font-semibold uppercase text-[#667085]">
                <tr>
                  <th className="w-[240px] px-4 py-3">Criteria</th>
                  {countries.map((country) => (
                    <th key={country.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FlagMark countryName={country.name} small />
                        <span>{country.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f6]">
                <CompareRow icon={Target} label="Overall suitability score" countries={countries} render={(country) => (
                  <span className="font-semibold text-[#15803d]">{scoreOf(country)} / 100</span>
                )} />
                <CompareRow icon={WalletCards} label="Average tuition fees" countries={countries} render={(country) => formatRange(country.meta?.tuitionMinUsd, country.meta?.tuitionMaxUsd)} />
                <CompareRow icon={PiggyBank} label="Average living cost" countries={countries} render={(country) => `USD ${formatNumber(country.averageLivingCostUsd)} / month`} />
                <CompareRow icon={CircleDollarSign} label="Estimated total cost" countries={countries} render={(country) => `USD ${formatNumber(country.decision?.estimatedAnnualCostUsd ?? 0)} / year`} />
                <CompareRow icon={GraduationCap} label="Scholarship availability" countries={countries} render={(country) => country.meta?.scholarshipAvailability ?? "Medium"} />
                <CompareRow icon={BriefcaseBusiness} label="Job market strength" countries={countries} render={(country) => country.meta?.jobMarketStrength ?? "Good"} />
                <CompareRow icon={ShieldCheck} label="Visa difficulty" countries={countries} render={(country) => country.visaDifficulty} />
                <CompareRow icon={CalendarDays} label="Part-time work" countries={countries} render={(country) => `${country.partTimeWorkHours} hrs/week`} />
                <CompareRow icon={MapPin} label="Post-study work opportunity" countries={countries} render={(country) => `${country.postStudyWorkVisaMonths} months search period`} />
                <CompareRow icon={Languages} label="Language of instruction" countries={countries} render={(country) => country.languageRequirement} />
                <CompareRow icon={ClipboardCheck} label="PR / settlement pathway" countries={countries} render={(country) => country.meta?.prPathwayDifficulty ?? "Moderate"} />
                <CompareRow icon={BadgeCheck} label="Safety and quality of life" countries={countries} render={(country) => `${country.safetyScore}/10`} />
                <CompareRow icon={Building2} label="Popular student cities" countries={countries} render={(country) => country.meta?.popularCities.slice(0, 3).join(", ") ?? "-"} />
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-3">
          <RecommendationTile icon={PiggyBank} label="Best budget option" value={recommendations?.bestBudget ?? countries[0]?.name ?? "-"} />
          <RecommendationTile icon={BriefcaseBusiness} label="Best career option" value={recommendations?.bestCareer ?? countries[0]?.name ?? "-"} />
          <RecommendationTile icon={GraduationCap} label="Best scholarship option" value={recommendations?.bestScholarships ?? countries[0]?.name ?? "-"} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {countries.map((country) => (
            <article key={country.id} className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#182033]">{country.name}</p>
                  <p className="mt-1 text-sm text-[#667085]">{country.decision?.recommendation}</p>
                </div>
                <ScoreRing score={scoreOf(country)} size="sm" />
              </div>
              <button type="button" onClick={() => onOpenDetail(country)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]">
                View country details
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </article>
          ))}
        </section>
      </div>

      <aside className="space-y-4">
        <RankingPanel countries={countries} />
        <RadarPanel countries={countries} />
        <NextStepsPanel onSummary={onSummary} onOpenDetail={() => countries[0] ? onOpenDetail(countries[0]) : undefined} />
      </aside>
    </div>
  );
}

function DetailView({
  country,
  selectedIds,
  activeTab,
  saving,
  onBack,
  onSetTab,
  onToggleCountry,
  onSaveCountry,
  onViewUniversities
}: {
  country: Country;
  selectedIds: string[];
  activeTab: (typeof detailTabs)[number];
  saving: boolean;
  onBack: () => void;
  onSetTab: (tab: (typeof detailTabs)[number]) => void;
  onToggleCountry: (id: string) => void;
  onSaveCountry: () => void;
  onViewUniversities: () => void;
}) {
  const selected = selectedIds.includes(country.id);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-xl border border-[#e3e8f4] bg-white shadow-sm">
          <div className="relative">
            <div className="absolute inset-0 opacity-20" style={{ background: getCountryTheme(country.name) }} />
            <div className="relative grid gap-6 bg-gradient-to-r from-white via-white/95 to-white/80 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5f3bd7]">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  Back to comparison
                </button>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <FlagPoster countryName={country.name} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">{country.name}</h1>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5f3bd7] shadow-sm">{country.meta?.region ?? "Global"}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#344054]">Study, work, and settlement overview</p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c667a]">{country.notes ?? country.meta?.insight}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {country.meta?.highlights.slice(0, 3).map((highlight) => (
                        <span key={highlight} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5f3bd7] shadow-sm">{highlight}</span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={onSaveCountry} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white px-4 text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:opacity-60">
                        <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        {saving ? "Saving..." : "Save country"}
                      </button>
                      <button type="button" onClick={() => onToggleCountry(country.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5f3bd7] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#4f2fca]">
                        {selected ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
                        {selected ? "In comparison" : "Add to compare"}
                      </button>
                      <button type="button" onClick={onViewUniversities} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dce3f0] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
                        <Landmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        View universities
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#344054]">Suitability score</p>
                <div className="mt-4 flex justify-center">
                  <ScoreRing score={scoreOf(country)} size="md" />
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{scoreLabel(scoreOf(country))}</span>
                  <p className="mt-3 text-xs font-medium leading-5 text-[#667085]">{country.decision?.budgetFit ?? "Profile"} budget fit</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e3e8f4] bg-white px-3 py-2 shadow-sm">
          <div className="flex gap-1 overflow-x-auto">
            {detailTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onSetTab(tab)}
                className={`h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${activeTab === tab ? "bg-[#f3efff] text-[#5f3bd7]" : "text-[#667085] hover:bg-[#f8fafc]"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <DetailTabContent country={country} activeTab={activeTab} />
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#182033]">Quick facts</h2>
          <div className="mt-4 space-y-3">
            <FactRow icon={MapPin} label="Capital" value={country.meta?.capital ?? "-"} />
            <FactRow icon={CircleDollarSign} label="Currency" value={country.meta?.currency ?? "-"} />
            <FactRow icon={Users} label="Population" value={country.meta?.population ?? "-"} />
            <FactRow icon={Languages} label="Official languages" value={country.meta?.officialLanguages ?? country.languageRequirement} />
            <FactRow icon={CalendarDays} label="Academic intake" value={country.meta?.academicIntake ?? "-"} />
          </div>
        </section>

        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#182033]">Why students choose {country.name}</h2>
          <div className="mt-4 space-y-3">
            {country.meta?.highlights.map((highlight) => (
              <CheckLine key={highlight} text={highlight} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#182033]">Popular universities</h2>
          <div className="mt-4 space-y-3">
            {country.topUniversities?.slice(0, 4).map((university) => (
              <div key={university.id} className="flex items-center gap-3 rounded-lg border border-[#edf0f6] px-3 py-2">
                <LogoBox label={university.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#182033]">{university.name}</p>
                  <p className="text-xs text-[#667085]">{university.city} - {university.rankingBand}</p>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={onViewUniversities} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]">
            View universities
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </section>

        <div className="grid gap-2 rounded-xl border border-[#e3e8f4] bg-white p-4 shadow-sm">
          <button type="button" onClick={onSaveCountry} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:opacity-60">
            <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {saving ? "Saving..." : "Save country"}
          </button>
          <button type="button" onClick={() => onToggleCountry(country.id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5f3bd7] text-sm font-semibold text-white shadow-sm hover:bg-[#4f2fca]">
            {selected ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            {selected ? "In comparison" : "Add to compare"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function SummaryView({
  countries,
  profile,
  priorities,
  savingCountryId,
  onBack,
  onUpdatePriority,
  onRecalculate,
  onSaveCountry,
  onExport,
  onFindUniversities,
  onFindScholarships,
  onDashboard
}: {
  countries: Country[];
  profile: ProfileResponse["profile"];
  priorities: Record<PriorityKey, number>;
  savingCountryId: string | null;
  onBack: () => void;
  onUpdatePriority: (key: PriorityKey, value: number) => void;
  onRecalculate: () => void;
  onSaveCountry: () => void;
  onExport: () => void;
  onFindUniversities: () => void;
  onFindScholarships: () => void;
  onDashboard: () => void;
}) {
  const topCountry = countries[0];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#5f3bd7]">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Back to comparison
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#111827]">Decision Summary & Recommendation</h1>
              <StepBadge label="Step 4 of 4" />
            </div>
            <p className="mt-1 text-sm text-[#667085]">Based on your profile and priorities, here is the recommended country ranking.</p>
          </div>
          <button type="button" onClick={onExport} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white px-4 text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]">
            <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Export report
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <ProfileSummaryPanel profile={profile} profileCompletion={profile ? 90 : 0} compact />
          <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#182033]">Your priorities</h2>
              <button type="button" onClick={onRecalculate} className="text-sm font-semibold text-[#5f3bd7]">Update</button>
            </div>
            <div className="space-y-4">
              {(Object.keys(priorityLabels) as PriorityKey[]).map((key) => (
                <label key={key} className="block">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#667085]">
                    <span>{priorityLabels[key]}</span>
                    <span>{priorities[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={priorities[key]}
                    onChange={(event) => onUpdatePriority(key, Number(event.target.value))}
                    className="w-full accent-[#5f3bd7]"
                  />
                </label>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm font-medium leading-6 text-emerald-800">Changing priorities recalculates the ranking using affordability, work, scholarships, visa, and career fit.</p>
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#182033]">Recommended country ranking</h2>
            <div className="mt-4 space-y-4">
              {countries.map((country, index) => (
                <article key={country.id} className="rounded-xl border border-[#edf0f6] bg-white p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <RankBadge rank={index + 1} />
                      <FlagMark countryName={country.name} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[#182033]">{country.name}</h3>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{index === 0 ? "Best overall match" : scoreLabel(scoreOf(country))}</span>
                        </div>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-[#667085]">{country.decision?.recommendation}</p>
                      </div>
                    </div>
                    <ScoreRing score={scoreOf(country)} size="md" />
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-4">
                    <MiniMetric label="Est. total cost" value={`USD ${formatNumber(country.decision?.estimatedAnnualCostUsd ?? 0)}`} />
                    <MiniMetric label="Job market" value={country.meta?.jobMarketStrength ?? "-"} />
                    <MiniMetric label="Scholarships" value={country.meta?.scholarshipAvailability ?? "-"} />
                    <MiniMetric label="Post-study work" value={`${country.postStudyWorkVisaMonths} months`} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#182033]">Why {topCountry?.name} is recommended</h2>
            </div>
            <div className="space-y-3">
              {(topCountry?.meta?.highlights ?? []).slice(0, 5).map((highlight) => (
                <CheckLine key={highlight} text={highlight} />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#7c4a03]">Considerations</h2>
            <div className="mt-4 space-y-3">
              {(topCountry?.meta?.considerations ?? []).map((consideration) => (
                <div key={consideration} className="flex gap-3 text-sm font-medium leading-6 text-[#8a5a09]">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <span>{consideration}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#d8e7ff] bg-[#f5f9ff] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#182033]">What should you do next?</h2>
            <div className="mt-4 space-y-2">
              <ActionRow label={`Find universities in ${topCountry?.name ?? "selected country"}`} onClick={onFindUniversities} />
              <ActionRow label={`Explore scholarships in ${topCountry?.name ?? "selected country"}`} onClick={onFindScholarships} />
              <ActionRow label="Go to dashboard" onClick={onDashboard} />
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#182033]">Ready to take the next step?</h2>
            <p className="mt-1 text-sm text-[#667085]">Save the recommended country to personalize university and scholarship recommendations.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[700px]">
            <button type="button" onClick={onSaveCountry} disabled={Boolean(savingCountryId)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5f3bd7] text-sm font-semibold text-white shadow-sm hover:bg-[#4f2fca] disabled:cursor-not-allowed disabled:opacity-60">
              <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Save {topCountry?.name ?? "country"}
            </button>
            <button type="button" onClick={onFindUniversities} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]">
              <Landmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Find universities
            </button>
            <button type="button" onClick={onFindScholarships} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]">
              <GraduationCap className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Find scholarships
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailTabContent({ country, activeTab }: { country: Country; activeTab: (typeof detailTabs)[number] }) {
  if (activeTab === "Cost of Study") {
    return (
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <InfoCard icon={WalletCards} title="Tuition fees" value={formatRange(country.meta?.tuitionMinUsd, country.meta?.tuitionMaxUsd)} caption="Master's programs" />
        <InfoCard icon={PiggyBank} title="Living cost" value={`USD ${formatNumber(country.averageLivingCostUsd)}`} caption="Estimated monthly cost" />
        <InfoCard icon={CircleDollarSign} title="Total annual cost" value={`USD ${formatNumber(country.decision?.estimatedAnnualCostUsd ?? 0)}`} caption={country.decision?.budgetFit ?? "Budget fit"} />
        <InfoCard icon={ShieldCheck} title="Proof of funds" value={`USD ${formatNumber(country.meta?.proofOfFundsUsd ?? 0)}`} caption="Visa planning estimate" />
      </section>
    );
  }

  if (activeTab === "Visa") {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <DetailPanel title="Visa overview">
          <FactRow icon={ShieldCheck} label="Visa difficulty" value={country.visaDifficulty} />
          <FactRow icon={CircleDollarSign} label="Visa fee" value={`USD ${formatNumber(country.meta?.visaFeeUsd ?? 0)}`} />
          <FactRow icon={WalletCards} label="Proof of funds" value={`USD ${formatNumber(country.meta?.proofOfFundsUsd ?? 0)}`} />
          <FactRow icon={ClipboardCheck} label="PR pathway" value={country.meta?.prPathwayDifficulty ?? "Moderate"} />
        </DetailPanel>
        <DetailPanel title="Official information">
          <p className="text-sm leading-6 text-[#667085]">Always confirm visa requirements through official immigration pages before applying.</p>
          <a href={country.meta?.officialVisaUrl ?? "#"} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ff] bg-white px-4 text-sm font-semibold text-[#5f3bd7] hover:bg-[#f7f5ff]">
            Official visa page
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </a>
        </DetailPanel>
      </section>
    );
  }

  if (activeTab === "Work") {
    return (
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <InfoCard icon={BriefcaseBusiness} title="Part-time work" value={`${country.partTimeWorkHours} hrs/week`} caption="During studies" />
        <InfoCard icon={MapPin} title="Post-study work" value={`${country.postStudyWorkVisaMonths} months`} caption="Search period" />
        <InfoCard icon={Target} title="Job market" value={country.meta?.jobMarketStrength ?? "Good"} caption="Profile-weighted score" />
      </section>
    );
  }

  if (activeTab === "Scholarships") {
    return (
      <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#182033]">Scholarships in {country.name}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(country.matchingScholarships ?? []).map((scholarship) => (
            <div key={scholarship.id} className="rounded-lg border border-[#edf0f6] p-4">
              <p className="text-sm font-semibold text-[#182033]">{scholarship.name}</p>
              <p className="mt-1 text-sm text-[#667085]">{scholarship.coverageType} - {scholarship.amountUsd ? `USD ${formatNumber(scholarship.amountUsd)}` : "Amount varies"}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeTab === "Job Market") {
    return (
      <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#182033]">Career fit</h2>
        <p className="mt-2 text-sm leading-6 text-[#667085]">{country.decision?.recommendation}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniMetric label="Market strength" value={country.meta?.jobMarketStrength ?? "-"} />
          <MiniMetric label="Work after study" value={`${country.postStudyWorkVisaMonths} months`} />
          <MiniMetric label="Student friendly" value={country.meta?.studentFriendliness ?? "-"} />
        </div>
      </section>
    );
  }

  if (activeTab === "Cities") {
    return (
      <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#182033]">Popular student cities</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(country.meta?.popularCities ?? []).map((city) => (
            <div key={city} className="rounded-lg border border-[#edf0f6] bg-[#fbfcff] p-4">
              <MapPin className="h-5 w-5 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[#182033]">{city}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeTab === "Student Life") {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <DetailPanel title={`Best for students who want ${country.name}`}>
          <div className="space-y-3">
            {(country.meta?.highlights ?? []).map((highlight) => (
              <CheckLine key={highlight} text={highlight} />
            ))}
          </div>
        </DetailPanel>
        <DetailPanel title="Student insight">
          <p className="text-sm leading-6 text-[#667085]">{country.meta?.insight}</p>
        </DetailPanel>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <InfoCard icon={WalletCards} title="Avg. tuition fee" value={formatRange(country.meta?.tuitionMinUsd, country.meta?.tuitionMaxUsd)} caption="Per year" />
        <InfoCard icon={PiggyBank} title="Avg. living cost" value={`USD ${formatNumber(country.averageLivingCostUsd)}`} caption="Per month" />
        <InfoCard icon={BriefcaseBusiness} title="Post-study work" value={`${country.postStudyWorkVisaMonths} months`} caption="Search period" />
        <InfoCard icon={CalendarDays} title="Part-time work" value={`${country.partTimeWorkHours} hrs/week`} caption="During studies" />
        <InfoCard icon={Languages} title="Language" value={country.meta?.languageBarrier ?? "Medium"} caption={country.languageRequirement} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <DetailPanel title={`About ${country.name}`}>
          <p className="text-sm leading-6 text-[#667085]">{country.notes ?? country.meta?.insight}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(country.meta?.highlights ?? []).slice(0, 4).map((highlight) => (
              <span key={highlight} className="rounded-full bg-[#f3efff] px-3 py-1 text-xs font-semibold text-[#5f3bd7]">{highlight}</span>
            ))}
          </div>
        </DetailPanel>
        <div className="overflow-hidden rounded-xl border border-[#e3e8f4] bg-white shadow-sm">
          <div className="h-64" style={{ background: getCountryTheme(country.name) }}>
            <div className="flex h-full items-end bg-gradient-to-t from-black/45 to-transparent p-5">
              <div className="text-white">
                <p className="text-lg font-semibold">Explore {country.name}</p>
                <p className="mt-1 text-sm text-white/80">{country.meta?.popularCities.slice(0, 3).join(" - ")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DetailPanel title="Best fit">
          <div className="space-y-3">
            <CheckLine text={country.decision?.recommendation ?? "This country has a balanced profile for your study plan."} />
            <CheckLine text={`${country.meta?.jobMarketStrength ?? "Good"} job market for your selected field.`} />
            <CheckLine text={`${country.meta?.scholarshipAvailability ?? "Medium"} scholarship availability in the catalog.`} />
          </div>
        </DetailPanel>
        <DetailPanel title="Planning snapshot">
          <FactRow icon={CircleDollarSign} label="Estimated yearly cost" value={`USD ${formatNumber(country.decision?.estimatedAnnualCostUsd ?? 0)}`} />
          <FactRow icon={ShieldCheck} label="Visa difficulty" value={country.visaDifficulty} />
          <FactRow icon={Languages} label="Language barrier" value={country.meta?.languageBarrier ?? "Medium"} />
        </DetailPanel>
        <DetailPanel title="Watch before applying">
          <div className="space-y-3">
            {(country.meta?.considerations ?? ["Verify official admission and visa requirements before applying."]).map((consideration) => (
              <div key={consideration} className="flex gap-3 text-sm font-medium leading-6 text-[#5c667a]">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span>{consideration}</span>
              </div>
            ))}
          </div>
        </DetailPanel>
      </section>
    </div>
  );
}

function SelectionPanel({
  countries,
  selectedCountries,
  countryToAdd,
  comparing,
  onSetCountryToAdd,
  onAddCountry,
  onRemoveCountry,
  onCompare
}: {
  countries: Country[];
  selectedCountries: Country[];
  countryToAdd: string;
  comparing: boolean;
  onSetCountryToAdd: (id: string) => void;
  onAddCountry: (id: string) => void;
  onRemoveCountry: (id: string) => void;
  onCompare: () => void;
}) {
  return (
    <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#182033]">Selected countries ({selectedCountries.length}/4)</h2>
        <button type="button" onClick={() => selectedCountries.forEach((country) => onRemoveCountry(country.id))} className="text-xs font-semibold text-[#5f3bd7]">Clear all</button>
      </div>
      <div className="space-y-2">
        {selectedCountries.map((country) => (
          <div key={country.id} className="flex items-center justify-between rounded-lg border border-[#e7eaf3] bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <FlagMark countryName={country.name} small />
              <span className="text-sm font-semibold text-[#182033]">{country.name}</span>
            </div>
            <button type="button" onClick={() => onRemoveCountry(country.id)} title={`Remove ${country.name}`} className="text-[#8b95aa] hover:text-[#344054]">
              <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        ))}
        <select
          value={countryToAdd}
          onChange={(event) => {
            onSetCountryToAdd(event.target.value);
            onAddCountry(event.target.value);
          }}
          className="h-11 w-full rounded-lg border border-dashed border-[#cfc7ff] bg-white px-3 text-sm font-medium text-[#5f3bd7] outline-none"
        >
          <option value="">Add another country</option>
          {countries.filter((country) => !selectedCountries.some((selected) => selected.id === country.id)).map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onCompare}
        disabled={selectedCountries.length < 2 || comparing}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5f3bd7] text-sm font-semibold text-white shadow-sm hover:bg-[#4f2fca] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        {comparing ? "Comparing..." : "Compare countries"}
      </button>
      <p className="mt-3 text-center text-xs font-medium text-[#7a8194]">See side-by-side comparison</p>
    </section>
  );
}

function ProfileSummaryPanel({ profile, profileCompletion, compact = false }: { profile: ProfileResponse["profile"]; profileCompletion: number; compact?: boolean }) {
  const rows = [
    ["Degree level", profile?.targetDegree ?? "Add degree"],
    ["Field of study", profile?.fieldOfStudy ?? "Add field"],
    ["Budget", profile ? `Up to USD ${formatNumber(profile.budgetUsd)}` : "Add budget"],
    ["TOEFL / IELTS", profile?.ieltsScore ? `${profile.ieltsScore} overall` : profile?.toeflScore ? `${profile.toeflScore} TOEFL` : "Add score"],
    ["Career goal", profile?.careerGoal ?? "Add goal"],
    ["Intake", profile?.preferredIntake ?? "Add intake"]
  ];

  return (
    <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#182033]">Your profile summary</h2>
        <span className="text-xs font-semibold text-[#5f3bd7]">{profileCompletion}%</span>
      </div>
      <div className={`grid gap-3 ${compact ? "" : ""}`}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 border-b border-[#f0f2f7] pb-2 last:border-0 last:pb-0">
            <span className="text-xs font-semibold text-[#667085]">{label}</span>
            <span className="max-w-[160px] text-right text-xs font-semibold text-[#27314f]">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TipPanel() {
  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
        <p className="text-sm font-medium leading-6 text-emerald-800">Add target countries, budget, test score, and career goal in your profile for sharper country recommendations.</p>
      </div>
    </section>
  );
}

function CountryExplorerCard({ country, selected, onToggle, onOpenDetail }: { country: Country; selected: boolean; onToggle: () => void; onOpenDetail: () => void }) {
  return (
    <article className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${selected ? "border-[#8b6df7] ring-2 ring-[#ece7ff]" : "border-[#e3e8f4] hover:border-[#cfc7ff]"}`}>
      <div className="h-28" style={{ background: getCountryTheme(country.name) }}>
        <div className="flex h-full items-start justify-between bg-gradient-to-t from-black/35 to-white/5 p-3">
          <FlagMark countryName={country.name} />
          <button type="button" onClick={onToggle} title={selected ? "Remove from comparison" : "Add to comparison"} className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? "bg-[#5f3bd7] text-white" : "bg-white/90 text-[#5f3bd7]"}`}>
            {selected ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Bookmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#182033]">{country.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#667085]">{country.meta?.insight ?? country.notes}</p>
          </div>
          <ScorePill score={scoreOf(country)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SmallTag>{costTier(country)}</SmallTag>
          <SmallTag>{country.meta?.scholarshipAvailability ?? "Medium"} scholarships</SmallTag>
          <SmallTag>{country.meta?.jobMarketStrength ?? "Good"} jobs</SmallTag>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Universities" value={`${country.universityCount ?? 0}`} />
          <MiniMetric label="Monthly" value={`$${formatNumber(country.averageLivingCostUsd)}`} />
          <MiniMetric label="Work" value={`${country.postStudyWorkVisaMonths}m`} />
        </div>
        <button type="button" onClick={onOpenDetail} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#dce3f0] bg-white text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
          View details
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function RankingPanel({ countries }: { countries: Country[] }) {
  return (
    <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#182033]">Overall ranking</h2>
      <p className="mt-1 text-xs font-medium text-[#667085]">Based on profile and priorities</p>
      <div className="mt-4 space-y-3">
        {countries.map((country, index) => (
          <div key={country.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <RankBadge rank={index + 1} small />
              <FlagMark countryName={country.name} small />
              <span className="truncate text-sm font-semibold text-[#182033]">{country.name}</span>
            </div>
            <span className="rounded-lg border border-[#edf0f6] px-2 py-1 text-xs font-semibold text-[#344054]">{scoreOf(country)} / 100</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RadarPanel({ countries }: { countries: Country[] }) {
  return (
    <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#182033]">Profile match breakdown</h2>
      <div className="mt-4">
        <RadarChart countries={countries.slice(0, 3)} />
      </div>
    </section>
  );
}

function NextStepsPanel({ onSummary, onOpenDetail }: { onSummary: () => void; onOpenDetail: () => void }) {
  return (
    <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#182033]">What is next?</h2>
      <div className="mt-4 space-y-2">
        <ActionRow label="View recommendation summary" onClick={onSummary} />
        <ActionRow label="Inspect top country details" onClick={onOpenDetail} />
      </div>
    </section>
  );
}

function CompareRow({ icon: Icon, label, countries, render }: { icon: ElementType; label: string; countries: Country[]; render: (country: Country) => React.ReactNode }) {
  return (
    <tr>
      <td className="px-4 py-4 font-semibold text-[#344054]">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#6d3df4]" strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </div>
      </td>
      {countries.map((country) => (
        <td key={country.id} className="px-4 py-4 text-[#27314f]">{render(country)}</td>
      ))}
    </tr>
  );
}

function RadarChart({ countries }: { countries: Country[] }) {
  const axes = [
    { label: "Affordability", value: (country: Country) => (country.decision?.breakdown.affordability ?? 0) / 25 },
    { label: "Job market", value: (country: Country) => (country.decision?.breakdown.jobMarket ?? 0) / 20 },
    { label: "Visa", value: (country: Country) => (country.decision?.breakdown.visaFriendliness ?? 0) / 15 },
    { label: "Post-study", value: (country: Country) => (country.decision?.breakdown.postStudyWork ?? 0) / 10 },
    { label: "Scholarships", value: (country: Country) => (country.decision?.breakdown.scholarships ?? 0) / 15 },
    { label: "Language", value: (country: Country) => (country.decision?.breakdown.language ?? 0) / 10 }
  ];
  const colors = ["#16a34a", "#2563eb", "#7c3aed"];
  const center = 110;
  const radius = 72;

  function point(index: number, scale: number) {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
  }

  return (
    <svg viewBox="0 0 220 220" className="h-[220px] w-full">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={axes.map((_axis, index) => point(index, scale)).join(" ")}
          fill="none"
          stroke="#e7eaf3"
          strokeWidth="1"
        />
      ))}
      {axes.map((axis, index) => (
        <g key={axis.label}>
          <line x1={center} y1={center} x2={point(index, 1).split(",")[0]} y2={point(index, 1).split(",")[1]} stroke="#edf0f6" strokeWidth="1" />
          <text x={point(index, 1.18).split(",")[0]} y={point(index, 1.18).split(",")[1]} textAnchor="middle" className="fill-[#667085] text-[9px] font-semibold">
            {axis.label}
          </text>
        </g>
      ))}
      {countries.map((country, countryIndex) => (
        <polygon
          key={country.id}
          points={axes.map((axis, axisIndex) => point(axisIndex, Math.max(0.08, Math.min(1, axis.value(country))))).join(" ")}
          fill={colors[countryIndex]}
          fillOpacity="0.16"
          stroke={colors[countryIndex]}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function StatTile({ icon: Icon, label, value, accent }: { icon: ElementType; label: string; value: string; accent: "green" | "purple" | "orange" | "blue" | "pink" }) {
  const accents = {
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-[#f3efff] text-[#6d3df4]",
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-600",
    pink: "bg-pink-50 text-pink-600"
  };

  return (
    <div className="rounded-xl border border-[#e3e8f4] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accents[accent]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xl font-semibold text-[#182033]">{value}</p>
          <p className="text-xs font-semibold text-[#667085]">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[#344054]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-[#dce3f0] bg-white px-3 text-sm font-medium text-[#27314f] outline-none focus:border-[#8b6df7] focus:ring-2 focus:ring-[#ece7ff]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function CheckFilter({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[#344054]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-[#cfd6e3] accent-[#5f3bd7]" />
      <span>{label}</span>
    </label>
  );
}

function StepBadge({ label }: { label: string }) {
  return <span className="rounded-full bg-[#f3efff] px-3 py-1 text-xs font-semibold text-[#5f3bd7]">{label}</span>;
}

function ScoreRing({ score, size }: { score: number; size: "sm" | "md" }) {
  const dimension = size === "sm" ? 62 : 82;
  const stroke = 7;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: dimension, height: dimension }}>
      <svg viewBox={`0 0 ${dimension} ${dimension}`} className="-rotate-90">
        <circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke="#ece7fb" strokeWidth={stroke} />
        <circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke={score >= 85 ? "#16a34a" : score >= 70 ? "#f59e0b" : "#ef4444"} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#182033]">{score}%</div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  return <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{score}</span>;
}

function SmallTag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#f4f6fb] px-2.5 py-1 text-xs font-semibold text-[#667085]">{children}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f8f9fc] px-3 py-2">
      <p className="text-[11px] font-semibold text-[#667085]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#182033]">{value}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, title, value, caption }: { icon: ElementType; title: string; value: string; caption: string }) {
  return (
    <article className="min-h-[128px] rounded-xl border border-[#e3e8f4] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3efff] text-[#6d3df4]">
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#667085]">{title}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-6 text-[#182033]">{value}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-[#7a8194]">{caption}</p>
        </div>
      </div>
    </article>
  );
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e3e8f4] bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#182033]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FactRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f2f7] pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm font-medium text-[#667085]">
        <Icon className="h-4 w-4 text-[#6d3df4]" strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <span className="max-w-[170px] text-right text-sm font-semibold text-[#182033]">{value}</span>
    </div>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <div className="flex gap-3 text-sm font-medium leading-6 text-[#344054]">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function RecommendationTile({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600">
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold text-emerald-700">{label}</p>
        <p className="mt-1 text-sm font-semibold text-[#182033]">{value}</p>
      </div>
    </div>
  );
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-11 w-full items-center justify-between rounded-lg bg-white px-3 text-left text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]">
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

function EmptyPanel({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <section className="rounded-xl border border-dashed border-[#cfd6e3] bg-white p-10 text-center shadow-sm">
      <Globe2 className="mx-auto h-8 w-8 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-[#182033]">{title}</h2>
      <p className="mt-2 text-sm text-[#667085]">{description}</p>
      <button type="button" onClick={onAction} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#5f3bd7] px-4 text-sm font-semibold text-white hover:bg-[#4f2fca]">
        {actionLabel}
      </button>
    </section>
  );
}

function CountryLoading() {
  return (
    <div className="mx-auto max-w-[1220px] space-y-5">
      <div className="h-28 animate-pulse rounded-xl bg-white" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-white lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-white" />
      </div>
    </div>
  );
}

function FlagMark({ countryName, small = false }: { countryName: string; small?: boolean }) {
  return (
    <span
      className={`${small ? "h-5 w-7" : "h-8 w-11"} shrink-0 rounded border border-white/60 shadow-sm`}
      style={{ background: getFlagBackground(countryName) }}
      aria-hidden="true"
    />
  );
}

function FlagPoster({ countryName }: { countryName: string }) {
  return (
    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-[#e3e8f4] shadow-sm">
      <div className="h-full w-full" style={{ background: getFlagBackground(countryName) }} />
    </div>
  );
}

function LogoBox({ label }: { label: string }) {
  const initials = label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf5ff] text-xs font-semibold text-[#2563eb]">
      {initials}
    </span>
  );
}

function RankBadge({ rank, small = false }: { rank: number; small?: boolean }) {
  const colors = rank === 1 ? "bg-amber-100 text-amber-700" : rank === 2 ? "bg-slate-100 text-slate-600" : "bg-orange-100 text-orange-700";

  return <span className={`flex ${small ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"} shrink-0 items-center justify-center rounded-full font-semibold ${colors}`}>{rank}</span>;
}

function matchesFilters(country: Country, filters: Filters) {
  const meta = country.meta;
  const search = filters.search.trim().toLowerCase();

  if (search) {
    const haystack = [
      country.name,
      country.notes,
      meta?.region,
      meta?.popularCities.join(" "),
      meta?.highlights.join(" ")
    ].filter(Boolean).join(" ").toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (filters.region !== "ALL" && meta?.region !== filters.region) {
    return false;
  }

  if (filters.tuition !== "ALL" && costBucket(meta?.tuitionMaxUsd ?? 0) !== filters.tuition) {
    return false;
  }

  if (filters.living !== "ALL" && livingBucket(country.averageLivingCostUsd) !== filters.living) {
    return false;
  }

  if (filters.scholarships !== "ALL" && meta?.scholarshipAvailability.toUpperCase() !== filters.scholarships) {
    return false;
  }

  if (filters.jobMarket !== "ALL") {
    const order = ["Growing", "Good", "Strong", "Excellent"];
    if (order.indexOf(meta?.jobMarketStrength ?? "Good") < order.indexOf(toTitle(filters.jobMarket))) {
      return false;
    }
  }

  if (filters.postStudy !== "ALL" && country.postStudyWorkVisaMonths < Number(filters.postStudy)) {
    return false;
  }

  if (filters.language === "LOW" && meta?.languageBarrier !== "Low") {
    return false;
  }

  if (filters.language === "ENGLISH" && !country.languageRequirement.toLowerCase().includes("english")) {
    return false;
  }

  if (filters.fullyFunded && !(country.matchingScholarships ?? []).some((scholarship) => /full|major/i.test(scholarship.coverageType))) {
    return false;
  }

  if (filters.englishFriendly && !country.languageRequirement.toLowerCase().includes("english")) {
    return false;
  }

  if (filters.lowVisaDifficulty && country.visaDifficulty.toLowerCase() === "high") {
    return false;
  }

  if (filters.strongPrPathway && meta?.prPathwayDifficulty === "Hard") {
    return false;
  }

  return true;
}

function scoreOf(country: Country) {
  return country.decision?.decisionScore ?? 0;
}

function scoreLabel(score: number) {
  if (score >= 85) {
    return "Excellent match";
  }

  if (score >= 75) {
    return "Strong match";
  }

  if (score >= 65) {
    return "Good match";
  }

  return "Needs review";
}

function costTier(country: Country) {
  const maxTuition = country.meta?.tuitionMaxUsd ?? 0;

  if (maxTuition <= 7000) {
    return "Low cost";
  }

  if (maxTuition <= 18000) {
    return "Medium cost";
  }

  return "Higher cost";
}

function costBucket(maxTuition: number): TuitionFilter {
  if (maxTuition <= 7000) {
    return "LOW";
  }

  if (maxTuition <= 18000) {
    return "MEDIUM";
  }

  return "HIGH";
}

function livingBucket(monthlyCost: number): LivingFilter {
  if (monthlyCost <= 850) {
    return "LOW";
  }

  if (monthlyCost <= 1300) {
    return "MEDIUM";
  }

  return "HIGH";
}

function toTitle(value: string) {
  return value.slice(0, 1) + value.slice(1).toLowerCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatRange(min?: number, max?: number) {
  if (!min && !max) {
    return "-";
  }

  return `USD ${formatNumber(min ?? 0)} - ${formatNumber(max ?? 0)}`;
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

function getFlagBackground(countryName: string) {
  const name = normalizeCountryName(countryName);
  const flags: Record<string, string> = {
    belgium: "linear-gradient(90deg, #111827 0 33%, #facc15 33% 66%, #dc2626 66% 100%)",
    poland: "linear-gradient(180deg, #f8fafc 0 50%, #dc2626 50% 100%)",
    france: "linear-gradient(90deg, #2563eb 0 33%, #ffffff 33% 66%, #ef4444 66% 100%)",
    germany: "linear-gradient(180deg, #111827 0 33%, #dc2626 33% 66%, #facc15 66% 100%)",
    netherlands: "linear-gradient(180deg, #dc2626 0 33%, #ffffff 33% 66%, #2563eb 66% 100%)",
    canada: "linear-gradient(90deg, #dc2626 0 25%, #ffffff 25% 75%, #dc2626 75% 100%)",
    australia: "linear-gradient(135deg, #1d4ed8 0 55%, #0f766e 55% 100%)",
    sweden: "linear-gradient(90deg, #2563eb 0 32%, #facc15 32% 42%, #2563eb 42% 100%)",
    ireland: "linear-gradient(90deg, #16a34a 0 33%, #ffffff 33% 66%, #f97316 66% 100%)",
    "united kingdom": "linear-gradient(135deg, #1d4ed8 0 35%, #ffffff 35% 45%, #dc2626 45% 56%, #ffffff 56% 66%, #1d4ed8 66% 100%)",
    "united states": "repeating-linear-gradient(180deg, #dc2626 0 8%, #ffffff 8% 16%)"
  };

  return flags[name] ?? "linear-gradient(135deg, #6d3df4, #2563eb)";
}

function getCountryTheme(countryName: string) {
  const name = normalizeCountryName(countryName);
  const themes: Record<string, string> = {
    belgium: "linear-gradient(135deg, #111827 0%, #facc15 55%, #dc2626 100%)",
    poland: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #dc2626 100%)",
    france: "linear-gradient(135deg, #2563eb 0%, #f8fafc 48%, #ef4444 100%)",
    germany: "linear-gradient(135deg, #111827 0%, #dc2626 48%, #facc15 100%)",
    netherlands: "linear-gradient(135deg, #dc2626 0%, #f8fafc 48%, #2563eb 100%)",
    canada: "linear-gradient(135deg, #dc2626 0%, #f8fafc 52%, #dc2626 100%)",
    australia: "linear-gradient(135deg, #1d4ed8 0%, #0f766e 58%, #facc15 100%)",
    sweden: "linear-gradient(135deg, #2563eb 0%, #facc15 55%, #2563eb 100%)",
    ireland: "linear-gradient(135deg, #16a34a 0%, #f8fafc 45%, #f97316 100%)",
    "united kingdom": "linear-gradient(135deg, #1d4ed8 0%, #ef4444 55%, #f8fafc 100%)",
    "united states": "linear-gradient(135deg, #1d4ed8 0%, #f8fafc 48%, #dc2626 100%)"
  };

  return themes[name] ?? "linear-gradient(135deg, #6d3df4 0%, #2563eb 55%, #10b981 100%)";
}
