import "server-only";

import { postgresQuery } from "@/lib/postgres";

export type StoredTailoredResume = {
  data: Buffer;
  fileName: string;
  mimeType: "application/pdf";
};

type TailoredResumeRow = {
  pdf_data: Buffer;
  file_name: string;
  mime_type: string;
};

export async function readTailoredResume(
  cacheKey: string
): Promise<StoredTailoredResume | null> {
  const result = await postgresQuery<TailoredResumeRow>(
    `SELECT pdf_data, file_name, mime_type
     FROM tailored_resumes WHERE cache_key = $1`,
    [cacheKey]
  );
  const row = result.rows[0];
  return row
    ? {
        data: row.pdf_data,
        fileName: row.file_name,
        mimeType: "application/pdf",
      }
    : null;
}

export async function writeTailoredResume(
  cacheKey: string,
  resume: StoredTailoredResume
): Promise<void> {
  await postgresQuery(
    `INSERT INTO tailored_resumes (
       cache_key, pdf_data, file_name, mime_type, created_at
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (cache_key) DO UPDATE SET
       pdf_data = EXCLUDED.pdf_data,
       file_name = EXCLUDED.file_name,
       mime_type = EXCLUDED.mime_type,
       created_at = EXCLUDED.created_at`,
    [cacheKey, resume.data, resume.fileName, resume.mimeType, Date.now()]
  );
}
