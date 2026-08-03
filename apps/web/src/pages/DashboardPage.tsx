import { BarChart3, GraduationCap, Landmark, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const phaseCards = [
  {
    title: "Authentication",
    status: "Complete",
    body: "JWT login, registration, protected routes, and role checks are wired.",
    icon: ShieldCheck
  },
  {
    title: "Student Profile",
    status: "Complete",
    body: "The student profile captures the academic and budget inputs Module 1 needs.",
    icon: GraduationCap
  },
  {
    title: "Readiness",
    status: "Complete",
    body: "Phase 5 calculates tier-wise readiness scores from the student profile.",
    icon: BarChart3
  },
  {
    title: "Scholarships",
    status: "Complete",
    body: "Eligibility matching, saved scholarships, details, and deadline tracking are wired.",
    icon: Landmark
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
            <article key={card.title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 text-moss">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-md bg-[#e8f1ee] px-2 py-1 text-xs font-semibold text-moss">
                  {card.status}
                </span>
              </div>
              <h2 className="text-base font-semibold text-ink">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
