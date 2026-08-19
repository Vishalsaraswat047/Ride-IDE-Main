import { spawn, type ChildProcess } from "node:child_process";
import { watch, type FSWatcher } from "node:fs";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { IpcChannel, type PreviewEvent, type PreviewStatus, type PreviewErrorDetail, type PreviewProjectType } from "@ride/contracts";
import { sendToRenderer } from "../../index";

const URL_RE = /http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+(?:\/\S*)?/;
const ERROR_RE = /\b(?:error|failed|failed to|ELIFECYCLE|cannot find|could not resolve|port .* already in use)\b/i;
const READY_RE = /ready in|Local:\s|compiled successfully|built in|listening on|vite v\d/i;
const IGNORED_DIRS = /(?:^|[\\/])(?:node_modules|dist|\.git|out|\.turbo)(?:[\\/]|$)/;

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

type ProjectType = "static" | "vite" | "react-scripts" | "next" | "nuxt" | "svelte" | "unknown";

interface DetectedProject {
  type: ProjectType;
  hasPackageJson: boolean;
  devCommand?: string;
  entryPoint?: string;
  framework?: string;
}

export class DevServerService {
  private child: ChildProcess | null = null;
  private watcher: FSWatcher | null = null;
  private changeTimer: ReturnType<typeof setTimeout> | null = null;
  private errorCount = 0;
  private phase = "";
  private url: string | null = null;
  private command: string | null = null;
  private cwd: string | null = null;
  private state: PreviewStatus["state"] = "idle";
  private staticServer: ReturnType<typeof createServer> | null = null;
  private staticPort: number | null = null;

  private emit(event: PreviewEvent): void {
    sendToRenderer(IpcChannel.preview.events, event);
  }

  private setState(state: PreviewStatus["state"], phase: string, projectType?: string, framework?: string, errorDetail?: PreviewErrorDetail): void {
    this.state = state;
    this.phase = phase;
    this.emit({ type: "status", status: this.status(projectType, framework, errorDetail) });
  }

  status(projectType?: string, framework?: string, errorDetail?: PreviewErrorDetail): PreviewStatus {
    return {
      state: this.state,
      url: this.url,
      command: this.command,
      cwd: this.cwd,
      phase: this.phase,
      lastChangedAt: null,
      errorCount: this.errorCount,
      projectType: projectType as PreviewStatus["projectType"],
      framework,
      errorDetail,
    };
  }

  async start(root: string): Promise<PreviewStatus> {
    if (this.child && this.cwd === root && this.state !== "stopped") return this.status();
    if (this.child) this.killChild();
    if (this.staticServer) this.stopStaticServer();

    this.cwd = root;
    this.url = null;
    this.errorCount = 0;
    this.command = null;

    const project = await this.detectProject(root);
    
    if (project.type === "static") {
      return this.startStaticServer(root, project.entryPoint!);
    }

    const pkg = await this.readPackageJson(root);
    if (!pkg) {
      this.setState("error", "No package.json in this workspace", undefined, undefined, { message: "No package.json found", timestamp: Date.now() });
      return this.status();
    }

    await this.startWatching(root);

    if (!(await this.hasNodeModules(root))) {
      this.setState("installing", "Installing dependencies…");
      this.log(`$ npm install (${root})`);
      const ok = await this.runInstall(root);
      if (!ok) {
        this.setState("error", "npm install failed — see logs", undefined, undefined, { message: "npm install failed", command: "npm install", timestamp: Date.now() });
        return this.status();
      }
    }

    const dev = pkg.scripts?.dev ?? pkg.scripts?.start ?? pkg.scripts?.build;
    this.command = dev ? `npm run ${Object.keys(pkg.scripts ?? {}).find((k) => pkg.scripts![k] === dev) ?? "dev"}` : "npm run dev";

    this.setState("starting", `Starting ${this.command}…`, project.type, project.framework);
    this.log(`$ ${this.command}`);
    this.spawnDev(root, dev ?? "react-scripts start");
    return this.status();
  }

