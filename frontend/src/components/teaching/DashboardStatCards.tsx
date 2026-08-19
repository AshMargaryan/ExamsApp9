import { Clock, GraduationCap, Radio } from "lucide-react";
import type { DashboardStats } from "../../api/teaching";
import { StatTile } from "../ui/StatTile";

/*
  The teacher's metrics band.

  It used to be five tiles, of which two restated a section rendered on the
  same screen. "Ուշադրության կարիք ունեն" was a full-width hero tile whose own
  hint read "Տես ցանկը ներքևում" — and that list was 150px below it; and
  "Սպասում է հաստատման" counted the review queue further down the page. A
  number whose whole job is to label a list already on screen is a heading,
  not a statistic, so both counts moved onto their section headings.

  What is left are the three figures with no list on this page. That also
  fixed a presentation problem: on a real teacher account four of the five
  tiles read 0, and a band of zeros reads as broken rather than as calm.

  Tone still does the work of the old hero treatment — a non-zero overdue
  count is the one number here that changes what a teacher does next, so it
  is the only one that can turn red.
*/

export function DashboardStatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        tone={stats.overdue_count > 0 ? "incorrect" : "default"}
        icon={<Clock size={18} strokeWidth={1.75} />}
        label="Ուշացած առաջադրանք"
        value={String(stats.overdue_count)}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
