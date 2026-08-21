import { NextResponse } from "next/server";
import { searchLocalSkills, uniqueSkills } from "@/lib/skill-catalog";

type EscoSearchResult = {
  searchHit?: unknown;
  title?: unknown;
  preferredLabel?: { en?: unknown };
};

type EscoSearchResponse = {
  _embedded?: { results?: EscoSearchResult[] };
};

function labelFromEsco(result: EscoSearchResult): string | null {
  const values = [result.searchHit, result.preferredLabel?.en, result.title];
  const value = values.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 1
  );
  return value?.trim() ?? null;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const localSkills = searchLocalSkills(query, 20);

  if (query.length < 2) {
    return NextResponse.json(
      { skills: localSkills, source: "catalog" },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400" } }
    );
  }

  try {
    const endpoint = new URL("https://ec.europa.eu/esco/api/search");
    endpoint.searchParams.set("text", query);
    endpoint.searchParams.set("type", "skill");
    endpoint.searchParams.set("language", "en");
    endpoint.searchParams.set("limit", "20");
    endpoint.searchParams.set("selectedVersion", "v1.2.0");
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error(`ESCO returned ${response.status}.`);
    const data = (await response.json()) as EscoSearchResponse;
    const escoSkills = (data._embedded?.results ?? [])
      .map(labelFromEsco)
      .filter((skill): skill is string => Boolean(skill));
    return NextResponse.json(
      {
        skills: uniqueSkills([...localSkills, ...escoSkills], 20),
        source: "catalog+esco",
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { skills: localSkills, source: "catalog" },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
    );
  }
}
