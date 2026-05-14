/**
 * load() — cross-runtime glob file resolver with tsconfig path alias support.
 *
 * Returns resolved absolute file paths. Does NOT import — caller drives imports.
 *
 * Supported glob features:
 *   *       — matches any segment (not path separators)
 *   **      — matches any depth (where supported by runtime FS walk)
 *   {a,b}   — brace expansion
 *   @alias  — tsconfig `paths` aliases
 *
 * Runtimes: Node.js, Bun, Deno, Cloudflare Workers (Workers: alias-only, no FS)
 *
 * Usage:
 *   const paths = load('@config/*')
 *   const paths = load(['@entity/*.entity.{ts,js}', './app/users/*.ts'])
 *
 *   make({ entity: load('@entity/*') })
 *   async function make(pathMap: Record<string, string[]>) {
 *     for (const [key, paths] of Object.entries(pathMap)) {
 *       for (const p of paths) {
 *         const mod = await import(p)
 *         // ...
 *       }
 *     }
 *   }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlobPattern = string | string[];

export interface LoadOptions {
  /** Working directory for relative patterns. Defaults to process.cwd() / Deno.cwd(). */
  cwd?: string;
  /** Path to tsconfig.json. Auto-discovered from cwd upward if not provided. */
  tsconfig?: string;
  /** Include dotfiles. Default: false. */
  dot?: boolean;
  /** Only return files (not directories). Default: true. */
  filesOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Runtime detection
// ---------------------------------------------------------------------------

type Runtime = "node" | "bun" | "deno" | "worker";

function detectRuntime(): Runtime {
  if (typeof (globalThis as any).Deno !== "undefined") return "deno";
  if (typeof (globalThis as any).Bun !== "undefined") return "bun";
  if (typeof process !== "undefined" && process.versions?.node) return "node";
  return "worker";
}

const RUNTIME = detectRuntime();

// ---------------------------------------------------------------------------
// FS abstraction — one interface, per-runtime implementations
// ---------------------------------------------------------------------------

interface FSAdapter {
  cwd(): string;
  readdir(dir: string): string[]; // sync
  lstat(path: string): { isFile: boolean; isDirectory: boolean };
  exists(path: string): boolean;
  readText(path: string): string;
  resolve(...parts: string[]): string;
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
  sep: string;
}

// -- Node / Bun (identical API) ---------------------------------------------
function makeNodeAdapter(): FSAdapter {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const statCache = new Map<string, { isFile: boolean; isDirectory: boolean }>();

  return {
    cwd: () => process.cwd(),
    readdir: (dir) => fs.readdirSync(dir),
    lstat: (p) => {
      if (statCache.has(p)) return statCache.get(p)!;
      const s = fs.lstatSync(p);
      const result = { isFile: s.isFile(), isDirectory: s.isDirectory() };
      statCache.set(p, result);
      return result;
    },
    exists: (p) => {
      try { fs.accessSync(p); return true; } catch { return false; }
    },
    readText: (p) => fs.readFileSync(p, "utf8"),
    resolve: (...parts) => path.resolve(...parts),
    join: (...parts) => path.join(...parts),
    relative: (from, to) => path.relative(from, to),
    sep: path.sep,
  };
}

