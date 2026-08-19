import { memo, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { API_ORIGIN } from "../../../api/client";

/*
  The markdown leaf of the assistant renderer.

  Deliberately NOT a fork of MarkdownMessage: that component is shared
  with SubtopicPage and HelpArticlePage, where its float-right image rule
  is correct. In a transcript it is not — a floated image pulls the
  following text around it while that text is still arriving, which is
  audit defect D10. This one renders images as blocks.

  memo() on `content` is the other reason it exists. During streaming the
  parent re-renders ~60×/sec with a monotonically growing string; without
  memoisation every one of those frames re-runs remark → mdast →
  rehype-katex and re-typesets every formula in the message from scratch,
  making the cost of a response O(length²). That is audit defect D4, and
  it is the dominant cost of the whole feature on a mid-range Android.
  memo does not fix it alone — the string genuinely changes each frame —
  but it stops *sibling* blocks in a multi-block answer from re-parsing
  when only the last one grew, which is the common case once directives
  are in play.
*/

function resolveImageSrc(src?: string) {
  if (!src) return src;
  return src.startsWith("/") ? `${API_ORIGIN}${src}` : src;
}

// react-markdown's default urlTransform strips "data:" URIs entirely (a
// blanket XSS guard). Diagrams are authored as inline data:image/svg+xml —
// safe for <img src>, which never executes scripts embedded in an SVG.
// Everything else still goes through the default allowlist.
function urlTransform(url: string, key: string, node: { tagName?: string }) {
  if (key === "src" && node.tagName === "img" && /^data:image\/(svg\+xml|png|jpeg|gif|webp)[,;]/i.test(url)) {
    return url;
  }
  return defaultUrlTransform(url);
}

function languageOf(className?: string): string | null {
  const match = /language-([\w+-]+)/.exec(className ?? "");
  return match ? match[1] : null;
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = languageOf(className);

  if (!language) {
    return <code className="asst-inline-code">{children}</code>;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is permission-gated and unavailable over plain http on
      // some browsers. Failing silently is right: the code is still
      // selectable, and an error toast for a convenience action is noise.
    }
  }

  return (
    <div className="asst-code">
      <span className="asst-code__lang" aria-hidden="true">
        {language}
      </span>
      <button type="button" onClick={handleCopy} className="asst-code__copy">
        {copied ? "Պատճենվեց" : "Պատճենել"}
      </button>
      <pre className="asst-code__pre">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export const AssistantMarkdown = memo(function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-chat asst-content break-words">
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
              loading="lazy"
              decoding="async"
              className="asst-figure"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
