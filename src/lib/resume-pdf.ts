import "server-only";

import { existsSync } from "node:fs";
import PDFDocument from "pdfkit";
import { z } from "zod/v4";
import type { StoredCandidateProfile } from "@/lib/application-store";
import type { Job } from "@/lib/jobs";

export const TailoredResumeSchema = z.object({
  summary: z.string(),
  experiences: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  skills: z.array(
    z.object({
      category: z.string(),
      items: z.array(z.string()),
    })
  ),
  education: z.array(
    z.object({
      credential: z.string(),
      institution: z.string(),
      dates: z.string(),
    })
  ),
  languages: z.array(z.string()),
});

export type TailoredResumeContent = z.infer<typeof TailoredResumeSchema>;

type FontSet = { regular: string; bold: string };

function fonts(): FontSet {
  const candidates: FontSet[] = [
    {
      regular: "C:\\Windows\\Fonts\\arial.ttf",
      bold: "C:\\Windows\\Fonts\\arialbd.ttf",
    },
    {
      regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    },
  ];
  return (
    candidates.find(
      (candidate) => existsSync(candidate.regular) && existsSync(candidate.bold)
    ) ?? { regular: "Helvetica", bold: "Helvetica-Bold" }
  );
}

function clean(value: string): string {
  return value
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/^[\s\u2022*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fitLine(value: string, max = 500): string {
  return clean(value).slice(0, max);
}

function compact(content: TailoredResumeContent): TailoredResumeContent {
  return {
    summary: fitLine(content.summary, 420),
    experiences: content.experiences.slice(0, 3).map((experience) => ({
      ...experience,
      bullets: experience.bullets.slice(0, 3).map((bullet) => fitLine(bullet, 330)),
    })),
    skills: content.skills.slice(0, 3).map((group) => ({
      ...group,
      items: group.items.slice(0, 12),
    })),
    education: content.education.slice(0, 3),
    languages: content.languages.slice(0, 6),
  };
}

function renderPdf(
  content: TailoredResumeContent,
  profile: StoredCandidateProfile,
  job: Job,
  scale: number
): Promise<{ buffer: Buffer; pageCount: number }> {
  const margin = 52;
  const font = fonts();
  const document = new PDFDocument({
    size: "LETTER",
    margins: { top: 42, right: margin, bottom: 38, left: margin },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${profile.firstName} ${profile.lastName} - ${job.title}`,
      Author: `${profile.firstName} ${profile.lastName}`.trim(),
      Subject: `Resume tailored for ${job.company}`,
    },
  });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  const pageWidth = document.page.width;
  const contentWidth = pageWidth - margin * 2;
  const right = pageWidth - margin;
  const regular = () => document.font(font.regular);
  const bold = () => document.font(font.bold);
  const bodySize = 9.4 * scale;
  const bodyGap = 1.25 * scale;

  const section = (label: string) => {
    document.moveDown(0.55 * scale);
    bold()
      .fontSize(10.7 * scale)
      .fillColor("#222222")
      .text(label.toUpperCase(), margin, document.y, { width: contentWidth });
    const lineY = document.y + 1.5 * scale;
    document
      .moveTo(margin, lineY)
      .lineTo(right, lineY)
      .lineWidth(0.55)
      .strokeColor("#999999")
      .stroke();
    document.y = lineY + 4 * scale;
  };

  const datedLine = (leftText: string, dateText: string, isBold = true) => {
    const y = document.y;
    const date = fitLine(dateText, 80);
    regular().fontSize(bodySize).fillColor("#444444");
    const dateWidth = Math.min(document.widthOfString(date), contentWidth * 0.32);
    document.text(date, right - dateWidth, y, {
      width: dateWidth,
      align: "right",
      lineBreak: false,
    });
    (isBold ? bold() : regular())
      .fontSize(bodySize)
      .fillColor("#222222")
      .text(fitLine(leftText), margin, y, {
        width: contentWidth - dateWidth - 10,
        lineBreak: false,
        ellipsis: true,
      });
    document.y = y + bodySize + 3.1 * scale;
  };

  const bullet = (value: string) => {
    const y = document.y;
    regular().fontSize(bodySize).fillColor("#222222");
    document.text("•", margin + 2, y, { lineBreak: false });
    document.text(fitLine(value, 420), margin + 12, y, {
      width: contentWidth - 12,
      lineGap: bodyGap,
    });
    document.y += 1.15 * scale;
  };

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  bold()
    .fontSize(18.5 * scale)
    .fillColor("#222222")
    .text(fullName.toUpperCase(), margin, 43, {
      width: contentWidth,
      align: "center",
      lineBreak: false,
      ellipsis: true,
    });
  regular()
    .fontSize(11.8 * scale)
    .fillColor("#444444")
    .text(fitLine(job.title, 150), margin, document.y + 2 * scale, {
      width: contentWidth,
      align: "center",
      lineBreak: false,
      ellipsis: true,
    });

  const contactLine = [profile.phone, profile.email, profile.location]
    .filter(Boolean)
    .map((value) => fitLine(value, 180))
    .join("  |  ");
  const linksLine = [profile.linkedinUrl, profile.portfolioUrl]
    .filter(Boolean)
    .map((value) => fitLine(value, 300).replace(/^https?:\/\//i, ""))
    .join("  |  ");
  regular()
    .fontSize(8.8 * scale)
    .text(contactLine, margin, document.y + 4 * scale, {
      width: contentWidth,
      align: "center",
      lineBreak: false,
      ellipsis: true,
    });
  if (linksLine) {
    document.text(linksLine, margin, document.y + 2 * scale, {
      width: contentWidth,
      align: "center",
      lineBreak: false,
      ellipsis: true,
    });
  }

  section("Summary");
  regular()
    .fontSize(bodySize)
    .fillColor("#222222")
    .text(fitLine(content.summary, 700), margin, document.y, {
      width: contentWidth,
      lineGap: bodyGap,
    });

  section("Professional Experience");
  for (const experience of content.experiences.slice(0, 3)) {
    datedLine(
      `${fitLine(experience.title, 140)}  |  ${fitLine(experience.company, 100)}`,
      experience.dates
    );
    for (const item of experience.bullets.slice(0, 5)) bullet(item);
    document.y += 1.25 * scale;
  }

  section("Technical Skills");
  for (const group of content.skills.slice(0, 4)) {
    bold().fontSize(bodySize).fillColor("#222222");
    document.text(`${fitLine(group.category, 80)}: `, margin, document.y, {
      continued: true,
      lineGap: bodyGap,
    });
    regular().text(group.items.slice(0, 16).map((item) => fitLine(item, 80)).join(", "), {
      width: contentWidth,
      lineGap: bodyGap,
    });
    document.y += 1.1 * scale;
  }

  section("Education and Training");
  for (const item of content.education.slice(0, 4)) {
    datedLine(
      `${fitLine(item.credential, 170)}  |  ${fitLine(item.institution, 120)}`,
      item.dates
    );
  }

  section("Languages");
  regular()
    .fontSize(bodySize)
    .fillColor("#222222")
    .text(content.languages.slice(0, 6).map((item) => fitLine(item, 80)).join("  |  "), {
      width: contentWidth,
      lineGap: bodyGap,
    });

  const pageCount = document.bufferedPageRange().count;
  document.end();
  return finished.then((buffer) => ({ buffer, pageCount }));
}

export async function generateTailoredResumePdf(
  content: TailoredResumeContent,
  profile: StoredCandidateProfile,
  job: Job
): Promise<Buffer> {
  const attempts: Array<[TailoredResumeContent, number]> = [
    [content, 1],
    [content, 0.94],
    [compact(content), 0.9],
    [compact(content), 0.84],
  ];

  for (const [candidate, scale] of attempts) {
    const rendered = await renderPdf(candidate, profile, job, scale);
    if (rendered.pageCount === 1) return rendered.buffer;
  }

  throw new Error("The tailored CV could not be fitted safely onto one page.");
}
