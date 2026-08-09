import { CheckCircle2, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { DocumentChecklistItem, DocumentStatus } from "../types";

const statuses: DocumentStatus[] = ["PENDING", "PREPARED", "SUBMITTED"];

export function DocumentsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<DocumentChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ items: DocumentChecklistItem[] }>("/documents", { token })
      .then((response) => setItems(response.items))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load documents"))
      .finally(() => setLoading(false));
  }, [token]);

  const programs = useMemo(() => {
    const grouped = new Map<string, DocumentChecklistItem[]>();
    for (const item of items) grouped.set(item.programId, [...(grouped.get(item.programId) ?? []), item]);
    return grouped;
  }, [items]);
  const submitted = items.filter((item) => item.status === "SUBMITTED").length;

  async function changeStatus(item: DocumentChecklistItem, status: DocumentStatus) {
    const previous = item.status;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
    try {
      await apiRequest(`/documents/${item.id}`, { method: "PATCH", token, body: JSON.stringify({ status }) });
    } catch (requestError) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: previous } : entry));
      setError(requestError instanceof Error ? requestError.message : "Could not update document");
    }
  }

  if (loading) return <p className="text-sm text-[#667085]">Loading document checklist…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#6d3df4]">Application planning</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#151b2d]">Smart Document Checklist</h1>
          <p className="mt-2 text-sm text-[#667085]">Documents required for every program in your latest strategy.</p>
        </div>
        <div className="rounded-xl bg-[#f1edff] px-5 py-3 text-sm font-semibold text-[#5f3bd7]">{submitted} of {items.length} submitted</div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!items.length ? (
        <div className="rounded-2xl border border-[#e4e7ec] bg-white p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-[#6d3df4]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#151b2d]">Build an application strategy first</h2>
          <p className="mt-2 text-sm text-[#667085]">Your checklist is generated from the programs you select.</p>
          <Link to="/application-strategy" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#6d3df4] px-5 text-sm font-semibold text-white">Open Strategy Builder</Link>
        </div>
      ) : [...programs.values()].map((documents) => {
        const program = documents[0].program;
        const complete = documents.filter((item) => item.status === "SUBMITTED").length;
        return (
          <section key={program.id} className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f6] p-5">
              <div>
                <h2 className="font-semibold text-[#151b2d]">{program.title}</h2>
                <p className="mt-1 text-sm text-[#667085]">{program.university.name}, {program.university.country.name}</p>
              </div>
              <span className="text-sm font-medium text-[#667085]">{complete}/{documents.length} submitted</span>
            </div>
            <div className="divide-y divide-[#edf0f6]">
              {documents.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <CheckCircle2 className={`h-5 w-5 ${item.status === "SUBMITTED" ? "text-emerald-500" : "text-[#c8ceda]"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#344054]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[#8b92a7]">{item.category.toLowerCase()}</p>
                  </div>
                  <select aria-label={`Status for ${item.title}`} value={item.status} onChange={(event) => changeStatus(item, event.target.value as DocumentStatus)} className="h-9 rounded-lg border border-[#dfe4ef] bg-white px-3 text-sm text-[#344054]">
                    {statuses.map((status) => <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