  async detectProject(root: string): Promise<DetectedProject> {
    const pkg = await this.readPackageJson(root);
    const hasPackageJson = !!pkg;
    
    // Check for static HTML project (index.html at root)
    try {
      const entries = await readdir(root);
      const hasIndexHtml = entries.some(e => e.toLowerCase() === "index.html");
      if (hasIndexHtml && !pkg) {
        return { type: "static", hasPackageJson: false, entryPoint: "index.html" };
      }
    } catch {
      // ignore
    }

    if (!pkg) {
      return { type: "unknown", hasPackageJson: false };
    }

    // Check for Vite
    const dev = pkg.scripts?.dev ?? pkg.scripts?.start;
    if (dev && (dev.includes("vite") || pkg.devDependencies?.vite || pkg.dependencies?.vite)) {
      return { type: "vite", hasPackageJson: true, devCommand: dev, framework: "vite" };
    }

    // Check for Next.js
    if (pkg.dependencies?.next || pkg.devDependencies?.next) {
      return { type: "next", hasPackageJson: true, devCommand: pkg.scripts?.dev ?? "next dev", framework: "next" };
    }

    // Check for Nuxt
    if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) {
      return { type: "nuxt", hasPackageJson: true, devCommand: pkg.scripts?.dev ?? "nuxt dev", framework: "nuxt" };
    }

    // Check for SvelteKit
    if (pkg.dependencies?.["@sveltejs/kit"] || pkg.devDependencies?.["@sveltejs/kit"]) {
      return { type: "svelte", hasPackageJson: true, devCommand: pkg.scripts?.dev ?? "vite dev", framework: "svelte" };
    }

    // Check for Create React App / react-scripts
    if (pkg.dependencies?.["react-scripts"] || pkg.devDependencies?.["react-scripts"]) {
      return { type: "react-scripts", hasPackageJson: true, devCommand: pkg.scripts?.start ?? "react-scripts start", framework: "react" };
    }

    // Default: use whatever dev script exists
    if (dev) {
      return { type: "unknown", hasPackageJson: true, devCommand: dev };
    }

