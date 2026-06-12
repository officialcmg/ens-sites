"use client";

import { ConnectKitButton } from "connectkit";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  FileCode2,
  FolderUp,
  ImagePlus,
  LoaderCircle,
  Minus,
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
 * VARIANT 1 — "EDITORIAL"
 * Flat print/magazine direction. No shadows, no blur, no glass.
 * Hairline rules, numbered sections, uppercase micro-labels,
 * generous whitespace, light paper code editor.
 * Same palette: cream paper, ink, emerald accent.
 */

const RULE = "border-[#181612]/12";

function SectionLabel({ index, title, children }: { index: string; title: string; children?: React.ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between border-b ${RULE} pb-2`}>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-[#2d8a57]">{index}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#181612]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function EditorialTimeline({ state }: { state: PublishState }) {
  if (state.phase === "idle") {
    return (
      <p className="text-sm leading-7 text-[#181612]/55">
        Nothing published yet. The five steps below run when you press publish — IPFS first, then the
        on-chain contenthash record.
      </p>
    );
  }

  const currentOrder = PHASE_ORDER[state.phase];

  return (
    <div>
      {PUBLISH_STEPS.map((step, i) => {
        const stepOrder = PHASE_ORDER[step.phase];
        const isActive = state.phase === step.phase && state.phase !== "done";
        const isComplete =
          state.phase !== "error" &&
          (currentOrder > stepOrder || (state.phase === "done" && step.phase === "done"));

        return (
          <div key={step.phase} className={`flex items-center justify-between border-b ${RULE} py-2.5`}>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] text-[#181612]/40">{String(i + 1).padStart(2, "0")}</span>
              <span
                className={`text-sm ${
                  isComplete
                    ? "text-[#1d5f3d]"
                    : isActive
                      ? "font-medium text-[#181612]"
                      : "text-[#181612]/40"
                }`}
              >
                {step.label}
              </span>
            </div>
            {isComplete ? (
              <Check className="size-3.5 text-[#2d8a57]" />
            ) : isActive ? (
              <LoaderCircle className="size-3.5 animate-spin text-[#2d8a57]" />
            ) : (
              <Minus className="size-3.5 text-[#181612]/20" />
            )}
          </div>
        );
      })}

      {state.phase === "error" && (
        <div className="mt-4 flex items-start gap-3 border-l-2 border-rose-600 pl-4">
          <p className="text-sm leading-6 text-rose-800">{state.message || "Publishing failed."}</p>
        </div>
      )}
      {state.phase === "done" && (
        <div className="mt-4 flex items-start gap-3 border-l-2 border-[#2d8a57] pl-4">
          <p className="text-sm leading-6 text-[#1d5f3d]">{state.message}</p>
        </div>
      )}
    </div>
  );
}

export function WorkspaceEditorial() {
  const w = useWorkspace();
  const { selectedFile, publishState } = w;

  return (
    <div className="min-h-screen bg-[#ece8de] text-[#181612]">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-8 lg:px-10">

        {/* ============ MASTHEAD ============ */}
        <header className={`border-b-2 border-[#181612] pb-5`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#2d8a57]">
                Decentralised publishing
              </p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight">sites.xyz</h1>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#181612]/50">
                  Publishing to
                </label>
                <select
                  value={w.selectedName}
                  onChange={(e) => w.setSelectedName(e.target.value)}
                  className={`border-b ${RULE} bg-transparent pb-1 pr-6 font-mono text-sm outline-none focus:border-[#2d8a57]`}
                >
                  <option value="" disabled>
                    {w.namesLoading ? "loading…" : "pick a .eth name"}
                  </option>
                  {w.ensNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <ConnectKitButton />
            </div>
          </div>

          {w.namesMessage && (
            <p className="mt-4 max-w-2xl border-l-2 border-[#2d8a57] pl-3 text-xs leading-5 text-[#1d5f3d]">
              {w.namesMessage}
            </p>
          )}

          {w.validation.length > 0 && (
            <div className="mt-4 space-y-1">
              {w.validation.map((issue, index) => (
                <p
                  key={`${issue.message}-${index}`}
                  className={`flex items-center gap-2 text-xs ${
                    issue.level === "error" ? "text-rose-700" : "text-amber-700"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  {issue.message}
                  {issue.path && <span className="font-mono opacity-60">({issue.path})</span>}
                </p>
              ))}
            </div>
          )}
        </header>

        {/* ============ COLUMNS ============ */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[280px_1fr_1fr] lg:gap-8">

          {/* -------- FILES column -------- */}
          <section>
            <SectionLabel index="01" title="Files">
              <span className="font-mono text-[11px] text-[#181612]/45">
                {w.files.length} · {humanFileSize(w.totalSize)}
              </span>
            </SectionLabel>

            <div className="mt-1">
              {w.files.map((file) => {
                const active = selectedFile?.path === file.path;
                return (
                  <div
                    key={file.path}
                    className={`group flex items-center justify-between border-b ${RULE}`}
                  >
                    <button
                      onClick={() => w.setSelectedPath(file.path)}
                      className={`flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left text-sm transition ${
                        active ? "font-medium text-[#1d5f3d]" : "text-[#181612]/65 hover:text-[#181612]"
                      }`}
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${active ? "bg-[#2d8a57]" : "bg-[#181612]/15"}`} />
                      <span className="truncate font-mono text-[13px]">{file.path}</span>
                    </button>
                    <button
                      onClick={() => w.deleteFile(file.path)}
                      className="p-1 text-[#181612]/0 transition hover:text-rose-600 group-hover:text-[#181612]/30"
                      aria-label={`Delete ${file.path}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}

              <div className={`flex items-center gap-2 border-b ${RULE} py-2`}>
                <input
                  value={w.newFilePath}
                  onChange={(e) => w.setNewFilePath(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") w.handleCreateFile(); }}
                  placeholder="new-file.html"
                  className="w-full bg-transparent font-mono text-[13px] text-[#181612] placeholder:text-[#181612]/30 outline-none"
                />
                <button onClick={w.handleCreateFile} className="text-[#181612]/40 transition hover:text-[#2d8a57]">
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => w.assetInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#181612]/60 underline decoration-[#181612]/20 underline-offset-4 transition hover:text-[#1d5f3d] hover:decoration-[#2d8a57]"
                >
                  <ImagePlus className="size-3" />
                  Upload files
                </button>
                <button
                  onClick={() => w.folderInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#181612]/60 underline decoration-[#181612]/20 underline-offset-4 transition hover:text-[#1d5f3d] hover:decoration-[#2d8a57]"
                >
                  <FolderUp className="size-3" />
                  Import folder
                </button>
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
            </div>

            {/* Publish block lives under files in this layout */}
            <div className="mt-12">
              <SectionLabel index="03" title="Publish" />
              <div className="mt-4">
                <EditorialTimeline state={publishState} />
              </div>

              <button
                onClick={w.publishSite}
                disabled={w.isPublishing}
                className="mt-6 flex w-full items-center justify-between border-2 border-[#181612] bg-[#181612] px-4 py-3 text-sm font-semibold text-[#ece8de] transition hover:bg-transparent hover:text-[#181612] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {w.isPublishing ? "Publishing…" : "Publish to ENS"}
                {w.isPublishing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
              </button>

              {(publishState.cid || publishState.txHash || publishState.gatewayUrl || publishState.limoUrl) && (
                <div className="mt-5 space-y-2.5 text-sm">
                  {publishState.cid && (
                    <div className={`border-b ${RULE} pb-2.5`}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#181612]/45">IPFS CID</p>
                      <p className="mt-1 break-all font-mono text-xs text-[#181612]/75">{publishState.cid}</p>
                    </div>
                  )}
                  {publishState.txHash && (
                    <a
                      href={getEtherscanTxUrl(publishState.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between border-b ${RULE} pb-2.5 text-[#181612]/75 transition hover:text-[#1d5f3d]`}
                    >
                      <span>View on Etherscan</span>
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                  {publishState.gatewayUrl && (
                    <a
                      href={publishState.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between border-b ${RULE} pb-2.5 text-[#181612]/75 transition hover:text-[#1d5f3d]`}
                    >
                      <span>Open IPFS gateway</span>
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                  {publishState.limoUrl && (
                    <a
                      href={publishState.limoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between border-b border-[#2d8a57] pb-2.5 font-medium text-[#1d5f3d] transition hover:text-[#2d8a57]"
                    >
                      <span>Open {publishState.limoUrl}</span>
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* -------- EDITOR column -------- */}
          <section className="min-w-0">
            <SectionLabel index="02" title="Editor">
              {selectedFile && (
                <span className="truncate font-mono text-[11px] text-[#181612]/45">{selectedFile.path}</span>
              )}
            </SectionLabel>

            <div className="mt-1">
              {selectedFile ? (
                selectedFile.kind === "text" ? (
                  <textarea
                    value={selectedFile.content}
                    onChange={(e) => w.updateSelectedText(e.target.value)}
                    spellCheck={false}
                    className="min-h-[640px] w-full resize-none bg-transparent py-4 font-mono text-[13px] leading-7 text-[#181612] caret-[#1d5f3d] outline-none"
                  />
                ) : (
                  <div className="flex min-h-[640px] flex-col items-center justify-center py-4 text-center">
                    {isImage(selectedFile.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:${selectedFile.mimeType};base64,${selectedFile.content}`}
                        alt={selectedFile.path}
                        className={`max-h-[440px] w-auto border ${RULE}`}
                      />
                    ) : (
                      <Upload className="size-10 text-[#181612]/30" />
                    )}
                    <p className="mt-4 font-mono text-sm">{selectedFile.path}</p>
                    <p className="mt-1 text-xs text-[#181612]/50">
                      {selectedFile.mimeType} · {humanFileSize(selectedFile.size)}
                    </p>
                  </div>
                )
              ) : (
                <div className="flex min-h-[640px] items-center justify-center text-sm text-[#181612]/40">
                  Select a file to start editing.
                </div>
              )}
            </div>
          </section>

          {/* -------- PREVIEW column -------- */}
          <section className="min-w-0">
            <SectionLabel index="04" title="Preview">
              {w.selectedName && (
                <span className="font-mono text-[11px] text-[#2d8a57]">{w.selectedName}.limo</span>
              )}
            </SectionLabel>

            <div className={`mt-4 border ${RULE}`}>
              <iframe
                title="Static site preview"
                srcDoc={w.previewHtml}
                sandbox="allow-scripts allow-same-origin"
                className="h-[680px] w-full bg-white"
              />
            </div>
            <p className="mt-3 flex items-center gap-2 text-[11px] text-[#181612]/45">
              <FileCode2 className="size-3" />
              Live preview — assets inlined, sandboxed iframe.
            </p>
          </section>
        </div>

        <footer className={`mt-12 border-t ${RULE} pt-4 pb-2`}>
          <p className="flex items-center justify-between font-mono text-[11px] text-[#181612]/40">
            <span>sites.xyz — static sites on ENS + IPFS</span>
            <span className="flex items-center gap-1.5">
              {publishState.phase === "error" ? <X className="size-3 text-rose-600" /> : <Check className="size-3 text-[#2d8a57]" />}
              {w.errors.length === 0 ? "ready to publish" : `${w.errors.length} error(s)`}
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}
