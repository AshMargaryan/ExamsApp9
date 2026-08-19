import { CircleAlert, Clock, GraduationCap, Inbox, Radio } from "lucide-react";
import type { DashboardStats } from "../../api/teaching";
import { StatTile } from "../ui/StatTile";

/*
  The teacher's metrics band.

  Deliberately not five identical boxes: "how many students need me right now"
  is the one number that changes what a teacher does next, so it gets the hero
  treatment and everything else reads as supporting detail.
*/

export function DashboardStatCards({
  stats,
  attentionCount,
}: {
  stats: DashboardStats;
  /** null while the needs-attention request is still in flight. */
  attentionCount: number | null;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StatTile
        size="hero"
        align="start"
        tone={attentionCount ? "incorrect" : "correct"}
        icon={<CircleAlert size={22} strokeWidth={1.75} />}
        label="Ուշադրության կարիք ունեն"
        value={attentionCount === null ? "—" : String(attentionCount)}
        hint={
          attentionCount === null
            ? "Հաշվարկվում է..."
            : attentionCount === 0
              ? "Բոլորը լավ առաջընթաց ունեն"
              : "Տես ցանկը ներքևում"
        }
        className="justify-center"
      />

      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatTile
          size="sm"
          align="start"
          icon={<GraduationCap size={18} strokeWidth={1.75} />}
          label="Աշակերտներ"
          value={String(stats.student_count)}
        />
        <StatTile
          size="sm"
          align="start"
          tone={stats.online_now_count > 0 ? "correct" : "default"}
          icon={<Radio size={18} strokeWidth={1.75} />}
          label="Հիմա սովորում են"
          value={String(stats.online_now_count)}
        />
        <StatTile
          size="sm"
          align="start"
          tone={stats.pending_review_count > 0 ? "primary" : "default"}
          icon={<Inbox size={18} strokeWidth={1.75} />}
          label="Սպասում է հաստատման"
          value={String(stats.pending_review_count)}
        />
        <StatTile
          size="sm"
          align="start"
          tone={stats.overdue_count > 0 ? "incorrect" : "default"}
          icon={<Clock size={18} strokeWidth={1.75} />}
          label="Ուշացած առաջադրանք"
          value={String(stats.overdue_count)}
        />
      </div>
    </div>
  );
}
