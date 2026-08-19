import { memo, useMemo } from "react";
import { parseAssistantContent } from "../../../lib/assistantContent";
import type { ParsedContent } from "../../../lib/assistantContent";
import { AssistantBlockView } from "./blocks";

/*
  The assistant's content renderer.

  A strict superset of the old MarkdownMessage: a message with no
  directives in it — which is every message stored before this dialect
  existed, and every message produced after a prompt rollback — parses to
  a single markdown block and renders exactly as it did before. The
  dialect is optional, never expected.

  What this component deliberately does NOT render is the `:::next`
  action row. Where that row goes is a surface decision — under the last
  answer on the full page, possibly nowhere in the 320px floating widget,
  a different control entirely on native — and Slice 2 owns it. Read it
  with useAssistantContent() where you need it. What is fixed here is the
  rule that the row exists only when the model asked for it, and that
  there is no default set to fall back to.
*/

export interface AssistantContentProps {
  content: string;
  /**
   * True while this message is still streaming. Enables held-back
   * partial directive markers and trailing-incomplete-math suppression.
   * Must be false for stored messages, where an unmatched `$` is the
   * student's own text and has to render literally.
   */
  streaming?: boolean;
  className?: string;
}

export const AssistantContent = memo(function AssistantContent({
  content,
  streaming = false,
  className,
}: AssistantContentProps) {
  const parsed = useAssistantContent(content, streaming);

  return (
    <div className={className}>
      {parsed.blocks.map((block, index) => (
        // Index is the correct key here, unusually: the block list is
        // append-only during streaming and fully rebuilt on any other
        // change, so position IS identity. Keying on content would
        // remount every block on every frame and defeat the memo below.
        <AssistantBlockView key={index} block={block} />
      ))}
    </div>
  );
});

/**
 * Parse without rendering — for a surface that needs the contextual
 * action row, or the block count, before it decides on a layout.
 * Returns `next: null` when the model asked for no actions, which is
 * different from an empty array and must not be treated as "use the
 * defaults".
 */
export function useAssistantContent(content: string, streaming = false): ParsedContent {
  return useMemo(() => parseAssistantContent(content, { streaming }), [content, streaming]);
}
