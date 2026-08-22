import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import {
  extractScannedPdfText,
  googleVisionConfig,
  googleVisionEndpoint,
  googleVisionOidcOptions,
} from "../src/lib/google-vision-ocr";
import { extractResumeText } from "../src/lib/resume-parser";

const ocrResumeText =
  "Jordan Candidate is a senior product engineer with TypeScript, React, Node.js, PostgreSQL, production AI systems, remote collaboration, and ten years of delivery experience.";

const config = {
  projectId: "apply-ink-test",
  projectNumber: "123456789012",
  serviceAccountEmail: "vision-test@apply-ink-test.iam.gserviceaccount.com",
  workloadIdentityPoolId: "vercel",
  workloadIdentityPoolProviderId: "vercel",
  location: "eu" as const,
};

async function createPdf(text = ""): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const document = new PDFDocument({ autoFirstPage: false });
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise<void>((resolve) => document.on("end", resolve));
  document.addPage();
  if (text) document.fontSize(11).text(text);
  document.end();
  await complete;
  return Buffer.concat(chunks);
}

async function main() {
  const emptyPdf = await createPdf();
  let capturedRequest:
    | {
        endpoint: string;
        projectId: string;
        body: {
          requests: Array<{
            inputConfig: { content: string; mimeType: "application/pdf" };
            features: Array<{ type: "DOCUMENT_TEXT_DETECTION" }>;
          }>;
        };
      }
    | undefined;

  const extracted = await extractScannedPdfText(emptyPdf, {
    config,
    request: async (input) => {
      capturedRequest = input;
      return {
        responses: [
          {
            responses: [
              { fullTextAnnotation: { text: "Jordan Candidate" } },
              { fullTextAnnotation: { text: ocrResumeText } },
            ],
          },
        ],
      };
    },
  });
  assert.match(extracted ?? "", /Jordan Candidate/);
  assert.equal(
    capturedRequest?.endpoint,
    "https://eu-vision.googleapis.com/v1/projects/apply-ink-test/locations/eu/files:annotate"
  );
  assert.equal(capturedRequest?.projectId, config.projectId);
  assert.equal(
    capturedRequest?.body.requests[0].inputConfig.content,
    emptyPdf.toString("base64")
  );
  assert.equal(
    capturedRequest?.body.requests[0].features[0].type,
    "DOCUMENT_TEXT_DETECTION"
  );
  assert.equal(
    "pages" in (capturedRequest?.body.requests[0] ?? {}),
    false,
    "Omitting pages lets Vision safely read the first five existing pages."
  );

  assert.equal(await extractScannedPdfText(emptyPdf, { config: null }), null);
  assert.equal(
    googleVisionEndpoint({ ...config, location: "global" }),
    "https://vision.googleapis.com/v1/files:annotate"
  );
  assert.equal(googleVisionConfig({}), null);
  assert.throws(
    () => googleVisionConfig({ GCP_PROJECT_ID: "incomplete" }),
    /OIDC configuration is incomplete/
  );
  const environmentConfig = googleVisionConfig({
    GCP_PROJECT_ID: config.projectId,
    GCP_PROJECT_NUMBER: config.projectNumber,
    GCP_SERVICE_ACCOUNT_EMAIL: config.serviceAccountEmail,
    GCP_WORKLOAD_IDENTITY_POOL_ID: config.workloadIdentityPoolId,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:
      config.workloadIdentityPoolProviderId,
  });
  assert.deepEqual(environmentConfig, config);
  const oidcOptions = googleVisionOidcOptions(config);
  assert.equal(
    oidcOptions.audience,
    "//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/vercel/providers/vercel"
  );
  assert.equal(
    oidcOptions.service_account_impersonation_url,
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/vision-test@apply-ink-test.iam.gserviceaccount.com:generateAccessToken"
  );

  await assert.rejects(
    extractScannedPdfText(emptyPdf, {
      config,
      request: async () => ({
        responses: [{ error: { message: "Vision request rejected" } }],
      }),
    }),
    /Vision request rejected/
  );

  let ocrCalls = 0;
  const resumeText = await extractResumeText(emptyPdf, "scanned.pdf", {
    ocrPdf: async (buffer) => {
      ocrCalls += 1;
      assert.deepEqual(buffer, emptyPdf);
      return ocrResumeText;
    },
  });
  assert.equal(ocrCalls, 1);
  assert.match(resumeText, /TypeScript/);

  const textPdf = await createPdf(ocrResumeText);
  await extractResumeText(textPdf, "text.pdf", {
    ocrPdf: async () => {
      throw new Error("OCR must not run for a text-based PDF.");
    },
  });

  await assert.rejects(
    extractResumeText(emptyPdf, "scanned.pdf", {
      ocrPdf: async () => "Unreadable",
    }),
    /No (?:usable CV|readable resume) text (?:was )?found/
  );

  console.log(
    JSON.stringify({
      directPdfUpload: true,
      euEndpoint: true,
      keylessOidcConfiguration: true,
      firstFivePagesDefault: true,
      responseValidation: true,
      scannedPdfFallback: true,
      textPdfSkipsOcr: true,
      unusableOcrRejected: true,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
