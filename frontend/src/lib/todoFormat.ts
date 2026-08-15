export function formatDueLabel(dueDate: string | null, dueTime: string | null): string | null {
  if (!dueDate) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today
    .getDate()
    .toString()
    .padStart(2, "0")}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, "0")}-${tomorrow
    .getDate()
    .toString()
    .padStart(2, "0")}`;

  let label: string;
  if (dueDate === todayStr) label = "Այսօր";
  else if (dueDate === tomorrowStr) label = "Վաղը";
  else label = new Date(`${dueDate}T00:00:00`).toLocaleDateString("hy-AM", { month: "short", day: "numeric" });

  if (dueTime) label += ` · ${dueTime.slice(0, 5)}`;
  return label;
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} ր`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ժ ${m} ր` : `${h} ժ`;
}
