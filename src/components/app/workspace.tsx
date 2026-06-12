"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectKitButton } from "connectkit";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ExternalLink,
  FolderUp,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Plus,
  Square,
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
import { languageLabel, PressCodeEditor } from "@/components/app/press-code-editor";
import { PressNameSelect } from "@/components/app/press-name-select";

/**
 * Workspace — "PRESS" (neo-brutalist) UI.
 * Chunky 2px ink borders, hard offset shadows, zero blur, zero gradients,
 * stark blocks and oversized type on the cream/ink/emerald palette.
 *
 * - Draggable split between left (files+editor) and right (preview+publish)
 * - Real CodeMirror editor with language detection + syntax highlighting
 * - Custom styled .eth name dropdown with empty/disconnected states
 *
 * All behavior lives in useWorkspace() — this file is pure presentation.
 */

const BOX = "border-2 border-[#12120f] bg-[#fffcf7]";
const SHADOW = "shadow-[5px_5px_0_#12120f]";
const PRESS =
  "transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#12120f]";

// ---------------------------------------------------------------------------
// Draggable split hook
// ---------------------------------------------------------------------------

const SPLIT_MIN = 28; // % — don't let either side collapse entirely
const SPLIT_MAX = 72;

function useDragSplit(initial = 50) {
  const [split, setSplit] = useState(initial); // % width of the LEFT side
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct)));
    }
    function onUp() {
      setDragging(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  return { split, dragging, containerRef, onDragStart };
}

// ---------------------------------------------------------------------------
// Publish timeline
// ---------------------------------------------------------------------------

function PressTimeline({ state }: { state: PublishState }) {
  if (state.phase === "idle") {
    return (
      <p className="text-sm leading-6 text-[#12120f]/60">
        Nothing published yet. Smash the big green button when your preview looks right.
      </p>
    );
  }

  const currentOrder = PHASE_ORDER[state.phase];

  return (
    <div className="space-y-1.5">
      {PUBLISH_STEPS.map((step) => {
        const stepOrder = PHASE_ORDER[step.phase];
        const isActive = state.phase === step.phase && state.phase !== "done";
        const isComplete =
          state.phase !== "error" &&
          (currentOrder > stepOrder || (state.phase === "done" && step.phase === "done"));

        return (
          <div
            key={step.phase}
            className={`flex items-center gap-2.5 border-2 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wide ${
              isComplete
                ? "border-[#12120f] bg-[#2d8a57] text-white"
                : isActive
                  ? "border-[#12120f] bg-[#fff64f] text-[#12120f]"
                  : "border-[#12120f]/20 bg-transparent text-[#12120f]/35"
            }`}
          >
            {isComplete ? (
              <Check className="size-4" />
            ) : isActive ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Square className="size-3.5" />
            )}
            {step.label}
          </div>
        );
      })}

      {state.phase === "error" && (
        <div className="flex items-start gap-2.5 border-2 border-[#12120f] bg-rose-500 px-2.5 py-2 text-sm font-medium text-white">
          <X className="mt-0.5 size-4 shrink-0" />
          {state.message || "Publishing failed."}
        </div>
      )}
      {state.phase === "done" && (
        <div className="flex items-start gap-2.5 border-2 border-[#12120f] bg-[#1d5f3d] px-2.5 py-2 text-sm font-medium text-white">
          <Check className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function Workspace() {
  const w = useWorkspace();
  const { selectedFile, publishState } = w;
  const { split, dragging, containerRef, onDragStart } = useDragSplit(50);

  return (
    <div className="min-h-screen bg-[#ece8de] text-[#12120f]">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-6">

        {/* ============ HEADER ============ */}
        <header className={`${BOX} ${SHADOW} flex flex-wrap items-center gap-4 px-5 py-4`}>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center border-2 border-[#12120f] bg-[#2d8a57] text-sm font-black text-white shadow-[3px_3px_0_#12120f]">
              SX
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">sites.xyz</h1>
              <p className="text-xs font-medium text-[#12120f]/60">
                Static sites → IPFS → your .eth name
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <PressNameSelect
              names={w.ensNames}
              value={w.selectedName}
              onChange={w.setSelectedName}
              loading={w.namesLoading}
              connected={w.isConnected}
            />
            <ConnectKitButton />
          </div>
        </header>

        {/* messages */}
        {w.namesMessage && (
          <div className="mt-4 border-2 border-[#12120f] bg-[#d8f3e3] px-4 py-2 text-xs font-medium">
            ℹ {w.namesMessage}
          </div>
        )}
        {w.validation.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {w.validation.map((issue, index) => (
              <span
                key={`${issue.message}-${index}`}
                className={`flex items-center gap-1.5 border-2 border-[#12120f] px-2.5 py-1 text-xs font-bold uppercase ${
                  issue.level === "error" ? "bg-rose-400 text-[#12120f]" : "bg-amber-300 text-[#12120f]"
                }`}
              >
                <AlertTriangle className="size-3" />
                {issue.message}
                {issue.path && <span className="font-mono normal-case opacity-70">({issue.path})</span>}
              </span>
            ))}
          </div>
        )}

        {/* ============ SPLIT LAYOUT ============ */}
        {/* Stacks on small screens; draggable split from lg up. */}
        <div ref={containerRef} className="mt-5 flex flex-col gap-5 lg:flex-row lg:gap-0">

          {/* -------- LEFT: files + editor -------- */}
          <div
            className="flex min-w-0 flex-col gap-5"
            style={{ flexBasis: `${split}%`, flexGrow: 0, flexShrink: 0 }}
          >

            {/* Files */}
            <section className={`${BOX} ${SHADOW}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#12120f] bg-[#2d8a57] px-4 py-2.5">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Files</h2>
                <div className="flex items-center gap-2">
                  <span className="border-2 border-[#12120f] bg-white px-2 py-0.5 text-[11px] font-bold">
                    {w.files.length} · {humanFileSize(w.totalSize)}
                  </span>
                  <button
                    onClick={() => w.assetInputRef.current?.click()}
                    className={`flex items-center gap-1 border-2 border-[#12120f] bg-white px-2 py-0.5 text-[11px] font-bold uppercase ${PRESS} shadow-[2px_2px_0_#12120f]`}
                  >
                    <ImagePlus className="size-3" /> Upload
                  </button>
                  <button
                    onClick={() => w.folderInputRef.current?.click()}
                    className={`flex items-center gap-1 border-2 border-[#12120f] bg-white px-2 py-0.5 text-[11px] font-bold uppercase ${PRESS} shadow-[2px_2px_0_#12120f]`}
                  >
                    <FolderUp className="size-3" /> Folder
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

              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {w.files.map((file) => {
                    const active = selectedFile?.path === file.path;
                    return (
                      <div
                        key={file.path}
                        className={`group flex items-center border-2 border-[#12120f] ${
                          active ? "bg-[#12120f] text-white" : "bg-white text-[#12120f]"
                        }`}
                      >
                        <button
                          onClick={() => w.setSelectedPath(file.path)}
                          className="px-2.5 py-1.5 font-mono text-xs font-semibold"
                        >
                          {file.path}
                        </button>
                        <button
                          onClick={() => w.deleteFile(file.path)}
                          className={`border-l-2 border-[#12120f] px-1.5 py-1.5 transition ${
                            active ? "hover:bg-rose-500" : "hover:bg-rose-400"
                          }`}
                          aria-label={`Delete ${file.path}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex items-center border-2 border-dashed border-[#12120f]/40">
                    <input
                      value={w.newFilePath}
                      onChange={(e) => w.setNewFilePath(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") w.handleCreateFile(); }}
                      placeholder="new-file.html"
                      className="w-28 bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none placeholder:text-[#12120f]/35"
                    />
                    <button
                      onClick={w.handleCreateFile}
                      className="border-l-2 border-dashed border-[#12120f]/40 px-1.5 py-1.5 hover:bg-[#2d8a57] hover:text-white"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Editor */}
            <section className={`${BOX} ${SHADOW} flex flex-1 flex-col overflow-hidden`}>
              <div className="flex items-center justify-between border-b-2 border-[#12120f] bg-[#12120f] px-4 py-2.5">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Editor</h2>
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <span className="border-2 border-white/30 px-2 py-0.5 font-mono text-[11px] text-white/80">
                      {selectedFile.path}
                    </span>
                    <span className="border-2 border-[#12120f] bg-[#fff64f] px-2 py-0.5 text-[10px] font-black text-[#12120f]">
                      {languageLabel(selectedFile.path)}
                    </span>
                  </div>
                )}
              </div>

              {selectedFile ? (
                selectedFile.kind === "text" ? (
                  <div className="min-h-[520px] flex-1 bg-[#12120f]">
                    <PressCodeEditor
                      path={selectedFile.path}
                      value={selectedFile.content}
                      onChange={w.updateSelectedText}
                      minHeight="520px"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[520px] flex-1 flex-col items-center justify-center bg-[#fffcf7] p-6 text-center">
                    {isImage(selectedFile.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:${selectedFile.mimeType};base64,${selectedFile.content}`}
                        alt={selectedFile.path}
                        className="max-h-[400px] w-auto border-2 border-[#12120f] shadow-[4px_4px_0_#12120f]"
                      />
                    ) : (
                      <Upload className="size-10 text-[#12120f]/30" />
                    )}
                    <p className="mt-4 font-mono text-sm font-bold">{selectedFile.path}</p>
                    <p className="mt-1 text-xs text-[#12120f]/50">
                      {selectedFile.mimeType} · {humanFileSize(selectedFile.size)}
                    </p>
                  </div>
                )
              ) : (
                <div className="flex min-h-[520px] flex-1 items-center justify-center bg-[#fffcf7] text-sm font-bold uppercase text-[#12120f]/35">
                  Select a file
                </div>
              )}
            </section>
          </div>

          {/* -------- DRAG HANDLE (lg+) -------- */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            onPointerDown={onDragStart}
            className="group relative hidden w-5 shrink-0 cursor-col-resize items-center justify-center lg:flex"
          >
            <div
              className={`flex h-16 w-3.5 items-center justify-center border-2 border-[#12120f] transition-colors ${
                dragging ? "bg-[#fff64f]" : "bg-[#fffcf7] group-hover:bg-[#fff64f]"
              }`}
            >
              <GripVertical className="size-3 text-[#12120f]" />
            </div>
            {/* full-height hairline */}
            <div className="absolute inset-y-0 left-1/2 -z-10 w-0.5 -translate-x-1/2 bg-[#12120f]/15" />
          </div>

          {/* -------- RIGHT: preview + publish -------- */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">

            {/* Preview */}
            <section className={`${BOX} ${SHADOW} overflow-hidden`}>
              <div className="flex items-center justify-between border-b-2 border-[#12120f] bg-[#fff64f] px-4 py-2.5">
                <h2 className="text-sm font-black uppercase tracking-widest">Preview</h2>
                {w.selectedName && (
                  <span className="border-2 border-[#12120f] bg-white px-2 py-0.5 font-mono text-[11px] font-bold">
                    {w.selectedName}.limo
                  </span>
                )}
              </div>
              <div className="relative">
                <iframe
                  title="Static site preview"
                  srcDoc={w.previewHtml}
                  sandbox="allow-scripts allow-same-origin"
                  className="h-[460px] w-full bg-white"
                />
                {/* overlay while dragging so iframe doesn't eat pointer events */}
                {dragging && <div className="absolute inset-0" />}
              </div>
            </section>

            {/* Publish */}
            <section className={`${BOX} ${SHADOW} flex-1`}>
              <div className="border-b-2 border-[#12120f] bg-[#1d5f3d] px-4 py-2.5">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Publish</h2>
              </div>

              <div className="p-4">
                <button
                  onClick={w.publishSite}
                  disabled={w.isPublishing}
                  className={`flex w-full items-center justify-center gap-3 border-2 border-[#12120f] bg-[#2d8a57] px-5 py-4 text-lg font-black uppercase tracking-widest text-white ${PRESS} shadow-[5px_5px_0_#12120f] hover:bg-[#1d5f3d] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {w.isPublishing ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <ArrowRight className="size-5" />
                  )}
                  {w.isPublishing ? "Publishing…" : "Publish to ENS"}
                </button>

                <div className="mt-4">
                  <PressTimeline state={publishState} />
                </div>

                {(publishState.cid || publishState.txHash || publishState.limoUrl) && (
                  <div className="mt-4 space-y-2.5 border-t-2 border-[#12120f] pt-4">
                    {publishState.cid && (
                      <div className="border-2 border-[#12120f] bg-white p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#12120f]/50">IPFS CID</p>
                        <p className="mt-1 break-all font-mono text-xs">{publishState.cid}</p>
                      </div>
                    )}
                    {publishState.txHash && (
                      <a
                        href={getEtherscanTxUrl(publishState.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center justify-between border-2 border-[#12120f] bg-white px-3 py-2 text-sm font-bold ${PRESS} shadow-[3px_3px_0_#12120f] hover:bg-[#d8f3e3]`}
                      >
                        <span>VIEW ON ETHERSCAN</span>
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    {publishState.limoUrl && (
                      <a
                        href={publishState.limoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center justify-between border-2 border-[#12120f] bg-[#2d8a57] px-3 py-2 text-sm font-bold text-white ${PRESS} shadow-[3px_3px_0_#12120f] hover:bg-[#1d5f3d]`}
                      >
                        <span className="truncate">OPEN {publishState.limoUrl}</span>
                        <ExternalLink className="size-4 shrink-0" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
