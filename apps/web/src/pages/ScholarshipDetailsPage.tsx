import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  GraduationCap,
  Info,
  Landmark,
  ListChecks,
  ShieldCheck,
  Star,
  UserRound
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { ProfileResponse, Scholarship, ScholarshipDetailResponse } from "../types";

const tabs = ["Overview", "Eligibility", "Required Documents", "Coverage & Benefits", "How to Apply", "About University"];

export function ScholarshipDetailsPage() {
  const { scholarshipId } = useParams();
  const { token } = useAuth();
  const [detail, setDetail] = useState<ScholarshipDetailResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse["profile"]>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDeadline, setAddingDeadline] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scholarshipId, token]);

  const scholarship = detail?.scholarship;
  const match = detail?.match;
  const score = match?.matchingPercentage ?? 0;
  const status = match?.status ?? "ALMOST_ELIGIBLE";
  const eligibilityItems = useMemo(() => scholarship ? buildEligibilityItems(scholarship, profile, status) : [], [profile, scholarship, status]);

  async function loadDetail() {
    if (!token || !scholarshipId) {
      return;
    }

    try {
      const [detailResponse, profileResponse] = await Promise.all([
        apiRequest<ScholarshipDetailResponse>(`/scholarships/${scholarshipId}`, {
          token
        }),
        apiRequest<ProfileResponse>("/student/profile", {
          token
        })
      ]);
      setDetail(detailResponse);
      setProfile(profileResponse.profile);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load scholarship details");
    } finally {
      setLoading(false);
    }
  }

  async function saveScholarship() {
    if (!detail) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/scholarships/save", {
        method: "POST",
        token,
        body: JSON.stringify({
          scholarshipId: detail.scholarship.id
        })
      });
      setDetail({
        ...detail,
        scholarship: {
          ...detail.scholarship,
          isSaved: true,
          deadlineTracked: true
        }
      });
      setMessage("Scholarship saved and deadline added to tracker");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save scholarship");
    } finally {
      setSaving(false);
    }
  }

  async function addDeadline() {
    if (!detail) {
      return;
    }

    setAddingDeadline(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/scholarships/${detail.scholarship.id}/deadline`, {
        method: "POST",
        token
      });
      setDetail({
        ...detail,
        scholarship: {
          ...detail.scholarship,
          deadlineTracked: true
        }
      });
      setMessage("Deadline added to tracker");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not add deadline");
    } finally {
      setAddingDeadline(false);
    }
  }

  if (loading) {
    return <div className="text-sm font-medium text-[#667085]">Loading scholarship details</div>;
  }

  if (!detail || !scholarship) {
    return (
      <div className="mx-auto max-w-[920px] rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        {error || "Scholarship not found"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/scholarships" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d3df4]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Back to Results
        </Link>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={saveScholarship} disabled={saving || scholarship.isSaved} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8f8fb] disabled:opacity-60">
            <Bookmark className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {scholarship.isSaved ? "Saved Scholarship" : saving ? "Saving" : "Save Scholarship"}
          </button>
          <button type="button" onClick={addDeadline} disabled={addingDeadline || scholarship.deadlineTracked || !scholarship.deadline} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8f8fb] disabled:opacity-60">
            <CalendarPlus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {scholarship.deadlineTracked ? "Tracker Added" : addingDeadline ? "Adding" : "Add to Tracker"}
          </button>
          {scholarship.sourceUrl ? (
            <a href={scholarship.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-4 text-sm font-semibold text-white hover:bg-[#5f35d8]">
              Apply Now
              <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>

      {message ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}
      {error ? <ErrorNotice message={error} /> : null}

      <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_160px]">
          <div className="flex min-w-0 gap-4">
            <ScholarshipLogo scholarship={scholarship} />
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-[#151b2d]">{scholarship.name}</h1>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(status)}`}>{formatStatus(status)}</span>
              </div>
              <p className="text-sm font-medium text-[#667085]">
                {scholarship.university?.name ?? getScholarshipProvider(scholarship)} / {scholarship.country?.name ?? "Multiple countries"} / {scholarship.degreeLevel}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#344054]">{buildScholarshipDescription(scholarship)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{scholarship.amountUsd ? `USD ${formatNumber(scholarship.amountUsd)}` : "Funding"}</span>
                <span className="rounded-md bg-[#f4f1ff] px-2.5 py-1 text-xs font-semibold text-[#6d3df4]">{scholarship.coverageType}</span>
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">For International Students</span>
              </div>
              <div className="mt-5 grid gap-3 text-xs sm:grid-cols-4">
                <MiniMeta icon={CalendarDays} label="Deadline" value={formatDate(scholarship.deadline)} tone="red" />
                <MiniMeta icon={CircleDollarSign} label="Coverage" value={scholarship.amountUsd ? `USD ${formatNumber(scholarship.amountUsd)} / year` : "Varies"} tone="green" />
                <MiniMeta icon={GraduationCap} label="Degree Level" value={shortDegree(scholarship.degreeLevel)} tone="purple" />
                <MiniMeta icon={FileText} label="Subjects" value={scholarship.eligibleFields[0] ?? "All fields"} tone="blue" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start justify-center lg:items-center">
            <ScoreRing value={score} status={status} size="large" />
            <p className="mt-2 text-sm font-semibold text-[#344054]">Match Score</p>
            <span className={`mt-2 rounded-md px-3 py-1 text-xs font-semibold ${getStatusTone(status)}`}>{formatStatus(status)}</span>
          </div>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto border-t border-[#edf0f6] pt-4">
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === tab ? "bg-[#f4f1ff] text-[#6d3df4]" : "text-[#667085] hover:bg-[#f8f8fb]"}`}>
              {tab}
            </button>
          ))}
        </nav>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
            <InfoCard icon={Info} title="About the Scholarship">
              <p className="text-sm leading-6 text-[#344054]">{buildScholarshipDescription(scholarship)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[#f4f1ff] px-2.5 py-1 text-xs font-semibold text-[#6d3df4]">Merit Based</span>
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">For International Students</span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Developing Countries</span>
              </div>
            </InfoCard>

            <InfoCard icon={CalendarDays} title="Important Dates">
              <DateRow label="Application Opens" value="01 Sep 2026" />
              <DateRow label="Application Deadline" value={formatDate(scholarship.deadline)} urgent />
              <DateRow label="Result Announcement" value="31 Mar 2027" />
              <DateRow label="Program Start" value="Sep 2027" />
              <button type="button" onClick={addDeadline} disabled={addingDeadline || scholarship.deadlineTracked || !scholarship.deadline} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] text-sm font-semibold text-[#6d3df4] hover:bg-[#f4f1ff] disabled:opacity-60">
                <CalendarPlus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Add all to Deadline Tracker
              </button>
            </InfoCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <InfoCard icon={ShieldCheck} title="Coverage & Benefits">
              <BenefitList scholarship={scholarship} />
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                This is a {scholarship.coverageType.toLowerCase()} scholarship. Living expenses may depend on final award terms.
              </p>
            </InfoCard>

            <InfoCard icon={FileText} title="Required Documents">
              <ul className="grid gap-2 text-sm leading-6 text-[#344054] sm:grid-cols-2">
                {getDocuments(scholarship).map((document) => (
                  <li key={document} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d3df4]" />
                    {document}
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] text-sm font-semibold text-[#6d3df4] hover:bg-[#f4f1ff]">
                View Full Document List
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </InfoCard>
          </section>

          <InfoCard icon={ListChecks} title="How to Apply">
            <div className="grid gap-3 text-sm leading-6 text-[#344054] md:grid-cols-2">
              {["Check eligibility and prepare documents", "Apply for the master's program", "Submit scholarship materials before the deadline", "Track result updates from the official page"].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-lg bg-[#f8f9fc] px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6d3df4] text-xs font-semibold text-white">{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
            {scholarship.sourceUrl ? (
              <a href={scholarship.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] px-5 text-sm font-semibold text-[#6d3df4] hover:bg-[#f4f1ff]">
                View Official Page
                <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : null}
          </InfoCard>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
                <h2 className="text-base font-semibold text-[#151b2d]">Your Eligibility Summary</h2>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusTone(status)}`}>{formatStatus(status)}</span>
            </div>
            <div className="space-y-4">
              {eligibilityItems.map((item) => (
                <EligibilityRow key={item.label} item={item} />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[#edf0f6] pt-4">
              <span className="text-sm font-semibold text-[#344054]">Overall Match Score</span>
              <span className="text-lg font-semibold text-emerald-700">{score}%</span>
            </div>
          </section>

          <section className="rounded-xl border border-amber-100 bg-amber-50 p-5">
            <div className="mb-4 flex items-center gap-2 text-amber-800">
              <Star className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="text-base font-semibold">Why you are a good match</h2>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-[#344054]">
              {(match?.reasons ?? ["Your profile matches the stored eligibility rules."]).slice(0, 5).map((reason) => (
                <li key={reason} className="flex gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[#eadfff] bg-[#fbf9ff] p-5">
            <div className="mb-4 flex items-center gap-2 text-[#6d3df4]">
              <Landmark className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="text-base font-semibold">About {getScholarshipProvider(scholarship)}</h2>
            </div>
            <InfoPair label="Location" value={scholarship.country?.name ?? "Multiple countries"} />
            <InfoPair label="Type" value="Public Research University" />
            <InfoPair label="Funding" value={scholarship.coverageType} />
            <Link to="/matches" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#6d3df4] hover:bg-[#f4f1ff]">
              View University Profile
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#6d3df4]">
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-[#151b2d]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniMeta({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: string; tone: "red" | "green" | "purple" | "blue" }) {
  const colors = {
    red: "text-red-600",
    green: "text-emerald-600",
    purple: "text-[#6d3df4]",
    blue: "text-blue-600"
  };

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-medium text-[#8b92a7]">
        <Icon className={`h-3.5 w-3.5 ${colors[tone]}`} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-[#344054]">{value}</p>
    </div>
  );
}

function DateRow({ label, value, urgent = false }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-[#667085]">{label}</span>
      <span className={`font-semibold ${urgent ? "text-red-600" : "text-[#344054]"}`}>{value}</span>
    </div>
  );
}

function BenefitList({ scholarship }: { scholarship: Scholarship }) {
  const benefits = [
    scholarship.amountUsd ? `USD ${formatNumber(scholarship.amountUsd)} scholarship for academic year` : "Scholarship amount varies by award decision",
    scholarship.coverageType.toLowerCase().includes("full") ? "Tuition and major living support" : "Tuition fee reduction",
    "Selection based on academic merit",
    "Renewable depending on final scholarship terms"
  ];

  return (
    <ul className="space-y-2 text-sm leading-6 text-[#344054]">
      {benefits.map((benefit) => (
        <li key={benefit} className="flex gap-2">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
          {benefit}
        </li>
      ))}
    </ul>
  );
}

function EligibilityRow({ item }: { item: { label: string; value: string; status: string } }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#edf0f6] pb-3 last:border-b-0">
      <div className="flex gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
        <span className="text-sm font-medium text-[#344054]">{item.label}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#344054]">{item.value}</p>
        <span className="text-xs font-semibold text-emerald-700">{item.status}</span>
      </div>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-[#667085]">{label}</span>
      <span className="text-right font-semibold text-[#344054]">{value}</span>
    </div>
  );
}

function ScoreRing({ value, status, size = "normal" }: { value: number; status: string; size?: "normal" | "large" }) {
  const color = status === "ELIGIBLE" ? "#12a66a" : status === "ALMOST_ELIGIBLE" ? "#f59e0b" : "#ef4444";
  const dimension = size === "large" ? "h-[112px] w-[112px]" : "h-[72px] w-[72px]";
  const radius = size === "large" ? 45 : 30;
  const viewBox = size === "large" ? "0 0 112 112" : "0 0 72 72";
  const center = size === "large" ? 56 : 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`relative flex ${dimension} items-center justify-center`}>
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox={viewBox} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#eef1f7" strokeWidth="8" />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeDasharray={`${(value / 100) * circumference} ${circumference}`} strokeLinecap="round" strokeWidth="8" />
      </svg>
      <span className={`${size === "large" ? "text-3xl" : "text-lg"} font-semibold`} style={{ color }}>{value}%</span>
    </div>
  );
}

function ScholarshipLogo({ scholarship }: { scholarship: Scholarship }) {
  const initials = scholarship.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  const tone = getLogoTone(scholarship.country?.name ?? scholarship.name);

  return (
    <div className={`flex h-[72px] w-[104px] shrink-0 items-center justify-center rounded-md text-sm font-bold ${tone}`}>
      {initials || "SC"}
    </div>
  );
}

function buildEligibilityItems(scholarship: Scholarship, profile: ProfileResponse["profile"], status: string) {
  const statusLabel = status === "NOT_RECOMMENDED" ? "Review" : "Eligible";

  return [
    {
      label: "Nationality",
      value: friendlyNationality(profile?.nationality ?? "Not set"),
      status: statusLabel
    },
    {
      label: "Degree Level",
      value: shortDegree(profile?.targetDegree ?? scholarship.degreeLevel),
      status: statusLabel
    },
    {
      label: "Subject Match",
      value: profile?.fieldOfStudy ?? scholarship.eligibleFields[0] ?? "Not set",
      status: statusLabel
    },
    {
      label: "CGPA",
      value: profile ? `${profile.cgpa.toFixed(2)} / ${profile.cgpaScale.toFixed(2)} (Min. ${formatRequirement(scholarship.minCgpa)})` : `Min. ${formatRequirement(scholarship.minCgpa)}`,
      status: statusLabel
    },
    {
      label: "IELTS",
      value: profile?.ieltsScore ? `${profile.ieltsScore.toFixed(1)} (Min. ${formatRequirement(scholarship.minIelts, 1)})` : `Min. ${formatRequirement(scholarship.minIelts, 1)}`,
      status: statusLabel
    }
  ];
}

function getDocuments(scholarship: Scholarship) {
  return scholarship.requiredDocuments.length
    ? scholarship.requiredDocuments
    : ["Online application form", "Academic transcripts", "CV / Resume", "Motivation letter", "Recommendation letter", "English test score"];
}

function buildScholarshipDescription(scholarship: Scholarship) {
  return `${scholarship.name} supports strong international applicants in ${scholarship.eligibleFields.slice(0, 3).join(", ")}. The award is stored as ${scholarship.coverageType.toLowerCase()} funding and should be verified on the official page before applying.`;
}

function getScholarshipProvider(scholarship: Scholarship) {
  return scholarship.university?.name ?? scholarship.name.split(" Scholarship")[0].split(" Fellowship")[0];
}

function getStatusTone(status: string) {
  if (status === "ELIGIBLE") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "ALMOST_ELIGIBLE") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
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

function shortDegree(value: string) {
  return value.replace(" Degree", "");
}

function formatStatus(status: string) {
  return status.split("_").map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");
}

function formatRequirement(value?: number | null, digits = 2) {
  return value == null ? "Flexible" : value.toFixed(digits);
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
