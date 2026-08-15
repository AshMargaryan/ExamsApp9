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

  let html = "";
  try {
    html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    html = latex;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`inline-block cursor-text rounded px-0.5 align-middle hover:bg-surface-muted ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => {
        setDraft(latex);
        setEditing(true);
      }}
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
