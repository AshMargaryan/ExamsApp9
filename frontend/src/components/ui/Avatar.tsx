import { useState } from "react";
import { cn } from "../../lib/cn";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  src?: string | null;
  /** Used both for the initials fallback and the image's alt text. */
  name: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-11 w-11 text-lg",
  lg: "h-16 w-16 text-2xl",
};

/** Generalizes the circular-initials-fallback pattern duplicated inline across HomePage,
 * ProfileHero, chat, and notifications — one place to fix broken-image handling. */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name || "?").trim().slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        SIZE_CLASSES[size],
        className,
      )}
      style={{ background: "var(--gradient-hero)" }}
    >
      {src && !imgFailed ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
      ) : (
        initial
      )}
    </div>
  );
}
