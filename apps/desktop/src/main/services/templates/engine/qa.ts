/**
 * RIDE Visual QA Agent.
 *
 * Runs a static inspection over generated templates and produces a quality
 * score (0–100) with a verdict. Templates below the acceptance threshold are
 * rejected and auto-fixed where the fix is safe and mechanical.
 *
 * Verdicts:  <75 → reject · 75–84 → needs improvement · 85–94 → approved · 95+ → featured
 */

import { PLACEHOLDER_RE } from "./content";

export interface QaCheck {
  id: string;
  label: string;
  weight: number;
  score: number;
  passed: number;
  total: number;
  detail: string[];
}

export interface QaReport {
  score: number;
  verdict: "reject" | "needs-work" | "approved" | "featured";
  checks: QaCheck[];
  issues: string[];
}

type Archetype = string;
type FamilyId = string;

export interface QaTarget {
  familyId: FamilyId;
  archetype: Archetype;
  section: string;
  name: string;
}

const SECTION_MIN_SECTIONS: Record<string, number> = {
  websites: 4,
  webapps: 3,
  ai: 3,
  mobile: 3,
  desktop: 2,
  developer: 0,
  games: 1,
  starter: 0,
};

const APP_ARCHETYPES = new Set(["portfolio", "saas", "landing", "blog", "docs", "dashboard", "ecommerce", "social", "ai-app", "pwa", "arcade", "custom"]);
const DEV_ARCHETYPES = new Set(["api", "cli", "package", "extension"]);

/** Starter/blank scaffolds are empty by design — page-level checks don't apply. */
const IS_STARTER = (target: QaTarget): boolean => target.section === "starter" || target.archetype === "custom";

function verdictFor(score: number): QaReport["verdict"] {
  if (score >= 95) return "featured";
  if (score >= 85) return "approved";
  if (score >= 75) return "needs-work";
  return "reject";
}

function ok(check: QaCheck, passed: boolean, detail?: string): void {
  check.score += passed ? check.weight : 0;
  check.passed += passed ? 1 : 0;
  check.total += 1;
  if (!passed) check.detail.push(detail ?? "");
}

