import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Section } from "./Section";
import { Reveal } from "./Reveal";

function useConversationStage(active: boolean) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timers = [
      setTimeout(() => setStage(1), 200),
      setTimeout(() => setStage(2), 900),
      setTimeout(() => setStage(3), 1900),
      setTimeout(() => setStage(4), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return stage;
}

function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-[var(--radius)] rounded-tl-sm bg-surface-muted px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-text-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function TutorDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const stage = useConversationStage(visible);

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

  return (
    <div
      ref={ref}
      className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/10"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-base">🤖</span>
        <div>
          <p className="text-sm font-semibold text-text">AI Tutor</p>
          <p className="text-xs text-text-muted">Մաթեմատիկա</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p
          className={`ml-auto max-w-[85%] rounded-[var(--radius)] rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-contrast transition-all duration-500 ${
            stage >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          Եթե 2x + 5 = 17, ինչպե՞ս գտնեմ x-ը։
        </p>

        {stage === 2 && <TypingDots />}

        {stage >= 3 && (
          <div className="max-w-[90%] rounded-[var(--radius)] rounded-tl-sm bg-surface-muted px-4 py-2.5 text-sm text-text transition-all duration-500">
            <p>Եկ քայլ առ քայլ լուծենք։</p>
            <p className="mt-1.5">Նախ հանենք 5-ը երկու կողմերից՝</p>
            <p className="mt-1 font-mono text-text">2x = 12</p>
            <p className="mt-1.5">Հիմա բաժանենք 2-ի՝</p>
            <p className="mt-1 font-mono font-semibold text-primary">x = 6</p>
          </div>
        )}
      </div>

      <div
        className={`mt-4 border-t border-border pt-4 transition-opacity duration-500 ${
          stage >= 4 ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="mb-2 text-xs text-text-muted">Ուզու՞մ ես փորձել նմանատիպ մեկը։</p>
        <Link
          to="/register"
          className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary"
        >
          Պարապել նմանատիպ հարց →
        </Link>
      </div>
    </div>
  );
}

export function AiTutorSection() {
  return (
    <Section id="ai-tutor" className="bg-surface-muted/40">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="mb-3 text-sm font-semibold tracking-wide text-primary uppercase">AI Tutor</p>
          <h2 className="text-balance text-3xl font-semibold text-text sm:text-4xl">
            Ստացիր ոչ միայն պատասխանը։
            <br />
            Հասկացիր այն։
          </h2>
          <p className="mt-4 max-w-md text-lg text-text-muted">
            Gitus-ի AI Tutor-ը չի տալիս պատրաստի պատասխան։ Այն բացատրում է լուծման ամեն քայլը՝ ինչպես
            ուսուցիչը, մինչև իրականում հասկանաս թեման։
          </p>
          <ul className="mt-6 flex flex-col gap-2.5 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Քայլ առ քայլ բացատրություններ, ոչ միայն վերջնական պատասխան
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Հասկանում է քո հարցի ենթատեքստը և առարկան
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Առաջարկում է նմանատիպ վարժություն ամրապնդելու համար
            </li>
          </ul>
        </Reveal>

        <div className="flex justify-center">
          <TutorDemo />
        </div>
      </div>
    </Section>
  );
}
