import fs from "node:fs/promises";
import path from "node:path";

import { runSessionPrepPipeline } from "./airia";
import { runWebScraper } from "./apify";
import { env } from "./env";
import { parseConferenceSessions } from "./conference-parser";
import {
  loadConferenceMaterial,
  loadSessionPrep,
  loadSpeakerProfile,
  ResearchSnippet,
  SessionOutline,
  storeConferenceMaterial,
  storeSessionPrep,
  SessionPrepCache,
  storeSpeakerProfile,
} from "./research-store";
import {
  BrightDataProfile,
  BrightDataSnapshotRunning,
  BrightDataDiscoverBy,
  BrightDataDiscoverInput,
  getPeopleInfoSnapshot,
  triggerPeopleInfo,
} from "./bright-data";
import { searchSerper } from "./serper";

const DEFAULT_CONFERENCE_ID = "ai-engineer-worlds-fair-2025";
const EXAMPLE_FILE_RELATIVE_PATH = "../examples/example_llms.txt";
const BRIGHT_DATA_POLL_INTERVAL_MS = 3_000;
const BRIGHT_DATA_MAX_POLLS = 15;

export type SessionPrepRequest = {
  sessionId: string;
  conferenceId?: string;
  forceRefresh?: boolean;
};

export type SessionPrepBrief = {
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

export type SessionPrepResponse = {
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

const conferenceContextFromText = (content: string): string => {
  const scheduleIndex = content.indexOf("## Schedule");
  const overview = scheduleIndex > -1 ? content.slice(0, scheduleIndex) : content;
  return overview.trim();
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const truncate = (text: string | undefined, maxLength: number): string | undefined => {
  if (!text) {
    return text;
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const speakerCacheIdentifier = (session: SessionOutline): string => {
  if (session.speakerLinkedInUrl) {
    return `url:${session.speakerLinkedInUrl.toLowerCase()}`;
  }
  const normalizedName = session.speaker.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedCompany = (session.company ?? "").toLowerCase().trim();
  return `name:${normalizedName}|company:${normalizedCompany}`;
};

const createBrightDataDiscoverPayload = (
  session: SessionOutline
): { discoverBy: BrightDataDiscoverBy; inputs: BrightDataDiscoverInput[] } | null => {
  if (session.speakerLinkedInUrl) {
    return {
      discoverBy: "url",
      inputs: [{ url: session.speakerLinkedInUrl }],
    };
  }

  const parts = session.speaker.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const [firstName, ...rest] = parts;
  const lastName = rest.join(" ") || firstName;
  return {
    discoverBy: "name",
    inputs: [
      {
        first_name: firstName,
        last_name: lastName,
      },
    ],
  };
};

const selectBestProfile = (
  profiles: BrightDataProfile[],
  session: SessionOutline
): BrightDataProfile | null => {
  if (profiles.length === 0) {
    return null;
  }

  const targetName = session.speaker.toLowerCase().replace(/\s+/g, " ").trim();
  const targetCompany = (session.company ?? "").toLowerCase().trim();

  let bestProfile: BrightDataProfile | null = null;
  let bestScore = -Infinity;

  for (const profile of profiles) {
    let score = 0;
    const profileName = (profile.name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const profileCompany = (profile.current_company?.name ?? "").toLowerCase().trim();

    if (profileName && profileName === targetName) {
      score += 2;
    }
    if (targetCompany && profileCompany && profileCompany === targetCompany) {
      score += 1.5;
    }
    if (profile.input?.url) {
      score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  return bestProfile ?? profiles[0] ?? null;
};

const buildSpeakerSnippet = (
  profile: BrightDataProfile,
  session: SessionOutline
): ResearchSnippet => {
  const lines: string[] = [];

  const currentTitle = profile.current_company?.title ?? profile.position ?? profile.headline;
  const currentCompanyName = profile.current_company?.name;
  if (currentTitle || currentCompanyName) {
    const pieces = [currentTitle, currentCompanyName].filter(Boolean);
    lines.push(`Current focus: ${pieces.join(" at ")}`);
  }

  if (profile.about) {
    lines.push(`About: ${truncate(profile.about, 360)}`);
  }

  const experienceHighlights = (profile.experience ?? []).filter(Boolean).slice(0, 2);
  if (experienceHighlights.length > 0) {
    lines.push("Experience highlights:");
    for (const exp of experienceHighlights) {
      const parts = [exp.title, exp.company].filter(Boolean);
      const timeframe = exp.start_date
        ? ` (${exp.start_date}${exp.end_date ? ` – ${exp.end_date}` : " – present"})`
        : "";
      lines.push(`- ${parts.join(" at ")}${timeframe}`);
    }
  }

  const hooks: string[] = [];
  const recentActivities = (profile.recent_activity ?? []).filter(Boolean).slice(0, 2);
  for (const activity of recentActivities) {
    if (activity.title) {
      hooks.push(
        `${activity.interaction ?? "Latest update"}: ${truncate(activity.title, 140)}`
      );
    }
  }

  if (hooks.length === 0 && currentCompanyName) {
    hooks.push(`Ask about current priorities at ${currentCompanyName}.`);
  }
  if (hooks.length === 0 && experienceHighlights.length > 0) {
    const exp = experienceHighlights[0];
    hooks.push(`Ask about lessons from ${exp.title ?? "their previous role"}.`);
  }

  if (hooks.length > 0) {
    lines.push("Conversation hooks:");
    for (const hook of hooks) {
      lines.push(`- ${hook}`);
    }
  }

  if (profile.interests && profile.interests.length > 0) {
    lines.push(`Interests: ${profile.interests.slice(0, 4).join(", ")}`);
  }

  const url = profile.input?.url ?? (profile.id ? `https://www.linkedin.com/in/${profile.id}` : undefined);

  return {
    title: `Bright Data · ${profile.name ?? session.speaker}`,
    summary: lines.join("\n"),
    url,
    source: "brightdata",
  };
};

const fetchSpeakerProfileSnippet = async (
  session: SessionOutline
): Promise<ResearchSnippet | null> => {
  const cacheIdentifier = speakerCacheIdentifier(session);
  const cached = await loadSpeakerProfile(cacheIdentifier);
  if (cached) {
    return cached.snippet;
  }

  const discoverPayload = createBrightDataDiscoverPayload(session);
  if (!discoverPayload) {
    return null;
  }

  try {
    const snapshotId = await triggerPeopleInfo(
      env.brightDataDatasetId,
      discoverPayload.inputs,
      discoverPayload.discoverBy
    );

    let profiles: BrightDataProfile[] | null = null;
    for (let attempt = 0; attempt < BRIGHT_DATA_MAX_POLLS; attempt += 1) {
      const snapshot = await getPeopleInfoSnapshot(snapshotId);
      if (Array.isArray(snapshot)) {
        profiles = snapshot;
        break;
      }
      if ((snapshot as BrightDataSnapshotRunning).status !== "running") {
        break;
      }
      await wait(BRIGHT_DATA_POLL_INTERVAL_MS);
    }

    if (!profiles || profiles.length === 0) {
      return null;
    }

    const bestProfile = selectBestProfile(profiles, session);
    if (!bestProfile) {
      return null;
    }

    const snippet = buildSpeakerSnippet(bestProfile, session);
    await storeSpeakerProfile({
      identifier: cacheIdentifier,
      snippet,
      profile: bestProfile,
      computedAt: new Date().toISOString(),
    });
    return snippet;
  } catch (error) {
    console.error("Bright Data speaker fetch failed", error);
    return null;
  }
};

const exampleFilePath = () =>
  path.resolve(process.cwd(), EXAMPLE_FILE_RELATIVE_PATH);

const ensureConferenceMaterial = async (
  conferenceId: string
): Promise<string> => {
  const cached = await loadConferenceMaterial(conferenceId);
  if (cached) {
    return cached.content;
  }

  const filePath = exampleFilePath();
  const content = await fs.readFile(filePath, "utf-8");
  await storeConferenceMaterial({
    conferenceId,
    content,
    source: "file",
    capturedAt: new Date().toISOString(),
  });
  return content;
};

const dedupeLinks = (snippets: ResearchSnippet[]): string[] => {
  const seen = new Set<string>();
  const links: string[] = [];
  for (const snippet of snippets) {
    if (!snippet.url) {
      continue;
    }
    if (seen.has(snippet.url)) {
      continue;
    }
    seen.add(snippet.url);
    links.push(snippet.url);
  }
  return links;
};

const mapSerperResults = (
  results: Awaited<ReturnType<typeof searchSerper>>
): ResearchSnippet[] => {
  if (!results.organic) {
    return [];
  }

  return results.organic.slice(0, 5).map((item) => ({
    title: item.title,
    summary: item.snippet ?? "",
    url: item.link,
    source: "serper" as const,
  }));
};

const scrapeTopLinks = async (links: string[]): Promise<ResearchSnippet[]> => {
  if (!links.length) {
    return [];
  }

  const startUrls = links.slice(0, 2).map((url) => ({ url }));
  const pageFunction = `async function pageFunction(context) {
    const { request, $, log } = context;
    if (!$) {
      return null;
    }
    const title = $('title').text() || request.url;
    const text = $('body').text().replace(/\\s+/g, ' ').trim().slice(0, 1500);
    log.debug('Scraped page', { url: request.url, textLength: text.length });
    return { url: request.url, title, text };
  }`;

  try {
    const items = await runWebScraper({
      startUrls,
      maxRequestsPerCrawl: 10,
      maxPagesPerCrawl: 10,
      pageFunction,
    });

    return items
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "Scraped page",
        summary: typeof item.text === "string" ? item.text : "",
        url: typeof item.url === "string" ? item.url : undefined,
        source: "apify" as const,
      }));
  } catch (error) {
    console.error("Apify scrape failed", error);
    return [];
  }
};

const gatherTopicResearch = async (
  session: SessionOutline
): Promise<ResearchSnippet[]> => {
  const query = `${session.sessionTitle} ${session.track}`.trim();
  const serperResults = await searchSerper({ q: query });
  const serperSnippets = mapSerperResults(serperResults);
  const links = serperSnippets.map((snippet) => snippet.url).filter((url): url is string => Boolean(url));
  const scraped = await scrapeTopLinks(links);
  return [...serperSnippets, ...scraped];
};

const gatherCompanyResearch = async (
  session: SessionOutline
): Promise<ResearchSnippet[]> => {
  if (!session.company) {
    return [];
  }
  const query = `${session.company} company news`;
  const serperResults = await searchSerper({ q: query });
  return mapSerperResults(serperResults);
};

const gatherSpeakerResearch = async (
  session: SessionOutline
): Promise<ResearchSnippet[]> => {
  const snippets: ResearchSnippet[] = [];
  const query = `${session.speaker} ${session.company ?? ""}`.trim();
  if (query) {
    const serperResults = await searchSerper({ q: query });
    snippets.push(...mapSerperResults(serperResults));
  }

  const brightDataSnippet = await fetchSpeakerProfileSnippet(session);
  if (brightDataSnippet) {
    snippets.push(brightDataSnippet);
  } else {
    snippets.push({
      title: "Bright Data speaker profile unavailable",
      summary:
        "Bright Data did not return a profile. Prepare conversation hooks based on the session abstract and company focus.",
      source: "brightdata",
    });
  }

  return snippets;
};

const buildPromptVariables = (
  session: SessionOutline,
  conferenceContext: string,
  companyResearch: ResearchSnippet[],
  topicResearch: ResearchSnippet[],
  speakerResearch: ResearchSnippet[],
  relatedLinks: string[],
  cacheInfo: "cache:hit" | "cache:miss"
) => {
  return {
    session_outline: JSON.stringify(session),
    conference_context: conferenceContext,
    company_research: JSON.stringify(companyResearch),
    topic_research: JSON.stringify(topicResearch),
    speaker_profile: JSON.stringify(speakerResearch),
    related_links: JSON.stringify(relatedLinks),
    redis_cache_state: cacheInfo,
  };
};

const parseAiriaResult = (raw: string): SessionPrepBrief => {
  try {
    return JSON.parse(raw) as SessionPrepBrief;
  } catch (error) {
    console.error("Failed to parse Airia response", { raw, error });
    throw new Error("Airia response was not valid JSON");
  }
};

export const prepareSessionPrep = async (
  request: SessionPrepRequest
): Promise<SessionPrepResponse> => {
  const conferenceId = request.conferenceId ?? DEFAULT_CONFERENCE_ID;

  if (!request.forceRefresh) {
    const cached = await loadSessionPrep(request.sessionId);
    if (cached) {
      return {
        session: cached.sessionOutline,
        brief: parseAiriaResult(cached.airiaBriefRaw),
        research: {
          conferenceContext: cached.conferenceContext,
          companyResearch: cached.companyResearch,
          topicResearch: cached.topicResearch,
          speakerResearch: cached.speakerResearch,
          relatedLinks: cached.relatedLinks,
          cacheInfo: "cache:hit",
        },
        generatedAt: cached.computedAt,
      };
    }
  }

  const conferenceContent = await ensureConferenceMaterial(conferenceId);
  const conferenceContext = conferenceContextFromText(conferenceContent);

  const sessions = parseConferenceSessions(conferenceContent);
  const session = sessions.find((item) => item.sessionId === request.sessionId);
  if (!session) {
    throw new Error(`Session ${request.sessionId} not found in conference content`);
  }

  const [topicResearch, companyResearch, speakerResearch] = await Promise.all([
    gatherTopicResearch(session),
    gatherCompanyResearch(session),
    gatherSpeakerResearch(session),
  ]);

  const relatedLinks = dedupeLinks([
    ...topicResearch,
    ...companyResearch,
    ...speakerResearch,
  ]);

  const cacheInfo: "cache:hit" | "cache:miss" = "cache:miss";

  const promptVariables = buildPromptVariables(
    session,
    conferenceContext,
    companyResearch,
    topicResearch,
    speakerResearch,
    relatedLinks,
    cacheInfo
  );

  const airiaResultRaw = await runSessionPrepPipeline({
    promptVariables,
  });

  const brief = parseAiriaResult(airiaResultRaw);

  const cachePayload: SessionPrepCache = {
    sessionId: session.sessionId,
    sessionOutline: session,
    conferenceContext,
    companyResearch,
    topicResearch,
    speakerResearch,
    relatedLinks,
    cacheInfo,
    airiaBriefRaw: airiaResultRaw,
    computedAt: new Date().toISOString(),
  };

  await storeSessionPrep(cachePayload);

  return {
    session,
    brief,
    research: {
      conferenceContext,
      companyResearch,
      topicResearch,
      speakerResearch,
      relatedLinks,
      cacheInfo,
    },
    generatedAt: cachePayload.computedAt,
  };
};

export const listConferenceSessions = async (
  conferenceId: string = DEFAULT_CONFERENCE_ID
): Promise<SessionOutline[]> => {
  const conferenceContent = await ensureConferenceMaterial(conferenceId);
  return parseConferenceSessions(conferenceContent);
};
