"use client";

import { ConnectKitButton } from "connectkit";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  FolderUp,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getEtherscanTxUrl } from "@/lib/ens";
import {
  humanFileSize,
  isImage,
  PHASE_ORDER,
  PUBLISH_STEPS,
  PublishState,
  useWorkspace,
} from "@/components/app/use-workspace";

/**
 * VARIANT 2 — "TERMINAL"
 * Dark-ink IDE direction. The whole app lives inside one dark shell
 * (the inverse of the current cream theme — same ink/cream/emerald palette,
 * flipped). Monospace-first, dense, sidebar + tabs, status bar at the bottom.
 */

const INK = "#12120f";
const PANEL = "#1a1a16";
const PANEL_SOFT = "#21211c";
const CREAM = "#f7f2e8";
const LINE = "border-white/8";

function TerminalTimeline({ state }: { state: PublishState }) {
  if (state.phase === "idle") {
    return (
      <p className="font-mono text-xs leading-6 text-[#f7f2e8]/40">
        $ awaiting publish command_
      </p>
    );
  }

  const currentOrder = PHASE_ORDER[state.phase];

  return (
    <div className="space-y-1 font-mono text-xs">
      {PUBLISH_STEPS.map((step) => {
        const stepOrder = PHASE_ORDER[step.phase];
        const isActive = state.phase === step.phase && state.phase !== "done";
        const isComplete =
          state.phase !== "error" &&
          (currentOrder > stepOrder || (state.phase === "done" && step.phase === "done"));

        return (
          <div key={step.phase} className="flex items-center gap-2.5 py-0.5">
            {isComplete ? (
              <span className="text-emerald-400">[ok]</span>
            ) : isActive ? (
              <span className="animate-pulse text-emerald-300">[..]</span>
            ) : (
              <span className="text-[#f7f2e8]/25">[--]</span>
            )}
            <span
              className={
                isComplete
                  ? "text-emerald-200/80"
                  : isActive
                    ? "text-[#f7f2e8]"
                    : "text-[#f7f2e8]/35"
              }
            >
              {step.label.toLowerCase()}
            </span>
          </div>
        );
      })}

      {state.phase === "error" && (
        <p className="mt-2 border-l-2 border-rose-500 pl-3 leading-5 text-rose-300">
          err: {state.message || "publishing failed."}
        </p>
      )}
      {state.phase === "done" && (
        <p className="mt-2 border-l-2 border-emerald-400 pl-3 leading-5 text-emerald-200">
          {state.message}
        </p>
      )}
    </div>
  );
}

