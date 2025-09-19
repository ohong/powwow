import { env } from "./env";

const SERPER_ENDPOINT = "https://google.serper.dev/search";

export type SerperSearchOptions = {
  q: string;
  gl?: string;
  hl?: string;
  num?: number;
};

export type SerperSearchResponse = {
  searchParameters: {
    q: string;
  };
  organic?: Array<{
    title: string;
    link: string;
    snippet?: string;
  }>;
  knowledgeGraph?: unknown;
  peopleAlsoAsk?: Array<{ question: string; snippet: string; link: string }>;
  relatedSearches?: Array<{ query: string }>;
};

export const searchSerper = async (
  options: SerperSearchOptions
): Promise<SerperSearchResponse> => {
  const response = await fetch(SERPER_ENDPOINT, {
    method: "POST",
    headers: {
      "X-API-KEY": env.serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: options.q,
      gl: options.gl ?? "us",
      hl: options.hl ?? "en",
      num: options.num ?? 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Serper request failed with status ${response.status}: ${errorText}`
    );
  }

  return (await response.json()) as SerperSearchResponse;
};
