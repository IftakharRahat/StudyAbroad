import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Filter, GraduationCap, RefreshCw, Search, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { Country, UniversityMatch, UniversityMatchesResponse } from "../types";

type CategoryFilter = "ALL" | "SAFE" | "TARGET" | "REACH";

const categories: Array<{ value: CategoryFilter; label: string }> = [
  {
    value: "ALL",
    label: "All"
  },
  {
    value: "SAFE",
    label: "Safe"
  },
  {
    value: "TARGET",
    label: "Target"
  },
  {
    value: "REACH",
    label: "Reach"
  }
];

export function MatchingPage() {
  const { token } = useAuth();
  const [matches, setMatches] = useState<UniversityMatch[]>([]);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [country, setCountry] = useState("");
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [field, setField] = useState("");
  const [maxTuition, setMaxTuition] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const countryMatch = country ? match.program.university.country.name.toLowerCase().includes(country.toLowerCase()) : true;
      const fieldMatch = field ? match.program.field.toLowerCase().includes(field.toLowerCase()) : true;
      const tuitionMatch = maxTuition ? match.program.tuitionUsd <= Number(maxTuition) : true;
      const categoryMatch = category === "ALL" ? true : match.category === category;

      return countryMatch && fieldMatch && tuitionMatch && categoryMatch;
    });
  }, [category, country, field, matches, maxTuition]);

  const counts = useMemo(() => ({
    ALL: matches.length,
    SAFE: matches.filter((match) => match.category === "SAFE").length,
    TARGET: matches.filter((match) => match.category === "TARGET").length,
    REACH: matches.filter((match) => match.category === "REACH").length
  }), [matches]);

  async function loadInitialData() {
    if (!token) {
      return;
    }

    try {
      const [matchResponse, countryResponse] = await Promise.all([
        apiRequest<UniversityMatchesResponse>("/matches/universities", {
          token
        }),
        apiRequest<{ countries: Country[] }>("/catalog/countries", {
          token
        })
      ]);

      setCountryOptions(countryResponse.countries.map((item) => item.name));

      if (matchResponse.universityMatches.length) {
        setMatches(matchResponse.universityMatches);
      } else {
        await generateMatches(false);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load university matches");
    } finally {
      setLoading(false);
    }
  }

  async function generateMatches(showMessage = true) {
    setGenerating(true);
    setError("");
    if (showMessage) {
      setMessage("");
    }

    try {
      const response = await apiRequest<UniversityMatchesResponse>("/matches/universities/generate", {
        method: "POST",
        token
      });
      setMatches(response.universityMatches);
      if (showMessage) {
        setMessage("University matches generated");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate university matches");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="text-sm font-medium text-[#667085]">Loading university matches</div>;
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]">
              <GraduationCap className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-[#151b2d]">Smart University Matching</h1>
              <p className="mt-2 text-sm text-[#667085]">Programs are grouped by profile fit, requirements, budget, country preference, and readiness score.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => generateMatches()}
            disabled={generating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-5 text-sm font-medium text-white hover:bg-[#5f35d8] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} strokeWidth={1.8} aria-hidden="true" />
            <span>{generating ? "Generating" : "Generate matches"}</span>
          </button>
        </div>
      </section>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <div>
              <p className="font-medium">{error}</p>
              <Link to="/profile" className="mt-1 inline-block font-medium underline">Review profile</Link>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[#344054]">
          <Filter className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          <span>Filters</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <CountrySelect value={country} onChange={setCountry} options={countryOptions} />
          <FilterInput icon={Search} label="Field" value={field} onChange={setField} placeholder="Computer Science" />
          <FilterInput icon={Search} label="Max tuition" value={maxTuition} onChange={setMaxTuition} placeholder="25000" type="number" />
          <button
            type="button"
            onClick={() => {
              setCountry("");
              setField("");
              setMaxTuition("");
              setCategory("ALL");
            }}
            className="self-end rounded-lg border border-[#dfe4ef] px-4 py-2.5 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb]"
          >
            Clear
          </button>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${category === item.value ? "border-[#6d3df4] bg-[#f4f1ff] text-[#5f3bd7]" : "border-[#dfe4ef] bg-white text-[#667085] hover:bg-[#f8f8fb]"}`}
          >
            {item.label} <span className="ml-1 text-xs text-[#8b92a7]">{counts[item.value]}</span>
          </button>
        ))}
      </div>

      {filteredMatches.length ? (
        <section className="grid gap-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-[#d6dbe8] bg-white p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#151b2d]">No university matches yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">Generate matches after completing your profile and readiness scorecard.</p>
          <button
            type="button"
            onClick={() => generateMatches()}
            disabled={generating}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-5 text-sm font-medium text-white hover:bg-[#5f35d8] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} strokeWidth={1.8} aria-hidden="true" />
            <span>{generating ? "Generating" : "Generate matches"}</span>
          </button>
        </section>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: UniversityMatch }) {
  const tone = getCategoryTone(match.category);

  return (
    <article className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${tone.badge}`}>{formatCategory(match.category)}</span>
            <span className="rounded-md bg-[#f6f7fb] px-2.5 py-1 text-xs font-medium text-[#667085]">{match.program.university.rankingBand}</span>
          </div>
          <h2 className="text-lg font-semibold text-[#151b2d]">{match.program.title}</h2>
          <p className="mt-1 text-sm text-[#667085]">
            {match.program.university.name}, {match.program.university.city}, {match.program.university.country.name}
          </p>
          <div className="mt-4 grid gap-3 text-sm text-[#344054] sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Field" value={match.program.field} />
            <Info label="Tuition" value={`USD ${formatNumber(match.program.tuitionUsd)}`} />
            <Info label="Min CGPA" value={match.program.minCgpa.toFixed(2)} />
            <Info label="IELTS" value={match.program.minIelts ? match.program.minIelts.toFixed(1) : "Flexible"} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold ${tone.score}`}>
            {match.score}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#edf0f6] pt-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#344054]">
          <TrendingUp className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          <span>Why this match</span>
        </div>
        <ul className="grid gap-2 text-sm leading-6 text-[#667085] lg:grid-cols-2">
          {match.reasons.slice(0, 6).map((reason) => (
            <li key={reason} className="flex gap-2 rounded-lg bg-[#f8f9fc] px-3 py-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function FilterInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#344054]">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-3 focus-within:border-[#5f3bd7] focus-within:ring-2 focus-within:ring-[#5f3bd7]/10">
        <Icon className="h-4 w-4 text-[#8b92a7]" strokeWidth={1.8} aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          className="w-full border-0 bg-transparent text-sm font-normal text-[#344054] outline-none placeholder:text-[#a0a7b8]"
        />
      </div>
    </label>
  );
}

function CountrySelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#344054]">Country</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-[#dfe4ef] bg-white px-3 text-sm font-normal text-[#344054] outline-none transition focus:border-[#5f3bd7] focus:ring-2 focus:ring-[#5f3bd7]/10"
      >
        <option value="">All countries</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#8b92a7]">{label}</p>
      <p className="mt-1 font-medium text-[#27314f]">{value}</p>
    </div>
  );
}

function getCategoryTone(category: UniversityMatch["category"]) {
  if (category === "SAFE") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      score: "bg-emerald-50 text-emerald-700"
    };
  }

  if (category === "TARGET") {
    return {
      badge: "bg-blue-50 text-blue-700",
      score: "bg-blue-50 text-blue-700"
    };
  }

  return {
    badge: "bg-amber-50 text-amber-700",
    score: "bg-amber-50 text-amber-700"
  };
}

function formatCategory(category: UniversityMatch["category"]) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}
