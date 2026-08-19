import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, Github, Loader2, Rocket, Share2, Sparkles, X } from "lucide-react";
import { cn } from "@ride/ui";

interface ShareModalProps {
  workspacePath: string;
  projectName: string;
  liveUrl?: string | null;
  onClose: () => void;
  onDeploy?: () => void;
}

function useCopy(): { copied: string | null; copy: (id: string, text: string) => void } {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    });
  };
  return { copied, copy };
}

const pill = "flex h-8 items-center gap-1.5 rounded-sm px-3 text-[11px] font-medium transition-colors ride-focus-ring disabled:opacity-60";
const ghost = "border border-hairline bg-canvas text-body hover:bg-canvas-soft hover:text-ink";
const primary = "bg-primary text-on-primary hover:opacity-85";
const gradientText = "bg-gradient-to-r from-[#ff8020] via-[#ff2020] to-[#c02080] bg-clip-text text-transparent";

export function ShareModal({ workspacePath, projectName, liveUrl, onClose, onDeploy }: ShareModalProps) {
  const { copied, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipDone, setZipDone] = useState<string | null>(null);
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "my-project");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [ghBusy, setGhBusy] = useState(false);
  const [ghResult, setGhResult] = useState<{ ok: boolean; message?: string; repoUrl?: string | null; needsAuth?: boolean; commands?: string[] } | null>(null);
  const [badge, setBadge] = useState<string>("");

  useEffect(() => {
    if (!liveUrl) {
      setQr(null);
      return;
    }
    void QRCode.toDataURL(liveUrl, { width: 176, margin: 1, color: { dark: "#17161e", light: "#ffffff" } }).then(setQr);
  }, [liveUrl]);

  const shareLine = `I built ${projectName} with RIDE.${liveUrl ? `\n\n${liveUrl}` : ""}`;

  const downloadZip = async () => {
    setZipBusy(true);
    try {
      const r = await window.ride.share.downloadZip(workspacePath);
      setZipDone(r.ok && r.path ? r.path : (r.error && r.error !== "canceled" ? r.error : null));
    } finally {
      setZipBusy(false);
    }
  };

  const exportToGitHub = async () => {
    setGhBusy(true);
    setGhResult(null);
    try {
      setGhResult(await window.ride.share.exportToGitHub({ workspacePath, repoName, visibility }));
    } finally {
      setGhBusy(false);
    }
  };

  useEffect(() => {
    void window.ride.share.badgeHtml("https://ride.app").then(setBadge).catch(() => setBadge(""));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline bg-canvas-soft px-4">
          <Share2 className="h-4 w-4 text-link" />
          <span className="text-sm font-medium text-ink">Share {projectName}</span>
          <button onClick={onClose} className="ml-auto rounded-sm p-1.5 text-mute transition-colors hover:bg-canvas-soft-2 hover:text-ink ride-focus-ring">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
          {/* Live link + QR */}
          <section>
            <div className="text-[11px] font-medium text-mute uppercase">Live URL</div>
            {liveUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex h-8 items-center gap-1 overflow-hidden rounded-sm border border-hairline bg-canvas-soft px-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{liveUrl}</span>
                    <button
                      onClick={() => copy("url", liveUrl)}
                      className={cn("rounded-sm p-1 text-mute transition-colors hover:text-ink ride-focus-ring")}
                      title="Copy URL"
                    >
                      {copied === "url" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => void window.ride.app.openExternal(liveUrl)}
                      className="rounded-sm p-1 text-mute transition-colors hover:text-ink ride-focus-ring"
                      title="Open in browser"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-mute">Anyone with this link can open the deployed site.</p>
                </div>
                {qr && (
                  <div className="shrink-0 overflow-hidden rounded-md border border-hairline bg-white p-1.5">
                    <img src={qr} alt="QR code for live URL" className="h-[136px] w-[136px]" />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 rounded-sm border border-hairline bg-canvas-soft px-3 py-2.5">
                <p className="text-[11px] leading-4 text-mute">
                  This project isn’t deployed yet. Deploy it to get a live URL, a QR code, and a shareable link.
                </p>
                {onDeploy && (
                  <button onClick={onDeploy} className={cn(pill, primary, "w-fit")}>
                    <Rocket className="h-3.5 w-3.5" /> Deploy to get a share link
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Share line */}
          <section>
            <div className="text-[11px] font-medium text-mute uppercase">Share it</div>
            <div className="mt-2 flex items-center gap-2 rounded-sm border border-hairline bg-canvas-soft px-2.5 py-2">
              <p className="min-w-0 flex-1 text-[11px] leading-4 text-body">
                “I built <span className="text-ink">{projectName}</span> with RIDE{liveUrl ? " — live here" : ""}.”
              </p>
              <button
                onClick={() => copy("share", shareLine)}
                className={cn(pill, ghost, "shrink-0")}
                title="Copy share text"
              >
                {copied === "share" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "share" ? "Copied" : "Copy"}
              </button>
            </div>
          </section>

          {/* Download + GitHub */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => void downloadZip()} disabled={zipBusy} className={cn(pill, ghost, "flex-1 justify-center")}>
                {zipBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {zipBusy ? "Zipping…" : "Download ZIP"}
              </button>
              <button onClick={() => void exportToGitHub()} disabled={ghBusy} className={cn(pill, primary, "flex-1 justify-center")}>
                {ghBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
                {ghBusy ? "Pushing…" : "Export to GitHub"}
              </button>
            </div>
            {zipDone && (
              <div className="flex items-center gap-2 rounded-sm border border-success/20 bg-success/10 px-2.5 py-1.5 text-[10.5px] text-success">
                <Check className="h-3 w-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{zipDone}</span>
                <button
                  onClick={() => void window.ride.app.showItemInFolder(zipDone!)}
                  className="shrink-0 underline-offset-2 hover:underline"
                >
                  Show in folder
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="h-8 min-w-0 flex-1 rounded-sm border border-hairline bg-canvas px-2 text-[11px] text-ink outline-none placeholder:text-mute ride-focus-ring"
                placeholder="my-project"
              />
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                className="h-8 rounded-sm border border-hairline bg-canvas px-2 text-[11px] text-body outline-none ride-focus-ring"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            {ghResult && (
              <div
                className={cn(
                  "flex flex-col gap-1.5 rounded-sm border px-2.5 py-2 text-[10.5px] leading-4",
                  ghResult.ok ? "border-success/20 bg-success/10 text-success" : ghResult.needsAuth ? "border-amber/30 bg-amber/10 text-body" : "border-error/20 bg-error/10 text-error",
                )}
              >
                {ghResult.ok && ghResult.repoUrl ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{ghResult.repoUrl}</span>
                    <button
                      onClick={() => void window.ride.app.openExternal(ghResult.repoUrl!)}
                      className="shrink-0 underline-offset-2 hover:underline"
                    >
                      Open
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{ghResult.message ?? "Export failed."}</span>
                    {ghResult.commands && ghResult.commands.length > 0 && (
                      <button
                        onClick={() => copy("gh", ghResult.commands!.join("\n"))}
                        className="w-fit underline-offset-2 hover:underline"
                      >
                        {copied === "gh" ? "Commands copied ✓" : "Copy commands"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Badge */}
          <section>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-mute uppercase">
                Built with <span className={gradientText}>RIDE</span> badge
              </div>
              <button
                onClick={() => copy("badge", badge)}
                disabled={!badge}
                className={cn(pill, ghost, "h-6 px-2 text-[10px]")}
                title="Copy badge HTML"
              >
                {copied === "badge" ? <Check className="h-3 w-3 text-success" /> : <Sparkles className="h-3 w-3 text-violet" />}
                {copied === "badge" ? "Copied" : "Copy HTML"}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-sm border border-hairline bg-[#131218] px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#eae8f6]">
                Built with <span className={cn("bg-gradient-to-r from-[#ff8020] via-[#ff2020] to-[#c02080] bg-clip-text text-transparent")}>RIDE</span>
              </span>
              <span className="shrink-0 text-[9.5px] text-mute">injected on deploy · links to ride.app</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}