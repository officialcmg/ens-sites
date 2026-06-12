import { NextRequest, NextResponse } from "next/server";
import { getEthLimoUrl } from "@/lib/ens";
import { MAX_SITE_SIZE_BYTES, SiteFile, totalSiteSize, validateSite } from "@/lib/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PublishRequest = {
  name?: string;
  files?: SiteFile[];
};

export async function POST(request: NextRequest) {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json(
      { error: "PINATA_JWT is missing. Add it to enable publishing." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as PublishRequest;
  const files = body.files ?? [];

  const issues = validateSite(files);
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) {
    return NextResponse.json(
      { error: errors[0]?.message || "The site folder did not pass validation." },
      { status: 400 },
    );
  }

  if (totalSiteSize(files) > MAX_SITE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "This v1 only supports sites up to 3.5 MB." },
      { status: 413 },
    );
  }

  const formData = new FormData();

  for (const file of files) {
    const blob =
      file.kind === "text"
        ? new Blob([file.content], { type: file.mimeType })
        : new Blob([Buffer.from(file.content, "base64")], { type: file.mimeType });

    // Pinata requires a folder prefix for multi-file directory uploads.
    // We always use "site" so the IPFS path is predictable.
    formData.append("file", blob, `site/${file.path}`);
  }

  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: `${body.name || "ens-site"}-${Date.now()}`,
      keyvalues: {
        app: "sites.xyz",
        target: body.name || "manual",
      },
    }),
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({
      // cidVersion 0 → Qm... base58 CID, which content-hash.encode("ipfs-ns") requires.
      // cidVersion 1 → baf... base32 CID, which breaks the base58 decoder and throws
      // "Non-base58 character" when building the ENS contenthash.
      cidVersion: 0,
      // wrapWithDirectory: false so Pinata returns the CID of the "site/" directory
      // directly. With true + a "site/" prefix, you get {CID}/site/index.html —
      // the ENS record would point at the outer wrapper and eth.limo shows a dir listing.
      wrapWithDirectory: false,
    }),
  );

  let pinataResponse: Response;
  try {
    pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error("[publish] Pinata fetch failed:", msg);
    return NextResponse.json(
      { error: `Could not reach Pinata: ${msg}` },
      { status: 502 },
    );
  }

  const rawText = await pinataResponse.text();

  if (!pinataResponse.ok) {
    console.error("[publish] Pinata error:", pinataResponse.status, rawText);
    // Try to extract a structured error message
    let errorMessage = `Pinata returned ${pinataResponse.status}`;
    try {
      const errPayload = JSON.parse(rawText);
      errorMessage =
        errPayload?.error?.reason ||
        errPayload?.error?.details ||
        errPayload?.error?.message ||
        errPayload?.error ||
        errPayload?.message ||
        errorMessage;
    } catch {
      // rawText isn't JSON — use it directly if short enough
      if (rawText.length < 200) errorMessage = rawText;
    }
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }

  let payload: { IpfsHash?: string };
  try {
    payload = JSON.parse(rawText);
  } catch {
    console.error("[publish] Pinata returned non-JSON:", rawText.slice(0, 300));
    return NextResponse.json(
      { error: "Pinata returned an invalid response." },
      { status: 502 },
    );
  }

  if (!payload.IpfsHash) {
    console.error("[publish] Pinata response missing IpfsHash:", rawText.slice(0, 300));
    return NextResponse.json(
      { error: "Pinata did not return a CID." },
      { status: 502 },
    );
  }

  const gatewayHost = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
  const cid = payload.IpfsHash;

  return NextResponse.json({
    cid,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `https://${gatewayHost}/ipfs/${cid}`,
    limoUrl: body.name ? getEthLimoUrl(body.name) : undefined,
  });
}
