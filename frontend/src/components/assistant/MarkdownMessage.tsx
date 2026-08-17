import { useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { API_ORIGIN } from "../../api/client";

function resolveImageSrc(src?: string) {
  if (!src) return src;
  return src.startsWith("/") ? `${API_ORIGIN}${src}` : src;
}

// react-markdown's default urlTransform strips "data:" URIs entirely (a
// blanket XSS guard). We author diagrams as inline data:image/svg+xml — safe
// here because an <img src> never executes scripts embedded in an SVG (only
// <object>/<iframe>/inline-<svg> would), unlike a raw href. Everything else
// (links, non-image src) still goes through the default allowlist.
function urlTransform(url: string, key: string, node: { tagName?: string }) {
  if (key === "src" && node.tagName === "img" && /^data:image\/(svg\+xml|png|jpeg|gif|webp)[,;]/i.test(url)) {
    return url;
  }
  return defaultUrlTransform(url);
}

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

export function MarkdownMessage({
  content,
  className = "text-[15px] leading-relaxed",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`prose-chat break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={urlTransform}
        components={{
          code: CodeBlock,
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
          img: ({ alt, ...props }) => (
            <img
              {...props}
              src={resolveImageSrc(props.src)}
              alt={alt ?? ""}
              className="float-right ml-5 mb-4 w-full max-w-[560px] rounded-[var(--radius)] border border-border shadow-sm md:w-[55%] lg:max-w-[680px]"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
