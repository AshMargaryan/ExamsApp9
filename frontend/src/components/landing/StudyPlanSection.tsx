import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

interface DemoTask {
  icon: string;
  subject: string;
  topic: string;
  minutes: number;
  done?: boolean;
}

const TASKS: DemoTask[] = [
  { icon: "∑", subject: "Մաթեմատիկա", topic: "Քառակուսի հավասարումներ", minutes: 20 },
  { icon: "⚗", subject: "Քիմիա", topic: "Քիմիական կապեր", minutes: 15, done: true },
  { icon: "⚛", subject: "Ֆիզիկա", topic: "Կինեմատիկա", minutes: 25 },
];

function TaskRowDemo({ task }: { task: DemoTask }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-[var(--radius)] border p-4 ${
        task.done ? "border-correct/40 bg-correct-bg/40" : "border-border bg-surface"
      }`}
    >
      <span className="flex-none text-xl" aria-hidden>
        {task.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{task.topic}</p>
        <p className="text-xs text-text-muted">
          {task.subject} · ~{task.minutes} րոպե
        </p>
      </div>
      <span className={`flex-none text-sm font-semibold ${task.done ? "text-correct" : "text-primary"}`}>
        {task.done ? "✓ Կատարված" : "Սկսել →"}
      </span>
    </div>
  );
}

export function StudyPlanSection() {
  return (
    <Section id="study-plan">
      <SectionHeading
        kicker="Ուսումնական պլան"
        title="Դադարիր մտածելուց՝ ինչ սովորել հաջորդը։"
        subtitle="Gitus-ը ամեն օր ասում է, թե կոնկրետ ինչ ես պետք է սովորես՝ հիմնվելով քո առաջընթացի ու թույլ կողմերի վրա։"
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <Reveal>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-text">🗓️ Այսօրվա ուսումնական պլան</p>
              <span className="text-xs text-text-muted">78%</span>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full w-[78%] rounded-full bg-correct" />
            </div>
            <div className="flex flex-col gap-3">
              {TASKS.map((task) => (
                <TaskRowDemo key={task.topic} task={task} />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="flex h-full flex-col justify-center rounded-[var(--radius)] border border-border bg-surface p-6">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted">🤖</span>
              Քո AI մարզիչը
            </p>
            <p className="text-sm leading-relaxed text-text-muted">
              Այս շաբաթ մաթեմատիկայում բարելավում ես ունեցել <span className="font-semibold text-correct">+12%</span>։
              Ամենաթույլ թեման՝ <span className="font-medium text-text">քառակուսի հավասարումներ</span>։ Խորհուրդ եմ տալիս
              այսօր պարապել 10 միջին բարդության հարց այդ թեմայից։
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              Սկսել առաջարկվածը →
            </button>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
