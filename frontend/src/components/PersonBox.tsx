import type { FriendUser } from "../api/friends";

export function PersonBox({ person, onClick }: { person: FriendUser; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors hover:border-primary"
    >
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-lg font-semibold text-text-muted">
        {person.avatar ? (
          <img src={person.avatar} alt={person.username} className="h-full w-full object-cover" />
        ) : (
          (person.first_name || person.username).slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="text-sm font-medium text-text">
        {[person.first_name, person.last_name].filter(Boolean).join(" ") || person.username}
      </span>
      <span className="text-xs text-text-muted">@{person.username}</span>
    </button>
  );
}