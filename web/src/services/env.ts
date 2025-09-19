const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

export const env = {
  serperApiKey: requireEnv("INTERNAL_SERPER_API_KEY"),
  airiaApiKey: requireEnv("INTERNAL_AIRIA_API_KEY"),
  apifyApiKey: requireEnv("INTERNAL_APIFY_API_KEY"),
  brightDataApiKey: requireEnv("INTERNAL_BRIGHTDATA_API_KEY"),
  brightDataDatasetId:
    process.env.BRIGHT_DATA_DATASET_ID ?? "gd_l1viktl72bvl7bjuj0",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  airiaSessionPrepPipelineId: process.env.AIRIA_SESSION_PREP_PIPELINE_ID ?? "",
};
