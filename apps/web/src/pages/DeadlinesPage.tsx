import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { ScholarshipDeadline } from "../types";

export function DeadlinesPage() {
  const { token } = useAuth();
  const [deadlines, setDeadlines] = useState<ScholarshipDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeadlines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const upcomingCount = useMemo(() => deadlines.filter((item) => new Date(item.deadline).getTime() >= Date.now()).length, [deadlines]);

  async function loadDeadlines() {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<{ deadlines: ScholarshipDeadline[] }>("/scholarships/deadlines", {
        token
      });
      setDeadlines(response.deadlines);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load deadlines");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-sm font-medium text-[#667085]">Loading deadlines</div>;
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]">
              <CalendarDays className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-[#151b2d]">Deadline Tracker</h1>
              <p className="mt-2 text-sm text-[#667085]">Saved scholarship deadlines from your eligibility results.</p>
            </div>
          </div>
          <div className="rounded-lg bg-[#f4f1ff] px-4 py-3 text-sm font-medium text-[#5f3bd7]">
            {upcomingCount} upcoming
          </div>
        </div>
      </section>

      {error ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      {deadlines.length ? (
        <section className="grid gap-4">
          {deadlines.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]">
                    <Clock className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-[#151b2d]">{item.title}</h2>
                    <p className="mt-1 text-sm text-[#667085]">{item.scholarship.country?.name ?? "Multiple countries"} / due {formatDate(item.deadline)}</p>
                    <p className="mt-2 text-sm font-medium text-[#344054]">{daysUntil(item.deadline)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to={`/scholarships/${item.scholarshipId}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb]">
                    Details
                  </Link>
                  {item.scholarship.sourceUrl ? (
                    <a href={item.scholarship.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb]">
                      <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      Official link
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-[#d6dbe8] bg-white p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#151b2d]">No scholarship deadlines tracked</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">Saving a scholarship with a deadline automatically adds it here.</p>
          <Link to="/scholarships" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#6d3df4] px-5 text-sm font-medium text-white hover:bg-[#5f35d8]">
            Find scholarships
          </Link>
        </section>
      )}
    </div>
  );
}

function daysUntil(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);

  if (days < 0) {
    return "Deadline passed";
  }

  if (days === 0) {
    return "Due today";
  }

  return `${days} days left`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
