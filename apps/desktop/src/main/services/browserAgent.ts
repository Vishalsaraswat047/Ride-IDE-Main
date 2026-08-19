import { BrowserWindow } from "electron";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export interface BrowserAgent {
  open(url: string): Promise<{ ok: boolean; output?: string; error?: string }>;
  navigate(url: string): Promise<{ ok: boolean; output?: string; error?: string }>;
  click(selector: string, index?: number): Promise<{ ok: boolean; output?: string; error?: string }>;
  type(selector: string, text: string): Promise<{ ok: boolean; output?: string; error?: string }>;
  select(selector: string, value: string): Promise<{ ok: boolean; output?: string; error?: string }>;
  scroll(direction: "down" | "up" | "top" | "bottom", amount?: number): Promise<{ ok: boolean; output?: string; error?: string }>;
  extract(selector?: string, maxLength?: number): Promise<{ ok: boolean; output?: string; error?: string }>;
  screenshot(dir: string): Promise<{ ok: boolean; output?: string; error?: string; path?: string }>;
  status(): { ok: boolean; output?: string; error?: string };
  close(): void;
}

let window: BrowserWindow | null = null;
let currentUrl = "";

function ensureWindow(): { ok: boolean; error?: string } {
  if (window && !window.isDestroyed()) return { ok: true };
  window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  window.webContents.on("render-process-gone", () => {
    currentUrl = "";
  });
  window.webContents.on("did-navigate", (_e, url) => {
    currentUrl = url;
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  return { ok: true };
}

async function waitLoaded(): Promise<void> {
  if (!window || window.isDestroyed()) return;
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        window!.webContents.once("did-finish-load", () => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 15_000)),
    ]);
  } catch {
    /* timeout is fine */
  }
}

async function evalJS<T>(code: string): Promise<T> {
  if (!window || window.isDestroyed()) throw new Error("Browser window is closed");
  return (await window.webContents.executeJavaScript(code, true)) as T;
}

async function tryScreenshot(path: string): Promise<boolean> {
  if (!window || window.isDestroyed()) return false;
  try {
    const image = await window.webContents.capturePage();
    if (image.isEmpty()) return false;
    await mkdir(path.slice(0, Math.max(0, path.lastIndexOf("\\"))), { recursive: true });
    await writeFile(path, image.toPNG());
    return true;
  } catch {
    try {
      const image = await window.webContents.capturePage();
      if (image.isEmpty()) return false;
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, image.toPNG());
      return true;
    } catch {
      return false;
    }
  }
}

export const browserAgent: BrowserAgent = {
  async open(url) {
    try {
      new URL(url);
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
    const w = ensureWindow();
    if (!w.ok) return w;
    try {
      await window!.loadURL(url);
      await waitLoaded();
      currentUrl = window!.webContents.getURL();
      const title = await evalJS<string>("document.title");
      return { ok: true, output: `Opened ${currentUrl} — "${title}"` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async navigate(url) {
    try {
      new URL(url);
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
    if (!ensureWindow().ok) return { ok: false, error: "Browser unavailable" };
    try {
      await window!.loadURL(url);
      await waitLoaded();
      currentUrl = window!.webContents.getURL();
      return { ok: true, output: `Navigated to ${currentUrl}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async click(selector, index = 0) {
    if (!ensureWindow().ok) return { ok: false, error: "Browser not open" };
    try {
      const clicked = await evalJS<boolean>(`
        (() => {
          const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
          if (!els.length) return false;
          const el = els[${index}] || els[0];
          el.scrollIntoView({ block: "center", behavior: "instant" });
          (el as HTMLElement).click();
          return true;
        })()
      `);
      return clicked
        ? { ok: true, output: `Clicked ${selector}[${index}]` }
        : { ok: false, error: `No element matching ${selector}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async type(selector, text) {
    if (!ensureWindow().ok) return { ok: false, error: "Browser not open" };
    try {
      const typed = await evalJS<boolean>(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return false;
          el.scrollIntoView({ block: "center", behavior: "instant" });
          const elt = el as HTMLInputElement | HTMLTextAreaElement;
          elt.focus();
          elt.value = ${JSON.stringify(text)};
          elt.dispatchEvent(new Event("input", { bubbles: true }));
          elt.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        })()
      `);
      return typed
        ? { ok: true, output: `Typed into ${selector}` }
        : { ok: false, error: `No element matching ${selector}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async select(selector, value) {
    if (!ensureWindow().ok) return { ok: false, error: "Browser not open" };
    try {
      const selected = await evalJS<boolean>(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)}) as HTMLSelectElement | null;
          if (!el) return false;
          el.value = ${JSON.stringify(value)};
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        })()
      `);
      return selected
        ? { ok: true, output: `Selected ${value} in ${selector}` }
        : { ok: false, error: `No select matching ${selector}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async scroll(direction, amount = 400) {
    if (!ensureWindow().ok) return { ok: false, error: "Browser not open" };
    try {
      const delta =
        direction === "down" ? amount
        : direction === "up" ? -amount
        : direction === "top" ? -1_000_000
        : 1_000_000;
      await evalJS<number>(`(() => { window.scrollBy(0, ${delta}); return window.scrollY; })()`);
      return { ok: true, output: `Scrolled ${direction}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async extract(selector, maxLength = 8000) {
    if (!ensureWindow().ok) return { ok: false, error: "Browser not open" };
    try {
      const text = await evalJS<string>(`
        (() => {
          const root = ${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document.body"};
          if (!root) return "__NO_MATCH__";
          const clone = root.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("script,style,noscript,svg").forEach(n => n.remove());
          return (clone.innerText || clone.textContent || "").replace(/\\s+/g, " ").trim();
        })()
      `);
      if (text === "__NO_MATCH__") return { ok: false, error: `No element matching ${selector}` };
      return { ok: true, output: `URL: ${currentUrl}\n${text.slice(0, maxLength)}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async screenshot(dir) {
    if (!ensureWindow().ok) return { ok: false, error: "Browser not open" };
    const name = `browser-${randomUUID().slice(0, 8)}.png`;
    const path = join(dir, name);
    try {
      const ok = await tryScreenshot(path);
      if (!ok) return { ok: false, error: "Screenshot failed (window not painted)" };
      return { ok: true, output: `Screenshot saved: ${path}`, path };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  status() {
    if (!window || window.isDestroyed()) {
      return { ok: false, output: "Browser closed. Use browser open(url) first." };
    }
    return { ok: true, output: `Browser open at ${currentUrl || "(not navigated yet)"}` };
  },

  close() {
    if (window && !window.isDestroyed()) window.destroy();
    window = null;
    currentUrl = "";
  },
};