// -- Deno -------------------------------------------------------------------
function makeDenoAdapter(): FSAdapter {
  const deno = (globalThis as any).Deno;
  const statCache = new Map<string, { isFile: boolean; isDirectory: boolean }>();

  // Deno doesn't have path.join built-in; use URL-based helpers
  const join = (...parts: string[]) =>
    parts.reduce((a, b) => a.replace(/\/+$/, "") + "/" + b.replace(/^\/+/, ""));
  const resolve = (...parts: string[]) => {
    let base = parts[0].startsWith("/") ? parts[0] : join(deno.cwd(), parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      base = p.startsWith("/") ? p : join(base, p);
    }
    // Normalize ..
    const segments = base.split("/");
    const out: string[] = [];
    for (const s of segments) {
      if (s === "..") out.pop();
      else if (s !== ".") out.push(s);
    }
    return out.join("/") || "/";
  };

  return {
    cwd: () => deno.cwd(),
    readdir: (dir) =>
      [...deno.readDirSync(dir)].map((e: any) => e.name),
    lstat: (p) => {
      if (statCache.has(p)) return statCache.get(p)!;
      const s = deno.lstatSync(p);
      const result = { isFile: s.isFile, isDirectory: s.isDirectory };
      statCache.set(p, result);
      return result;
    },
    exists: (p) => {
      try { deno.lstatSync(p); return true; } catch { return false; }
    },
    readText: (p) => deno.readTextFileSync(p),
    resolve,
    join,
    relative: (from, to) => {
      const f = from.split("/").filter(Boolean);
      const t = to.split("/").filter(Boolean);
      let i = 0;
      while (i < f.length && f[i] === t[i]) i++;
      return [...f.slice(i).map(() => ".."), ...t.slice(i)].join("/") || ".";
    },
    sep: "/",
  };
}

// -- Cloudflare Workers (no FS) ---------------------------------------------
function makeWorkerAdapter(): FSAdapter {
  const noFS = (method: string) => () => {
    throw new Error(
      `load(): filesystem access unavailable in Cloudflare Workers (called: ${method}). ` +
      `Only pre-resolved paths or alias-only patterns are supported.`
    );
  };
  return {
    cwd: noFS("cwd"),
    readdir: noFS("readdir") as any,
    lstat: noFS("lstat") as any,
    exists: () => false,
    readText: noFS("readText") as any,
    resolve: (...parts) => parts.join("/").replace(/\/+/g, "/"),
    join: (...parts) => parts.join("/").replace(/\/+/g, "/"),
    relative: noFS("relative") as any,
    sep: "/",
  };
}

function makeAdapter(): FSAdapter {
  if (RUNTIME === "deno") return makeDenoAdapter();
  if (RUNTIME === "worker") return makeWorkerAdapter();
  return makeNodeAdapter(); // node or bun
}

// ---------------------------------------------------------------------------
// Brace expansion  {a,b,c} → ['a','b','c']
// Handles nesting: {a,{b,c}} → ['a','b','c']
// ---------------------------------------------------------------------------

