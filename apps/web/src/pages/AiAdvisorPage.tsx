import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
  Copy,
  DollarSign,
  FileText,
  Globe2,
  GraduationCap,
  HelpCircle,
  Info,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type {
  AdvisorContextResponse,
  AdvisorMessage,
  AdvisorNextStepItem,
  AdvisorReferencedEntity,
  AdvisorResponse
} from "../types";

type AdvisoryMode = "GENERAL" | "UNIVERSITY" | "COUNTRY" | "INSIGHTS" | "NEXT_STEPS";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  responseMeta?: AdvisorResponse;
};

export function AiAdvisorPage() {
  const { token } = useAuth();
  const [context, setContext] = useState<AdvisorContextResponse | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [activeMode, setActiveMode] = useState<AdvisoryMode>("GENERAL");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAdvisorContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function loadAdvisorContext() {
    if (!token) return;
    setLoadingContext(true);
    setError("");

    try {
      const response = await apiRequest<AdvisorContextResponse>("/advisor/context", { token });
      setContext(response);

      if (response.availablePrograms.length > 0) {
        setSelectedProgramId(response.availablePrograms[0].id);
      }
      if (response.availableCountries.length >= 2) {
        setSelectedCountryIds([response.availableCountries[0].id, response.availableCountries[1].id]);
      }

      // Initial welcome message
      const welcomeMessage: ChatItem = {
        id: "welcome-msg",
        role: "assistant",
        content: `### 👋 Welcome to your AI Study Abroad Advisor, **${response.profileSummary.name}**!\n\nI analyze your student profile (**${response.profileSummary.cgpaNormalized}/4.0 GPA**, **${response.profileSummary.englishScore}**, **$${response.profileSummary.budgetUsd.toLocaleString()} budget**) against our platform database of universities, scholarships, and country data.\n\nHere are some of the ways I can help you today:\n* **🎓 Explain University Fit**: Discover why a specific program was categorized as Safe, Target, or Reach.\n* **🌍 Compare Countries**: Multi-factor breakdown of living costs, post-study work visa, part-time hours, and tech market demand.\n* **📊 Public & Visa Insights**: Summaries of visa rules, proof of funds requirements, and intake timelines.\n* **🚀 Next Steps Roadmap**: Personalized actionable milestones tailored to your application timeline.\n\n*Note: I complement and explain our rule-based matching system and deterministic criteria.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages([welcomeMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load advisor context");
    } finally {
      setLoadingContext(false);
    }
  }

  async function handleSendMessage(customPrompt?: string, modeOverride?: AdvisoryMode) {
    const questionToSend = customPrompt ?? inputQuery;
    if (!questionToSend.trim() || sending) return;

    const mode = modeOverride ?? activeMode;
    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatItem = {
      id: userMsgId,
      role: "user",
      content: questionToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setSending(true);
    setError("");

    try {
      let response: AdvisorResponse;

      if (mode === "UNIVERSITY" && selectedProgramId) {
        response = await apiRequest<AdvisorResponse>("/advisor/explain-university", {
          method: "POST",
          token,
          body: JSON.stringify({ programId: selectedProgramId, question: questionToSend })
        });
      } else if (mode === "COUNTRY" && selectedCountryIds.length >= 2) {
        response = await apiRequest<AdvisorResponse>("/advisor/compare-countries", {
          method: "POST",
          token,
          body: JSON.stringify({ countryIds: selectedCountryIds, question: questionToSend })
        });
      } else if (mode === "INSIGHTS") {
        response = await apiRequest<AdvisorResponse>("/advisor/insights", {
          method: "POST",
          token,
          body: JSON.stringify({ question: questionToSend })
        });
      } else if (mode === "NEXT_STEPS") {
        response = await apiRequest<AdvisorResponse>("/advisor/next-steps", {
          method: "POST",
          token,
          body: JSON.stringify({ question: questionToSend })
        });
      } else {
        const history = messages
          .filter((m) => m.id !== "welcome-msg")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        response = await apiRequest<AdvisorResponse>("/advisor/chat", {
          method: "POST",
          token,
          body: JSON.stringify({
            question: questionToSend,
            history,
            focusMode: mode,
            entityId: mode === "UNIVERSITY" ? selectedProgramId : undefined
          })
        });
      }

      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMessage: ChatItem = {
        id: assistantMsgId,
        role: "assistant",
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        responseMeta: response
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error getting response from advisor");
    } finally {
      setSending(false);
    }
  }

  function handleCountryToggle(countryId: string) {
    if (selectedCountryIds.includes(countryId)) {
      if (selectedCountryIds.length > 2) {
        setSelectedCountryIds((prev) => prev.filter((id) => id !== countryId));
      }
    } else {
      if (selectedCountryIds.length < 5) {
        setSelectedCountryIds((prev) => [...prev, countryId]);
      }
    }
  }

  function handleCopy(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleClearChat() {
    if (context) {
      setMessages([
        {
          id: "welcome-msg",
          role: "assistant",
          content: `Chat history cleared. How can I assist your study abroad planning today, **${context.profileSummary.name}**?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } else {
      setMessages([]);
    }
  }

  const selectedProgram = useMemo(() => {
    return context?.availablePrograms.find((p) => p.id === selectedProgramId);
  }, [context, selectedProgramId]);

  if (loadingContext) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3efff] text-[#6d3df4]">
          <Bot className="h-6 w-6 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-[#667085]">Connecting to AI Advisor & grounding student profile data...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] pb-10">
      {/* Top Banner / Disclaimer */}
      <section className="mb-6 rounded-2xl border border-[#e5dcff] bg-gradient-to-r from-[#fcfaff] via-[#f7f3ff] to-[#f4effe] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6d3df4] text-white shadow-md shadow-[#6d3df4]/25">
              <Bot className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-[#141b34]">AI Study Abroad Advisor</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eee7ff] px-3 py-0.5 text-xs font-semibold text-[#6d3df4]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Profile Grounded
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-medium text-emerald-700">
                  Complements Rule-Based Matching
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5a6275]">
                Answers personalized questions using your active student profile, admission requirements, country policies, and verified platform records.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e1e5ef] bg-white px-3 text-xs font-medium text-[#667085] hover:bg-[#f8f9fc] hover:text-[#141b34]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Conversation
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <p className="mt-1 text-xs text-red-600">Please verify your student profile data or try another query.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Column: Student Profile Snapshot & Mode Controls */}
        <aside className="space-y-5">
          {/* Profile Snapshot Card */}
          {context ? (
            <div className="rounded-xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#141b34]">
                  <UserCheck className="h-4 w-4 text-[#6d3df4]" />
                  <span>Profile Grounding</span>
                </div>
                <Link to="/profile" className="text-xs font-semibold text-[#6d3df4] hover:underline">
                  Edit Profile
                </Link>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between rounded-lg bg-[#f8f9fd] p-2.5">
                  <span className="text-[#7a8194]">Target Field:</span>
                  <span className="font-semibold text-[#141b34]">{context.profileSummary.fieldOfStudy}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#f8f9fd] p-2.5">
                  <span className="text-[#7a8194]">Normalized GPA:</span>
                  <span className="font-semibold text-[#141b34]">{context.profileSummary.cgpaNormalized} / 4.0</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#f8f9fd] p-2.5">
                  <span className="text-[#7a8194]">English Score:</span>
                  <span className="font-semibold text-[#141b34]">{context.profileSummary.englishScore}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#f8f9fd] p-2.5">
                  <span className="text-[#7a8194]">Annual Budget:</span>
                  <span className="font-semibold text-[#141b34]">${context.profileSummary.budgetUsd.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#f8f9fd] p-2.5">
                  <span className="text-[#7a8194]">Readiness Tier:</span>
                  <span className="font-semibold text-[#6d3df4]">{context.profileSummary.readinessTier ?? "Mid-tier"} ({context.profileSummary.readinessScore ?? 70}/100)</span>
                </div>
                {context.profileSummary.preferredCountries.length ? (
                  <div className="rounded-lg bg-[#f8f9fd] p-2.5">
                    <span className="block text-[#7a8194] mb-1">Preferred Destinations:</span>
                    <div className="flex flex-wrap gap-1">
                      {context.profileSummary.preferredCountries.map((c) => (
                        <span key={c} className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-[#344054] border border-[#e7eaf3]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Mode Selector & Quick Tools */}
          <div className="rounded-xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7a8194]">Advisory Focus Modes</h3>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveMode("GENERAL")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${activeMode === "GENERAL" ? "bg-[#f3efff] text-[#6d3df4] font-semibold" : "text-[#4b5565] hover:bg-[#f8f9fd]"}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span>💬 Ask Anything</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("UNIVERSITY")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${activeMode === "UNIVERSITY" ? "bg-[#f3efff] text-[#6d3df4] font-semibold" : "text-[#4b5565] hover:bg-[#f8f9fd]"}`}
              >
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span>🎓 Explain University Fit</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("COUNTRY")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${activeMode === "COUNTRY" ? "bg-[#f3efff] text-[#6d3df4] font-semibold" : "text-[#4b5565] hover:bg-[#f8f9fd]"}`}
              >
                <Globe2 className="h-4 w-4 shrink-0" />
                <span>🌍 Compare Countries</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("INSIGHTS")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${activeMode === "INSIGHTS" ? "bg-[#f3efff] text-[#6d3df4] font-semibold" : "text-[#4b5565] hover:bg-[#f8f9fd]"}`}
              >
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span>📊 Public & Visa Insights</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode("NEXT_STEPS")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${activeMode === "NEXT_STEPS" ? "bg-[#f3efff] text-[#6d3df4] font-semibold" : "text-[#4b5565] hover:bg-[#f8f9fd]"}`}
              >
                <Target className="h-4 w-4 shrink-0" />
                <span>🚀 Next Steps Roadmap</span>
              </button>
            </div>

            {/* Mode-Specific Tool Panels */}
            {activeMode === "UNIVERSITY" && context?.availablePrograms.length ? (
              <div className="mt-4 border-t border-[#edf0f6] pt-4">
                <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                  Select Program to Evaluate:
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full rounded-lg border border-[#dfe4ef] bg-white p-2 text-xs font-medium text-[#141b34] outline-none focus:border-[#6d3df4]"
                >
                  {context.availablePrograms.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.title} ({prog.universityName}) {prog.category ? `• [${prog.category}]` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSendMessage(`Explain why ${selectedProgram?.title} at ${selectedProgram?.universityName} is suitable for my profile and why it received its match rating.`, "UNIVERSITY")}
                  disabled={sending}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#6d3df4] py-2 text-xs font-semibold text-white hover:bg-[#5f35d8] disabled:opacity-60"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Evaluate Program Fit
                </button>
              </div>
            ) : null}

            {activeMode === "COUNTRY" && context?.availableCountries.length ? (
              <div className="mt-4 border-t border-[#edf0f6] pt-4">
                <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                  Select 2 to 4 Countries to Compare:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {context.availableCountries.map((country) => {
                    const isSelected = selectedCountryIds.includes(country.id);
                    return (
                      <button
                        key={country.id}
                        type="button"
                        onClick={() => handleCountryToggle(country.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${isSelected ? "bg-[#6d3df4] text-white" : "border border-[#dfe4ef] bg-white text-[#4b5565] hover:bg-[#f8f9fd]"}`}
                      >
                        {country.name}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => handleSendMessage(`Compare living costs, post-study work visa rights, and tech job opportunities for my chosen countries.`, "COUNTRY")}
                  disabled={sending || selectedCountryIds.length < 2}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#6d3df4] py-2 text-xs font-semibold text-white hover:bg-[#5f35d8] disabled:opacity-60"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Run Country Comparison ({selectedCountryIds.length})
                </button>
              </div>
            ) : null}

            {activeMode === "NEXT_STEPS" ? (
              <div className="mt-4 border-t border-[#edf0f6] pt-4">
                <button
                  type="button"
                  onClick={() => handleSendMessage("Generate a prioritized 4-phase next steps roadmap for my profile and upcoming application intake.", "NEXT_STEPS")}
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#6d3df4] py-2 text-xs font-semibold text-white hover:bg-[#5f35d8] disabled:opacity-60"
                >
                  <Target className="h-3.5 w-3.5" />
                  Generate Action Roadmap
                </button>
              </div>
            ) : null}
          </div>

          {/* Direct Platform Links */}
          <div className="rounded-xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a8194] mb-3">Platform Tools</h4>
            <div className="grid gap-2 text-xs">
              <Link to="/matches" className="flex items-center justify-between rounded-lg p-2 text-[#344054] hover:bg-[#f8f9fd] hover:text-[#6d3df4]">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-[#6d3df4]" />
                  University Matcher
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a0a7b8]" />
              </Link>
              <Link to="/application-strategy" className="flex items-center justify-between rounded-lg p-2 text-[#344054] hover:bg-[#f8f9fd] hover:text-[#6d3df4]">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5 text-[#6d3df4]" />
                  Strategy Builder (3-4-2)
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a0a7b8]" />
              </Link>
              <Link to="/scholarships" className="flex items-center justify-between rounded-lg p-2 text-[#344054] hover:bg-[#f8f9fd] hover:text-[#6d3df4]">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-[#6d3df4]" />
                  Scholarships Directory
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a0a7b8]" />
              </Link>
              <Link to="/countries" className="flex items-center justify-between rounded-lg p-2 text-[#344054] hover:bg-[#f8f9fd] hover:text-[#6d3df4]">
                <span className="flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 text-[#6d3df4]" />
                  Country Decision Dashboard
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a0a7b8]" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Column: Chat Conversation Stream & Interactive Responses */}
        <main className="flex flex-col rounded-xl border border-[#e7eaf3] bg-white shadow-sm overflow-hidden min-h-[640px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-[#edf0f6] bg-[#fbfaff] px-6 py-3.5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#141b34]">Active Advisory Session</h2>
                <p className="text-[11px] text-[#7a8194]">
                  Mode: <span className="font-semibold text-[#6d3df4]">{activeMode}</span> • Grounded in Student Database
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#eee7ff] px-2.5 py-1 text-[11px] font-semibold text-[#6d3df4]">
                AI Advisor v1.0
              </span>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.map((item) => (
              <article
                key={item.id}
                className={`flex gap-3.5 ${item.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold shadow-sm ${item.role === "user" ? "bg-[#6d3df4] text-white" : "bg-[#f3efff] text-[#6d3df4] border border-[#e5dcff]"}`}
                >
                  {item.role === "user" ? "You" : <Bot className="h-5 w-5" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[85%] space-y-3 ${item.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm ${item.role === "user" ? "bg-[#6d3df4] text-white rounded-tr-none" : "bg-[#f8f9fd] text-[#141b34] border border-[#edf0f6] rounded-tl-none"}`}
                  >
                    {/* Render Formatted Markdown-style content */}
                    <FormattedMessage content={item.content} isUser={item.role === "user"} />

                    {/* Suitability Score Badge (if available) */}
                    {item.responseMeta?.suitabilityScore ? (
                      <div className="mt-4 rounded-xl border border-[#e5dcff] bg-white p-3.5 text-xs text-[#141b34]">
                        <div className="flex items-center justify-between border-b border-[#edf0f6] pb-2 mb-2">
                          <span className="font-semibold text-[#6d3df4]">Suitability Assessment</span>
                          <span className="rounded bg-[#eee7ff] px-2 py-0.5 font-bold text-[#6d3df4]">
                            Score: {item.responseMeta.suitabilityScore.overallFit}/100 ({item.responseMeta.suitabilityScore.category})
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="rounded bg-[#f8f9fd] p-1.5">
                            <span className="text-[#7a8194] block">Academic Fit</span>
                            <span className="font-semibold text-emerald-700">{item.responseMeta.suitabilityScore.academicFit}</span>
                          </div>
                          <div className="rounded bg-[#f8f9fd] p-1.5">
                            <span className="text-[#7a8194] block">Budget Fit</span>
                            <span className="font-semibold text-[#141b34]">{item.responseMeta.suitabilityScore.budgetFit}</span>
                          </div>
                          <div className="rounded bg-[#f8f9fd] p-1.5">
                            <span className="text-[#7a8194] block">English Fit</span>
                            <span className="font-semibold text-emerald-700">{item.responseMeta.suitabilityScore.englishFit}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Referenced Entities Cards */}
                    {item.responseMeta?.referencedEntities && item.responseMeta.referencedEntities.length > 0 ? (
                      <div className="mt-4 border-t border-[#e5e9f2] pt-3">
                        <p className="text-[11px] font-semibold text-[#7a8194] mb-2 flex items-center gap-1.5">
                          <Compass className="h-3.5 w-3.5 text-[#6d3df4]" />
                          Referenced Database Entities:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {item.responseMeta.referencedEntities.map((ent) => (
                            <Link
                              key={ent.id}
                              to={ent.link ?? "/matches"}
                              className="flex items-center justify-between rounded-lg border border-[#e2e7f2] bg-white p-2.5 text-xs transition hover:border-[#6d3df4] hover:shadow-sm"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[#141b34] truncate">{ent.name}</span>
                                  {ent.badge ? (
                                    <span className="rounded bg-[#f3efff] px-1.5 py-0.5 text-[10px] font-semibold text-[#6d3df4]">
                                      {ent.badge}
                                    </span>
                                  ) : null}
                                </div>
                                {ent.subtext ? (
                                  <span className="block text-[11px] text-[#7a8194] truncate">{ent.subtext}</span>
                                ) : null}
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#8c94a8]" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Next Steps Checklist Cards */}
                    {item.responseMeta?.nextSteps && item.responseMeta.nextSteps.length > 0 ? (
                      <div className="mt-4 space-y-2 border-t border-[#e5e9f2] pt-3">
                        <p className="text-[11px] font-semibold text-[#7a8194] mb-1.5 flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5 text-[#6d3df4]" />
                          Recommended Next Step Milestones:
                        </p>
                        {item.responseMeta.nextSteps.map((step) => (
                          <div
                            key={step.id}
                            className="flex flex-col gap-2 rounded-xl border border-[#e2e7f2] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${step.priority === "HIGH" ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                                  {step.priority} PRIORITY
                                </span>
                                <h4 className="text-xs font-semibold text-[#141b34]">{step.title}</h4>
                              </div>
                              <p className="text-[11px] text-[#667085] leading-relaxed">{step.description}</p>
                            </div>
                            {step.actionUrl ? (
                              <Link
                                to={step.actionUrl}
                                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-[#f3efff] px-3 py-1.5 text-xs font-semibold text-[#6d3df4] hover:bg-[#6d3df4] hover:text-white transition"
                              >
                                <span>{step.actionLabel ?? "Take Action"}</span>
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Actions under bubble */}
                  {item.role === "assistant" ? (
                    <div className="flex items-center gap-2 text-[11px] text-[#8c94a8] pl-2">
                      <span>{item.timestamp}</span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.content, item.id)}
                        className="inline-flex items-center gap-1 text-[#667085] hover:text-[#141b34]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedId === item.id ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-[11px] text-[#8c94a8] pr-2">{item.timestamp}</div>
                  )}

                  {/* Suggested Follow-ups Chips */}
                  {item.responseMeta?.suggestedFollowUps && item.responseMeta.suggestedFollowUps.length > 0 ? (
                    <div className="mt-2 space-y-1 pl-2">
                      <p className="text-[11px] font-semibold text-[#7a8194]">Suggested follow-up questions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.responseMeta.suggestedFollowUps.map((followUp, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(followUp)}
                            className="rounded-full border border-[#dcd7fe] bg-[#faf8ff] px-3 py-1 text-xs font-medium text-[#6d3df4] hover:bg-[#6d3df4] hover:text-white transition"
                          >
                            {followUp}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}

            {sending ? (
              <div className="flex gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#6d3df4] border border-[#e5dcff]">
                  <Bot className="h-5 w-5 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-none border border-[#edf0f6] bg-[#f8f9fd] px-5 py-4 text-xs text-[#667085] shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#6d3df4] animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-[#6d3df4] animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-[#6d3df4] animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-2 font-medium">Synthesizing personalized advice from platform database...</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Chips (Top of input box) */}
          {context?.samplePrompts && messages.length <= 2 ? (
            <div className="border-t border-[#edf0f6] bg-[#fafbfc] px-6 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7a8194] mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-[#f59e0b]" />
                <span>Suggested quick queries for your profile:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {context.samplePrompts.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSendMessage(p.prompt, p.category as AdvisoryMode)}
                    className="rounded-lg border border-[#e2e7f2] bg-white px-3 py-1.5 text-left text-xs font-medium text-[#344054] hover:border-[#6d3df4] hover:bg-[#fcfaff] transition"
                  >
                    {p.title}: <span className="text-[#667085]">{p.prompt.slice(0, 45)}...</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Input Box Footer */}
          <div className="border-t border-[#edf0f6] bg-white p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 rounded-xl border border-[#dfe4ef] bg-white px-3 py-2 focus-within:border-[#6d3df4] focus-within:ring-2 focus-within:ring-[#6d3df4]/15 shadow-sm"
            >
              <input
                ref={inputRef}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  activeMode === "UNIVERSITY"
                    ? "Ask a question about this university or type a specific inquiry..."
                    : activeMode === "COUNTRY"
                      ? "Ask a question comparing your selected countries..."
                      : activeMode === "INSIGHTS"
                        ? "Ask about visa rules, proof of funds, tech job market, or salaries..."
                        : activeMode === "NEXT_STEPS"
                          ? "Ask for an application timeline, SOP tips, or document guidance..."
                          : "Ask any personalized question about universities, scholarships, countries, or next steps..."
                }
                disabled={sending}
                className="w-full border-0 bg-transparent text-sm font-normal text-[#141b34] outline-none placeholder:text-[#9aa2b5] disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6d3df4] text-white transition hover:bg-[#5f35d8] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-[#8c94a8] px-1">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Answers are grounded in your student profile and verified database records.
              </span>
              <span>StudyCompass Decision Intelligence</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Markdown formatting helper component
function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const lines = content.split("\n");

  return (
    <div className="space-y-2.5 markdown-body">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={index} className="text-base font-bold text-[#141b34] mt-2 mb-1">
              {trimmed.replace("### ", "")}
            </h3>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={index} className="text-sm font-bold text-[#2d3448] mt-2 mb-1">
              {trimmed.replace("#### ", "")}
            </h4>
          );
        }

        if (trimmed.startsWith("##### ")) {
          return (
            <h5 key={index} className="text-xs font-bold text-[#475467] mt-1.5">
              {trimmed.replace("##### ", "")}
            </h5>
          );
        }

        if (trimmed.startsWith("---")) {
          return <hr key={index} className="my-2 border-[#edf0f6]" />;
        }

        if (trimmed.startsWith("| ") && trimmed.endsWith(" |")) {
          // simple table row
          const cells = trimmed
            .split("|")
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((c) => c.trim());

          if (cells.some((c) => c.includes("---"))) {
            return null; // separator row
          }

          return (
            <div key={index} className="grid grid-flow-col auto-cols-fr gap-2 rounded bg-white p-2 text-xs border border-[#edf0f6] font-mono">
              {cells.map((cell, cIdx) => (
                <span key={cIdx} className="truncate">
                  {cell.replace(/\*\*/g, "")}
                </span>
              ))}
            </div>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const bulletText = trimmed.replace(/^[\*\-]\s+/, "");
          return (
            <div key={index} className="flex items-start gap-2 pl-1 text-xs leading-relaxed text-[#344054]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d3df4]" />
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(bulletText) }} />
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={index} className="flex items-start gap-2 pl-1 text-xs leading-relaxed text-[#344054]">
                <span className="font-bold text-[#6d3df4]">{numMatch[1]}.</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(numMatch[2]) }} />
              </div>
            );
          }
        }

        if (!trimmed) {
          return null;
        }

        return (
          <p
            key={index}
            className="text-xs leading-relaxed text-[#344054]"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
          />
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#141b34]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#f0edf9] px-1 py-0.5 rounded text-[11px] text-[#6d3df4]">$1</code>');
}
