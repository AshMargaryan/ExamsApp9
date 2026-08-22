import { Link } from "react-router-dom";
import type { CoachToday } from "../../api/studyPlan";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { formatMinutes } from "./planFormat";

/*
  Finishing the day should land, not pop.

  Restrained on purpose: a summary of what actually happened, one warm line
  about tomorrow, and a way out. No confetti cannon — this screen appears every
  single day the student succeeds, and a celebration that fires daily stops
  being a celebration by the end of the first week.
*/

export function DayCompleteDialog({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: CoachToday;
}) {
  const stats = [
    { label: "ժամանակ", value: formatMinutes(today.minutes_done) },
    { label: "հարց", value: String(today.questions) },
    { label: "ճիշտ", value: String(today.correct) },
    { label: "ճշտություն", value: `${today.accuracy}%` },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Այսօրվա պլանը ավարտված է"
      footer={
        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Փակել
          </Button>
          <Link
            to="/profile"
            className="w-full rounded-[var(--radius)] py-2 text-center text-sm font-medium text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Դիտել առաջընթացը
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[var(--radius)] bg-surface-muted px-3.5 py-3 text-center">
            <p className="text-xl font-semibold tabular-nums text-text">{s.value}</p>
            <p className="mt-0.5 text-xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">
        Հիանալի աշխատանք էր։ Վաղը կշարունակենք հենց այնտեղից, որտեղ կանգ առար։
      </p>
    </Modal>
  );
}
