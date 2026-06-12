export type SiteFileKind = "text" | "asset";

export type SiteFile = {
  path: string;
  kind: SiteFileKind;
  content: string;
  mimeType: string;
  size: number;
};

export type SiteValidationIssue = {
  level: "error" | "warning";
  message: string;
  path?: string;
};

export const MAX_SITE_SIZE_BYTES = 3.5 * 1024 * 1024;

const textExtensions = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "json",
  "svg",
  "txt",
  "xml",
]);

const mimeMap: Record<string, string> = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  mjs: "text/javascript",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  webm: "video/webm",
  webp: "image/webp",
  xml: "application/xml",
};

export function getExtension(path: string) {
  const segment = path.split("/").pop() ?? path;
  const index = segment.lastIndexOf(".");
  if (index === -1) return "";
  return segment.slice(index + 1).toLowerCase();
}

export function inferMimeType(path: string) {
  return mimeMap[getExtension(path)] ?? "application/octet-stream";
}

export function isTextPath(path: string) {
  return textExtensions.has(getExtension(path));
}

export function sanitizePath(value: string) {
  const cleaned = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");

  if (!cleaned) return "";
  if (cleaned.includes("..")) return "";
  if (cleaned.startsWith(".")) return "";
  return cleaned;
}

export function totalSiteSize(files: SiteFile[]) {
  return files.reduce((sum, file) => sum + file.size, 0);
}

function isExternalRef(ref: string) {
  return /^(?:[a-z]+:|\/\/|#)/i.test(ref);
}

function resolvePath(fromPath: string, ref: string) {
  if (!ref || isExternalRef(ref)) return ref;
  if (ref.startsWith("/")) return ref.slice(1);

  const fromParts = fromPath.split("/");
  fromParts.pop();

  for (const part of ref.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      fromParts.pop();
      continue;
    }
    fromParts.push(part);
  }

  return fromParts.join("/");
}

function utf8ToBase64(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }

  return window.btoa(unescape(encodeURIComponent(value)));
}

function toDataUrl(mimeType: string, body: string, isBase64 = false) {
  return `data:${mimeType};base64,${isBase64 ? body : utf8ToBase64(body)}`;
}

