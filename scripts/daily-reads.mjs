#!/usr/bin/env node
// daily-reads: UserPromptSubmit hook for Claude Code.
// Extracts tech keywords from the prompt (locally), searches daily.dev and
// shows a few posts to the user via `systemMessage`. Nothing is added to
// Claude's context, and the prompt text itself never leaves the machine.
//
// Fails silently: any error means "no reads this time", never a blocked prompt.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

const API_BASE = process.env.DAILY_READS_API_BASE || "https://api.daily.dev/public/v1";
const STATE_DIR = process.env.DAILY_READS_STATE_DIR || join(homedir(), ".claude", "daily-reads");
const STATE_FILE = join(STATE_DIR, "state.json");

const num = (v, d) => (v !== undefined && v !== "" && !isNaN(+v) ? +v : d);
const CONFIG = {
  maxPosts: num(process.env.DAILY_READS_MAX_POSTS, 3),
  cooldownMin: num(process.env.DAILY_READS_COOLDOWN_MINUTES, 10),
  monthlyBudget: num(process.env.DAILY_READS_MONTHLY_BUDGET, 150), // free tier: 200 req/month
  cacheHours: num(process.env.DAILY_READS_CACHE_HOURS, 72),
  timeoutMs: num(process.env.DAILY_READS_TIMEOUT_MS, 4000),
};

// Known tech terms. "label|alias|alias": the label is what we search for.
// A leading "~" marks a generic concept, ranked after concrete technologies.
const VOCAB = [
  "react|reactjs|react.js", "next.js|nextjs|next js", "vue|vuejs|vue.js", "nuxt", "angular", "svelte|sveltekit",
  "solid.js|solidjs", "astro", "remix", "htmx", "tailwind|tailwindcss", "~css", "~html", "web components",
  "typescript|ts", "javascript|js", "node.js|nodejs|node", "deno", "bun", "vite", "webpack", "esbuild",
  "express|expressjs", "nestjs", "graphql", "~rest api|rest", "grpc", "websocket|websockets", "trpc",
  "python", "django", "flask", "fastapi", "pandas", "numpy", "pytorch", "tensorflow", "jupyter",
  "rust", "go|golang", "java", "kotlin", "spring boot|spring", "scala", "c#|csharp", ".net|dotnet|asp.net",
  "blazor", "c++|cpp", "swift", "swiftui", "flutter", "dart", "react native", "android", "ios", "php",
  "laravel", "ruby", "rails|ruby on rails", "elixir", "phoenix", "haskell", "zig", "wasm|webassembly",
  "postgres|postgresql", "mysql", "sqlite", "mongodb|mongo", "redis", "elasticsearch", "kafka", "rabbitmq",
  "prisma", "drizzle", "~sql", "~orm", "supabase", "firebase",
  "docker|dockerfile", "kubernetes|k8s", "helm", "terraform", "ansible", "aws", "azure", "gcp|google cloud",
  "cloudflare", "vercel", "serverless|lambda", "ci/cd|github actions|gitlab ci", "~git", "nginx", "linux",
  "observability|opentelemetry", "prometheus", "grafana", "~microservices", "~monorepo", "nx", "turborepo",
  "llm|llms", "rag", "embeddings", "vector database|vector db", "mcp|model context protocol", "ai agents|agentic",
  "openai", "~prompt engineering", "~machine learning|ml",
  "~testing|unit test|unit tests", "playwright", "cypress", "jest", "vitest", "pytest", "~tdd",
  "~security|vulnerability", "oauth|oidc", "jwt", "~authentication|auth", "~performance|optimization",
  "~accessibility|a11y", "~refactoring|refactor", "~design patterns", "~clean code", "~code review",
  "~debugging", "~concurrency|async", "~memory leak", "~caching", "~regex", "~algorithms", "~system design",
  "electron", "tauri", "pwa", "~seo", "web performance|core web vitals", "three.js|threejs", "webgl", "gis|geospatial",
];

const STACK_FILES = {
  "go.mod": ["go"], "Cargo.toml": ["rust"], "pom.xml": ["java"], "build.gradle": ["java"],
  "build.gradle.kts": ["kotlin"], "Gemfile": ["ruby"], "composer.json": ["php"], "pubspec.yaml": ["flutter"],
  "Dockerfile": ["docker"], "docker-compose.yml": ["docker"], "tsconfig.json": ["typescript"],
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MATCHERS = VOCAB.map((entry) => {
  const generic = entry.startsWith("~");
  const [label, ...aliases] = entry.replace(/^~/, "").split("|");
  const alts = [label, ...aliases].map(escape).join("|");
  // custom boundaries so "c#", ".net" and "next.js" match too
  return { label, generic, re: new RegExp(`(?<![\\w.#+-])(?:${alts})(?![\\w#+-])`, "i") };
});

function extractTerms(text) {
  const hits = [];
  for (const { label, generic, re } of MATCHERS) {
    const m = re.exec(text);
    if (m) hits.push({ label, generic, pos: m.index });
  }
  // concrete technologies first; within each group, earlier mentions tend to be the main subject
  return hits.sort((a, b) => a.generic - b.generic || a.pos - b.pos).map((h) => h.label);
}

function detectStack(cwd) {
  const terms = new Set();
  const safeRead = (f) => { try { return readFileSync(join(cwd, f), "utf8"); } catch { return null; } };
  for (const [file, labels] of Object.entries(STACK_FILES)) {
    if (existsSync(join(cwd, file))) labels.forEach((l) => terms.add(l));
  }
  const pkg = safeRead("package.json");
  if (pkg) {
    try {
      const j = JSON.parse(pkg);
      const deps = Object.keys({ ...j.dependencies, ...j.devDependencies }).join(" ").replace(/[@/]/g, " ");
      extractTerms(deps).forEach((t) => terms.add(t));
    } catch {}
  }
  const py = (safeRead("requirements.txt") || "") + (safeRead("pyproject.toml") || "");
  if (py) { terms.add("python"); extractTerms(py).forEach((t) => terms.add(t)); }
  try {
    if (readdirSync(cwd).some((f) => /\.(csproj|sln)$/i.test(f))) terms.add(".net");
  } catch {}
  return [...terms];
}

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { return {}; }
}

