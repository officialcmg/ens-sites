"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Unplug } from "lucide-react";

/**
 * "PRESS" custom .eth name dropdown — fully styled listbox (no native
 * <select>), keyboard accessible, with loading / disconnected / empty states.
 */

const PRESS =
  "transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#12120f]";

export function PressNameSelect({
  names,
  value,
  onChange,
  loading,
  connected,
}: {
  names: string[];
  value: string;
  onChange: (name: string) => void;
  loading: boolean;
  connected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Keep highlight in sync with current value when opening
  useEffect(() => {
    if (open) {
      const index = names.indexOf(value);
      setHighlighted(index >= 0 ? index : 0);
    }
  }, [open, names, value]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.children[highlighted] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      setHighlighted((h) => Math.min(h + 1, names.length - 1));
    } else if (e.key === "ArrowUp") {
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      const name = names[highlighted];
      if (name) {
        onChange(name);
        setOpen(false);
      }
    }
  }

  const triggerLabel = loading
    ? "LOADING NAMES…"
    : value
      ? value
      : !connected
        ? "CONNECT WALLET"
        : names.length === 0
          ? "NO .ETH NAMES"
          : "PICK A NAME";

  return (
    <div ref={rootRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-w-[210px] items-center gap-2 border-2 border-[#12120f] bg-white px-3 py-2 text-sm font-bold shadow-[3px_3px_0_#12120f] ${PRESS}`}
      >
        <span className="border-2 border-[#12120f] bg-[#2d8a57] px-1.5 py-0.5 text-[10px] font-black text-white">
          .ETH
        </span>
        <span className={`flex-1 truncate text-left font-mono text-[13px] ${value ? "text-[#12120f]" : "text-[#12120f]/45"}`}>
          {triggerLabel}
        </span>
        {loading ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-[#2d8a57]" />
        ) : (
          <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[260px] border-2 border-[#12120f] bg-[#fffcf7] shadow-[5px_5px_0_#12120f]">
          <div className="border-b-2 border-[#12120f] bg-[#12120f] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
            Your .eth names
          </div>

          {/* States */}
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs font-bold text-[#12120f]/60">
              <LoaderCircle className="size-4 animate-spin text-[#2d8a57]" />
              FETCHING FROM ENS…
            </div>
          ) : !connected ? (
            <div className="px-3 py-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#12120f]">
                <Unplug className="size-4" />
                WALLET NOT CONNECTED
              </div>
              <p className="mt-1.5 text-[11px] leading-4 text-[#12120f]/55">
                Connect your wallet to load the .eth names you own.
              </p>
            </div>
          ) : names.length === 0 ? (
            <div className="px-3 py-4">
              <p className="text-xs font-bold text-[#12120f]">NO .ETH NAMES FOUND</p>
              <p className="mt-1.5 text-[11px] leading-4 text-[#12120f]/55">
                This wallet doesn&apos;t own any .eth names we could find. Grab one at{" "}
                <a
                  href="https://app.ens.domains"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#1d5f3d] underline"
                >
                  app.ens.domains
                </a>
                .
              </p>
            </div>
          ) : (
            <div ref={listRef} role="listbox" aria-label="ENS names" className="max-h-64 overflow-y-auto">
              {names.map((name, index) => {
                const selected = name === value;
                const isHighlighted = index === highlighted;
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 border-b-2 border-[#12120f]/10 px-3 py-2.5 text-left font-mono text-[13px] font-semibold last:border-b-0 ${
                      selected
                        ? "bg-[#2d8a57] text-white"
                        : isHighlighted
                          ? "bg-[#fff64f] text-[#12120f]"
                          : "bg-transparent text-[#12120f]"
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {selected && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
