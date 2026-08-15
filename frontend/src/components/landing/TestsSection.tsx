import { useEffect, useRef, useState } from "react";
import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const CHOICES = [
  { id: 1, text: "x = 4", correct: false },
  { id: 2, text: "x = 6", correct: true },
  { id: 3, text: "x = 8", correct: false },
  { id: 4, text: "x = 12", correct: false },
];

function useRevealOnView() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function QuestionDemo() {
  const { ref, visible } = useRevealOnView();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setSelected(4), 700);
    const t2 = setTimeout(() => setRevealed(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  return (
    <div ref={ref} className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-5 shadow-2xl shadow-black/10">
      <div className="mb-4 flex items-center justify-between text-xs text-text-muted">
        <span>Հարց 12/20</span>
        <span className="rounded-full px-2 py-0.5 font-semibold" style={{ color: "var(--color-medium)", backgroundColor: "color-mix(in srgb, var(--color-medium) 15%, transparent)" }}>
          Միջին
        </span>
        <span>⏱ 02:14</span>
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full w-[60%] rounded-full bg-primary" />
      </div>

      <p className="mt-4 mb-4 text-base font-medium text-text">Լուծիր՝ 2x + 5 = 17</p>

      <div className="flex flex-col gap-2">
        {CHOICES.map((choice) => {
          const isSelected = choice.id === selected;
          let classes = "border-border";
          if (revealed) {
            if (choice.correct) classes = "border-correct bg-correct-bg text-correct";
            else if (isSelected) classes = "border-incorrect bg-incorrect-bg text-incorrect";
          } else if (isSelected) {
            classes = "border-primary bg-primary text-primary-contrast";
          }
          return (
            <div key={choice.id} className={`rounded-md border px-4 py-2 text-sm transition-colors ${classes}`}>
              {choice.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TestsSection() {
  return (
    <Section id="tests">
      <SectionHeading
        kicker="Թեստեր"
        title="Պարապիր, ինչպես կլինի իրականում։"
        subtitle="Իրական քննության ձևաչափին մոտ հարցեր, ժամանակի սահմանափակում և բարդության մակարդակներ։"
      />

      <div className="mt-12 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex justify-center">
          <QuestionDemo />
        </div>

        <Reveal delay={100}>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
            <p className="mb-4 text-sm font-semibold text-text">✅ Թեստն ավարտված է</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-bg p-4 text-center">
                <p className="text-2xl font-semibold text-text">84%</p>
                <p className="mt-1 text-xs text-text-muted">Ճշգրտություն</p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4 text-center">
                <p className="text-2xl font-semibold text-text">42/50</p>
                <p className="mt-1 text-xs text-text-muted">Ճիշտ պատասխան</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-text-muted">Թույլ կողմեր</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-incorrect/40 bg-incorrect-bg px-3 py-1 text-xs text-incorrect">
                  Երկրաչափություն
                </span>
                <span className="rounded-full border border-incorrect/40 bg-incorrect-bg px-3 py-1 text-xs text-incorrect">
                  Ֆունկցիաներ
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-text-muted">
              Հաջորդ քայլ. <span className="font-medium text-text">պարապիր երկրաչափություն</span>։
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