function saveState(state) {
  try { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {}
}

// The hook can be registered twice (plugin + settings), and Claude Code runs
// both copies in parallel. Only the first to create the lock file proceeds.
function claimRun(sessionId, prompt) {
  const dir = join(STATE_DIR, "locks");
  try {
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) {
      try { if (Date.now() - statSync(join(dir, f)).mtimeMs > 36e5) unlinkSync(join(dir, f)); } catch {}
    }
    const key = createHash("sha1").update(`${sessionId}\n${prompt}`).digest("hex").slice(0, 16);
    writeFileSync(join(dir, key), "", { flag: "wx" });
    return true;
  } catch (e) {
    return e.code !== "EEXIST"; // if locking itself fails, don't lose the reads
  }
}

async function search(q, token) {
  const url = `${API_BASE}/search/posts?q=${encodeURIComponent(q)}&limit=10&time=year`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(CONFIG.timeoutMs),
  });
  if (!res.ok) throw new Error(`daily.dev ${res.status}`);
  const body = await res.json();
  return (body.data || []).map((p) => ({
    id: p.id,
    title: p.title,
    link: p.commentsPermalink || p.url,
    readTime: p.readTime,
    upvotes: p.numUpvotes,
    text: [p.title, ...(p.tags || [])].join(" "),
    summary: (p.summary || "").slice(0, 300),
  }));
}

// Search results are loose matches: put posts that mention more of the terms
// first (title/tags count double), and drop ones that mention none (unless
// nothing matches at all).
function rank(posts, terms) {
  const res = MATCHERS.filter((m) => terms.includes(m.label)).map((m) => m.re);
  const hits = (s) => (s ? res.filter((re) => re.test(s)).length : 0);
  const scored = posts.map((p) => ({ p, score: 2 * hits(p.text || p.title) + hits(p.summary) }));
  const relevant = scored.filter((s) => s.score > 0);
  return (relevant.length ? relevant : scored).sort((a, b) => b.score - a.score).map((s) => s.p);
}

function format(terms, posts) {
  const lines = posts.map((p) => {
    const meta = [p.readTime ? `${p.readTime} min` : null, p.upvotes ? `▲${p.upvotes}` : null].filter(Boolean).join(" · ");
    // short id-only links: hook notices are plain text, so they must be easy to copy
    const link = p.id ? `https://daily.dev/posts/${p.id}` : p.link;
    return `  • ${p.title}${meta ? ` (${meta})` : ""} → ${link}`;
  });
  return `📖 While you wait: daily.dev reads on ${terms.join(", ")}\n${lines.join("\n")}`;
}

async function main() {
  if (process.env.DAILY_READS_DISABLED === "1") return;
  const token = process.env.DAILY_DEV_TOKEN;
  if (!token) return;

  let input = {};
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
  const prompt = (input.prompt || "").trim();
  if (prompt.length < 12) return;
  if (!claimRun(input.session_id, prompt)) return;

  const state = loadState();
  const now = Date.now();
  const month = new Date().toISOString().slice(0, 7);
  if (state.month !== month) { state.month = month; state.used = 0; }
  state.cache ||= {};
  state.sessions ||= {};

  // prune old sessions and cache entries
  for (const [id, s] of Object.entries(state.sessions)) if (now - (s.seen || 0) > 2 * 864e5) delete state.sessions[id];
  for (const [q, c] of Object.entries(state.cache)) if (now - c.t > CONFIG.cacheHours * 36e5) delete state.cache[q];

  const sid = input.session_id || "default";
  const session = (state.sessions[sid] ||= { shown: [], topics: [] });
  session.seen = now;

  // Topic from the prompt; fall back to the project stack only once per session.
  let terms = extractTerms(prompt).slice(0, 2);
  if (!terms.length && !session.topics.length) terms = detectStack(input.cwd || process.cwd()).slice(0, 2);
  if (!terms.length) return saveState(state);

  const topic = [...terms].sort().join(" "); // "redis fastapi" == "fastapi redis"
  if (session.topics.includes(topic)) return saveState(state); // already showed reads for this topic

  const cooling = session.lastSearch && now - session.lastSearch < CONFIG.cooldownMin * 6e4;
  const fetchCached = async (q) => {
    if (state.cache[q]) return state.cache[q].posts;
    if (cooling || state.used >= CONFIG.monthlyBudget) return null;
    state.used++;
    session.lastSearch = now;
    const posts = await search(q, token);
    state.cache[q] = { t: now, posts };
    return posts;
  };

  let posts = await fetchCached(topic);
  if (posts && !posts.length && terms.length > 1) {
    terms = terms.slice(0, 1);
    posts = await fetchCached(terms[0]);
  }
  if (!posts) return saveState(state);

  const fresh = rank(posts, terms).filter((p) => !session.shown.includes(p.id)).slice(0, CONFIG.maxPosts);
  session.topics.push(topic);
  if (!fresh.length) return saveState(state);
  session.shown.push(...fresh.map((p) => p.id));
  saveState(state);

  process.stdout.write(JSON.stringify({ systemMessage: format(terms, fresh), suppressOutput: true }));
}

main().catch(() => {}).finally(() => process.exit(0));
