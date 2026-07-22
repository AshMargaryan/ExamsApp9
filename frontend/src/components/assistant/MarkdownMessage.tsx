import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const isBlock = /language-/.test(className ?? "");

  if (!isBlock) {
    return (
      <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    );
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative my-2 overflow-hidden rounded-[var(--radius)] border border-border">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 rounded bg-surface/80 px-2 py-0.5 text-xs text-text-muted hover:text-text"
      >
        {copied ? "Պատճենվեց" : "Պատճենել"}
      </button>
      <pre className="overflow-x-auto bg-surface-muted p-3 font-mono text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose-chat text-[15px] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: CodeBlock,
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