function expandBraces(pattern: string): string[] {
  const open = pattern.indexOf("{");
  if (open === -1) return [pattern];

  let depth = 0;
  let close = -1;
  for (let i = open; i < pattern.length; i++) {
    if (pattern[i] === "{") depth++;
    else if (pattern[i] === "}") {
      depth--;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close === -1) return [pattern]; // unmatched — treat literally

  const prefix = pattern.slice(0, open);
  const suffix = pattern.slice(close + 1);
  const inner = pattern.slice(open + 1, close);

  // Split inner by top-level commas only
  const parts: string[] = [];
  let buf = "";
  let d = 0;
  for (const ch of inner) {
    if (ch === "{") { d++; buf += ch; }
    else if (ch === "}") { d--; buf += ch; }
    else if (ch === "," && d === 0) { parts.push(buf); buf = ""; }
    else buf += ch;
  }
  parts.push(buf);

  const results: string[] = [];
  for (const part of parts) {
    for (const expanded of expandBraces(prefix + part + suffix)) {
      results.push(expanded);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Glob → RegExp
// Converts a glob segment (no braces left) to a RegExp
// ---------------------------------------------------------------------------

function globToRegex(glob: string, opts: { globstar?: boolean } = {}): RegExp {
  let src = "^";
  let i = 0;
  const len = glob.length;
  while (i < len) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        // ** — match any path depth
        src += opts.globstar !== false ? ".*" : "[^/]*";
        i += 2;
        if (glob[i] === "/") i++; // consume trailing slash
        continue;
      }
      src += "[^/]*";
    } else if (ch === "?") {
      src += "[^/]";
    } else if (".+^${}|[]()\\".includes(ch)) {
      src += "\\" + ch;
    } else {
      src += ch;
    }
    i++;
  }
  src += "$";
  return new RegExp(src);
}

// ---------------------------------------------------------------------------
// FS walk — resolves a single expanded glob to matching absolute paths
// ---------------------------------------------------------------------------

const HIDDEN = /(^|[/\\])\.[^/\\.]/;

function walkSync(
  fs: FSAdapter,
  baseDir: string,
  globParts: string[], // path segments of the glob after the static prefix
  currentDir: string,
  opts: { dot: boolean; filesOnly: boolean }
): string[] {
  if (globParts.length === 0) return [];

  const results: string[] = [];
  const [head, ...rest] = globParts;
  const isLast = rest.length === 0;

  let entries: string[];
  try {
    entries = fs.readdir(currentDir);
  } catch {
    return results;
  }

  // Special: ** gobbles everything recursively
  if (head === "**") {
    // match current dir itself with remaining parts
    for (const name of entries) {
      const full = fs.join(currentDir, name);
      if (!opts.dot && HIDDEN.test(name)) continue;
      let stat: { isFile: boolean; isDirectory: boolean };
      try { stat = fs.lstat(full); } catch { continue; }

      if (stat.isDirectory) {
        // recurse with ** still in front (greedily consume depth)
        results.push(...walkSync(fs, baseDir, globParts, full, opts));
        // also try matching rest against this dir's children
        if (rest.length > 0) {
          results.push(...walkSync(fs, baseDir, rest, full, opts));
        }
      } else if (stat.isFile) {
        if (rest.length === 0) results.push(full);
        else {
          // file can't match further directory segments
        }
      }
    }
    return results;
  }

  const regex = globToRegex(head, { globstar: false });

  for (const name of entries) {
    if (!opts.dot && HIDDEN.test(name)) continue;
    if (!regex.test(name)) continue;

    const full = fs.join(currentDir, name);
    let stat: { isFile: boolean; isDirectory: boolean };
    try { stat = fs.lstat(full); } catch { continue; }

    if (isLast) {
      if (stat.isFile) results.push(full);
      else if (stat.isDirectory && !opts.filesOnly) results.push(full);
    } else {
      if (stat.isDirectory) {
        results.push(...walkSync(fs, baseDir, rest, full, opts));
      }
    }
  }

  return results;
}

function resolveGlob(
  fsAdapter: FSAdapter,
  pattern: string,
  opts: { cwd: string; dot: boolean; filesOnly: boolean }
): string[] {
  // Split into static prefix and glob suffix
  const sep = /[/\\]/;
  const parts = pattern.split(sep);

  let staticParts: string[] = [];
  let globParts: string[] = [];
  let inGlob = false;
  for (const p of parts) {
    if (!inGlob && !p.includes("*") && !p.includes("?")) {
      staticParts.push(p);
    } else {
      inGlob = true;
      globParts.push(p);
    }
  }

  const baseDir = fsAdapter.resolve(opts.cwd, staticParts.join("/"));

  if (globParts.length === 0) {
    // No glob — exact path
    try {
      const stat = fsAdapter.lstat(baseDir);
      if (opts.filesOnly && !stat.isFile) return [];
      return [baseDir];
    } catch {
      return [];
    }
  }

  return walkSync(fsAdapter, baseDir, globParts, baseDir, opts);
}

// ---------------------------------------------------------------------------
// tsconfig alias resolution
// ---------------------------------------------------------------------------

interface TsConfigPaths {
  [alias: string]: string[]; // e.g. "@config/*" → ["src/config/*"]
}

interface AliasMap {
  paths: TsConfigPaths;
  baseUrl: string; // absolute
}

const aliasCache = new Map<string, AliasMap | null>();

function findTsconfig(fsAdapter: FSAdapter, startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = fsAdapter.join(dir, "tsconfig.json");
    if (fsAdapter.exists(candidate)) return candidate;
    const parent = fsAdapter.resolve(dir, "..");
    if (parent === dir) return null; // reached root
    dir = parent;
  }
}

