import * as React from "react";
import { Check, Copy, FileCheck2, FilePlus2, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "../lib/cn";

export type AgentFileStatus = "idle" | "creating" | "created" | "error";

export interface CodeBlockInfo {
  filename: string | null;
  lang: string;
  code: string;
}

/** Pull every fenced code block out of a message. A fence language that looks like a path (src/App.tsx, package.json) is treated as the suggested filename. */
export function extractCodeBlocks(text: string): CodeBlockInfo[] {
  const out: CodeBlockInfo[] = [];
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const label = (m[1] ?? "").trim();
    const code = (m[2] ?? "").replace(/\n$/, "");
    const looksLikePath = /[\\/]/.test(label) || /^[A-Za-z0-9_.-]+\.[A-Za-z0-9]{1,6}$/.test(label);
    out.push({ filename: looksLikePath ? label.replace(/^\.\//, "") : null, lang: label, code });
  }
  return out;
}

// ─── Inline markdown ─────────────────────────────────────────────────────────

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(INLINE);
  const out: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push(
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-ink">
          {renderInline(part.slice(2, -2), `${keyPrefix}-${i}-b`)}
        </strong>,
      );
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      out.push(
        <em key={`${keyPrefix}-${i}`} className="italic">
          {part.slice(1, -1)}
        </em>,
      );
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      out.push(
        <code key={`${keyPrefix}-${i}`} className="rounded-sm bg-canvas-soft-2 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("[") && part.includes("](")) {
      const close = part.indexOf("](");
      const label = part.slice(1, close);
      const href = part.slice(close + 2, -1);
      out.push(
        <a key={`${keyPrefix}-${i}`} href={href} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2 hover:opacity-80">
          {label}
        </a>,
      );
    } else {
      out.push(<span key={`${keyPrefix}-${i}`}>{part}</span>);
    }
  });
  return out;
}

// ─── Code block with filename + actions ──────────────────────────────────────

export interface MarkdownProps {
  text: string;
  className?: string;
  /** Called for code blocks that carry a suggested filename. */
  onCreateFile?: (filename: string, code: string) => void;
  fileStatus?: (filename: string) => AgentFileStatus;
}

export function Markdown({ text, className, onCreateFile, fileStatus }: MarkdownProps) {
  const tokens = React.useMemo(() => parseBlocks(text, onCreateFile, fileStatus), [text, onCreateFile, fileStatus]);
  return <div className={cn("text-sm leading-6", className)}>{tokens}</div>;
}

function parseBlocks(
  text: string,
  onCreateFile?: (filename: string, code: string) => void,
  fileStatus?: (filename: string) => AgentFileStatus,
): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(
        <p key={`p${key++}`}>
          {renderInline(paragraph.join("\n"), `p${key}`)}
        </p>,
      );
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("```")) {
      flushParagraph();
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        code.push(lines[i]!);
        i += 1;
      }
      i += 1; // skip closing fence
      out.push(<CodeBlock key={`c${key++}`} lang={lang} code={code.join("\n")} onCreateFile={onCreateFile} fileStatus={fileStatus} />);
    } else if (/^#{1,6}\s+/.test(line)) {
      flushParagraph();
      const level = line.match(/^#{1,6}/)![0].length;
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"][level - 1] ?? "h3") as "h3";
      out.push(
        <Tag key={`h${key++}`} className={cn("mt-3 mb-1 font-semibold text-ink", level === 1 && "text-base", level === 2 && "text-[15px]", level >= 3 && "text-sm")}>
          {renderInline(line.replace(/^#{1,6}\s+/, ""), `h${key}`)}
        </Tag>,
      );
    } else if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]!) || /^\s*\d+[.)]\s+/.test(lines[i]!))) {
        items.push(lines[i]!.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={`l${key++}`} className={cn("my-2 space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item, `l${key}-${n}`)}</li>
          ))}
        </Tag>,
      );
    } else if (/^> /.test(line)) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && /^> /.test(lines[i]!)) {
        quote.push(lines[i]!.slice(2));
        i += 1;
      }
      out.push(
        <blockquote key={`q${key++}`} className="my-2 border-l-2 border-hairline-strong pl-3 text-body italic">
          {renderInline(quote.join("\n"), `q${key}`)}
        </blockquote>,
      );
    } else if (line.trim() === "") {
      flushParagraph();
      i += 1;
    } else {
      paragraph.push(line);
      i += 1;
    }
  }
  flushParagraph();
  return out;
}

function CodeBlock({
  lang,
  code,
  onCreateFile,
  fileStatus,
}: {
  lang: string;
  code: string;
  onCreateFile?: (filename: string, code: string) => void;
  fileStatus?: (filename: string) => AgentFileStatus;
}) {
  const [copied, setCopied] = React.useState(false);
  const looksLikePath = /[\\/]/.test(lang) || /^[A-Za-z0-9_.-]+\.[A-Za-z0-9]{1,6}$/.test(lang);
  const filename = looksLikePath ? lang.replace(/^\.\//, "") : null;
  const status = filename && fileStatus ? fileStatus(filename) : "idle";

  const copy = () => {
    void navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-hairline bg-canvas-soft shadow-level-1">
      <div className="flex items-center gap-2 border-b border-hairline bg-canvas-soft-2/80 px-3 py-1.5">
        <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-mute" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-body">{(filename ?? lang) || "code"}</span>
        {filename && onCreateFile && (
          status === "created" ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-success">
              <FileCheck2 className="h-3.5 w-3.5" /> Created
            </span>
          ) : status === "creating" ? (
            <span className="flex items-center gap-1 text-[11px] text-body">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…
            </span>
          ) : status === "error" ? (
            <button
              onClick={() => onCreateFile(filename, code)}
              className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-error hover:bg-error/10 ride-focus-ring"
            >
              <TriangleAlert className="h-3.5 w-3.5" /> Retry
            </button>
          ) : (
            <button
              onClick={() => onCreateFile(filename, code)}
              className="flex items-center gap-1 rounded-sm bg-link/10 px-2 py-0.5 text-[11px] font-medium text-link transition-colors hover:bg-link/20 ride-focus-ring"
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Create file
            </button>
          )
        )}
        <button
          onClick={copy}
          title="Copy code"
          className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] text-mute transition-colors hover:bg-canvas-soft-2 hover:text-ink ride-focus-ring"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}