export function WorkspaceTerminal() {
  const w = useWorkspace();
  const { selectedFile, publishState } = w;

  return (
    <div className="flex min-h-screen flex-col font-mono" style={{ background: INK, color: CREAM }}>

      {/* ============ TITLE BAR ============ */}
      <header className={`flex flex-wrap items-center gap-3 border-b ${LINE} px-4 py-2.5`} style={{ background: PANEL }}>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rose-400/80" />
          <span className="size-2.5 rounded-full bg-amber-300/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <span className="text-xs text-[#f7f2e8]/60">
          sites.xyz <span className="text-[#f7f2e8]/30">—</span>{" "}
          <span className="text-emerald-300">{w.selectedName || "no name selected"}</span>
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 rounded border ${LINE} px-2.5 py-1`} style={{ background: PANEL_SOFT }}>
            <ChevronRight className="size-3 text-emerald-400" />
            <select
              value={w.selectedName}
              onChange={(e) => w.setSelectedName(e.target.value)}
              className="appearance-none bg-transparent pr-4 text-xs text-[#f7f2e8] outline-none [&>option]:text-black"
            >
              <option value="" disabled>
                {w.namesLoading ? "loading…" : "select .eth name"}
              </option>
              {w.ensNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      {/* messages */}
      {w.namesMessage && (
        <div className={`border-b ${LINE} px-4 py-1.5 text-[11px] text-emerald-200/70`} style={{ background: PANEL }}>
          # {w.namesMessage}
        </div>
      )}
      {w.validation.length > 0 && (
        <div className={`flex flex-wrap gap-x-5 gap-y-1 border-b ${LINE} px-4 py-1.5 text-[11px]`} style={{ background: PANEL }}>
          {w.validation.map((issue, index) => (
            <span
              key={`${issue.message}-${index}`}
              className={`flex items-center gap-1.5 ${issue.level === "error" ? "text-rose-300" : "text-amber-300"}`}
            >
              <AlertTriangle className="size-3" />
              {issue.message}
              {issue.path && <span className="opacity-50">({issue.path})</span>}
            </span>
          ))}
        </div>
      )}

      {/* ============ MAIN: sidebar / editor / right rail ============ */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_1fr_420px]">

        {/* -------- SIDEBAR: files -------- */}
        <aside className={`flex flex-col border-b ${LINE} lg:border-b-0 lg:border-r`} style={{ background: PANEL }}>
          <div className={`flex items-center justify-between border-b ${LINE} px-3 py-2`}>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#f7f2e8]/45">explorer</span>
            <div className="flex gap-1">
              <button
                onClick={() => w.assetInputRef.current?.click()}
                className="rounded p-1 text-[#f7f2e8]/40 transition hover:bg-white/5 hover:text-emerald-300"
                title="Upload files"
              >
                <ImagePlus className="size-3.5" />
              </button>
              <button
                onClick={() => w.folderInputRef.current?.click()}
                className="rounded p-1 text-[#f7f2e8]/40 transition hover:bg-white/5 hover:text-emerald-300"
                title="Import folder"
              >
                <FolderUp className="size-3.5" />
              </button>
            </div>
          </div>

          <input
            ref={w.assetInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void w.handleImportedFiles(e.target.files)}
          />
          <input
            ref={w.folderInputRef}
            type="file"
            multiple
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => void w.handleImportedFiles(e.target.files)}
          />

          <div className="flex-1 overflow-y-auto py-1">
            {w.files.map((file) => {
              const active = selectedFile?.path === file.path;
              return (
                <div
                  key={file.path}
                  className={`group flex items-center justify-between pr-2 ${
                    active ? "bg-emerald-400/10" : "hover:bg-white/4"
                  }`}
                >
                  <button
                    onClick={() => w.setSelectedPath(file.path)}
                    className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-xs ${
                      active ? "text-emerald-300" : "text-[#f7f2e8]/65"
                    }`}
                  >
                    <span className={active ? "text-emerald-400" : "text-[#f7f2e8]/25"}>
                      {active ? ">" : "·"}
                    </span>
                    <span className="truncate">{file.path}</span>
                  </button>
                  <button
                    onClick={() => w.deleteFile(file.path)}
                    className="p-0.5 text-transparent transition hover:text-rose-400 group-hover:text-[#f7f2e8]/30"
                    aria-label={`Delete ${file.path}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })}

            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <span className="text-[#f7f2e8]/25">+</span>
              <input
                value={w.newFilePath}
                onChange={(e) => w.setNewFilePath(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") w.handleCreateFile(); }}
                placeholder="touch new-file.html"
                className="w-full bg-transparent text-xs text-[#f7f2e8] placeholder:text-[#f7f2e8]/25 outline-none"
              />
              <button onClick={w.handleCreateFile} className="text-[#f7f2e8]/30 transition hover:text-emerald-300">
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          <div className={`border-t ${LINE} px-3 py-2 text-[10px] text-[#f7f2e8]/35`}>
            {w.files.length} files · {humanFileSize(w.totalSize)} / 3.5 MB
          </div>
        </aside>

        {/* -------- CENTER: editor -------- */}
        <main className="flex min-w-0 flex-col" style={{ background: INK }}>
          {/* tab bar */}
          <div className={`flex items-center overflow-x-auto border-b ${LINE}`} style={{ background: PANEL }}>
            {selectedFile && (
              <div className={`flex items-center gap-2 border-r ${LINE} bg-[#12120f] px-4 py-2 text-xs text-emerald-200`}>
                {selectedFile.path}
                <span className="text-[10px] uppercase text-[#f7f2e8]/30">
                  {selectedFile.mimeType.split("/")[1]}
                </span>
              </div>
            )}
          </div>

          {selectedFile ? (
            selectedFile.kind === "text" ? (
              <textarea
                value={selectedFile.content}
                onChange={(e) => w.updateSelectedText(e.target.value)}
                spellCheck={false}
                className="min-h-[500px] w-full flex-1 resize-none bg-transparent p-5 text-[13px] leading-7 text-emerald-50 caret-emerald-400 outline-none"
              />
            ) : (
              <div className="flex min-h-[500px] flex-1 flex-col items-center justify-center p-6 text-center">
                {isImage(selectedFile.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${selectedFile.mimeType};base64,${selectedFile.content}`}
                    alt={selectedFile.path}
                    className={`max-h-[440px] w-auto rounded border ${LINE}`}
                  />
                ) : (
                  <Upload className="size-10 text-[#f7f2e8]/25" />
                )}
                <p className="mt-4 text-sm text-[#f7f2e8]/80">{selectedFile.path}</p>
                <p className="mt-1 text-xs text-[#f7f2e8]/40">
                  {selectedFile.mimeType} · {humanFileSize(selectedFile.size)}
                </p>
              </div>
            )
          ) : (
            <div className="flex min-h-[500px] flex-1 items-center justify-center text-xs text-[#f7f2e8]/35">
              $ select a file to edit_
            </div>
          )}
        </main>

        {/* -------- RIGHT RAIL: preview + publish -------- */}
        <aside className={`flex flex-col border-t ${LINE} lg:border-t-0 lg:border-l`} style={{ background: PANEL }}>
          <div className={`flex items-center justify-between border-b ${LINE} px-3 py-2`}>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#f7f2e8]/45">preview</span>
            {w.selectedName && (
              <span className="text-[10px] text-emerald-300">{w.selectedName}.limo</span>
            )}
          </div>
          <iframe
            title="Static site preview"
            srcDoc={w.previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="h-[380px] w-full bg-white"
          />

          <div className={`flex items-center justify-between border-y ${LINE} px-3 py-2`}>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#f7f2e8]/45">publish</span>
            <button
              onClick={w.publishSite}
              disabled={w.isPublishing}
              className="flex items-center gap-1.5 rounded border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {w.isPublishing ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              {w.isPublishing ? "running" : "./publish --ens"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <TerminalTimeline state={publishState} />

            {(publishState.cid || publishState.txHash || publishState.gatewayUrl || publishState.limoUrl) && (
              <div className={`mt-4 space-y-2 border-t ${LINE} pt-3 text-xs`}>
                {publishState.cid && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#f7f2e8]/40">cid</p>
                    <p className="mt-0.5 break-all text-emerald-200/80">{publishState.cid}</p>
                  </div>
                )}
                {publishState.txHash && (
                  <a
                    href={getEtherscanTxUrl(publishState.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-[#f7f2e8]/70 transition hover:text-emerald-300"
                  >
                    <span>etherscan ↗</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {publishState.gatewayUrl && (
                  <a
                    href={publishState.gatewayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-[#f7f2e8]/70 transition hover:text-emerald-300"
                  >
                    <span>ipfs gateway ↗</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {publishState.limoUrl && (
                  <a
                    href={publishState.limoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between font-semibold text-emerald-300 transition hover:text-emerald-200"
                  >
                    <span>{publishState.limoUrl} ↗</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ============ STATUS BAR ============ */}
      <footer
        className={`flex flex-wrap items-center gap-x-5 gap-y-1 border-t ${LINE} px-4 py-1.5 text-[11px]`}
        style={{ background: "#0d4f31", color: "#eafff3" }}
      >
        <span className="flex items-center gap-1.5">
          {w.errors.length === 0 ? <Check className="size-3" /> : <X className="size-3" />}
          {w.errors.length === 0 ? "clean" : `${w.errors.length} error(s)`}
        </span>
        {w.warnings.length > 0 && <span>{w.warnings.length} warning(s)</span>}
        <span>{w.files.length} files</span>
        <span>{humanFileSize(w.totalSize)}</span>
        <span className="ml-auto">{w.selectedName ? `→ ${w.selectedName}` : "no .eth name"}</span>
        <span className="opacity-70">ipfs + ens mainnet</span>
      </footer>
    </div>
  );
}
