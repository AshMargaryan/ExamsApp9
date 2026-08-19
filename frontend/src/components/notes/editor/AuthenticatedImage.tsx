import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useAuthenticatedImageUrl } from "../../../hooks/useAuthenticatedImageUrl";

function ImageNodeView({ node }: ReactNodeViewProps) {
  const { src, error } = useAuthenticatedImageUrl(node.attrs.src ?? null);

  return (
    <NodeViewWrapper as="span" className="inline-block">
      {error ? (
        <span className="text-sm text-text-muted">Նկարը հասանելի չէ</span>
      ) : src ? (
        <img
          src={src}
          alt={node.attrs.alt ?? ""}
          loading="lazy"
          decoding="async"
          className="max-w-full rounded-[var(--radius)]"
        />
      ) : (
        <span className="inline-block h-24 w-24 animate-pulse rounded bg-surface-muted" />
      )}
    </NodeViewWrapper>
  );
}

/** The stored `src` is our auth-gated download endpoint, not a browser-loadable
 * URL — a plain <img> can't send the Authorization header. This node view
 * fetches the bytes through apiClient instead, same as chat's attachment
 * images (see useAuthenticatedImageUrl). */
export const AuthenticatedImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