    return { type: "unknown", hasPackageJson: true };
  }

  async startStaticServer(root: string, entryPoint: string): Promise<PreviewStatus> {
    return new Promise((resolve) => {
      this.setState("starting", "Starting static file server…", "static", "static");
      
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const reqUrl = (req.url ?? "/") as string;
          const pathPart = reqUrl.split("?")[0] ?? "/";
          let filePath = reqUrl === "/" || reqUrl === "/index.html" 
            ? join(root, entryPoint) 
            : join(root, pathPart);
          
          // Prevent directory traversal
          if (!filePath.startsWith(root)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
          }

          const fileStat = await stat(filePath).catch(() => null);
          if (!fileStat || fileStat.isDirectory()) {
            // Try index.html in directory
            const indexPath = join(filePath, "index.html");
            const indexStat = await stat(indexPath).catch(() => null);
            if (indexStat) {
              filePath = indexPath;
            } else {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
          }

          const content = await readFile(filePath);
          const ext = extname(filePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".jsx": "application/javascript",
            ".ts": "application/typescript",
            ".tsx": "application/typescript",
            ".json": "application/json",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
            ".ttf": "font/ttf",
            ".eot": "application/vnd.ms-fontobject",
          };
          
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          res.end(content);
        } catch (err) {
          res.writeHead(500);
          res.end("Internal server error");
        }
      });

      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") {
          this.staticPort = address.port;
          this.url = `http://127.0.0.1:${address.port}`;
          this.staticServer = server;
          this.command = "static file server";
          this.setState("running", "Static preview ready", "static", "static");
          resolve(this.status("static", "static"));
        }
      });

      server.on("error", (err) => {
        this.setState("error", `Static server failed: ${err.message}`, "static", "static", { message: err.message, command: "static file server", timestamp: Date.now() });
        resolve(this.status("static", "static"));
      });
    });
  }

  stopStaticServer(): void {
    if (this.staticServer) {
      this.staticServer.close();
      this.staticServer = null;
      this.staticPort = null;
    }
  }

  stop(): PreviewStatus {
    this.killChild();
    this.stopStaticServer();
    this.setState("stopped", "Stopped");
    return this.status();
  }

  dispose(): void {
    this.killChild();
    this.stopStaticServer();
    this.watcher?.close();
    this.watcher = null;
  }

  private readPackageJson(root: string): Promise<PackageJson | null> {
    return readFile(join(root, "package.json"), "utf8")
      .then((raw) => {
        try {
          return JSON.parse(raw) as PackageJson;
        } catch {
          return null;
        }
      })
      .catch(() => null);
  }

  private hasNodeModules(root: string): Promise<boolean> {
    return import("node:fs/promises")
      .then(({ stat }) => stat(join(root, "node_modules")))
      .then(() => true)
      .catch(() => false);
  }

  private runInstall(root: string): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
      const install = spawn(cmd, ["install", "--no-audit", "--no-fund"], {
        cwd: root,
        shell: process.platform === "win32",
        windowsHide: true,
      });
      install.stdout.on("data", (d: Buffer) => this.log(d.toString()));
      install.stderr.on("data", (d: Buffer) => this.log(d.toString()));
      install.on("error", () => resolve(false));
      install.on("close", (code) => resolve(code === 0));
    });
  }

  private spawnDev(root: string, script: string): void {
    const child = spawn(script, {
      cwd: root,
      shell: true,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    this.child = child;

    child.stdout?.on("data", (d: Buffer) => this.handleOutput(d.toString()));
    child.stderr?.on("data", (d: Buffer) => this.handleOutput(d.toString()));
    child.on("error", (err) => {
      this.errorCount += 1;
      this.log(String(err.message));
      this.setError(`Dev server failed to start: ${err.message}`);
    });
    child.on("close", (code) => {
      if (this.child !== child) return;
      this.child = null;
      const phase = code === 0 ? "Dev server exited (code 0)" : `Dev server exited (code ${String(code)})`;
      const errorDetail = code === 0 ? undefined : { message: phase, command: this.command ?? undefined, exitCode: code ?? undefined, timestamp: Date.now() };
      this.setState(code === 0 ? "stopped" : "error", phase, undefined, undefined, errorDetail);
    });
  }

  private handleOutput(chunk: string): void {
    const lines = chunk.split(/\r?\n/).filter((l) => l.length > 0);
    for (const line of lines) {
      const urlMatch = line.match(URL_RE);
      if (urlMatch && !this.url) {
        this.url = urlMatch[0].replace(/\/$/, "");
        this.setState("running", `Preview ready`);
        this.emit({ type: "log", line });
        continue;
      }
      if (READY_RE.test(line)) {
        if (this.errorCount > 0) {
          this.errorCount = 0;
          this.emit({ type: "status", status: this.status() });
        }
        if (this.state === "starting") this.setState("running", "Dev server ready");
      }
      if (ERROR_RE.test(line)) {
        this.errorCount += 1;
        this.emit({ type: "error", line });
        this.emit({ type: "status", status: this.status(undefined, undefined, { message: line, timestamp: Date.now() }) });
      } else {
        this.emit({ type: "log", line });
      }
    }
  }

  private setError(message: string): void {
    this.setState("error", message, undefined, undefined, { message, timestamp: Date.now() });
    this.emit({ type: "error", line: message });
  }

  private killChild(): void {
    const child = this.child;
    this.child = null;
    if (!child || child.killed) return;
    if (process.platform === "win32" && child.pid) {
      try {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      } catch {
        child.kill();
      }
    } else {
      child.kill();
    }
  }

  private startWatching(root: string): void {
    this.watcher?.close();
    try {
      this.watcher = watch(root, { recursive: true }, (event, filename) => {
        const name = filename?.toString() ?? "";
        if (!name || IGNORED_DIRS.test(name)) return;
        if (this.changeTimer) clearTimeout(this.changeTimer);
        this.changeTimer = setTimeout(() => {
          const time = Date.now();
          this.emit({ type: "changed", path: name, time });
          if (this.state === "running") {
            this.phase = "Changed detected — recompiling…";
            this.emit({ type: "status", status: this.status() });
          }
        }, 400);
      });
    } catch {
      this.watcher = null;
    }
  }

  private log(line: string): void {
    this.emit({ type: "log", line });
  }
}

export const devServer = new DevServerService();