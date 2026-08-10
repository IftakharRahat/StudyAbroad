import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileWarning,
  RefreshCw,
  ShieldAlert,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type {
  MonitorAlert,
  MonitorAlertSeverity,
  MonitorAlertsResponse,
  MonitorScanResponse,
  ScholarshipDeadline
} from "../types";

export function DeadlinesPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [deadlines, setDeadlines] = useState<ScholarshipDeadline[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [watchedPrograms, setWatchedPrograms] = useState(0);
  const [watchedScholarships, setWatchedScholarships] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [updatingAlertId, setUpdatingAlertId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMonitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const upcomingCount = useMemo(() => deadlines.filter((item) => new Date(item.deadline).getTime() >= Date.now()).length, [deadlines]);
  const deadlineAlertCount = useMemo(() => alerts.filter((alert) => alert.type !== "REQUIREMENT_CHANGE").length, [alerts]);
  const requirementAlertCount = useMemo(() => alerts.filter((alert) => alert.type === "REQUIREMENT_CHANGE").length, [alerts]);

  async function loadMonitor() {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [scanResponse, deadlineResponse] = await Promise.all([
        apiRequest<MonitorScanResponse>("/monitor/scan", {
          method: "POST",
          token,
          body: JSON.stringify({
            horizonDays: 180,
            criticalDays: 30
          })
        }),
        apiRequest<{ deadlines: ScholarshipDeadline[] }>("/scholarships/deadlines", {
          token
        })
      ]);

      applyMonitorResponse(scanResponse);
      setDeadlines(deadlineResponse.deadlines);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not run the deadline and requirement monitor");
    } finally {
      setLoading(false);
    }
  }

  async function scanNow() {
    if (!token) {
      return;
    }

    setScanning(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest<MonitorScanResponse>("/monitor/scan", {
        method: "POST",
        token,
        body: JSON.stringify({
          horizonDays: 180,
          criticalDays: 30
        })
      });

      applyMonitorResponse(response);
      setMessage(response.summary.alertsCreated
        ? `${response.summary.alertsCreated} new alert${response.summary.alertsCreated === 1 ? "" : "s"} created`
        : "Monitor scan complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not run the monitor scan");
    } finally {
      setScanning(false);
    }
  }

  async function loadAlerts() {
    if (!token) {
      return;
    }

    const response = await apiRequest<MonitorAlertsResponse>("/monitor/alerts", {
      token,
      noCache: true
    });

    applyAlertResponse(response);
  }

  async function updateAlert(alertId: string, status: "READ" | "DISMISSED") {
    if (!token) {
      return;
    }

    setUpdatingAlertId(alertId);
    setError("");

    try {
      await apiRequest<{ alert: MonitorAlert }>(`/monitor/alerts/${alertId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          status
        })
      });
      await loadAlerts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update alert");
    } finally {
      setUpdatingAlertId("");
    }
  }

  async function markAllRead() {
    if (!token) {
      return;
    }

    setError("");

    try {
      const response = await apiRequest<MonitorAlertsResponse>("/monitor/alerts/read-all", {
        method: "PATCH",
        token
      });
      applyAlertResponse(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not mark alerts as read");
    }
  }

  function applyMonitorResponse(response: MonitorScanResponse) {
    applyAlertResponse(response);
    setWatchedPrograms(response.summary.watchedPrograms);
    setWatchedScholarships(response.summary.watchedScholarships);
  }

  function applyAlertResponse(response: MonitorAlertsResponse) {
    setAlerts(response.alerts);
    setUnreadCount(response.unreadCount);
    setCriticalCount(response.criticalCount);
  }

  if (loading) {
    return <div className="text-sm font-medium text-[#667085]">Loading deadline and requirement monitor</div>;
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      <section className="mb-5 rounded-lg border border-[#e6e9f2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff6e8] text-[#b66a00]">
              <Bell className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-[#151b2d]">Deadline & Requirement Monitor</h1>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Alerts for nearby application deadlines, scholarship deadlines, and admission requirement changes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] bg-white px-5 text-sm font-medium text-[#344054] hover:bg-[#f8f9fc] disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              <span>Mark all read</span>
            </button>
            <button
              type="button"
              onClick={scanNow}
              disabled={scanning}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#b66a00] px-5 text-sm font-medium text-white hover:bg-[#9c5b00] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} strokeWidth={1.8} aria-hidden="true" />
              <span>{scanning ? "Scanning" : "Scan now"}</span>
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <div>
              <p className="font-medium">{error}</p>
              <div className="mt-1 flex flex-wrap gap-3">
                <Link to="/profile" className="font-medium underline">Review profile</Link>
                <Link to="/application-strategy" className="font-medium underline">Review strategy</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <Metric label="Unread alerts" value={unreadCount.toString()} icon={Bell} tone={unreadCount ? "warning" : "neutral"} />
        <Metric label="Critical alerts" value={criticalCount.toString()} icon={ShieldAlert} tone={criticalCount ? "critical" : "neutral"} />
        <Metric label="Programs watched" value={watchedPrograms.toString()} icon={FileWarning} />
        <Metric label="Scholarships watched" value={watchedScholarships.toString()} icon={CalendarDays} />
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <CompactStat label="Deadline alerts" value={deadlineAlertCount} />
        <CompactStat label="Requirement alerts" value={requirementAlertCount} />
        <CompactStat label="Tracked scholarship deadlines" value={upcomingCount} />
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#151b2d]">Alerts</h2>
            <p className="mt-1 text-sm text-[#667085]">Unread and read alerts stay here until dismissed.</p>
          </div>
        </div>

        {alerts.length ? (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                updating={updatingAlertId === alert.id}
                onRead={() => updateAlert(alert.id, "READ")}
                onDismiss={() => updateAlert(alert.id, "DISMISSED")}
              />
            ))}
          </div>
        ) : (
          <section className="rounded-lg border border-dashed border-[#d6dbe8] bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" strokeWidth={1.8} aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-[#151b2d]">No active alerts</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">The latest scan did not find urgent deadlines or changed requirements.</p>
          </section>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#151b2d]">Tracked Scholarship Deadlines</h2>
            <p className="mt-1 text-sm text-[#667085]">Saved scholarship deadlines from eligibility results.</p>
          </div>
          <div className="rounded-lg bg-[#f4f1ff] px-4 py-3 text-sm font-medium text-[#5f3bd7]">
            {upcomingCount} upcoming
          </div>
        </div>

        {deadlines.length ? (
          <div className="grid gap-4">
            {deadlines.map((item) => (
              <article key={item.id} className="rounded-lg border border-[#e6e9f2] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#5f3bd7]">
                      <Clock className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#151b2d]">{item.title}</h3>
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
          </div>
        ) : (
          <section className="rounded-lg border border-dashed border-[#d6dbe8] bg-white p-8 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-[#5f3bd7]" strokeWidth={1.8} aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-[#151b2d]">No scholarship deadlines tracked</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">Saving a scholarship with a deadline automatically adds it here.</p>
            <Link to="/scholarships" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#6d3df4] px-5 text-sm font-medium text-white hover:bg-[#5f35d8]">
              Find scholarships
            </Link>
          </section>
        )}
      </section>
    </div>
  );
}

function AlertCard({
  alert,
  updating,
  onRead,
  onDismiss
}: {
  alert: MonitorAlert;
  updating: boolean;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const tone = getSeverityTone(alert.severity);
  const Icon = getAlertIcon(alert);

  return (
    <article className={`rounded-lg border bg-white p-5 shadow-sm ${tone.border}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
            <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>{formatSeverity(alert.severity)}</span>
              <span className="rounded-md bg-[#f6f7fb] px-2.5 py-1 text-xs font-medium text-[#667085]">{formatAlertType(alert.type)}</span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${alert.status === "UNREAD" ? "bg-[#fff6e8] text-[#9c5b00]" : "bg-[#f6f7fb] text-[#667085]"}`}>{formatStatus(alert.status)}</span>
            </div>
            <h3 className="text-base font-semibold text-[#151b2d]">{alert.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{alert.message}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#667085]">
              {alert.dueDate ? <span className="rounded-md bg-[#f8f9fc] px-2.5 py-1">Due {formatDate(alert.dueDate)}</span> : null}
              {alert.program?.university?.country?.name ? <span className="rounded-md bg-[#f8f9fc] px-2.5 py-1">{alert.program.university.country.name}</span> : null}
              {alert.scholarship?.country?.name ? <span className="rounded-md bg-[#f8f9fc] px-2.5 py-1">{alert.scholarship.country.name}</span> : null}
              {alert.field ? <span className="rounded-md bg-[#f8f9fc] px-2.5 py-1">{formatField(alert.field)}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {alert.status !== "READ" ? (
            <button
              type="button"
              onClick={onRead}
              disabled={updating}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f9fc] disabled:opacity-60"
            >
              <Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Read
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            disabled={updating}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f9fc] disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Dismiss
          </button>
          {alert.scholarshipId ? (
            <Link to={`/scholarships/${alert.scholarshipId}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f9fc]">
              Details
            </Link>
          ) : (
            <Link to="/matches" className="inline-flex h-10 items-center justify-center rounded-lg border border-[#dfe4ef] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8f9fc]">
              Matches
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string;
  icon: ElementType;
  tone?: "neutral" | "warning" | "critical";
}) {
  const toneClass = {
    neutral: "bg-[#f6f7fb] text-[#344054]",
    warning: "bg-amber-50 text-amber-700",
    critical: "bg-red-50 text-red-700"
  }[tone];

  return (
    <article className="rounded-lg border border-[#e6e9f2] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#667085]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[#151b2d]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-[#e6e9f2] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-[#667085]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#151b2d]">{value}</p>
    </article>
  );
}

function getAlertIcon(alert: MonitorAlert) {
  if (alert.type === "REQUIREMENT_CHANGE") {
    return FileWarning;
  }

  if (alert.severity === "CRITICAL") {
    return ShieldAlert;
  }

  return CalendarDays;
}

function getSeverityTone(severity: MonitorAlertSeverity) {
  if (severity === "CRITICAL") {
    return {
      border: "border-red-200",
      icon: "bg-red-50 text-red-700",
      badge: "bg-red-50 text-red-700"
    };
  }

  if (severity === "WARNING") {
    return {
      border: "border-amber-200",
      icon: "bg-amber-50 text-amber-700",
      badge: "bg-amber-50 text-amber-700"
    };
  }

  return {
    border: "border-[#e6e9f2]",
    icon: "bg-[#f6f7fb] text-[#344054]",
    badge: "bg-[#f6f7fb] text-[#344054]"
  };
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

function formatAlertType(value: MonitorAlert["type"]) {
  if (value === "APPLICATION_DEADLINE") {
    return "Application deadline";
  }

  if (value === "SCHOLARSHIP_DEADLINE") {
    return "Scholarship deadline";
  }

  return "Requirement change";
}

function formatSeverity(value: MonitorAlertSeverity) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatStatus(value: MonitorAlert["status"]) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatField(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
