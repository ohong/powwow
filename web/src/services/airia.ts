import { env } from "./env";

const AIRIA_BASE_URL = "https://api.airia.ai";

export type AiriaExecutionRequest = {
  promptVariables: Record<string, string>;
  userInput?: string;
  asyncOutput?: boolean;
  includeToolsResponse?: boolean;
};

export type AiriaPipelineExecutionResponse = {
  result?: string | null;
  report?: Record<string, unknown> | null;
  executionId?: string;
  $type?: string;
};

const extractResultString = (payload: AiriaPipelineExecutionResponse): string | null => {
  if (payload.result && typeof payload.result === "string") {
    return payload.result;
  }

  if (!payload.report) {
    return null;
  }

  for (const value of Object.values(payload.report)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const maybeOutputs = (value as { outputs?: Array<{ value?: unknown }> }).outputs;
    if (!maybeOutputs) {
      continue;
    }

    for (const output of maybeOutputs) {
      if (output && typeof output.value === "string") {
        return output.value;
      }
    }
  }

  return null;
};

export const runSessionPrepPipeline = async (
  request: AiriaExecutionRequest
): Promise<string> => {
  if (!env.airiaSessionPrepPipelineId) {
    throw new Error(
      "AIRIA_SESSION_PREP_PIPELINE_ID is not configured. Please add it to .env."
    );
  }

  const response = await fetch(
    `${AIRIA_BASE_URL}/v2/PipelineExecution/${env.airiaSessionPrepPipelineId}`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": env.airiaApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asyncOutput: false,
        includeToolsResponse: false,
        userInput: request.userInput ?? "Generate session prep brief",
        promptVariables: request.promptVariables,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Airia pipeline execution failed with status ${response.status}: ${errorText}`
    );
  }

  const payload = (await response.json()) as AiriaPipelineExecutionResponse;
  const resultString = extractResultString(payload);
  if (!resultString) {
    throw new Error("Airia pipeline response did not contain a result string.");
  }

  return resultString;
};
