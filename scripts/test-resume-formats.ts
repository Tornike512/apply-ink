import assert from "node:assert/strict";
import JSZip from "jszip";
import PDFDocument from "pdfkit";
import {
  resumeFieldsFromFile,
  ResumeUploadError,
} from "../src/lib/profile-form";

const resumeText =
  "Jordan Candidate is a senior product engineer with TypeScript, React, Node.js, PostgreSQL, production AI systems, remote collaboration, and ten years of software delivery experience.";

function blobBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(buffer);
}

async function createPdf(text: string, pages = 1): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const document = new PDFDocument({ autoFirstPage: false });
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise<void>((resolve) => document.on("end", resolve));
  for (let page = 0; page < pages; page += 1) {
    document.addPage();
    document.fontSize(18).text(`Jordan Candidate Resume · page ${page + 1}`);
    document.moveDown().fontSize(11).text(text);
  }
  document.end();
  await complete;
  return Buffer.concat(chunks);
}

async function createDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function createOdt(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
    compression: "STORE",
  });
  zip.file(
    "content.xml",
    `<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:p>${text}</text:p></office:text></office:body></office:document-content>`
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function expectUploadError(
  promise: Promise<unknown>,
  expectedMessage?: RegExp
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ResumeUploadError);
    if (expectedMessage) assert.match(error.message, expectedMessage);
    assert.doesNotMatch(error.message, /DOMMatrix|OfficeParser|pdfjs/i);
    return true;
  });
}

async function main() {
  const passed: string[] = [];
  async function check(name: string, test: () => Promise<void>) {
    await test();
    passed.push(name);
  }

  await check("text CV", async () => {
    const fields = await resumeFieldsFromFile(
      new File([resumeText], "resume.txt", { type: "text/plain" })
    );
    assert.equal(fields.resumeText, resumeText);
  });

  await check("uppercase extension", async () => {
    const fields = await resumeFieldsFromFile(
      new File([resumeText], "RESUME.TXT", { type: "text/plain" })
    );
    assert.equal(fields.resumeFileName, "RESUME.TXT");
  });

  await check("PDF without browser DOM globals", async () => {
    const runtimeGlobals = globalThis as unknown as Record<string, unknown>;
    delete runtimeGlobals.DOMMatrix;
    delete runtimeGlobals.ImageData;
    delete runtimeGlobals.Path2D;
    const fields = await resumeFieldsFromFile(
      new File([blobBytes(await createPdf(resumeText))], "resume.pdf", {
        type: "application/pdf",
      })
    );
    assert.match(fields.resumeText, /Jordan Candidate/);
    assert.ok(runtimeGlobals.DOMMatrix);
  });

  await check("multi-page PDF", async () => {
    const fields = await resumeFieldsFromFile(
      new File([blobBytes(await createPdf(resumeText, 2))], "multi-page.pdf", {
        type: "application/pdf",
      })
    );
    assert.match(fields.resumeText, /page 1/);
    assert.match(fields.resumeText, /page 2/);
  });

  await check("DOCX", async () => {
    const fields = await resumeFieldsFromFile(
      new File([blobBytes(await createDocx(resumeText))], "resume.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    );
    assert.match(fields.resumeText, /TypeScript/);
  });

  await check("ODT", async () => {
    const fields = await resumeFieldsFromFile(
      new File([blobBytes(await createOdt(resumeText))], "resume.odt", {
        type: "application/vnd.oasis.opendocument.text",
      })
    );
    assert.match(fields.resumeText, /PostgreSQL/);
  });

  await check("RTF", async () => {
    const rtf = `{\\rtf1\\ansi\\deff0 ${resumeText}}`;
    const fields = await resumeFieldsFromFile(
      new File([rtf], "resume.rtf", { type: "application/rtf" })
    );
    assert.match(fields.resumeText, /production AI systems/);
  });

  await check("invalid PDF is friendly", async () => {
    await expectUploadError(
      resumeFieldsFromFile(
        new File(["not a real PDF"], "broken.pdf", {
          type: "application/pdf",
        })
      ),
      /Could not read this PDF/
    );
  });

  await check("image-only PDF is rejected", async () => {
    const emptyPdf = await createPdf(" ");
    await expectUploadError(
      resumeFieldsFromFile(
        new File([blobBytes(emptyPdf)], "image-only.pdf", { type: "application/pdf" })
      ),
      /No usable CV text/
    );
  });

  await check("short CV is rejected", async () => {
    await expectUploadError(
      resumeFieldsFromFile(
        new File(["Too short"], "short.txt", { type: "text/plain" })
      ),
      /No usable CV text/
    );
  });

  await check("unsupported extension is rejected", async () => {
    await expectUploadError(
      resumeFieldsFromFile(
        new File([resumeText], "resume.png", { type: "image/png" })
      ),
      /must be a PDF, DOC, DOCX, RTF, ODT, or TXT/
    );
  });

  await check("MIME mismatch is rejected", async () => {
    await expectUploadError(
      resumeFieldsFromFile(
        new File([resumeText], "resume.txt", { type: "image/png" })
      ),
      /does not match its file extension/
    );
  });

  await check("generic MIME is accepted", async () => {
    const fields = await resumeFieldsFromFile(
      new File([resumeText], "resume.txt", {
        type: "application/octet-stream",
      })
    );
    assert.equal(fields.resumeText, resumeText);
  });

  await check("oversized CV is rejected", async () => {
    await expectUploadError(
      resumeFieldsFromFile(
        new File([Buffer.alloc(10 * 1024 * 1024 + 1)], "large.txt", {
          type: "text/plain",
        })
      ),
      /10 MB or smaller/
    );
  });

  console.log(JSON.stringify({ passed: passed.length, checks: passed }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
