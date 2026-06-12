"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import type { Extension } from "@codemirror/state";

/**
 * "PRESS" code editor — real CodeMirror 6 editor styled to match the
 * neo-brutalist cream/ink/emerald theme. Detects language from the file
 * extension and applies proper syntax highlighting.
 */

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

export function languageLabel(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "HTML",
    htm: "HTML",
    css: "CSS",
    js: "JS",
    mjs: "JS",
    cjs: "JS",
    jsx: "JSX",
    ts: "TS",
    tsx: "TSX",
    json: "JSON",
    md: "MD",
    markdown: "MD",
    svg: "SVG",
    xml: "XML",
    txt: "TXT",
  };
  return map[ext] ?? ext.toUpperCase() ?? "TXT";
}

function languageExtension(path: string): Extension[] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "html":
    case "htm":
      return [html({ autoCloseTags: true, matchClosingTags: true })];
    case "css":
      return [css()];
    case "js":
    case "mjs":
    case "cjs":
      return [javascript()];
    case "jsx":
      return [javascript({ jsx: true })];
    case "ts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "json":
      return [json()];
    case "md":
    case "markdown":
      return [markdown()];
    case "svg":
    case "xml":
      return [xml()];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Theme — dark ink panel, cream text, emerald/amber/rose accents.
// Same palette as the rest of the PRESS variant.
// ---------------------------------------------------------------------------

const INK = "#12120f";
const CREAM = "#f7f2e8";

const pressEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: INK,
      color: CREAM,
      fontSize: "13px",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#4ade80",
      fontFamily: "var(--font-mono), ui-monospace, monospace",
      lineHeight: "1.8",
      padding: "14px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#4ade80",
      borderLeftWidth: "2px",
    },
    "&.cm-focused": {
      outline: "none",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
      {
        backgroundColor: "rgba(45, 138, 87, 0.35) !important",
      },
    ".cm-activeLine": {
      backgroundColor: "rgba(247, 242, 232, 0.04)",
    },
    ".cm-gutters": {
      backgroundColor: INK,
      color: "rgba(247, 242, 232, 0.28)",
      border: "none",
      borderRight: "2px solid rgba(247, 242, 232, 0.1)",
      fontFamily: "var(--font-mono), ui-monospace, monospace",
      fontSize: "11px",
      minWidth: "42px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(247, 242, 232, 0.06)",
      color: "#4ade80",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 10px 0 6px",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(74, 222, 128, 0.2)",
      outline: "1px solid rgba(74, 222, 128, 0.5)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(255, 246, 79, 0.12)",
    },
    ".cm-tooltip": {
      backgroundColor: "#1f1f1a",
      color: CREAM,
      border: `2px solid ${CREAM}`,
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#2d8a57",
      color: "#fff",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "rgba(247, 242, 232, 0.1)",
      color: CREAM,
      border: "none",
    },
  },
  { dark: true },
);

const pressHighlightStyle = HighlightStyle.define([
  // tags / keywords — emerald
  { tag: [t.keyword, t.moduleKeyword, t.operatorKeyword], color: "#5eead4", fontWeight: "600" },
  { tag: [t.tagName, t.angleBracket], color: "#4ade80" },
  // attributes / properties — amber
  { tag: [t.attributeName, t.propertyName], color: "#fcd34d" },
  { tag: [t.definition(t.propertyName)], color: "#fcd34d" },
  // strings / values — warm cream-yellow
  { tag: [t.string, t.attributeValue, t.special(t.string)], color: "#fde68a" },
  // numbers / constants — orange-ish
  { tag: [t.number, t.bool, t.null, t.atom], color: "#fdba74" },
  // comments — muted
  { tag: [t.comment, t.blockComment, t.lineComment], color: "rgba(247,242,232,0.35)", fontStyle: "italic" },
  // functions / classes
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#93c5fd" },
  { tag: [t.className, t.typeName, t.namespace], color: "#a5f3fc" },
  // variables / plain text
  { tag: [t.variableName, t.name], color: CREAM },
  { tag: [t.definition(t.variableName)], color: "#d9f99d" },
  // punctuation / operators
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "rgba(247,242,232,0.65)" },
  // markdown & misc
  { tag: t.heading, color: "#4ade80", fontWeight: "700" },
  { tag: t.link, color: "#93c5fd", textDecoration: "underline" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  // css-specific
  { tag: [t.unit], color: "#fdba74" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#f9a8d4" },
  // invalid
  { tag: t.invalid, color: "#fda4af" },
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PressCodeEditor({
  path,
  value,
  onChange,
  minHeight = "520px",
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
  minHeight?: string;
}) {
  const extensions = useMemo(
    () => [
      ...languageExtension(path),
      syntaxHighlighting(pressHighlightStyle),
      EditorView.lineWrapping,
    ],
    [path],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={pressEditorTheme}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        indentOnInput: true,
        highlightSelectionMatches: true,
        defaultKeymap: true,
        history: true,
        searchKeymap: true,
      }}
      style={{ minHeight, height: "100%" }}
      className="press-codemirror h-full [&_.cm-editor]:h-full"
    />
  );
}
