/**
 * A file size in Armenian units.
 *
 * Four copies of this existed — three identical `formatSize` functions in the
 * chat components and one inline `Math.round(bytes / 1024) ԿԲ` in the note
 * editor, which reported a 4 MB image as "4096 ԿԲ".
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Բ`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ԿԲ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ՄԲ`;
}
