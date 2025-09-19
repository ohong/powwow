import { env } from "./env";

const APIFY_RUN_SYNC_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items";

export type ApifyStartUrl = {
  url: string;
  label?: string;
};

export type ApifyWebScraperInput = {
  startUrls: ApifyStartUrl[];
  maxRequestsPerCrawl?: number;
  maxPagesPerCrawl?: number;
  proxyConfiguration?: {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
  };
  pageFunction?: string;
  pseudoUrls?: Array<{ purl: string }>;
  maxConcurrency?: number;
};

export type ApifyDatasetItem = Record<string, unknown> & {
  url?: string;
  title?: string;
  text?: string;
};

export const runWebScraper = async (
  input: ApifyWebScraperInput
): Promise<ApifyDatasetItem[]> => {
  const endpoint = `${APIFY_RUN_SYNC_ENDPOINT}?token=${env.apifyApiKey}&clean=true&format=json`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Apify Web Scraper failed with status ${response.status}: ${errorText}`
    );
  }

  const payload = (await response.json()) as ApifyDatasetItem[];
  return payload;
};
