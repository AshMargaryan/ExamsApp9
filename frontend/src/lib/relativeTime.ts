export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "հենց նոր";
  if (minutes < 60) return `${minutes} րոպե առաջ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ժամ առաջ`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} օր առաջ`;
  const months = Math.floor(days / 30);
  return `${months} ամիս առաջ`;
}
