import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileCheck2,
  GraduationCap,
  Info,
  Landmark,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  WalletCards
} from "lucide-react";
import type { StudentProfileInput } from "@study-abroad/shared";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { ProfileResponse } from "../types";

type NumericInput = number | "";

type ProfileFormState = {
  nationality: string;
  currentDegree: string;
  bachelorDegreeName: string;
  universityName: string;
  departmentMajor: string;
  targetDegree: string;
  fieldOfStudy: string;
  preferredIntake: string;
  researchInterest: string;
  recentJobTitle: string;
  industryField: string;
  careerGoal: string;
  preferredCountries: string;
  cgpa: NumericInput;
  cgpaScale: NumericInput;
  ieltsScore: NumericInput;
  toeflScore: NumericInput;
  greScore: NumericInput;
  gmatScore: NumericInput;
  duolingoScore: NumericInput;
  researchPapers: NumericInput;
  workExperienceMonths: NumericInput;
  graduationYear: NumericInput;
  budgetUsd: NumericInput;
  preferredTuitionMinUsd: NumericInput;
  preferredTuitionMaxUsd: NumericInput;
  hasWorkExperience: boolean;
  needsScholarship: boolean;
};

const initialForm: ProfileFormState = {
  nationality: "Bangladeshi",
  currentDegree: "",
  bachelorDegreeName: "",
  universityName: "",
  departmentMajor: "",
  graduationYear: "",
  targetDegree: "",
  fieldOfStudy: "",
  cgpa: "",
  cgpaScale: "",
  ieltsScore: "",
  toeflScore: "",
  greScore: "",
  gmatScore: "",
  duolingoScore: "",
  researchPapers: 0,
  workExperienceMonths: 0,
  preferredCountries: "",
  preferredIntake: "",
  researchInterest: "",
  hasWorkExperience: false,
  recentJobTitle: "",
  industryField: "",
  budgetUsd: "",
  preferredTuitionMinUsd: "",
  preferredTuitionMaxUsd: "",
  needsScholarship: true,
  careerGoal: ""
};