function loadTsconfig(fsAdapter: FSAdapter, tsconfigPath: string): AliasMap | null {
  if (aliasCache.has(tsconfigPath)) return aliasCache.get(tsconfigPath)!;

  try {
    const raw = fsAdapter.readText(tsconfigPath);
    // Strip single-line comments (tsconfig allows them)
    const cleaned = raw.replace(/\/\/[^\n]*/g, "");
    const json = JSON.parse(cleaned);
    const co = json?.compilerOptions ?? {};
    const baseUrl = co.baseUrl
      ? fsAdapter.resolve(fsAdapter.join(tsconfigPath, ".."), co.baseUrl)
      : fsAdapter.join(tsconfigPath, "..");
    const paths: TsConfigPaths = co.paths ?? {};
    const result: AliasMap = { paths, baseUrl };
    aliasCache.set(tsconfigPath, result);
    return result;
  } catch {
    aliasCache.set(tsconfigPath, null);
    return null;
  }
}

/**
 * Resolves alias patterns in a glob string.
 * Returns an array of concrete patterns (alias might map to multiple roots).
 *
 * Example:
 *   "@entity\/*"  +  paths: { "@entity\/*": ["src/entities\/*"] }
 *   → ["<baseUrl>/src/entities\/*"]
 */
function resolveAliases(
  pattern: string,
  aliasMap: AliasMap
): string[] {
  const { paths, baseUrl } = aliasMap;

  // Try each alias key. Keys may contain * wildcard.
  for (const [key, targets] of Object.entries(paths)) {
    const aliasRegex = new RegExp(
      "^" + key.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "(.*)") + "$"
    );
    const match = pattern.match(aliasRegex);
    if (!match) continue;

    const capture = match[1] ?? ""; // what * matched in the alias key

    return targets.map((target) => {
      const concrete = target.includes("*")
        ? target.replace("*", capture)
        : target;
      return concrete.startsWith("/")
        ? concrete
        : `${baseUrl}/${concrete}`.replace(/\/+/g, "/");
    });
  }

  return [pattern]; // no alias matched — return as-is
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves a glob pattern (or array of patterns) to absolute file paths.
 * Supports tsconfig path aliases, `*` globs, and `{a,b}` brace expansion.
 *
 * @example
 * const paths = load('@entity\/*.entity.{ts,js}')
 * const paths = load(['@config\/*', './extra\/*.ts'])
 */
export function load(pattern: GlobPattern, options: LoadOptions = {}): string[] {
  const fsAdapter = makeAdapter();

  const cwd = options.cwd ?? (RUNTIME !== "worker" ? fsAdapter.cwd() : "/");
  const dot = options.dot ?? false;
  const filesOnly = options.filesOnly ?? true;

  // Discover tsconfig for alias resolution
  let aliasMap: AliasMap | null = null;
  if (RUNTIME !== "worker") {
    const tsconfigPath = options.tsconfig
      ? fsAdapter.resolve(cwd, options.tsconfig)
      : findTsconfig(fsAdapter, cwd);
    if (tsconfigPath) {
      aliasMap = loadTsconfig(fsAdapter, tsconfigPath);
    }
  }

  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const seen = new Set<string>();
  const results: string[] = [];

  for (const rawPattern of patterns) {
    // 1. Alias expansion → possibly multiple concrete patterns
    const aliasExpanded = aliasMap
      ? resolveAliases(rawPattern, aliasMap)
      : [rawPattern];

    for (const aliasPattern of aliasExpanded) {
      // 2. Brace expansion → multiple glob patterns
      const braceExpanded = expandBraces(aliasPattern);

      for (const globPattern of braceExpanded) {
        if (RUNTIME === "worker") {
          // Workers: no FS walk — return the pattern as-is (caller may use a bundler manifest)
          if (!seen.has(globPattern)) {
            seen.add(globPattern);
            results.push(globPattern);
          }
          continue;
        }

        // 3. Glob walk
        const matches = resolveGlob(fsAdapter, globPattern, { cwd, dot, filesOnly });
        for (const m of matches) {
          if (!seen.has(m)) {
            seen.add(m);
            results.push(m);
          }
        }
      }
    }
  }

  return results;
}

// Allow invalidating the tsconfig cache (useful in watch mode)
export function clearCache(): void {
  aliasCache.clear();
}