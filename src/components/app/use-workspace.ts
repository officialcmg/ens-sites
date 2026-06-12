"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import contentHash from "content-hash";
import { mainnet } from "wagmi/chains";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Hex } from "viem";
import { namehash, normalize } from "viem/ens";
import {
  CONTENTHASH_INTERFACE_ID,
  erc165Abi,
  getEthLimoUrl,
  publicResolverAbi,
} from "@/lib/ens";
import {
  buildPreviewDocument,
  inferMimeType,
  isTextPath,
  sanitizePath,
  SiteFile,
  starterFiles,
  totalSiteSize,
  validateSite,
} from "@/lib/site";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EnsNamesResponse = {
  names: string[];
  source?: string;
  message?: string;
};

type PublishResponse = {
  cid: string;
  ipfsUrl: string;
  gatewayUrl: string;
};

export type PublishPhase = "idle" | "preflight" | "uploading" | "writing" | "confirming" | "done" | "error";

export type PublishState = {
  phase: PublishPhase;
  message?: string;
  cid?: string;
  limoUrl?: string;
  gatewayUrl?: string;
  txHash?: string;
};

export type TimelineStep = {
  label: string;
  phase: PublishPhase;
};

export const PUBLISH_STEPS: TimelineStep[] = [
  { label: "Preflight checks", phase: "preflight" },
  { label: "Upload to IPFS", phase: "uploading" },
  { label: "Wallet signature", phase: "writing" },
  { label: "On-chain confirmation", phase: "confirming" },
  { label: "Live", phase: "done" },
];