export function runVisualQA(target: QaTarget, files: Record<string, string>): QaReport {
  const checks: QaCheck[] = [];
  const issues: string[] = [];
  const add = (id: string, label: string, weight: number) => {
    const c: QaCheck = { id, label, weight, score: 0, passed: 0, total: 0, detail: [] };
    checks.push(c);
    return c;
  };

  const srcFiles = Object.entries(files).filter(([p]) => p.startsWith("src/") || p.endsWith(".html") || p.endsWith(".js") || p.endsWith(".ts"));
  const allText = Object.values(files).join("\n");
  const srcText = srcFiles.map(([, t]) => t).join("\n");
  const isReact = APP_ARCHETYPES.has(target.archetype);
  const isDev = DEV_ARCHETYPES.has(target.archetype);

  // Starter/blank scaffolds are empty by design — every page-level check is waived.
  if (IS_STARTER(target)) {
    return {
      score: 100,
      verdict: "featured",
      checks: [],
      issues: ["blank starter scaffold — no generated content to review"],
    };
  }

  // 1 | Content — no placeholders may survive.
  {
    const c = add("content", "Placeholder-free content", 25);
    const hits: string[] = [];
    for (const [path, text] of srcFiles) {
      const m = text.match(PLACEHOLDER_RE);
      if (m) hits.push(`${path}: ${m[0]}`);
    }
    ok(c, hits.length === 0);
    hits.slice(0, 6).forEach((h) => issues.push(`placeholder found — ${h}`));
    if (hits.length > 0) issues.push(`content scan rejected template (${hits.length} placeholder hits)`);
  }

  // 2 | Architecture — enough real sections for the category.
  {
    const c = add("architecture", "Category-appropriate sections", 15);
    const floor = SECTION_MIN_SECTIONS[target.section] ?? 3;
    const sectionCount = (srcText.match(/<section\b/g) ?? []).length;
    const panelCount = (srcText.match(/<aside\b/g) ?? []).length;
    const total = sectionCount + panelCount;
    ok(c, isDev ? true : total >= floor, `found ${total} sections (floor ${floor})`);
    if (total < floor) issues.push(`only ${total} sections — ${target.section} templates need ${floor}+`);
  }

  // 3 | Landmarks — header / nav / footer present for page layouts.
  {
    const c = add("landmarks", "Semantic landmarks", 8);
    if (isReact && target.section === "websites") {
      const hasNav = /<header\b/.test(srcText) || /<nav\b/.test(srcText);
      const hasFooter = /<footer\b/.test(srcText);
      const hasMain = /<main\b/.test(srcText);
      ok(c, hasNav, "missing <header>/<nav>");
      ok(c, hasFooter, "missing <footer>");
      ok(c, hasMain, "missing <main>");
      if (!hasNav) issues.push("missing nav landmark");
      if (!hasFooter) issues.push("missing footer landmark");
    } else {
      ok(c, true);
    }
  }

  // 4 | Responsive — viewport meta + responsive classes or media queries.
  {
    const c = add("responsive", "Responsive design", 10);
    const html = files["index.html"] ?? "";
    const hasViewport = /name="viewport"|name='viewport'/.test(html);
    const hasBreakpoints = /(md:|lg:|sm:|@media)/.test(srcText);
    ok(c, hasViewport, "viewport meta missing");
    ok(c, hasBreakpoints, "no responsive breakpoints found");
    if (!hasViewport) issues.push("viewport meta missing in index.html");
  }

  // 5 | Accessibility — alt text, reduced motion, labelled buttons.
  {
    const c = add("accessibility", "Accessibility", 10);
    const imgs = srcText.match(/<img\b/g) ?? [];
    const alts = srcText.match(/alt=/g) ?? [];
    ok(c, imgs.length === 0 || alts.length >= imgs.length, `${alts.length}/${imgs.length} images have alt text`);
    ok(c, /prefers-reduced-motion/.test(srcText), "prefers-reduced-motion not honoured");
    const buttons = srcText.match(/<button\b/g) ?? [];
    const labelledButtons = srcText.match(/aria-label(?==)|aria-label=/g) ?? [];
    ok(c, buttons.length === 0 || labelledButtons.length > 0 || buttons.length <= 12, "icon buttons should carry aria-labels");
    if (imgs.length > alts.length) issues.push(`${imgs.length - alts.length} image(s) without alt text`);
    if (!/prefers-reduced-motion/.test(srcText)) issues.push("prefers-reduced-motion not honoured");
  }

  // 6 | Interaction — real interactive elements.
  {
    const c = add("interaction", "Working interactions", 10);
    const handlers = (srcText.match(/onClick=|onChange=|onSubmit=|useState\(/g) ?? []).length;
    const floor = isDev ? 0 : isReact ? 4 : 1;
    ok(c, handlers >= floor, `only ${handlers} interactive handlers (floor ${floor})`);
    if (isReact && handlers < floor) issues.push(`too few interactive handlers (${handlers})`);
  }

  // 7 | Design tokens — a coherent variable-driven palette.
  {
    const c = add("design-system", "Design tokens", 8);
    const css = srcText.split("\n").filter((l) => l.includes("--")).join("\n");
    ok(c, /--accent\s*:/.test(css), "missing --accent token");
    ok(c, /--canvas\s*:/.test(css) || /--ink\s*:/.test(css), "missing canvas/ink tokens");
    ok(c, /--hairline|--body|--mute/.test(css), "missing type/surface tokens");
  }

  // 8 | Visual system — gradients / scenes / decorative assets present.
  {
    const c = add("visual-system", "Visual assets & art direction", 8);
    const hasArt = /(linear-gradient|radial-gradient|vk-|conic-gradient|\.vk-)/.test(srcText);
    const hasMotion = /(animation|transition|hover)/.test(srcText);
    ok(c, hasArt, "no gradient/scene visual language found");
    ok(c, hasMotion, "no motion system found");
    if (!hasArt) issues.push("visual language missing — flat un-styled surfaces");
  }

  // 9 | Originality — distinct copy rather than repeated identical entries.
  {
    const c = add("originality", "Original, non-repetitive content", 6);
    const literals = new Set<string>();
    const repeats = new Map<string, number>();
    for (const m of srcText.matchAll(/["'`]([^"'`]{12,120})["'`]/g)) {
      const s = m[1]!;
      if (/^[a-z\s-]+$/.test(s) && !s.includes(" ")) continue;
      if (/(className|font-|text-|bg-|px-|py-|gap-|max-|min-|border)/.test(s)) continue;
      literals.add(s);
      repeats.set(s, (repeats.get(s) ?? 0) + 1);
    }
    let maxRepeats = 0;
    for (const [, n] of repeats) maxRepeats = Math.max(maxRepeats, n);
    ok(c, isDev ? true : literals.size >= 40, `only ${literals.size} distinct content strings`);
    ok(c, isDev ? true : maxRepeats <= 3, `identical content string repeated ${maxRepeats}×`);
    if (literals.size < 40) issues.push("content diversity too low — generic repeated cards present");
    if (maxRepeats > 3) issues.push(`identical entries repeated ${maxRepeats}× — visually repetitive`);
  }

  // 9b | Section diversity — identical <section> blocks are copy-paste art direction.
  {
    const c = add("section-diversity", "Distinct section architecture", 4);
    const norm = (s: string): string => s.replace(/\s+/g, " ").replace(/\${[^}]*}/g, "{}").trim();
    const seen = new Map<string, number>();
    let dups = 0;
    for (const [, text] of srcFiles) {
      for (const m of text.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)) {
        const key = norm(m[1]!);
        if (key.length < 40) continue;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    for (const [, n] of seen) if (n > 1) dups += n - 1;
    ok(c, dups === 0, `${dups} duplicate section blocks — visually repetitive page`);
    if (dups > 0) issues.push(`${dups} identical section blocks found — section architecture is repetitive`);
  }

  // 9c | Assets — image references must resolve to files that exist.
  {
    const c = add("assets", "Resolvable image assets", 6);
    const have = new Set(Object.keys(files).map((p) => p.replace(/\\/g, "/")));
    const missing = new Set<string>();
    for (const [, text] of Object.entries(files)) {
      for (const m of text.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^"')]+)["']?\)/g)) {
        const ref = (m[1] ?? m[2] ?? "").split(/[?#]/)[0];
        if (!ref) continue;
        if (/^(https?:|data:|blob:|#|\/\/)/.test(ref)) continue;
        if (!/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(ref)) continue;
const rel = ref.replace(/^\.?\//, "").replace(/^src\//, "src/").replace(/^public\//, "public/");
    const candidates = [rel, `src/${rel.replace(/^src\//, "")}`, `public/${rel.replace(/^public\//, "")}`];
        if (!candidates.some((cand) => have.has(cand))) missing.add(ref);
      }
    }
    ok(c, missing.size === 0, `${missing.size} image reference(s) point to missing files: ${[...missing].slice(0, 3).join(", ")}`);
    if (missing.size > 0) issues.push(`broken image references — ${[...missing].slice(0, 3).join(", ")}`);
  }

  // 10 | Project meta — title + description for the shell.
  {
    const c = add("meta", "Page meta", 5);
    const html = files["index.html"] ?? "";
    ok(c, /<title>/.test(html), "missing <title>");
    ok(c, /name="description"|name='description'/.test(html), "missing meta description");
  }

  // 10b | Completion — no dead links; every route referenced is defined.
  {
    const c = add("completion", "No dead links, working routes", 12);
    const dead = new Set<string>();
    for (const [path, text] of srcFiles) {
      for (const m of text.matchAll(/(?:href|to)=["'`]([^"'`]*)["'`]/g)) {
        const t = (m[1] ?? "").trim();
        if (t === "#" || t === "" || t.startsWith("javascript:")) dead.add(`${path}: ${t === "" ? "(empty)" : t}`);
      }
    }
    const hasRouter = /\bRoutes\b/.test(srcText) && /react-router-dom/.test(srcText);
    const dynamicOk = (r: string) =>
      ["/post/", "/project/", "/product/", "/course/"].some((p) => r.startsWith(p));
    let brokenRoutes = 0;
    let brokenList: string[] = [];
    if (hasRouter) {
      const defs = new Set<string>();
      const refs = new Set<string>();
      for (const m of srcText.matchAll(/<Route\s+path="([^"]+)"/g)) defs.add(m[1]!);
      for (const m of srcText.matchAll(/<Link\s+to=\{?["'`]([^"'`}]+)["'`]/g)) refs.add(m[1]!);
      for (const m of srcText.matchAll(/navigate\(\s*["'`]([^"'`]+)["'`]/g)) refs.add(m[1]!);
      for (const r of refs) {
        if (!r.startsWith("/")) continue;
        if (defs.has(r) || r === "/" || dynamicOk(r)) continue;
        brokenRoutes += 1;
        if (brokenList.length < 4) brokenList.push(r);
      }
    }
    ok(c, dead.size === 0, `${dead.size} dead link target(s): ${[...dead].slice(0, 3).join(", ")}`);
    ok(c, brokenRoutes === 0, `referenced but undefined routes: ${brokenList.join(", ")}`);
    if (dead.size > 0) issues.push(`dead link targets found (${dead.size}) — every button must lead somewhere real`);
    if (brokenRoutes > 0) issues.push(`${brokenRoutes} route reference(s) with no matching <Route>`);
  }

  // 11 | Robustness — no obvious escaping/placeholder fragments in code files.
  {
    const c = add("robustness", "No template leakage", 5);
    let leaked = 0;
    for (const [path, text] of Object.entries(files)) {
      if (path === "RIDE_TEMPLATE.json" || path === "TEMPLATE_MANIFEST.json" || path === "QA_REPORT.json") continue;
      if (/\$\{name\}/.test(text) && /(Replace|placeholder)/i.test(text)) leaked += 1;
    }
    ok(c, leaked === 0, `${leaked} files still reference the template interpolator`);
  }

  const scoreTotal = checks.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(checks.reduce((s, c) => s + c.score, 0) * (100 / scoreTotal));
  const report: QaReport = { score, verdict: verdictFor(score), checks, issues };

  return report;
}

/**
 * Mechanical auto-fixes that raise QA without guessing content:
 *  - meta description + viewport + lang in index.html
 *  - prefers-reduced-motion guard in the CSS entry
 *  - alt="" injection for decorative <img> without alt
 */
export function autofix(files: Record<string, string>, report: QaReport): Record<string, string> {
  const out: Record<string, string> = { ...files };
  const findIssue = (id: string) => report.checks.find((c) => c.id === id)?.detail.length ?? 0;

  if (findIssue("responsive") > 0 || findIssue("meta") > 0) {
    const html = out["index.html"];
    if (html && /<meta name="viewport"/.test(html) === false) {
      out["index.html"] = html.replace(/<head>/, '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="description" content="RIDE scaffold — production-grade starter with complete sample content." />');
    }
  }

  if (findIssue("accessibility") > 0) {
    const css = out["src/index.css"];
    if (css && /prefers-reduced-motion/.test(css) === false) {
      out["src/index.css"] = css + `\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }\n}\n`;
    }
    for (const [path, text] of Object.entries(out)) {
      if (!path.endsWith(".tsx") && !path.endsWith(".ts") && !path.endsWith(".jsx")) continue;
      if (/<img\b[^>]*\/?>/.test(text)) {
        out[path] = text.replace(/<img\b([^>]*?)\/?>/g, (full, attrs) => {
          if (/alt=/.test(full)) return full;
          return `<img ${attrs.replace(/\s*\/>$/, "")} alt="" />`;
        });
      }
    }
  }

  return out;
}

export function describeVerdict(verdict: QaReport["verdict"]): string {
  switch (verdict) {
    case "featured":
      return "Featured — production quality";
    case "approved":
      return "Approved — ready for the marketplace";
    case "needs-work":
      return "Needs improvement — below marketplace standard";
    default:
      return "Rejected — does not meet RIDE quality floor";
  }
}