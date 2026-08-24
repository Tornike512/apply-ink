import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getAuthenticatedSessionId } from "@/lib/user-session";

export const runtime = "nodejs";

const LOG_FILE = path.join(process.cwd(), "data", "logs", "auto-apply.log");

export async function GET(request: Request) {
  const sessionId = await getAuthenticatedSessionId(request);
  if (!sessionId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!existsSync(LOG_FILE)) {
      return Response.json({ logs: [] });
    }

    const content = readFileSync(LOG_FILE, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    // Get last 500 lines
    const recentLines = lines.slice(-500);

    return Response.json({ logs: recentLines });
  } catch (error) {
    console.error("Error reading log file:", error);
    return Response.json(
      { error: "Could not read logs" },
      { status: 500 }
    );
  }
}
