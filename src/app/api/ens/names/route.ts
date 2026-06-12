import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getEnsSubgraphUrl } from "@/lib/ens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Query both `owner` (unwrapped names) and `wrappedOwner` (NameWrapper-wrapped names)
 * in one round-trip so we catch the full set of names controlled by this wallet.
 */
const domainsQuery = `
  query GetDomainsForOwner($owner: String!) {
    byOwner: domains(first: 200, where: { owner: $owner }) {
      name
    }
    byWrapped: domains(first: 200, where: { wrappedOwner: $owner }) {
      name
    }
  }
`;

type SubgraphResponse = {
  data?: {
    byOwner?: { name?: string | null }[];
    byWrapped?: { name?: string | null }[];
  };
  errors?: { message?: string }[];
};

/** Only show top-level .eth names. Subnames (name.base.eth, etc.) and DNS imports are excluded. */
function isEthName(name: string): boolean {
  // Must end with .eth and be a direct 2-label name (label.eth), not a subdomain
  const parts = name.split(".");
  return parts.length === 2 && parts[1] === "eth";
}

export async function GET(request: NextRequest) {
  const addressParam = request.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!addressParam) {
    return NextResponse.json({ names: [], message: "Address is required." }, { status: 400 });
  }
  if (!isAddress(addressParam)) {
    return NextResponse.json({ names: [], message: "Address is invalid." }, { status: 400 });
  }

  const address = addressParam as `0x${string}`;

  const url = getEnsSubgraphUrl();
  if (!url) {
    return NextResponse.json({
      names: [],
      source: "unconfigured",
      message: "Owned-name enumeration requires ENS_SUBGRAPH_URL.",
    });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: domainsQuery,
        variables: { owner: address },
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as SubgraphResponse;
    if (!response.ok || payload.errors?.length) {
      throw new Error(payload.errors?.[0]?.message || "Could not query ENS names from the subgraph.");
    }

    const rawNames = [
      ...(payload.data?.byOwner ?? []),
      ...(payload.data?.byWrapped ?? []),
    ].map((entry) => entry.name).filter(Boolean) as string[];

    const names = [...new Set(rawNames)]
      .filter(isEthName)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      names,
      source: "ens-subgraph",
      message:
        names.length === 0
          ? "No names were found for this wallet through the ENS subgraph."
          : undefined,
    });
  } catch {
    return NextResponse.json({
      names: [],
      source: "subgraph-error",
      message: "The ENS subgraph query failed.",
    });
  }
}
