import { env } from "./env";

const BRIGHT_DATA_TRIGGER_BASE_URL =
  "https://api.brightdata.com/datasets/v3/trigger";

const BRIGHT_DATA_SNAPSHOT_URL =
  "https://api.brightdata.com/datasets/v3/snapshot";

export type BrightDataDiscoverBy = "name" | "url";

export type BrightDataDiscoverInput =
  | {
      first_name: string;
      last_name: string;
    }
  | {
      url: string;
    };

export type BrightDataTriggerResponse =
  | {
      people: {
        snapshot_id: string;
      };
    }
  | {
      snapshot_id: string;
    };

export type BrightDataSnapshotRunning = {
  status: "running";
  message: string;
};

export type BrightDataLinkedInPosition = {
  title?: string;
  company?: string;
  description?: string;
  start_date?: string;
  end_date?: string | null;
  location?: string | null;
};

export type BrightDataRecentActivity = {
  interaction?: string;
  link?: string;
  title?: string;
};

export type BrightDataProfile = {
  id: string;
  name?: string;
  position?: string;
  headline?: string;
  about?: string;
  current_company?: {
    name?: string;
    title?: string;
    location?: string | null;
  };
  input?: {
    url?: string;
  };
  experience?: BrightDataLinkedInPosition[];
  recent_activity?: BrightDataRecentActivity[];
  interests?: string[];
};

export async function triggerPeopleInfo(
  datasetId: string,
  inputs: BrightDataDiscoverInput[],
  discoverBy: BrightDataDiscoverBy
): Promise<string> {
  if (inputs.length === 0) {
    throw new Error("Bright Data trigger requires at least one input entry");
  }

  const params = new URLSearchParams({
    dataset_id: datasetId,
    include_errors: "true",
    type: "discover_new",
    discover_by: discoverBy,
  });

  const response = await fetch(`${BRIGHT_DATA_TRIGGER_BASE_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.brightDataApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Bright Data discover request failed with status ${response.status}: ${errorText}`
    );
  }

  const payload = (await response.json()) as BrightDataTriggerResponse;
  if ("people" in payload) {
    return payload.people.snapshot_id;
  }
  if ("snapshot_id" in payload) {
    return payload.snapshot_id;
  }
  throw new Error("Bright Data trigger response did not include snapshot_id");
}

export async function getPeopleInfoSnapshot(
  snapshotId: string
): Promise<BrightDataSnapshotRunning | BrightDataProfile[]> {
  const response = await fetch(
    `${BRIGHT_DATA_SNAPSHOT_URL}/${snapshotId}?format=json`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.brightDataApiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Bright Data snapshot request failed with status ${response.status}: ${errorText}`
    );
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload as BrightDataProfile[];
  }
  return payload as BrightDataSnapshotRunning;
}
