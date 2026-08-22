import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

const GOOGLE_VISION_SCOPE = "https://www.googleapis.com/auth/cloud-vision";
const GOOGLE_VISION_TIMEOUT_MS = 25_000;

type VisionLocation = "eu" | "us" | "global";

type GoogleVisionConfig = {
  projectId: string;
  projectNumber: string;
  serviceAccountEmail: string;
  workloadIdentityPoolId: string;
  workloadIdentityPoolProviderId: string;
  location: VisionLocation;
};

type VisionAnnotateResponse = {
  responses?: Array<{
    error?: { message?: string };
    responses?: Array<{
      error?: { message?: string };
      fullTextAnnotation?: { text?: string };
    }>;
  }>;
};

type VisionRequestInput = {
  endpoint: string;
  projectId: string;
  body: {
    requests: Array<{
      inputConfig: { content: string; mimeType: "application/pdf" };
      features: Array<{ type: "DOCUMENT_TEXT_DETECTION" }>;
    }>;
  };
};

type VisionRequester = (
  input: VisionRequestInput,
  config: GoogleVisionConfig
) => Promise<VisionAnnotateResponse>;

type GoogleVisionOcrOptions = {
  config?: GoogleVisionConfig | null;
  request?: VisionRequester;
};

type Environment = Readonly<Record<string, string | undefined>>;

function configuredValue(environment: Environment, name: string): string {
  return environment[name]?.trim() ?? "";
}

export function googleVisionConfig(
  environment: Environment = process.env
): GoogleVisionConfig | null {
  const projectId = configuredValue(environment, "GCP_PROJECT_ID");
  const projectNumber = configuredValue(environment, "GCP_PROJECT_NUMBER");
  const serviceAccountEmail = configuredValue(environment, "GCP_SERVICE_ACCOUNT_EMAIL");
  const workloadIdentityPoolId = configuredValue(
    environment,
    "GCP_WORKLOAD_IDENTITY_POOL_ID"
  );
  const workloadIdentityPoolProviderId = configuredValue(
    environment,
    "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"
  );
  const required = [
    projectId,
    projectNumber,
    serviceAccountEmail,
    workloadIdentityPoolId,
    workloadIdentityPoolProviderId,
  ];
  const configured = required.filter(Boolean).length;
  if (configured === 0) return null;
  if (configured !== required.length) {
    throw new Error("Google Cloud Vision OIDC configuration is incomplete.");
  }

  const locationValue =
    configuredValue(environment, "GCP_VISION_LOCATION").toLowerCase() || "eu";
  if (!(["eu", "us", "global"] as const).includes(locationValue as VisionLocation)) {
    throw new Error("Google Cloud Vision OCR location must be eu, us, or global.");
  }

  return {
    projectId,
    projectNumber,
    serviceAccountEmail,
    workloadIdentityPoolId,
    workloadIdentityPoolProviderId,
    location: locationValue as VisionLocation,
  };
}

export function googleVisionEndpoint(config: GoogleVisionConfig): string {
  if (config.location === "global") {
    return "https://vision.googleapis.com/v1/files:annotate";
  }
  return `https://${config.location}-vision.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/locations/${config.location}/files:annotate`;
}

export function googleVisionOidcOptions(config: GoogleVisionConfig) {
  return {
    type: "external_account" as const,
    audience: `//iam.googleapis.com/projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.workloadIdentityPoolId}/providers/${config.workloadIdentityPoolProviderId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: getVercelOidcToken },
    scopes: [GOOGLE_VISION_SCOPE],
  };
}

async function authenticatedVisionRequest(
  input: VisionRequestInput,
  config: GoogleVisionConfig
): Promise<VisionAnnotateResponse> {
  const client = ExternalAccountClient.fromJSON(googleVisionOidcOptions(config));
  if (!client) throw new Error("Could not create the Google Cloud OIDC client.");
  const response = await client.request<VisionAnnotateResponse>({
    url: input.endpoint,
    method: "POST",
    data: input.body,
    timeout: GOOGLE_VISION_TIMEOUT_MS,
    headers: { "x-goog-user-project": input.projectId },
  });
  return response.data;
}

function responseText(response: VisionAnnotateResponse): string {
  const fileResponse = response.responses?.[0];
  const fileError = fileResponse?.error?.message?.trim();
  if (fileError) throw new Error(fileError);

  const pages = fileResponse?.responses ?? [];
  const pageError = pages
    .map((page) => page.error?.message?.trim())
    .find(Boolean);
  if (pageError) throw new Error(pageError);

  return pages
    .map((page) => page.fullTextAnnotation?.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export async function extractScannedPdfText(
  buffer: Buffer,
  options: GoogleVisionOcrOptions = {}
): Promise<string | null> {
  const config = options.config === undefined ? googleVisionConfig() : options.config;
  if (!config) return null;

  const body: VisionRequestInput["body"] = {
    requests: [
      {
        inputConfig: {
          content: buffer.toString("base64"),
          mimeType: "application/pdf",
        },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  };
  const request = options.request ?? authenticatedVisionRequest;
  const response = await request(
    {
      endpoint: googleVisionEndpoint(config),
      projectId: config.projectId,
      body,
    },
    config
  );
  return responseText(response);
}
