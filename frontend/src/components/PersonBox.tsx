import type { FriendUser } from "../api/friends";

export function PersonBox({ person, onClick }: { person: FriendUser; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-[var(--radius-xl)] border border-border bg-surface p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
    >
      <span
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface-muted p-0.5 text-lg font-semibold text-text-muted transition-transform group-hover:scale-105"
        style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
      >
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface">
          {person.avatar ? (
            <img src={person.avatar} alt={person.username} className="h-full w-full object-cover" />
          ) : (
            (person.first_name || person.username).slice(0, 1).toUpperCase()
          )}
        </span>
      </span>
      <span className="text-sm font-medium text-text">
        {[person.first_name, person.last_name].filter(Boolean).join(" ") || person.username}
      </span>
      <span className="text-xs text-text-muted">@{person.username}</span>
    </button>
  );
}