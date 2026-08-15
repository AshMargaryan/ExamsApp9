const SIZES = {
  sm: { box: "h-7 w-7", text: "text-xs" },
  md: { box: "h-9 w-9", text: "text-sm" },
  lg: { box: "h-16 w-16", text: "text-xl" },
};

export function Avatar({
  avatar,
  username,
  size = "md",
  ringColor,
}: {
  avatar: string | null;
  username: string;
  size?: keyof typeof SIZES;
  ringColor?: string;
}) {
  const { box, text } = SIZES[size];
  const ring = ringColor ? { boxShadow: `0 0 0 2px var(--color-surface), 0 0 0 3.5px ${ringColor}` } : undefined;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className={`${box} shrink-0 rounded-full object-cover`}
        style={ring}
      />
    );
  }

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-surface-muted font-semibold text-text-muted ${text}`}
      style={ring}
    >
      {username.slice(0, 1).toUpperCase()}
    </div>
  );
}
