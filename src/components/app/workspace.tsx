"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ConnectKitButton } from "connectkit";
import contentHash from "content-hash";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  FileCode2,
  FolderUp,
  Globe,
  ImagePlus,
  Info,
  LoaderCircle,
  Plus,
  Rocket,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { mainnet } from "wagmi/chains";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Hex } from "viem";
import { namehash, normalize } from "viem/ens";
import {
  CONTENTHASH_INTERFACE_ID,
  erc165Abi,
  getEtherscanTxUrl,
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

type PublishPhase = "idle" | "preflight" | "uploading" | "writing" | "confirming" | "done" | "error";

type PublishState = {
  phase: PublishPhase;
  message?: string;
  cid?: string;
  limoUrl?: string;
  gatewayUrl?: string;
  txHash?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
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
// Sub-components
// ---------------------------------------------------------------------------

function FileRow({
  file,
  active,
  onSelect,
  onDelete,
}: {
  file: SiteFile;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
        active
          ? "border-emerald-500/40 bg-emerald-500/8 text-emerald-900"
          : "border-zinc-200/80 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50/50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <FileCode2 className="size-3.5 shrink-0 text-zinc-400" />
        <span className="truncate text-sm font-medium">{file.path}</span>
      </span>
      <span
        role="button"
        tabIndex={0}
        className="ml-2 rounded-full p-1 text-zinc-300 opacity-0 transition hover:bg-zinc-100 hover:text-rose-500 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(); } }}
        aria-label={`Delete ${file.path}`}
      >
        <Trash2 className="size-3.5" />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Publish Timeline
// ---------------------------------------------------------------------------

type TimelineStep = {
  label: string;
  phase: PublishPhase;
};

const PUBLISH_STEPS: TimelineStep[] = [
  { label: "Preflight checks", phase: "preflight" },
  { label: "Upload to IPFS", phase: "uploading" },
  { label: "Wallet signature", phase: "writing" },
  { label: "On-chain confirmation", phase: "confirming" },
  { label: "Live", phase: "done" },
];

const PHASE_ORDER: Record<PublishPhase, number> = {
  idle: -1,
  preflight: 0,
  uploading: 1,
  writing: 2,
  confirming: 3,
  done: 4,
  error: -2,
};

function PublishTimeline({ state }: { state: PublishState }) {
  if (state.phase === "idle") {
    return (
      <p className="text-sm leading-6 text-zinc-500">
        Nothing published yet. Hit <strong>Publish</strong> when your preview looks right.
      </p>
    );
  }

  const currentOrder = PHASE_ORDER[state.phase];

  return (
    <div className="space-y-1.5">
      {PUBLISH_STEPS.map((step) => {
        const stepOrder = PHASE_ORDER[step.phase];
        const isActive = state.phase === step.phase && state.phase !== "done";
        // A step is complete if we've passed it, OR if the current phase IS this step
        // and it's the terminal "done" phase (there's nothing after it to push it to complete).
        const isComplete =
          state.phase !== "error" &&
          (currentOrder > stepOrder || (state.phase === "done" && step.phase === "done"));

        let icon = <Circle className="size-3.5 text-zinc-300" />;
        let textColor = "text-zinc-400";

        if (isComplete) {
          icon = <Check className="size-3.5 text-emerald-600" />;
          textColor = "text-emerald-800";
        } else if (isActive) {
          icon = <LoaderCircle className="size-3.5 animate-spin text-emerald-600" />;
          textColor = "text-zinc-900 font-medium";
        }

        return (
          <div
            key={step.phase}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${
              isActive
                ? "bg-emerald-50 border border-emerald-200"
                : isComplete
                  ? "bg-emerald-50/50"
                  : ""
            }`}
          >
            {icon}
            <span className={`text-sm ${textColor}`}>{step.label}</span>
          </div>
        );
      })}

      {state.phase === "error" && (
        <div className="mt-1.5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2">
          <X className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
          <p className="text-sm text-rose-900">{state.message || "Publishing failed."}</p>
        </div>
      )}

      {state.phase === "done" && (
        <div className="mt-1.5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-900">{state.message}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Workspace
// ---------------------------------------------------------------------------

export function Workspace() {
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
              : "Showing your primary ENS name. Add ENS_SUBGRAPH_URL to see all owned names.";
        } else if (!nextMessage) {
          nextMessage = data.source === "none"
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

    try {
      // 90-second timeout — mainnet can be slow. If it doesn't confirm in time
      // we still advance to done: the tx is already submitted and will eventually mine.
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
    } catch {
      // Timeout or polling error — the tx is still on-chain, just not confirmed yet.
      // Show done with a note to check Etherscan rather than showing an error.
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isPublishing =
    publishState.phase === "preflight" ||
    publishState.phase === "uploading" ||
    publishState.phase === "writing" ||
    publishState.phase === "confirming";

  const activeName = selectedName;

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">

        {/* ============================================================= */}
        {/* TOP BAR — branding, ENS name, description, connect            */}
        {/* ============================================================= */}

        <header className="glass-panel relative rounded-2xl px-5 py-4">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: identity + description */}
            <div className="flex items-center gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-semibold text-white shadow-[0_12px_28px_rgba(18,18,15,0.2)]">
                sx
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-zinc-950">
                  sites.xyz
                </h1>
                <p className="text-sm text-zinc-500">
                  Deploy a decentralised site to your .eth name.
                </p>
              </div>
            </div>

            {/* Right: ENS name selector + wallet */}
            <div className="flex flex-wrap items-center gap-3">
              {/* ENS name quick-select */}
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 shadow-sm">
                <WandSparkles className="size-3.5 text-emerald-600" />
                <div className="relative">
                  <select
                    value={selectedName}
                    onChange={(event) => setSelectedName(event.target.value)}
                    className="appearance-none bg-transparent pr-6 text-sm font-medium text-zinc-900 outline-none"
                  >
                    <option value="" disabled>
                      {namesLoading ? "Loading…" : "Pick a .eth name"}
                    </option>
                    {ensNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-zinc-400" />
                </div>
              </div>

              <ConnectKitButton />
            </div>
          </div>

          {/* ENS info message */}
          {namesMessage && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/60 px-3 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              <p className="text-xs leading-5 text-emerald-800">{namesMessage}</p>
            </div>
          )}

          {/* Validation banner — compact, only when there are issues */}
          {validation.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {validation.map((issue, index) => (
                <div
                  key={`${issue.message}-${index}`}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    issue.level === "error"
                      ? "border border-rose-200 bg-rose-50 text-rose-800"
                      : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  {issue.message}
                  {issue.path && <span className="font-mono opacity-60">({issue.path})</span>}
                </div>
              ))}
            </div>
          )}
        </header>

        {/* ============================================================= */}
        {/* TWO HALVES — Editor left, Preview+Publish right               */}
        {/* ============================================================= */}

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">

          {/* =========================================================== */}
          {/* LEFT HALF — Files + Editor                                   */}
          {/* =========================================================== */}

          <div className="flex min-h-0 flex-col gap-4">
            {/* File management bar */}
            <div className="paper-panel rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Files</p>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                    {files.length}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                    {humanFileSize(totalSize)}
                  </span>
                  {errors.length > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                      {errors.length} error{errors.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {errors.length === 0 && warnings.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      {warnings.length} warning{warnings.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {errors.length === 0 && warnings.length === 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Clean
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => assetInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <ImagePlus className="size-3" />
                    Upload
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <FolderUp className="size-3" />
                    Folder
                  </button>
                </div>
              </div>

              <input
                ref={assetInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void handleImportedFiles(event.target.files)}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                onChange={(event) => void handleImportedFiles(event.target.files)}
              />

              {/* File list + add */}
              <div className="mt-3 flex flex-col gap-1.5">
                {files.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    active={selectedFile?.path === file.path}
                    onSelect={() => setSelectedPath(file.path)}
                    onDelete={() => {
                      setFiles((current) => current.filter((entry) => entry.path !== file.path));
                      if (selectedPath === file.path && files[0]) setSelectedPath(files[0].path);
                    }}
                  />
                ))}

                {/* Inline add */}
                <div className="flex items-center gap-1.5">
                  <input
                    value={newFilePath}
                    onChange={(event) => setNewFilePath(event.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateFile(); }}
                    placeholder="new-file.html"
                    className="w-32 rounded-lg border border-dashed border-zinc-300 bg-transparent px-2.5 py-2 text-sm text-zinc-700 outline-none transition focus:border-emerald-400"
                  />
                  <button
                    onClick={handleCreateFile}
                    className="rounded-lg bg-zinc-900 p-2 text-white transition hover:bg-zinc-700"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
              {selectedFile ? (
                selectedFile.kind === "text" ? (
                  <div className="overflow-hidden rounded-2xl border border-[#1d211c] bg-[#121511] shadow-[0_26px_60px_rgba(12,20,15,0.2)]">
                    <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                      <span className="size-2.5 rounded-full bg-rose-400/90" />
                      <span className="size-2.5 rounded-full bg-amber-300/90" />
                      <span className="size-2.5 rounded-full bg-emerald-400/90" />
                      <div className="ml-3 truncate rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-emerald-50/70">
                        {selectedFile.path}
                      </div>
                      <div className="ml-auto rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/42">
                        {selectedFile.mimeType.split("/")[1]}
                      </div>
                    </div>
                    <textarea
                      value={selectedFile.content}
                      onChange={(event) => updateSelectedText(event.target.value)}
                      spellCheck={false}
                      className="min-h-[600px] w-full resize-none bg-transparent p-5 font-mono text-sm leading-7 text-emerald-50 outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[600px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-[linear-gradient(180deg,_#fcfbf7_0%,_#f1ebdf_100%)] p-6 text-center">
                    {isImage(selectedFile.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:${selectedFile.mimeType};base64,${selectedFile.content}`}
                        alt={selectedFile.path}
                        className="max-h-[440px] w-auto rounded-2xl border border-zinc-200 bg-white shadow-sm"
                      />
                    ) : (
                      <Upload className="size-10 text-zinc-400" />
                    )}
                    <p className="mt-4 text-base font-medium text-zinc-900">{selectedFile.path}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {selectedFile.mimeType} · {humanFileSize(selectedFile.size)}
                    </p>
                  </div>
                )
              ) : (
                <div className="flex min-h-[600px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-[linear-gradient(180deg,_#fcfbf7_0%,_#f1ebdf_100%)] text-zinc-500">
                  Select a file to start editing.
                </div>
              )}
            </div>
          </div>

          {/* =========================================================== */}
          {/* RIGHT HALF — Preview + Publish                               */}
          {/* =========================================================== */}

          <div className="flex flex-col gap-4">
            {/* Preview */}
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#f5efe3] shadow-[0_20px_52px_rgba(18,31,22,0.08)]">
              <div className="flex items-center gap-2 border-b border-black/6 px-4 py-2.5">
                <span className="size-2 rounded-full bg-rose-300" />
                <span className="size-2 rounded-full bg-amber-300" />
                <span className="size-2 rounded-full bg-emerald-400" />
                <div className="ml-3 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                  Preview
                </div>
                {activeName && (
                  <div className="ml-auto rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                    {activeName}
                  </div>
                )}
              </div>
              <iframe
                title="Static site preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-same-origin"
                className="h-[480px] w-full bg-white"
              />
            </div>

            {/* Publish panel */}
            <div className="paper-panel flex-1 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Publish</p>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                    Upload the folder to IPFS, then write the ENS contenthash on mainnet.
                  </p>
                </div>
                <button
                  onClick={publishSite}
                  disabled={isPublishing}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(18,18,15,0.16)] transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPublishing ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Rocket className="size-4" />
                  )}
                  Publish to ENS
                </button>
              </div>

              <div className="mt-4">
                <PublishTimeline state={publishState} />
              </div>

              {/* Result links */}
              {(publishState.cid || publishState.txHash || publishState.gatewayUrl || publishState.limoUrl) && (
                <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
                  {publishState.cid && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <Globe className="size-3.5 text-emerald-600" />
                        IPFS CID
                      </div>
                      <p className="mt-1.5 break-all font-mono text-xs text-zinc-700">{publishState.cid}</p>
                    </div>
                  )}

                  {publishState.txHash && (
                    <a
                      href={getEtherscanTxUrl(publishState.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <span>View on Etherscan</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}

                  {publishState.gatewayUrl && (
                    <a
                      href={publishState.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <span>Open IPFS gateway</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}

                  {publishState.limoUrl && (
                    <a
                      href={publishState.limoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                    >
                      <span>Open {publishState.limoUrl}</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
