import { NextRequest } from "next/server";

import { prepareSessionPrep } from "@/services/session-prep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionPrepBody = {
  sessionId?: string;
  conferenceId?: string;
  forceRefresh?: boolean;
};

export async function POST(request: NextRequest) {
  let body: SessionPrepBody;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse session prep request body", error);
    return Response.json(
      { error: "Invalid JSON body" },
      {
        status: 400,
      }
    );
  }

  if (!body.sessionId || typeof body.sessionId !== "string") {
    return Response.json(
      { error: "sessionId is required" },
      {
        status: 400,
      }
    );
  }

  try {
    const result = await prepareSessionPrep({
      sessionId: body.sessionId,
      conferenceId: body.conferenceId,
      forceRefresh: body.forceRefresh,
    });

    return Response.json({ result });
  } catch (error) {
    console.error("Session prep generation failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate session prep";
    return Response.json(
      { error: message },
      {
        status: 500,
      }
    );
  }
}
