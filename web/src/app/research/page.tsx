"use client";

import { FormEvent, useState } from "react";

type SessionOutline = {
  sessionId: string;
  track: string;
  speaker: string;
  speakerTitle?: string;
  company?: string;
  room?: string;
  time?: string;
  sessionTitle: string;
  description: string;
};

type SessionPrepBrief = {
  session_summary: {
    headline: string;
    why_it_matters: string;
    attendee_fit: string;
  };
  key_takeaways: string[];
  company_brief: {
    positioning: string;
    recent_moves: string;
    competitive_angle: string;
  };
  speaker_brief: {
    bio: string;
    conference_goal: string;
    conversation_starter: string;
  };
  smart_questions: string[];
  follow_up_actions: string[];
  sources: Array<{ title: string; url: string }>;
};

type ResearchSnippet = {
  title: string;
  summary: string;
  url?: string;
  source: string;
};

type SessionPrepResult = {
  session: SessionOutline;
  brief: SessionPrepBrief;
  research: {
    conferenceContext: string;
    companyResearch: ResearchSnippet[];
    topicResearch: ResearchSnippet[];
    speakerResearch: ResearchSnippet[];
    relatedLinks: string[];
    cacheInfo: "cache:hit" | "cache:miss";
  };
  generatedAt: string;
};

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <div className="mt-3 text-sm text-slate-700">{children}</div>
  </section>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="ml-4 list-disc space-y-2 text-slate-700">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

export default function Home() {
  const [sessionId, setSessionId] = useState("933474");
  const [conferenceId, setConferenceId] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SessionPrepResult | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/research/session-prep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          conferenceId: conferenceId || undefined,
          forceRefresh,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Failed to generate session prep");
        setResult(null);
        return;
      }

      setResult(payload.result as SessionPrepResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-500">
              Conference Companion
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Session Research Prep
            </h1>
          </div>
          <div className="text-xs text-slate-500">
            {result ? (
              <span>
                Last generated {new Date(result.generatedAt).toLocaleString()}
              </span>
            ) : (
              <span>Provide a session ID to generate a prep brief.</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Session ID
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring"
              placeholder="933474"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Use an ID from the conference sessions dataset. The example is
              prefilled.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Conference ID (optional)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring"
              placeholder="ai-engineer-worlds-fair-2025"
              value={conferenceId}
              onChange={(event) => setConferenceId(event.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(event) => setForceRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Force refresh (ignore cached research)
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Generating…" : "Generate prep"}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </form>

        {result && (
          <div className="grid gap-6">
            <SectionCard title="Session overview">
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-slate-900">
                  {result.session.sessionTitle}
                </p>
                <p className="text-slate-600">Track: {result.session.track}</p>
                <p className="text-slate-600">
                  Speaker: {result.session.speaker}
                  {result.session.speakerTitle && (
                    <span>, {result.session.speakerTitle}</span>
                  )}
                  {result.session.company && (
                    <span> — {result.session.company}</span>
                  )}
                </p>
                <p className="text-slate-600">
                  {result.session.time} · {result.session.room}
                </p>
                <p className="text-slate-700">{result.session.description}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Research cache: {result.research.cacheInfo}
                </p>
              </div>
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard title="Session summary">
                <div className="space-y-3">
                  <p className="font-semibold text-slate-900">
                    {result.brief.session_summary.headline}
                  </p>
                  <p>{result.brief.session_summary.why_it_matters}</p>
                  <p className="text-slate-600">
                    Fit: {result.brief.session_summary.attendee_fit}
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Key takeaways">
                <BulletList items={result.brief.key_takeaways} />
              </SectionCard>

              <SectionCard title="Company focus">
                <div className="space-y-3">
                  <p>{result.brief.company_brief.positioning}</p>
                  <p>{result.brief.company_brief.recent_moves}</p>
                  <p>{result.brief.company_brief.competitive_angle}</p>
                </div>
              </SectionCard>

              <SectionCard title="Speaker approach">
                <div className="space-y-3">
                  <p>{result.brief.speaker_brief.bio}</p>
                  <p>{result.brief.speaker_brief.conference_goal}</p>
                  <p>{result.brief.speaker_brief.conversation_starter}</p>
                </div>
              </SectionCard>

              <SectionCard title="Smart questions">
                <BulletList items={result.brief.smart_questions} />
              </SectionCard>

              <SectionCard title="Follow-up actions">
                <BulletList items={result.brief.follow_up_actions} />
              </SectionCard>
            </div>

            <SectionCard title="Sources">
              <ul className="space-y-2 text-sm">
                {result.brief.sources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Research traces">
              <div className="grid gap-4 md:grid-cols-3">
                {["topicResearch", "companyResearch", "speakerResearch"].map(
                  (category) => {
                    const entries =
                      result.research[category as keyof typeof result.research];
                    if (!Array.isArray(entries)) {
                      return null;
                    }
                    return (
                      <div key={category} className="space-y-3">
                        <h3 className="text-sm font-semibold capitalize text-slate-800">
                          {category.replace("Research", " research")}
                        </h3>
                        <div className="space-y-2 text-xs text-slate-600">
                          {(entries as ResearchSnippet[]).map((snippet, index) => (
                            <div
                              key={`${category}-${index}`}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                            >
                              <p className="font-medium text-slate-800">
                                {snippet.title}
                              </p>
                              <p className="mt-1 text-slate-600">
                                {snippet.summary.slice(0, 240)}
                                {snippet.summary.length > 240 ? "…" : ""}
                              </p>
                              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
                                Source: {snippet.source}
                              </p>
                              {snippet.url && (
                                <a
                                  href={snippet.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-block text-[11px] font-medium text-blue-600 hover:underline"
                                >
                                  View source
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}
