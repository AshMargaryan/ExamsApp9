import type { MockExamAssignmentStatus } from "../../api/teaching";

const CONFIG: Record<MockExamAssignmentStatus, { color: string; label: string }> = {
  not_started: { color: "bg-incorrect", label: "Դեռ չի սկսել" },
  started: { color: "bg-correct", label: "Սկսել է թեստը" },
  drafted: { color: "bg-medium", label: "Պահել է սևագիր" },
  completed: { color: "bg-primary", label: "Ավարտել է թեստը" },
};

export function TestStatusIndicator({ status, className = "" }: { status: MockExamAssignmentStatus; className?: string }) {
  const { color, label } = CONFIG[status];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