export const PHASE_ORDER: Record<PublishPhase, number> = {
  idle: -1,
  preflight: 0,
  uploading: 1,
  writing: 2,
  confirming: 3,
  done: 4,
  error: -2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function makeFileFromText(path: string, content: string): SiteFile {
  return {
    path,
    kind: "text",
    content,
    mimeType: inferMimeType(path),
    size: new TextEncoder().encode(content).length,
  };
}

async function browserFileToSiteFile(file: File, overridePath?: string): Promise<SiteFile> {
  const candidatePath =
    sanitizePath(overridePath || (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name) ||
    sanitizePath(file.name);
  const mimeType = file.type || inferMimeType(candidatePath);

  if (isTextPath(candidatePath) || mimeType.startsWith("text/") || mimeType === "image/svg+xml") {
    const text = await file.text();
    return makeFileFromText(candidatePath, text);
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.readAsDataURL(file);
  });

  return {
    path: candidatePath,
    kind: "asset",
    content: base64,
    mimeType,
    size: file.size,
  };
}

async function getPrimaryNameFallback(
  publicClient: ReturnType<typeof usePublicClient>,
  address: `0x${string}`,
) {
  if (!publicClient) return null;

  try {
    const name = await publicClient.getEnsName({ address });
    return name?.endsWith(".eth") ? name : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The hook — all workspace state & behavior, no UI
// ---------------------------------------------------------------------------

export function useWorkspace() {
  const [files, setFiles] = useState<SiteFile[]>(starterFiles);
  const [selectedPath, setSelectedPath] = useState("index.html");
  const [newFilePath, setNewFilePath] = useState("");

  const [ensNames, setEnsNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [namesLoading, setNamesLoading] = useState(false);
  const [namesMessage, setNamesMessage] = useState<string>();
  const [publishState, setPublishState] = useState<PublishState>({ phase: "idle" });
  const [isMounted, setIsMounted] = useState(false);
  const [_isImporting, startImportTransition] = useTransition();

  const assetInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const deferredFiles = useDeferredValue(files);
  const validation = useMemo(() => validateSite(files), [files]);
  const previewHtml = useMemo(() => {
    if (!isMounted) {
      return `<html><body style="margin:0;display:grid;place-items:center;min-height:100vh;font-family:ui-sans-serif,system-ui,sans-serif;background:#f8f4ed;color:#16321d;">Preparing preview...</body></html>`;
    }
    return buildPreviewDocument(deferredFiles);
  }, [deferredFiles, isMounted]);

  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0] ?? null;

  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const totalSize = totalSiteSize(files);
  const errors = validation.filter((issue) => issue.level === "error");
  const warnings = validation.filter((issue) => issue.level === "warning");

  const loadNames = useCallback(async (nextAddress: string) => {
    setNamesLoading(true);
    setNamesMessage(undefined);

    try {
      const response = await fetch(`/api/ens/names?address=${nextAddress}`);
      const data = (await response.json()) as EnsNamesResponse;
      const routeNames = data.names ?? [];
      let nextNames = routeNames;
      let nextMessage = data.message;

      if (routeNames.length === 0 && publicClient) {
        const primaryName = await getPrimaryNameFallback(
          publicClient,
          nextAddress as `0x${string}`,
        );

        if (primaryName) {
          nextNames = [primaryName];
          nextMessage =
            data.source === "ens-subgraph"
              ? "Showing your primary ENS name. The subgraph returned no owned names for this wallet."
              : data.source === "subgraph-error"
                ? "Showing your primary ENS name. The subgraph lookup failed — full list unavailable right now."
                : "Showing your primary ENS name. Add ENS_SUBGRAPH_URL to see all owned names.";
        } else if (!nextMessage) {
          nextMessage =
            data.source === "unconfigured" || data.source === "subgraph-error"
              ? "Full name listing needs an indexer. Enter any name you control manually below."
              : undefined;
        }
      }

      setEnsNames(nextNames);

      if (nextNames[0]) {
        setSelectedName((current) => (current && nextNames.includes(current) ? current : nextNames[0]));
      }

      if (nextMessage) setNamesMessage(nextMessage);
    } catch {
      const primaryName = publicClient
        ? await getPrimaryNameFallback(publicClient, nextAddress as `0x${string}`)
        : null;

      if (primaryName) {
        setEnsNames([primaryName]);
        setSelectedName((current) => (current === primaryName ? current : primaryName));
        setNamesMessage("Showing your primary ENS name. The full dropdown request failed.");
      } else {
        setEnsNames([]);
        setNamesMessage("Could not load ENS names. Enter any name you control manually below.");
      }
    } finally {
      setNamesLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setEnsNames([]);
      setSelectedName("");
      return;
    }

    void loadNames(address);
  }, [address, isConnected, loadNames]);

  function upsertFiles(nextFiles: SiteFile[]) {
    const unique = new Map<string, SiteFile>();
    for (const file of [...files, ...nextFiles]) unique.set(file.path, file);
    const merged = [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
    setFiles(merged);
    if (nextFiles[0]) setSelectedPath(nextFiles[0].path);
  }

  async function handleImportedFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    startImportTransition(async () => {
      const imported = await Promise.all(Array.from(fileList).map((file) => browserFileToSiteFile(file)));
      upsertFiles(imported);
    });
  }

  function handleCreateFile() {
    const path = sanitizePath(newFilePath);
    if (!path) return;
    if (files.some((file) => file.path === path)) return;

    const template =
      path.endsWith(".css")
        ? "body {\n  margin: 0;\n}\n"
        : path.endsWith(".js")
          ? "console.log('hello from ENS');\n"
          : path.endsWith(".html")
            ? "<!DOCTYPE html>\n<html>\n  <body>\n    <h1>New page</h1>\n  </body>\n</html>\n"
            : "";

    const file = makeFileFromText(path, template);
    setFiles((current) => [...current, file].sort((a, b) => a.path.localeCompare(b.path)));
    setSelectedPath(path);
    setNewFilePath("");
  }

  function deleteFile(path: string) {
    setFiles((current) => current.filter((entry) => entry.path !== path));
    if (selectedPath === path && files[0]) setSelectedPath(files[0].path);
  }

  function updateSelectedText(content: string) {
    if (!selectedFile || selectedFile.kind !== "text") return;
    setFiles((current) =>
      current.map((file) =>
        file.path === selectedFile.path
          ? {
              ...file,
              content,
              size: new TextEncoder().encode(content).length,
            }
          : file,
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Publish with preflight
  // -------------------------------------------------------------------------

  async function publishSite() {
    if (!walletClient || !publicClient || !address) {
      setPublishState({ phase: "error", message: "Connect a wallet before publishing." });
      return;
    }

    if (!selectedName) {
      setPublishState({ phase: "error", message: "Select a .eth name from the dropdown first." });
      return;
    }

    if (errors.length) {
      setPublishState({
        phase: "error",
        message: `Fix ${errors.length} validation error${errors.length > 1 ? "s" : ""} before publishing.`,
      });
      return;
    }

    // ---- Phase: preflight ----
    setPublishState({ phase: "preflight", message: "Running preflight checks…" });

    let chosenName: string;
    try {
      chosenName = normalize(selectedName);
    } catch {
      setPublishState({
        phase: "error",
        message: `"${selectedName}" is not a valid ENS name.`,
      });
      return;
    }

    try {
      if (chainId !== mainnet.id) {
        setPublishState({ phase: "preflight", message: "Switching to Ethereum mainnet…" });
        await switchChainAsync({ chainId: mainnet.id });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      const isNoScopes =
        errMsg.includes("NO_SCOPES_FOUND") ||
        errMsg.toLowerCase().includes("no scopes") ||
        errMsg.toLowerCase().includes("session not found");
      setPublishState({
        phase: "error",
        message: isNoScopes
          ? "Wallet session missing mainnet approval. Disconnect and reconnect your wallet, then try again."
          : "Switch to Ethereum mainnet to write the contenthash record.",
      });
      return;
    }

    let resolverAddress: `0x${string}` | null = null;
    try {
      setPublishState({ phase: "preflight", message: "Checking ENS resolver…" });
      resolverAddress = await publicClient.getEnsResolver({ name: chosenName });
    } catch {
      setPublishState({
        phase: "error",
        message: "Could not look up the resolver for this ENS name. Check your RPC connection.",
      });
      return;
    }

    if (!resolverAddress) {
      setPublishState({
        phase: "error",
        message: "This ENS name does not have a resolver. Set one at app.ens.domains first.",
      });
      return;
    }

    try {
      const supports = await publicClient.readContract({
        address: resolverAddress,
        abi: erc165Abi,
        functionName: "supportsInterface",
        args: [CONTENTHASH_INTERFACE_ID],
      });
      if (!supports) {
        console.warn(
          `Resolver ${resolverAddress} reports no support for contenthash interface (0xbc1c58d1). The transaction may revert.`
        );
      }
    } catch {
      // Some resolvers may not implement ERC-165 — ignore.
    }

    // ---- Phase: uploading ----
    setPublishState({ phase: "uploading", message: "Uploading your site folder to IPFS…" });

    let publishData: PublishResponse & { error?: string };
    try {
      const publishResponse = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: chosenName, files }),
      });
      publishData = (await publishResponse.json()) as PublishResponse & { error?: string };
      if (!publishResponse.ok || publishData.error) {
        const isMissingPinata = publishResponse.status === 503;
        throw new Error(
          isMissingPinata
            ? "IPFS publishing is not configured. Ask the admin to add PINATA_JWT."
            : publishData.error || "IPFS upload failed."
        );
      }
    } catch (error) {
      setPublishState({
        phase: "error",
        message: error instanceof Error ? error.message : "IPFS upload failed.",
      });
      return;
    }

    // ---- Phase: writing ----
    setPublishState({
      phase: "writing",
      message: "Waiting for your wallet to sign the contenthash transaction…",
      cid: publishData.cid,
      gatewayUrl: publishData.gatewayUrl,
    });

    let txHash: Hex;
    try {
      const encodedContenthash = `0x${contentHash.encode("ipfs-ns", publishData.cid)}` as Hex;
      txHash = await walletClient.writeContract({
        account: walletClient.account,
        address: resolverAddress,
        abi: publicResolverAbi,
        functionName: "setContenthash",
        args: [namehash(chosenName), encodedContenthash],
        chain: mainnet,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Transaction failed.";
      const isUserRejected =
        msg.toLowerCase().includes("rejected") ||
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("user cancelled");
      const isNoScopes =
        msg.includes("NO_SCOPES_FOUND") ||
        msg.toLowerCase().includes("no scopes") ||
        msg.toLowerCase().includes("session not found");
      setPublishState({
        phase: "error",
        message: isUserRejected
          ? "Transaction was rejected in your wallet."
          : isNoScopes
            ? "Wallet session missing mainnet approval. Disconnect and reconnect your wallet, then try again."
            : `Contenthash write failed: ${msg}`,
        cid: publishData.cid,
        gatewayUrl: publishData.gatewayUrl,
      });
      return;
    }

    // ---- Phase: confirming ----
    setPublishState({
      phase: "confirming",
      message: "Waiting for on-chain confirmation…",
      cid: publishData.cid,
      gatewayUrl: publishData.gatewayUrl,
      txHash,
    });

    let confirmed = false;
    try {
      // 90-second timeout — mainnet can be slow. If it doesn't confirm in time
      // we still advance to done: the tx is already submitted and will eventually mine.
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
      confirmed = true;
    } catch {
      // waitForTransactionReceipt can throw even when the tx HAS confirmed —
      // the public RPCs rate-limit and drop polling requests. Before telling
      // the user it's unconfirmed, ask for the receipt directly a few times.
      for (let attempt = 0; attempt < 3 && !confirmed; attempt++) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          confirmed = !!receipt;
        } catch {
          // receipt not found yet — wait a beat and retry
          await new Promise((resolve) => setTimeout(resolve, 3_000));
        }
      }
    }

    if (!confirmed) {
      // Genuinely not confirmed yet — the tx is on-chain, just not mined.
      setPublishState({
        phase: "done",
        message: "Transaction submitted — may take a few minutes to confirm. Check Etherscan for status.",
        cid: publishData.cid,
        gatewayUrl: publishData.gatewayUrl,
        limoUrl: getEthLimoUrl(chosenName),
        txHash,
      });
      return;
    }

    // ---- Phase: done ----
    setPublishState({
      phase: "done",
      message: "Your ENS site now points at the new IPFS deployment.",
      cid: publishData.cid,
      gatewayUrl: publishData.gatewayUrl,
      limoUrl: getEthLimoUrl(chosenName),
      txHash,
    });
  }

  const isPublishing =
    publishState.phase === "preflight" ||
    publishState.phase === "uploading" ||
    publishState.phase === "writing" ||
    publishState.phase === "confirming";

  return {
    // files
    files,
    selectedFile,
    selectedPath,
    setSelectedPath,
    newFilePath,
    setNewFilePath,
    handleCreateFile,
    deleteFile,
    updateSelectedText,
    handleImportedFiles,
    assetInputRef,
    folderInputRef,
    totalSize,
    // validation
    validation,
    errors,
    warnings,
    // preview
    previewHtml,
    // ens
    ensNames,
    selectedName,
    setSelectedName,
    namesLoading,
    namesMessage,
    isConnected,
    // publish
    publishState,
    publishSite,
    isPublishing,
  };
}

export type WorkspaceController = ReturnType<typeof useWorkspace>;
