import { cacheJson, readJson } from "./redis";
import { BrightDataProfile } from "./bright-data";

const CONFERENCE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const SESSION_PREP_TTL_SECONDS = 60 * 15; // 15 minutes
const SPEAKER_PROFILE_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const conferenceKey = (conferenceId: string) => `conference:${conferenceId}:raw`;
const sessionPrepKey = (sessionId: string) => `session:${sessionId}:prep`;
const speakerProfileKey = (identifier: string) => `speaker:${identifier}:profile`;

export type RawConferenceMaterial = {
  conferenceId: string;
  content: string;
  source: "file" | "ingest" | "manual";
  capturedAt: string;
};

export type ResearchSnippet = {
  title: string;
  summary: string;
  url?: string;
  source: "serper" | "apify" | "brightdata" | "manual" | "other";
};

export type SessionOutline = {
  sessionId: string;
  track: string;
  speaker: string;
  speakerTitle?: string;
  company?: string;
  room?: string;
  time?: string;
  sessionTitle: string;
  description: string;
  speakerLinkedInUrl?: string;
};

export type SessionPrepCache = {
  sessionId: string;
  sessionOutline: SessionOutline;
  conferenceContext: string;
  companyResearch: ResearchSnippet[];
  topicResearch: ResearchSnippet[];
  speakerResearch: ResearchSnippet[];
  relatedLinks: string[];
  cacheInfo: "cache:hit" | "cache:miss";
  airiaBriefRaw: string;
  computedAt: string;
};

export type SpeakerProfileCache = {
  identifier: string;
  snippet: ResearchSnippet;
  profile: BrightDataProfile;
  computedAt: string;
};

export const storeConferenceMaterial = async (
  material: RawConferenceMaterial
) => {
  await cacheJson(conferenceKey(material.conferenceId), material, CONFERENCE_TTL_SECONDS);
};

export const loadConferenceMaterial = async (
  conferenceId: string
): Promise<RawConferenceMaterial | null> => {
  return readJson<RawConferenceMaterial>(conferenceKey(conferenceId));
};

export const storeSessionPrep = async (payload: SessionPrepCache) => {
  await cacheJson(sessionPrepKey(payload.sessionId), payload, SESSION_PREP_TTL_SECONDS);
};

export const loadSessionPrep = async (
  sessionId: string
): Promise<SessionPrepCache | null> => {
  return readJson<SessionPrepCache>(sessionPrepKey(sessionId));
};

export const storeSpeakerProfile = async (payload: SpeakerProfileCache) => {
  await cacheJson(
    speakerProfileKey(payload.identifier),
    payload,
    SPEAKER_PROFILE_TTL_SECONDS
  );
};

export const loadSpeakerProfile = async (
  identifier: string
): Promise<SpeakerProfileCache | null> => {
  return readJson<SpeakerProfileCache>(speakerProfileKey(identifier));
};
