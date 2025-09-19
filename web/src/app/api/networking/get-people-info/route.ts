import {
  getPeopleInfoSnapshot,
  triggerPeopleInfo,
  BrightDataProfile,
} from "@/services/bright-data";

export async function POST() {
  const snapshotId = await triggerPeopleInfo(
    "gd_l1viktl72bvl7bjuj0",
    [
      {
        first_name: "Mark",
        last_name: "Morgan",
      },
    ],
    "name"
  );

  let attempts = 0;
  const maxAttempts = 20;
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    const snapshot = await getPeopleInfoSnapshot(snapshotId);
    if (Array.isArray(snapshot)) {
      return Response.json({ profiles: snapshot as BrightDataProfile[] });
    }
    if (snapshot.status !== "running") {
      break;
    }
    attempts += 1;
    await wait(3000);
  }

  return Response.json({ error: "Snapshot not ready" }, { status: 504 });
}
