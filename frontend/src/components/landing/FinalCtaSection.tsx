import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

export function FinalCtaSection() {
  return (
    <section className="border-t border-border">
      <Reveal className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <h2 className="text-balance text-3xl font-semibold text-text sm:text-4xl">
          Քո հաջորդ մակարդակը սկսվում է այսօր։
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-text-muted">
          Պետք չէ ամեն ինչ իմանալ։ Պետք է պարզապես սկսել։
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="bg-primary w-full rounded-lg px-6 py-3.5 text-center text-base font-semibold text-primary-contrast shadow-lg shadow-violet-600/20 transition-colors hover:bg-primary-hover sm:w-auto"
          >
            🚀 Սկսել սովորել
          </Link>
          <Link
            to="/register"
            className="w-full rounded-lg border border-border bg-surface px-6 py-3.5 text-center text-base font-semibold text-text transition-colors hover:border-primary sm:w-auto"
          >
            🤖 Փորձել AI Tutor-ը
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
