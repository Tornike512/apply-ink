import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseOffice } from "officeparser";
import WordExtractor from "word-extractor";

export const RESUME_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".txt",
]);

const MAX_RESUME_TEXT_CHARS = 100_000;
function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_TEXT_CHARS);
}

export async function extractResumeText(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const extension = path.extname(fileName).toLowerCase();
  if (!RESUME_EXTENSIONS.has(extension)) {
    throw new Error("CV must be a PDF, DOC, DOCX, RTF, ODT, or TXT file.");
  }

  let text = "";
  if (extension === ".txt") {
    text = buffer.toString("utf8");
  } else if (extension === ".doc") {
    const extractor = new WordExtractor();
    text = (await extractor.extract(buffer)).getBody();
  } else {
    const workerPath =
      extension === ".pdf"
        ? await fs.realpath(
            path.join(
              process.cwd(),
              "node_modules",
              "pdfjs-dist",
              "legacy",
              "build",
              "pdf.worker.mjs"
            )
          )
        : null;
    const config = workerPath
      ? {
          outputErrorToConsole: false,
          pdfWorkerSrc: pathToFileURL(workerPath).href,
        }
      : { outputErrorToConsole: false };
    const parsed = await parseOffice(buffer, config);
    text = parsed.toText();
  }

  const normalized = normalizeText(text);
  if (normalized.length < 80) {
    throw new Error(
      "No usable CV text was found. Upload a text-based PDF or document."
    );
  }
  return normalized;
}

export function parseSkillsInventory(value: string): {
  json: string;
  skillCount: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Skills inventory must contain valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Skills inventory must be a JSON object.");
  }
  const skills = (parsed as { skills?: unknown }).skills;
  if (!Array.isArray(skills)) {
    throw new Error('Skills inventory must contain a "skills" array.');
  }

  return { json: JSON.stringify(parsed), skillCount: skills.length };
}
