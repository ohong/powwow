import { NextRequest } from "next/server";

import { listConferenceSessions } from "@/services/session-prep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conferenceId = searchParams.get("conferenceId") ?? undefined;

  try {
    const sessions = await listConferenceSessions(conferenceId);
    return Response.json({ sessions });
  } catch (error) {
    console.error("Failed to list conference sessions", error);
    return Response.json(
      { error: "Unable to load conference sessions" },
      { status: 500 },
    );
  }
}
