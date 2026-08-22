import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import katex from "katex";
import { useState } from "react";

function MathNodeView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const latex: string = node.attrs.latex ?? "";
  const [editing, setEditing] = useState(!latex);
  const [draft, setDraft] = useState(latex);

  function commit() {
    updateAttributes({ latex: draft });
    setEditing(false);
  }

  if (editing) {
    return (
      <NodeViewWrapper
        as="span"
        className="inline-flex items-center rounded border border-primary/60 bg-surface-muted px-1 align-middle"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft(latex);
              setEditing(false);
            }
          }}
          onBlur={commit}
          placeholder="\text{LaTeX}"
          className="min-w-[4ch] bg-transparent font-mono text-sm text-text outline-none"
          style={{ width: `${Math.max(draft.length, 6)}ch` }}
        />
      </NodeViewWrapper>
    );
  }

  // null means "KaTeX could not render this" — in which case the raw LaTeX is
  // rendered as TEXT below, never fed back through dangerouslySetInnerHTML.
  // `latex` is whatever the user typed into their note, so treating the error
  // path as HTML would turn any KaTeX failure into an HTML injection point.
  // KaTeX's own output is safe to inject: trust defaults to false, so
  // \href/\url cannot emit javascript: URLs.
  let html: string | null = null;
  try {
    html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    html = null;
  }

  const wrapperClassName = `inline-block cursor-text rounded px-0.5 align-middle hover:bg-surface-muted ${
    selected ? "ring-2 ring-primary" : ""
  }`;
  const startEditing = () => {
    setDraft(latex);
    setEditing(true);
  };

  if (html === null) {
    return (
      <NodeViewWrapper as="span" className={wrapperClassName} onClick={startEditing}>
        {latex}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      className={wrapperClassName}
      onClick={startEditing}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return { latex: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-math-inline": "", "data-latex": node.attrs.latex })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});
