import type { RankHistoryPoint } from "../../api/rankings";

const HEIGHT = 100;
const WIDTH = 300;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("hy-AM", { day: "numeric", month: "short" });
}

export function RankProgressChart({ points }: { points: RankHistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="p-4 text-center text-sm text-text-muted">
        Առաջընթացի գրաֆիկը կհայտնվի մի քանի օր դասակարգումն այցելելուց հետո։
      </p>
    );
  }

  const ranks = points.map((p) => p.rank);
  const maxRank = Math.max(...ranks);
  const minRank = Math.min(...ranks);
  const span = Math.max(1, maxRank - minRank);

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * WIDTH,
    // Lower (better) rank draws near the top of the chart.
    y: ((p.rank - minRank) / span) * (HEIGHT - 24) + 12,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const lastCoord = coords[coords.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
        <line x1={0} y1={HEIGHT - 1} x2={WIDTH} y2={HEIGHT - 1} stroke="var(--color-border)" strokeWidth={1} />
        <path d={areaPath} fill="var(--color-primary)" opacity={0.1} />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
        {coords.slice(0, -1).map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2} fill="var(--color-primary)" opacity={0.5} />
        ))}
        <circle cx={lastCoord.x} cy={lastCoord.y} r={4} fill="var(--color-primary)" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-xs tabular-nums text-text-muted">
        <span>
          {formatDate(first.date)} · #{first.rank}
        </span>
        <span className="font-bold text-text">
          {formatDate(last.date)} · #{last.rank}
        </span>
      </div>
    </div>
  );
}
