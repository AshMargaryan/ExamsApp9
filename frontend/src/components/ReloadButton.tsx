export function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      aria-label="Թարմացնել էջը"
      title="Թարմացնել էջը"
      className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-lg transition-colors hover:border-primary"
    >
      🔄
    </button>
  );
}
