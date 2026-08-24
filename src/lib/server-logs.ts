import "server-only";

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "data", "logs");
const LOG_FILE = path.join(LOG_DIR, "auto-apply.log");

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

export function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;

  try {
    appendFileSync(LOG_FILE, logLine, "utf-8");
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}