export function ProfilePage() {
  const { token } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const countries = useMemo(() => splitCountries(form.preferredCountries), [form.preferredCountries]);
  const completion = step === 3 ? 100 : computeProfileCompletion(form);

  function updateField<Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function loadProfile() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await apiRequest<ProfileResponse>("/student/profile", {
        token
      });

      if (response.profile) {
        setForm(mapProfileToForm(response.profile));
      }

      setComplete(response.completeness.complete);

      if (response.completeness.complete) {
        setStep(3);
      }
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  function toPayload(): StudentProfileInput {
    return {
      ...form,
      currentDegree: nullableText(form.currentDegree),
      bachelorDegreeName: nullableText(form.bachelorDegreeName),
      universityName: nullableText(form.universityName),
      departmentMajor: nullableText(form.departmentMajor),
      graduationYear: nullableNumber(form.graduationYear),
      careerGoal: nullableText(form.careerGoal),
      preferredIntake: nullableText(form.preferredIntake),
      researchInterest: nullableText(form.researchInterest),
      recentJobTitle: nullableText(form.recentJobTitle),
      industryField: nullableText(form.industryField),
      ieltsScore: nullableNumber(form.ieltsScore),
      toeflScore: nullableNumber(form.toeflScore),
      greScore: nullableNumber(form.greScore),
      gmatScore: nullableNumber(form.gmatScore),
      duolingoScore: nullableNumber(form.duolingoScore),
      cgpa: Number(form.cgpa),
      cgpaScale: Number(form.cgpaScale),
      researchPapers: Number(form.researchPapers),
      workExperienceMonths: Number(form.workExperienceMonths),
      budgetUsd: Number(form.budgetUsd),
      preferredTuitionMinUsd: nullableNumber(form.preferredTuitionMinUsd),
      preferredTuitionMaxUsd: nullableNumber(form.preferredTuitionMaxUsd),
      hasWorkExperience: Boolean(form.hasWorkExperience),
      needsScholarship: Boolean(form.needsScholarship),
      preferredCountries: countries
    };
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiRequest<ProfileResponse>("/student/profile", {
        method: "PUT",
        token,
        body: JSON.stringify(toPayload())
      });
      setComplete(response.completeness.complete);
      setMessage("Profile saved successfully");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save profile");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function completeProfile() {
    const saved = await saveProfile();

    if (saved) {
      setStep(3);
    }
  }

  if (loading) {
    return <div className="text-sm font-semibold text-[#667085]">Loading profile</div>;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[760px] rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-[#151b2d]">Could not load your profile</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">
          Your saved profile is still in the database, but the API server is not reachable right now.
        </p>
        <p className="mt-3 text-sm font-medium text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-4 text-sm font-medium text-white hover:bg-[#5f35d8]"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      {step < 3 ? (
        <ProfileCard
          step={step === 1 ? 1 : 2}
          completion={completion}
          title={step === 1 ? "Academic & Test Information" : "Preferences & Financial Information"}
          subtitle={step === 1 ? "Tell us about your academic background and test scores" : "Tell us about your study preferences and budget"}
          onBack={() => setStep(step === 1 ? 1 : 1)}
        >
          {step === 1 ? (
            <AcademicStep form={form} updateField={updateField} onSave={saveProfile} onNext={() => setStep(2)} saving={saving} />
          ) : (
            <PreferencesStep form={form} countries={countries} updateField={updateField} onSave={saveProfile} onPrevious={() => setStep(1)} onComplete={completeProfile} saving={saving} />
          )}
        </ProfileCard>
      ) : (
        <SummaryStep form={form} countries={countries} complete={complete} onEdit={(targetStep) => setStep(targetStep)} />
      )}

      {message ? <p className="mt-4 text-center text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-center text-sm font-medium text-red-700">{error}</p> : null}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs font-normal text-[#8b92a7]">
        <ShieldCheck className="h-4 w-4 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
        <span>Your information is safe and secure with us.</span>
      </div>
    </div>
  );
}

function ProfileCard({
  step,
  completion,
  title,
  subtitle,
  onBack,
  children
}: {
  step: 1 | 2;
  completion: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e6e9f2] bg-white shadow-sm">
      <header className="flex flex-col gap-5 border-b border-[#edf0f6] px-6 py-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]"
            title="Go back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-[#151b2d]">
              {step} of 2&nbsp; {title}
            </h1>
            <p className="mt-2 text-sm font-normal text-[#667085]">{subtitle}</p>
          </div>
        </div>
        <CompletionMeter value={completion} />
      </header>
      <div className="px-6 py-7">{children}</div>
    </section>
  );
}

function CompletionMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-8">
      <div className="min-w-64">
        <div className="mb-3 flex items-center justify-between text-sm font-medium text-[#667085]">
          <span>Profile Completion</span>
          <span>{value}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#ece7ff]">
          <div className="h-full rounded-full bg-[#6d3df4]" style={{ width: `${value}%` }} />
        </div>
      </div>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-semibold text-[#5f3bd7]"
        style={{
          background: `conic-gradient(#6d3df4 ${value * 3.6}deg, #ece7ff 0deg)`
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">{value}%</div>
      </div>
    </div>
  );
}

function AcademicStep({
  form,
  updateField,
  onSave,
  onNext,
  saving
}: StepProps & {
  onNext: () => void;
}) {
  return (
    <div>
      <SectionTitle icon={GraduationCap} title="Academic Information" />
      <div className="grid gap-6 lg:grid-cols-3">
        <SelectField label="Current Education Level" required value={form.currentDegree ?? ""} onChange={(value) => updateField("currentDegree", value)} options={["Bachelor's Degree", "Master's Degree", "Diploma"]} />
        <TextField label="Bachelor Degree Name" required value={form.bachelorDegreeName ?? ""} onChange={(value) => updateField("bachelorDegreeName", value)} />
        <TextField label="University Name" required value={form.universityName ?? ""} onChange={(value) => updateField("universityName", value)} />
        <TextField label="Department / Major" required value={form.departmentMajor ?? ""} onChange={(value) => updateField("departmentMajor", value)} />
        <NumberField label="CGPA" required value={form.cgpa} step="0.01" onChange={(value) => updateField("cgpa", value ?? "")} />
        <SelectField label="CGPA Scale" required value={String(form.cgpaScale)} onChange={(value) => updateField("cgpaScale", value ? Number(value) : "")} options={["4", "5"]} />
        <NumberField label="Graduation Year" required value={form.graduationYear} onChange={(value) => updateField("graduationYear", value ?? "")} />
      </div>

      <Divider />

      <SectionTitle icon={BarChart3} title="Test Scores" />
      <div className="grid gap-6 lg:grid-cols-4">
        <ScoreField label="IELTS Overall Score" value={form.ieltsScore} step="0.5" onChange={(value) => updateField("ieltsScore", value ?? "")} />
        <ScoreField label="GRE" optional value={form.greScore} onChange={(value) => updateField("greScore", value ?? "")} />
        <ScoreField label="TOEFL" optional value={form.toeflScore} onChange={(value) => updateField("toeflScore", value ?? "")} />
        <ScoreField label="Duolingo" optional value={form.duolingoScore} onChange={(value) => updateField("duolingoScore", value ?? "")} />
      </div>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-5 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb] disabled:opacity-60">
          <Save className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          <span>{saving ? "Saving" : "Save & Exit"}</span>
        </button>
        <button type="button" onClick={onNext} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-6 text-sm font-medium text-white hover:bg-[#5f35d8]">
          <span>Next: Study Preferences</span>
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function PreferencesStep({
  form,
  countries,
  updateField,
  onSave,
  onPrevious,
  onComplete,
  saving
}: StepProps & {
  countries: string[];
  onPrevious: () => void;
  onComplete: () => void;
}) {
  return (
    <div>
      <SectionTitle icon={ClipboardList} title="Study Preferences" />
      <div className="grid gap-6 lg:grid-cols-3">
        <SelectField label="Target Degree" required value={form.targetDegree} onChange={(value) => updateField("targetDegree", value)} options={["Master's Degree", "Bachelor's Degree", "PhD"]} />
        <SelectField label="Target Subject / Field" required value={form.fieldOfStudy} onChange={(value) => updateField("fieldOfStudy", value)} options={["Computer Science", "Data Science", "Cyber Security", "Business"]} />
        <SelectField label="Preferred Intake" required value={form.preferredIntake ?? ""} onChange={(value) => updateField("preferredIntake", value)} options={["Fall 2027 (Sept 2027)", "Spring 2027 (Jan 2027)", "Fall 2026 (Sept 2026)"]} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.15fr]">
        <CountryField countries={countries} value={form.preferredCountries} onChange={(value) => updateField("preferredCountries", value)} />
        <div className="space-y-5">
          <TextField label="Career Goal" required value={form.careerGoal ?? ""} onChange={(value) => updateField("careerGoal", value)} />
          <TextField label="Research Interest" optional value={form.researchInterest ?? ""} onChange={(value) => updateField("researchInterest", value)} />
        </div>
      </div>

      <Divider />

      <SectionTitle icon={BriefcaseBusiness} title="Work Experience" muted="Optional" />
      <div className="mb-5 flex flex-wrap gap-8 text-sm font-medium text-[#344054]">
        <Radio checked={!form.hasWorkExperience} label="No Work Experience" onChange={() => updateField("hasWorkExperience", false)} />
        <Radio checked={form.hasWorkExperience} label="I have work experience" onChange={() => updateField("hasWorkExperience", true)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <SelectField label="Total Work Experience" value={experienceLabel(toNumber(form.workExperienceMonths))} onChange={(value) => updateField("workExperienceMonths", experienceMonths(value))} options={["No Experience", "1 - 2 Years", "2 - 4 Years", "4+ Years"]} />
        <TextField label="Most Recent Job Title" value={form.recentJobTitle ?? ""} onChange={(value) => updateField("recentJobTitle", value)} />
        <TextField label="Industry / Field" value={form.industryField ?? ""} onChange={(value) => updateField("industryField", value)} />
      </div>

      <Divider />

      <SectionTitle icon={WalletCards} title="Financial Information" />
      <div className="grid gap-6 lg:grid-cols-3">
        <NumberField label="Total Budget for Study (USD)" required value={form.budgetUsd} onChange={(value) => updateField("budgetUsd", value ?? "")} hint="Total amount you can spend for tuition + living" />
        <div>
          <div className="mb-2 text-sm font-medium text-[#344054]">Preferred Tuition Fee Range <span className="font-normal text-[#8b92a7]">(Per Year)</span></div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <NumberInput value={form.preferredTuitionMinUsd} onChange={(value) => updateField("preferredTuitionMinUsd", value ?? "")} />
            <span className="font-normal text-[#8b92a7]">-</span>
            <NumberInput value={form.preferredTuitionMaxUsd} onChange={(value) => updateField("preferredTuitionMaxUsd", value ?? "")} />
          </div>
          <div className="mt-2 flex justify-between text-xs font-normal text-[#8b92a7]">
            <span>Minimum</span>
            <span>Maximum</span>
          </div>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold text-[#344054]">Do you need Scholarship / Funding? <span className="text-red-500">*</span></div>
          <div className="space-y-3 text-sm font-medium text-[#344054]">
            <Radio checked={form.needsScholarship} label="Yes, I need scholarship" onChange={() => updateField("needsScholarship", true)} />
            <Radio checked={!form.needsScholarship} label="No, I can self-fund" onChange={() => updateField("needsScholarship", false)} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-4 rounded-lg border border-[#ece7fb] bg-[#fbfaff] px-5 py-4 text-sm font-normal leading-6 text-[#5b5574]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f4f1ff] text-[#5f3bd7]">
          <Info className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span>Your preferences and financial information will help us find the best universities, scholarships and countries that match your profile.</span>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onPrevious} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-5 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          <span>Previous</span>
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-5 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb] disabled:opacity-60">
            <Save className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            <span>{saving ? "Saving" : "Save & Exit"}</span>
          </button>
          <button type="button" onClick={onComplete} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#6d3df4] px-6 text-sm font-medium text-white hover:bg-[#5f35d8] disabled:opacity-60">
            <span>{saving ? "Saving" : "Complete Profile"}</span>
            <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStep({
  form,
  countries,
  complete,
  onEdit
}: {
  form: ProfileFormState;
  countries: string[];
  complete: boolean;
  onEdit: (step: 1 | 2) => void;
}) {
  return (
    <div>
      <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => onEdit(2)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]">
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-[#151b2d]">Profile Summary</h1>
              <p className="mt-2 text-sm font-normal text-[#667085]">Review your information before saving your profile</p>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span><strong>Great!</strong> Your profile is {complete ? "100%" : "almost"} complete.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-[#e6e9f2] bg-white p-6 shadow-sm">
          <SummaryHeader title="Your Profile Summary" subtitle="Please review your information" icon={UserRound} onEdit={() => onEdit(1)} />
          <SummaryBlock title="Academic Information" icon={GraduationCap} onEdit={() => onEdit(1)} items={[
            ["Education Level", form.currentDegree ?? "-"],
            ["Degree", form.bachelorDegreeName ?? "-"],
            ["University", form.universityName ?? "-"],
            ["Major / Department", form.departmentMajor ?? "-"],
            ["CGPA", `${form.cgpa} / ${form.cgpaScale}`],
            ["Graduation Year", String(form.graduationYear ?? "-")]
          ]} />
          <SummaryBlock title="Test Scores" icon={ClipboardList} onEdit={() => onEdit(1)} items={[
            ["IELTS Overall", String(form.ieltsScore ?? "-")],
            ["GRE", String(form.greScore ?? "-")],
            ["TOEFL", String(form.toeflScore ?? "-")],
            ["Duolingo", String(form.duolingoScore ?? "-")]
          ]} />
          <SummaryBlock title="Study Preferences" icon={GlobeLikeIcon} onEdit={() => onEdit(2)} items={[
            ["Target Degree", form.targetDegree],
            ["Preferred Intake", form.preferredIntake ?? "-"],
            ["Target Subject / Field", form.fieldOfStudy],
            ["Preferred Countries", countries.join(", ")],
            ["Career Goal", form.careerGoal ?? "-"],
            ["Research Interest", form.researchInterest ?? "-"]
          ]} />
          <SummaryBlock title="Work Experience" icon={BriefcaseBusiness} onEdit={() => onEdit(2)} items={[
            ["Experience", experienceLabel(toNumber(form.workExperienceMonths))],
            ["Most Recent Job Title", form.recentJobTitle ?? "-"],
            ["Industry / Field", form.industryField ?? "-"]
          ]} />
          <SummaryBlock title="Financial Information" icon={WalletCards} onEdit={() => onEdit(2)} items={[
            ["Total Budget for Study", `USD ${formatNumber(toNumber(form.budgetUsd))}`],
            ["Preferred Tuition Fee Range", `USD ${formatNumber(toNumber(form.preferredTuitionMinUsd))} - USD ${formatNumber(toNumber(form.preferredTuitionMaxUsd))}`],
            ["Scholarship / Funding", form.needsScholarship ? "Yes, I need scholarship" : "No, I can self-fund"]
          ]} />
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#ece7fb] bg-[#fbfaff] px-5 py-4 text-sm font-normal leading-6 text-[#5b5574]">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
            <span>Your information is secure and helps us provide the most relevant universities, scholarships and recommendations for you.</span>
          </div>
        </section>

        <aside className="space-y-5 rounded-xl border border-[#e6e9f2] bg-white p-6 shadow-sm">
          <SummaryHeader title="Profile Analytics" icon={BarChart3} />
          <Metric icon={CheckCircle2} label="Profile Completion" value="100%" tone="green" detail="Excellent! You've completed all sections." />
          <Metric icon={GraduationCap} label="Target Degree" value={form.targetDegree.replace(" Degree", "")} tone="purple" />
          <Metric icon={GlobeLikeIcon} label="Preferred Countries" value={`${countries.length} Countries`} tone="blue" detail={countries.join(", ")} />
          <Metric icon={WalletCards} label="Estimated Budget" value={`USD ${formatNumber(toNumber(form.budgetUsd))}`} tone="orange" detail="Total budget for your study" />
          <Metric icon={Landmark} label="Scholarship Need" value={form.needsScholarship ? "High" : "Low"} tone="pink" detail={form.needsScholarship ? "Looking for full/partial funding" : "Self-funded preference"} />
          <Metric icon={Calendar} label="Preferred Intake" value={(form.preferredIntake ?? "Fall 2027").split(" (")[0]} tone="cyan" />
          <Metric icon={FileCheck2} label="Career Goal" value={form.careerGoal ?? "-"} tone="yellow" />

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-800">
            <div className="flex gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="font-semibold">Profile Saved Successfully!</p>
                <p className="mt-1 leading-5">Your profile is ready to help you find the best opportunities.</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[#667085]">What would you like to do next?</p>
            <div className="space-y-3">
              <ActionLink to="/matches" label="Find Universities" primary />
              <ActionLink to="/scholarships" label="Find Scholarships" />
              <ActionLink to="/" label="Go to Dashboard" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type StepProps = {
  form: ProfileFormState;
  updateField: <Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) => void;
  onSave: () => void;
  saving: boolean;
};

function SectionTitle({ icon: Icon, title, muted }: { icon: React.ElementType; title: string; muted?: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f4f1ff] text-[#5f3bd7]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold text-[#151b2d]">{title} {muted ? <span className="font-normal text-[#8b92a7]">({muted})</span> : null}</h2>
    </div>
  );
}

function TextField({ label, value, onChange, required, optional }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; optional?: boolean }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} optional={optional} />
      <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} type="text" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange, step, required, hint }: { label: string; value: string | number | null; onChange: (value: number | null) => void; step?: string; required?: boolean; hint?: string }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <NumberInput value={value} onChange={onChange} step={step} />
      {hint ? <p className="mt-2 text-xs font-normal text-[#8b92a7]">{hint}</p> : null}
    </label>
  );
}

function ScoreField({ label, value, onChange, step, optional }: { label: string; value: string | number | null; onChange: (value: number | null) => void; step?: string; optional?: boolean }) {
  return (
    <div>
      <label className="block">
        <FieldLabel label={label} optional={optional} info />
        <NumberInput value={value} onChange={onChange} step={step} />
      </label>
      <button type="button" className="mt-3 text-sm font-medium text-[#5f3bd7]">Not taken yet?</button>
    </div>
  );
}

function NumberInput({ value, onChange, step }: { value: string | number | null; onChange: (value: number | null) => void; step?: string }) {
  return (
    <input
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      className={inputClassName}
      type="number"
      step={step ?? "1"}
    />
  );
}

function FieldLabel({ label, required, optional, info }: { label: string; required?: boolean; optional?: boolean; info?: boolean }) {
  return (
    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#344054]">
      <span>{label} {required ? <span className="text-red-500">*</span> : null} {optional ? <span className="font-normal text-[#8b92a7]">(Optional)</span> : null}</span>
      {info ? <Info className="h-4 w-4 text-[#98a2b3]" aria-hidden="true" /> : null}
    </span>
  );
}

function CountryField({ countries, value, onChange }: { countries: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <FieldLabel label="Preferred Countries" required />
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-3 py-2 focus-within:border-[#5f3bd7]">
        {countries.map((country) => (
          <span key={country} className="rounded-md bg-[#f2efff] px-3 py-1 text-sm font-medium text-[#5f3bd7]">{country} x</span>
        ))}
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-52 flex-1 border-0 bg-transparent text-sm font-normal outline-none" />
      </div>
      <p className="mt-2 text-xs font-normal text-[#8b92a7]">Select the countries you are most interested in</p>
    </label>
  );
}

function Radio({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <input type="radio" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#5f3bd7]" />
      <span>{label}</span>
    </label>
  );
}

function SummaryHeader({ title, subtitle, icon: Icon, onEdit }: { title: string; subtitle?: string; icon: React.ElementType; onEdit?: () => void }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f4f1ff] text-[#5f3bd7]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#151b2d]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-normal text-[#667085]">{subtitle}</p> : null}
        </div>
      </div>
      {onEdit ? <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 text-sm font-medium text-[#5f3bd7]">Edit <Edit3 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /></button> : null}
    </div>
  );
}

function SummaryBlock({ title, icon, items, onEdit }: { title: string; icon: React.ElementType; items: Array<[string, string]>; onEdit: () => void }) {
  return (
    <section className="border-t border-[#edf0f6] py-5">
      <SummaryHeader title={title} icon={icon} onEdit={onEdit} />
      <dl className="grid gap-x-10 gap-y-5 md:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-[#667085]">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-[#27314f]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail?: string; tone: "green" | "purple" | "blue" | "orange" | "pink" | "cyan" | "yellow" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-[#f4f1ff] text-[#5f3bd7]",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-500",
    pink: "bg-pink-50 text-pink-500",
    cyan: "bg-cyan-50 text-cyan-500",
    yellow: "bg-yellow-50 text-yellow-500"
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#edf0f6] p-4">
      <div className="flex items-center gap-4">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-[#344054]">{label}</p>
          {detail ? <p className="mt-1 text-xs font-normal text-[#667085]">{detail}</p> : null}
        </div>
      </div>
      <p className={`text-lg font-semibold ${tones[tone].split(" ").at(-1)}`}>{value}</p>
    </div>
  );
}

function ActionLink({ to, label, primary }: { to: string; label: string; primary?: boolean }) {
  return (
    <Link to={to} className={`flex h-11 items-center justify-between rounded-lg px-4 text-sm font-medium ${primary ? "bg-[#6d3df4] text-white" : "border border-[#dfe4ef] bg-white text-[#344054]"}`}>
      <span>{label}</span>
      <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

function Divider() {
  return <div className="my-8 border-t border-[#edf0f6]" />;
}

function GlobeLikeIcon(props: React.ComponentProps<typeof Landmark>) {
  return <Landmark {...props} />;
}

function mapProfileToForm(profile: NonNullable<ProfileResponse["profile"]>): ProfileFormState {
  return {
    nationality: profile.nationality,
    currentDegree: profile.currentDegree ?? "",
    bachelorDegreeName: profile.bachelorDegreeName ?? "",
    universityName: profile.universityName ?? "",
    departmentMajor: profile.departmentMajor ?? "",
    graduationYear: profile.graduationYear ?? "",
    targetDegree: profile.targetDegree,
    fieldOfStudy: profile.fieldOfStudy,
    cgpa: profile.cgpa,
    cgpaScale: profile.cgpaScale,
    ieltsScore: profile.ieltsScore ?? "",
    toeflScore: profile.toeflScore ?? "",
    greScore: profile.greScore ?? "",
    gmatScore: profile.gmatScore ?? "",
    duolingoScore: profile.duolingoScore ?? "",
    researchPapers: profile.researchPapers,
    workExperienceMonths: profile.workExperienceMonths,
    preferredCountries: profile.preferredCountries.join(", "),
    preferredIntake: profile.preferredIntake ?? "",
    researchInterest: profile.researchInterest ?? "",
    hasWorkExperience: profile.hasWorkExperience ?? false,
    recentJobTitle: profile.recentJobTitle ?? "",
    industryField: profile.industryField ?? "",
    budgetUsd: profile.budgetUsd,
    preferredTuitionMinUsd: profile.preferredTuitionMinUsd ?? "",
    preferredTuitionMaxUsd: profile.preferredTuitionMaxUsd ?? "",
    needsScholarship: profile.needsScholarship ?? true,
    careerGoal: profile.careerGoal ?? ""
  };
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function splitCountries(value: string) {
  return value.split(",").map((country) => country.trim()).filter(Boolean);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function toNumber(value: NumericInput) {
  return value === "" ? 0 : value;
}

function computeProfileCompletion(form: ProfileFormState) {
  const checks = [
    hasText(form.currentDegree),
    hasText(form.bachelorDegreeName),
    hasText(form.universityName),
    hasText(form.departmentMajor),
    form.graduationYear !== "",
    form.cgpa !== "",
    form.cgpaScale !== "",
    form.ieltsScore !== "" || form.toeflScore !== "",
    hasText(form.targetDegree),
    hasText(form.fieldOfStudy),
    splitCountries(form.preferredCountries).length > 0,
    hasText(form.preferredIntake),
    hasText(form.careerGoal),
    form.budgetUsd !== ""
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function experienceLabel(months: number) {
  if (months <= 0) {
    return "No Experience";
  }

  if (months <= 24) {
    return "1 - 2 Years";
  }

  if (months <= 48) {
    return "2 - 4 Years";
  }

  return "4+ Years";
}

function experienceMonths(label: string) {
  if (label === "1 - 2 Years") {
    return 18;
  }

  if (label === "2 - 4 Years") {
    return 36;
  }

  if (label === "4+ Years") {
    return 60;
  }

  return 0;
}

const inputClassName = "h-11 w-full rounded-lg border border-[#dfe4ef] bg-white px-4 text-sm font-normal text-[#344054] outline-none transition focus:border-[#5f3bd7] focus:ring-2 focus:ring-[#5f3bd7]/10";
