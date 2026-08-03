import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { ReadinessResponse, ReadinessScore } from "../types";

const tierOrder = ["Top-tier", "Mid-tier", "Accessible-tier"];

export function ReadinessPage() {
  const { token } = useAuth();
  const [scores, setScores] = useState<ReadinessScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadScores() {
      if (!token) {
        return;
      }

      try {
        const response = await apiRequest<ReadinessResponse>("/readiness/latest", {
          token
        });
        setScores(sortScores(response.readinessScores));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not load readiness scores");
      } finally {
        setLoading(false);
      }
    }

    loadScores();
  }, [token]);

  const lastGenerated = useMemo(() => {
    if (!scores.length) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(scores[0].createdAt));
  }, [scores]);

  async function generateScores() {
    setGenerating(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest<ReadinessResponse>("/readiness/generate", {
        method: "POST",
        token
      });
      setScores(sortScores(response.readinessScores));
      setMessage("Readiness scorecard generated");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate readiness scorecard");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading scorecard</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Candidate Readiness Scorecard</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Tier-wise readiness based on academics, English score, research, experience, and budget.
          </p>
          {lastGenerated ? <p className="mt-2 text-sm text-slate-500">Last generated: {lastGenerated}</p> : null}
        </div>
        <button
          type="button"
          onClick={generateScores}
          disabled={generating}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-[#275c4e] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{generating ? "Generating" : "Generate scorecard"}</span>
        </button>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{error}</p>
              <Link to="/profile" className="mt-1 inline-block font-semibold underline">
                Review profile
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-moss">
          {message}
        </div>
      ) : null}

      {scores.length ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {scores.map((score) => (
            <ScoreCard key={score.id} score={score} />
          ))}
        </section>
      ) : (
        <EmptyState onGenerate={generateScores} generating={generating} />
      )}
    </div>
  );
}

function ScoreCard({ score }: { score: ReadinessScore }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{score.tier}</h2>
          <p className="mt-1 text-sm text-slate-500">Readiness score</p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#e8f1ee] text-xl font-bold text-moss">
          {score.score}
        </div>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-moss" style={{ width: `${score.score}%` }} />
      </div>

      <ScoreList title="Strengths" tone="positive" items={score.strengths} />
      <ScoreList title="Weaknesses" tone="warning" items={score.weaknesses} />
      <ScoreList title="Recommendations" tone="neutral" items={score.recommendations} />
    </article>
  );
}

function ScoreList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "warning" | "neutral" }) {
  const Icon = tone === "positive" ? CheckCircle2 : tone === "warning" ? AlertTriangle : Sparkles;
  const color = tone === "positive" ? "text-moss" : tone === "warning" ? "text-coral" : "text-skyline";

  return (
    <div className="mt-4">
      <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${color}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{title}</span>
      </div>
      <ul className="space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-stone-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <section className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-moss" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-ink">No scorecard generated yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Generate a scorecard after completing the student profile.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-[#275c4e] disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} aria-hidden="true" />
        <span>{generating ? "Generating" : "Generate scorecard"}</span>
      </button>
    </section>
  );
}

function sortScores(scores: ReadinessScore[]) {
  return [...scores].sort((left, right) => tierOrder.indexOf(left.tier) - tierOrder.indexOf(right.tier));
}