function rewriteCssUrls(
  css: string,
  currentPath: string,
  files: SiteFile[],
  cache: Map<string, string>,
  stack: Set<string>,
) {
  return css.replace(/url\(([^)]+)\)/g, (match, rawRef: string) => {
    const ref = rawRef.trim().replace(/^['"]|['"]$/g, "");
    if (!ref || isExternalRef(ref)) return match;

    const resolved = resolvePath(currentPath, ref);
    const replacement = filePathToPreviewUrl(resolved, files, cache, stack);
    return replacement ? `url("${replacement}")` : match;
  });
}

function filePathToPreviewUrl(
  path: string,
  files: SiteFile[],
  cache: Map<string, string>,
  stack: Set<string>,
): string | null {
  if (cache.has(path)) return cache.get(path) ?? null;
  if (stack.has(path)) return null;

  const file = files.find((entry) => entry.path === path);
  if (!file) return null;

  stack.add(path);

  let dataUrl: string | null = null;

  if (file.kind === "asset") {
    dataUrl = toDataUrl(file.mimeType, file.content, true);
  } else if (file.mimeType === "text/css") {
    dataUrl = toDataUrl(
      file.mimeType,
      rewriteCssUrls(file.content, file.path, files, cache, stack),
    );
  } else if (file.mimeType === "text/html") {
    dataUrl = toDataUrl(file.mimeType, buildPreviewDocument(files, file.path));
  } else {
    dataUrl = toDataUrl(file.mimeType, file.content);
  }

  stack.delete(path);
  cache.set(path, dataUrl);
  return dataUrl;
}

export function buildPreviewDocument(files: SiteFile[], entryPath = "index.html") {
  const entry = files.find((file) => file.path === entryPath && file.kind === "text");
  if (!entry) {
    return `<html><body style="font-family: sans-serif; padding: 24px;">Missing ${entryPath}</body></html>`;
  }

  if (typeof DOMParser === "undefined") {
    return entry.content;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(entry.content, "text/html");
  const cache = new Map<string, string>();
  const stack = new Set<string>();

  const attrPairs = [
    ["img", "src"],
    ["script", "src"],
    ["source", "src"],
    ["video", "src"],
    ["audio", "src"],
    ["iframe", "src"],
    ["object", "data"],
    ["link", "href"],
    ["a", "href"],
  ] as const;

  for (const [tagName, attribute] of attrPairs) {
    const nodes = documentNode.querySelectorAll<HTMLElement>(`${tagName}[${attribute}]`);
    for (const node of nodes) {
      const value = node.getAttribute(attribute);
      if (!value || isExternalRef(value)) continue;

      if (tagName === "link" && (node.getAttribute("rel") ?? "").toLowerCase() !== "stylesheet") {
        continue;
      }

      const resolved = resolvePath(entry.path, value);
      const replacement = filePathToPreviewUrl(resolved, files, cache, stack);
      if (replacement) node.setAttribute(attribute, replacement);
    }
  }

  const styleNodes = documentNode.querySelectorAll("style");
  for (const styleNode of styleNodes) {
    styleNode.textContent = rewriteCssUrls(
      styleNode.textContent ?? "",
      entry.path,
      files,
      cache,
      stack,
    );
  }

  const head = documentNode.head ?? documentNode.createElement("head");
  const viewport = documentNode.createElement("meta");
  viewport.setAttribute("name", "viewport");
  viewport.setAttribute("content", "width=device-width, initial-scale=1");
  head.prepend(viewport);
  if (!documentNode.head) documentNode.documentElement.prepend(head);

  return `<!DOCTYPE html>\n${documentNode.documentElement.outerHTML}`;
}

export function validateSite(files: SiteFile[]) {
  const issues: SiteValidationIssue[] = [];
  const pathSet = new Set<string>();

  if (!files.length) {
    return [{ level: "error", message: "Add at least one file to publish." }] satisfies SiteValidationIssue[];
  }

  for (const file of files) {
    if (!file.path) {
      issues.push({ level: "error", message: "Every file needs a valid path." });
      continue;
    }

    if (file.path !== sanitizePath(file.path)) {
      issues.push({
        level: "error",
        message: "File paths must be relative and cannot contain '..' segments.",
        path: file.path,
      });
    }

    if (pathSet.has(file.path)) {
      issues.push({
        level: "error",
        message: "Duplicate file path.",
        path: file.path,
      });
    }
    pathSet.add(file.path);
  }

  if (!pathSet.has("index.html")) {
    issues.push({
      level: "error",
      message: "Your site needs an index.html file at the root.",
      path: "index.html",
    });
  }

  const totalSize = totalSiteSize(files);
  if (totalSize > MAX_SITE_SIZE_BYTES) {
    issues.push({
      level: "error",
      message: `This v1 supports sites up to ${Math.round(
        MAX_SITE_SIZE_BYTES / 1024 / 1024,
      )} MB.`,
    });
  }

  for (const file of files.filter((entry) => entry.kind === "text")) {
    const refMatches = [
      ...file.content.matchAll(/\b(?:src|href|poster|data)=["']([^"']+)["']/gi),
      ...file.content.matchAll(/url\(([^)]+)\)/gi),
    ];

    for (const match of refMatches) {
      const ref = match[1]?.trim().replace(/^['"]|['"]$/g, "");
      if (!ref || isExternalRef(ref)) continue;
      if (ref.startsWith("/")) {
        issues.push({
          level: "warning",
          message: "Absolute paths can break on ENS gateways. Prefer relative paths.",
          path: file.path,
        });
        continue;
      }

      const resolved = resolvePath(file.path, ref);
      if (!pathSet.has(resolved)) {
        issues.push({
          level: "error",
          message: `Missing referenced file: ${resolved}`,
          path: file.path,
        });
      }
    }
  }

  const indexFile = files.find((file) => file.path === "index.html");
  if (indexFile?.kind === "text") {
    if (!/<title>[\s\S]*<\/title>/i.test(indexFile.content)) {
      issues.push({
        level: "warning",
        message: "Add a <title> tag to index.html so the published site has a proper page title.",
        path: indexFile.path,
      });
    }
    if (!/<meta[^>]+name=["']viewport["']/i.test(indexFile.content)) {
      issues.push({
        level: "warning",
        message: "Add a viewport meta tag for better mobile behavior.",
        path: indexFile.path,
      });
    }
  }

  return issues;
}

export const starterFiles: SiteFile[] = [
  {
    path: "index.html",
    kind: "text",
    mimeType: "text/html",
    size: 608,
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My ENS Site</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="shell">
      <p class="eyebrow">Live from ENS</p>
      <h1>My site is now shipping from IPFS.</h1>
      <p>
        Edit <code>index.html</code>, <code>styles.css</code>, and
        <code>script.js</code> in the builder, then publish to your ENS name.
      </p>
      <button id="cta">Tap me</button>
      <p id="message" class="message">The web page is static. The publish flow is not.</p>
    </main>
    <script src="./script.js"></script>
  </body>
</html>`,
  },
  {
    path: "styles.css",
    kind: "text",
    mimeType: "text/css",
    size: 522,
    content: `:root {
  color-scheme: light;
  --bg: linear-gradient(180deg, #f5fff7 0%, #e6f5ea 100%);
  --panel: rgba(255, 255, 255, 0.92);
  --ink: #14311c;
  --accent: #2d8f54;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: var(--ink);
  background: var(--bg);
}

.shell {
  max-width: 40rem;
  margin: 10vh auto;
  padding: 3rem;
  border-radius: 1.75rem;
  background: var(--panel);
  box-shadow: 0 24px 60px rgba(18, 53, 28, 0.12);
}

.eyebrow { text-transform: uppercase; letter-spacing: 0.16em; color: var(--accent); }
.message { opacity: 0.75; }
button {
  margin-top: 1rem;
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.3rem;
  background: var(--accent);
  color: white;
}`,
  },
  {
    path: "script.js",
    kind: "text",
    mimeType: "text/javascript",
    size: 158,
    content: `const button = document.getElementById("cta");
const message = document.getElementById("message");

button?.addEventListener("click", () => {
  if (message) message.textContent = "Nice. Your static site can still feel alive.";
});`,
  },
];
