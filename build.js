#!/usr/bin/env node
// Generates the lolly.is short-link site into dist/ from links.json.
// No dependencies — run with `node build.js`.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "links.json"), "utf8"));

// HTML-escape for text and attribute contexts.
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// JSON-encode for embedding inside inline <script> ("</" would end the tag).
const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

const CSS = `
:root {
  --bg: #faf8f6;
  --card: #ffffff;
  --ink: #221d27;
  --muted: #7a7284;
  --line: #e5dfe8;
  --accent: #e0417e;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17141b;
    --card: #201c26;
    --ink: #f0ecf3;
    --muted: #968da1;
    --line: #322c3a;
    --accent: #ff6ba0;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
main {
  max-width: 26rem;
  margin: 0 auto;
  padding: 14vh 1.25rem 4rem;
}
header {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .5rem;
}
header img { width: 44px; height: 44px; }
h1 { font-size: 1.35rem; margin: 0; letter-spacing: -.01em; }
.tagline { color: var(--muted); margin: 0 0 2rem; }
.notice {
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  padding: .6rem .9rem;
  margin: 0 0 1.5rem;
  color: var(--muted);
}
nav { display: grid; gap: .75rem; }
nav a {
  display: block;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: .9rem 1.1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color .15s, transform .15s;
}
nav a:hover { border-color: var(--accent); transform: translateY(-1px); }
nav a strong { display: block; }
nav a span { color: var(--muted); font-size: .9rem; }
footer {
  margin-top: 2.5rem;
  color: var(--muted);
  font-size: .85rem;
}
footer a { color: inherit; }
.redirecting {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  text-align: center;
  color: var(--muted);
}
.redirecting a { color: var(--accent); text-decoration: none; }
`.trim();

// Impression beacon. `slug` and `dest` are prebuilt JS expressions.
function beacon(slugExpr, destExpr) {
  if (!cfg.beacon) return "";
  return `
  if (navigator.sendBeacon) {
    try {
      navigator.sendBeacon(${js(cfg.beacon)}, JSON.stringify({
        slug: ${slugExpr},
        dest: ${destExpr},
        ref: document.referrer,
        lang: (navigator.languages || [navigator.language]).join(","),
        tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
        platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "",
        screen: screen.width + "x" + screen.height + "@" + (window.devicePixelRatio || 1),
        ua: navigator.userAgent
      }));
    } catch (e) {}
  }`;
}

function head(title, description, extra = "") {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="theme-color" content="#e0417e">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
${extra}<style>${CSS}</style>`;
}

function redirectPage(link) {
  return `<!doctype html>
<html lang="en">
<head>
${head(`${link.title} — ${cfg.domain}`, link.description, `<meta property="og:url" content="https://${cfg.domain}/${link.slug}">
<meta name="robots" content="noindex">
<script>
(function () {
  var dest = ${js(link.url)};${beacon(js(link.slug), "dest")}
  location.replace(dest);
})();
</script>
<noscript><meta http-equiv="refresh" content="0;url=${esc(link.url)}"></noscript>
`)}</head>
<body>
<p class="redirecting">Taking you to <a href="${esc(link.url)}">${esc(link.title)}</a>&hellip;</p>
</body>
</html>
`;
}

function linkList() {
  return cfg.links
    .filter((l) => !l.hidden)
    .map(
      (l) => `  <a href="/${esc(l.slug)}"><strong>${esc(l.title)}</strong> <span>${esc(l.description)}</span></a>`
    )
    .join("\n");
}

function hubPage({ is404 } = {}) {
  const slugExpr = is404 ? js("404") : js("home");
  const destExpr = is404 ? "location.pathname" : js("/");
  return `<!doctype html>
<html lang="en">
<head>
${head(
    is404 ? `Not found — ${cfg.domain}` : cfg.domain,
    "Short links for Lolly — the local-first design toolkit.",
    `<script>
(function () {${beacon(slugExpr, destExpr) || "return;"}
})();
</script>
`
  )}</head>
<body>
<main>
<header><img src="/icon.svg" alt=""><h1>${esc(cfg.domain)}</h1></header>
<p class="tagline">Short links for Lolly — the local-first design toolkit.</p>
${is404 ? `<p class="notice">That short link doesn&rsquo;t exist. Here&rsquo;s everything we&rsquo;ve got:</p>\n` : ""}<nav>
${linkList()}
</nav>
<footer>Made by <a href="https://lolly.tools">lolly.tools</a></footer>
</main>
</body>
</html>
`;
}

// --- build ---
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

fs.writeFileSync(path.join(OUT, "CNAME"), cfg.domain + "\n");
fs.writeFileSync(path.join(OUT, "index.html"), hubPage());
fs.writeFileSync(path.join(OUT, "404.html"), hubPage({ is404: true }));

for (const link of cfg.links) {
  if (!/^[a-z0-9-]+$/.test(link.slug)) {
    throw new Error(`Bad slug "${link.slug}" — use lowercase letters, digits, hyphens.`);
  }
  const dir = path.join(OUT, link.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), redirectPage(link));
}

for (const asset of fs.readdirSync(path.join(ROOT, "assets"))) {
  fs.copyFileSync(path.join(ROOT, "assets", asset), path.join(OUT, asset));
}

console.log(
  `Built ${cfg.links.length} short links into dist/ (beacon ${cfg.beacon ? "on" : "OFF — set \"beacon\" in links.json"})`
);
