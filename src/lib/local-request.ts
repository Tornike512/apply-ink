import "server-only";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostname(value: string): string {
  const normalized = value.includes("://") ? value : `http://${value}`;
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isTrustedLocalRequest(
  request: Request,
  options: { mutation?: boolean } = {}
): boolean {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? new URL(request.url).host;
  if (!LOCAL_HOSTS.has(hostname(host))) return false;

  const origin = request.headers.get("origin");
  if (origin && !LOCAL_HOSTS.has(hostname(origin))) return false;

  if (options.mutation && request.headers.get("x-apply-ink") !== "1") {
    return false;
  }

  return true;
}

export function localOnlyResponse(): Response {
  return Response.json(
    {
      error:
        "Applications and profile data are available only from the local dashboard at http://localhost:3000.",
    },
    { status: 403 }
  );
}

