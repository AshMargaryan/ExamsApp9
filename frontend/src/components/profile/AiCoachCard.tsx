import { useState } from "react";
import type { Coach } from "../../api/profile";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

export function AiCoachCard({ coach }: { coach: Coach }) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (!coach.available) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-text">🤖 Gitus-ը ճանաչում է ձեզ</p>
        <EmptyState icon="🤖" title="Gitus-ը դեռ ուսումնասիրում է ձեզ" hint={coach.reason} />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-3 text-sm font-semibold text-text">🤖 Gitus-ը ճանաչում է ձեզ</p>
      <div className="flex flex-col gap-2 text-sm text-text">
        {coach.situation && <p>{coach.situation}</p>}
        <p>{coach.weakness}</p>
        <p>{coach.opportunity}</p>
        <p className="font-medium">{coach.recommendation}</p>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setShowEvidence((v) => !v)} className="mt-3">
        {showEvidence ? "Թաքցնել հիմնավորումը" : "Ինչու՞ եմ սա տեսնում"}
      </Button>

      {showEvidence && (
        <div className="mt-2 rounded-md border border-border bg-bg p-3 text-xs text-text-muted">
          <p>Թեմա՝ «{coach.evidence.topic}»</p>
          <p>Սխալ պատասխաններ՝ {coach.evidence.incorrect_count}</p>
          <p>Ընդհանուր սխալների մասնաբաժինը՝ {coach.evidence.mistake_share_percent}%</p>
          {coach.evidence.accuracy_delta !== null && (
            <p>Ճշգրտության փոփոխություն նախորդ ամսվա նկատմամբ՝ {coach.evidence.accuracy_delta > 0 ? "+" : ""}{coach.evidence.accuracy_delta}%</p>
          )}
        </div>
      )}
    </div>
  );
}
