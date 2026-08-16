import { BarChart3, Bot, GraduationCap, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { OpportunityFeed } from "../components/OpportunityFeed";

const phaseCards = [
  {
    title: "AI Study Abroad Advisor",
    status: "Active",
    body: "Personalized question answering grounded in student profile, matching data, and country insights.",
    icon: Bot,
    to: "/advisor"
  },
  {
    title: "Student Profile",
    status: "Complete",
    body: "The student profile captures the academic and budget inputs Module 1 needs.",
    icon: GraduationCap,
    to: "/profile"
  },
  {
    title: "Readiness Scorecard",
    status: "Complete",
    body: "Phase 5 calculates tier-wise readiness scores from the student profile.",
    icon: BarChart3,
    to: "/readiness"
  },
  {
    title: "Scholarships",
    status: "Complete",
    body: "Eligibility matching, saved scholarships, details, and deadline tracking are wired.",
    icon: Landmark,
    to: "/scholarships"
  }
];

export function DashboardPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Module 1 now connects profile data to readiness, university matching, scholarship eligibility, and country guidance.
          </p>
        </div>
        <Link
          to="/matches"
          className="inline-flex h-10 items-center justify-center rounded-md bg-coral px-4 text-sm font-semibold text-white hover:bg-[#bd5945]"
        >
          Find universities
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phaseCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.to}
              className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-[#6d3df4] transition hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3efff] text-[#6d3df4]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-md bg-[#e8f1ee] px-2 py-1 text-xs font-semibold text-moss">
                  {card.status}
                </span>
              </div>
              <h2 className="text-base font-semibold text-ink">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
            </Link>
          );
        })}
      </section>

      <OpportunityFeed />
    </div>
  );
}
