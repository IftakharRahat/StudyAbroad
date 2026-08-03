import { useEffect, useState } from "react";
import { Bookmark, CalendarDays, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { SavedScholarship } from "../types";

export function SavedScholarshipsPage() {
  const { token } = useAuth();
  const [savedScholarships, setSavedScholarships] = useState<SavedScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSavedScholarships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadSavedScholarships() {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<{ savedScholarships: SavedScholarship[] }>("/scholarships/saved", {
        token
      });
      setSavedScholarships(response.savedScholarships);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load saved scholarships");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-sm font-medium text-[#667085]">Loading saved scholarships</div>;
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <section className="mb-5 rounded-xl border border-[#e6e9f2] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]">
            <Bookmark className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-[#151b2d]">Saved Scholarships</h1>
            <p className="mt-2 text-sm text-[#667085]">Scholarships you saved from eligibility results.</p>
          </div>
        </div>
      </section>

      {error ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      {savedScholarships.length ? (
        <section className="grid gap-4">
          {savedScholarships.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#e6e9f2] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#151b2d]">{item.scholarship.name}</h2>
                  <p className="mt-1 text-sm text-[#667085]">{item.scholarship.country?.name ?? "Multiple countries"} / {item.scholarship.coverageType}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#344054]">
                    <span className="rounded-md bg-[#f8f9fc] px-3 py-2">Deadline: {formatDate(item.scholarship.deadline)}</span>
                    <span className="rounded-md bg-[#f8f9fc] px-3 py-2">Coverage: {item.scholarship.amountUsd ? `USD ${formatNumber(item.scholarship.amountUsd)}` : "Varies"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to={`/scholarships/${item.scholarship.id}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f8fb]">
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
          <h2 className="mt-4 text-lg font-semibold text-[#151b2d]">No saved scholarships yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">Run scholarship eligibility and save the awards you want to track.</p>
          <Link to="/scholarships" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#6d3df4] px-5 text-sm font-medium text-white hover:bg-[#5f35d8]">
            Find scholarships
          </Link>
        </section>
      )}
    </div>
  );
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
