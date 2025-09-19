import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

interface ProfilePayload {
  conference?: string;
  name?: string;
  social?: string;
  motivation?: string;
  density?: string;
  notes?: string;
}

const formatLine = (label: string, value: string) =>
  `${label}: ${value && value.trim().length > 0 ? value.trim() : "Not provided"}`;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProfilePayload | null;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const lines = [
      "=== ATTENDEE PROFILE ===",
      `Generated: ${now}`,
      "",
      formatLine("Conference Link", payload.conference ?? ""),
      formatLine("Name", payload.name ?? ""),
      formatLine("Social", payload.social ?? ""),
      formatLine("Main Motivation", payload.motivation ?? ""),
      formatLine("Schedule Density Preference", payload.density ?? ""),
    ];

    const notes = payload.notes?.trim();
    if (notes) {
      lines.push("", "Additional Notes:", notes);
    }

    lines.push("", "=== END PROFILE ===", "");

    const filePath = path.resolve(process.cwd(), "..", "attendee_profile.txt");
    await fs.writeFile(filePath, lines.join("\n"), "utf8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing attendee profile:", error);
    return NextResponse.json(
      { error: "Failed to save attendee profile" },
      { status: 500 },
    );
  }
}
