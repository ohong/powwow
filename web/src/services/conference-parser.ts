import { SessionOutline } from "./research-store";

type ParsedSpeaker = {
  name: string;
  title?: string;
  company?: string;
};

const parseSpeakerLine = (raw: string): ParsedSpeaker => {
  const trimmed = raw.trim();
  const parenMatch = trimmed.match(/^(.*?)\s*\((.*)\)$/);
  if (!parenMatch) {
    return { name: trimmed };
  }

  const [, name, details] = parenMatch;
  const pieces = details.split(",").map((segment) => segment.trim());
  if (pieces.length === 1) {
    return { name: name.trim(), title: pieces[0] };
  }

  const [title, ...rest] = pieces;
  return {
    name: name.trim(),
    title,
    company: rest.join(", "),
  };
};

export const parseConferenceSessions = (
  content: string
): SessionOutline[] => {
  const lines = content.split("\n");
  const sessions: SessionOutline[] = [];

  let current: Partial<SessionOutline> & {
    descriptionLines: string[];
  } | null = null;
  let collectingDescription = false;

  const flushCurrent = () => {
    if (!current || !current.sessionId || !current.sessionTitle || !current.descriptionLines) {
      current = null;
      collectingDescription = false;
      return;
    }

    const outline: SessionOutline = {
      sessionId: current.sessionId,
      track: current.track ?? "",
      speaker: current.speaker ?? "",
      speakerTitle: current.speakerTitle,
      company: current.company,
      room: current.room,
      time: current.time,
      sessionTitle: current.sessionTitle,
      description: current.descriptionLines.join("\n").trim(),
    };
    sessions.push(outline);
    current = null;
    collectingDescription = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (collectingDescription && current) {
        current.descriptionLines.push("");
      }
      continue;
    }

    if (trimmed.startsWith("Session ID:")) {
      flushCurrent();
      const sessionId = trimmed.replace("Session ID:", "").trim();
      current = {
        sessionId,
        descriptionLines: [],
        sessionTitle: "",
      };
      collectingDescription = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (trimmed.startsWith("Track:")) {
      current.track = trimmed.replace("Track:", "").trim();
      collectingDescription = false;
      continue;
    }

    if (trimmed.startsWith("Speaker:")) {
      const rawSpeaker = trimmed.replace("Speaker:", "").trim();
      const parsedSpeaker = parseSpeakerLine(rawSpeaker);
      current.speaker = parsedSpeaker.name;
      current.speakerTitle = parsedSpeaker.title;
      current.company = parsedSpeaker.company;
      collectingDescription = false;
      continue;
    }

    if (trimmed.startsWith("Room:")) {
      current.room = trimmed.replace("Room:", "").trim();
      collectingDescription = false;
      continue;
    }

    if (trimmed.startsWith("Time:")) {
      current.time = trimmed.replace("Time:", "").trim();
      collectingDescription = false;
      continue;
    }

    if (trimmed.startsWith("Session Title:")) {
      current.sessionTitle = trimmed.replace("Session Title:", "").trim();
      collectingDescription = false;
      continue;
    }

    if (trimmed.startsWith("Description:")) {
      collectingDescription = true;
      continue;
    }

    if (collectingDescription) {
      current.descriptionLines.push(trimmed);
      continue;
    }
  }

  flushCurrent();
  return sessions;
};
