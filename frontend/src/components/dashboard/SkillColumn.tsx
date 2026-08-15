export function SkillColumn({
  title, color, items,
}: {
  title: string;
  color: string;
  items: { name: string; subject_name: string; avg_score: number }[];
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text">
        {color} {title} ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">Դեռ ոչինչ այս խմբում։</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.slice(0, 8).map((item) => (
            <li key={item.name} className="text-xs text-text-muted">
              <span className="text-text">{item.name}</span> · {item.subject_name} · {item.avg_score}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
