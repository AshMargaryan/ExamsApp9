import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 7b — who built this. RESERVED, DELIBERATELY EMPTY.

  ── Read this before adding anything ──────────────────────────────────────

  The real content — photographs of the two people who built Gitus and their
  own biographical copy — is being supplied separately. Until it arrives this
  section renders NOTHING: `FOUNDERS` is empty and the component returns null.

  That is the whole design. It is not an oversight and it is not waiting for
  a placeholder.

  Everything else on this page earns its place by being checkable: real exam
  counts, real conversation modes, a real error taxonomy, and an explicit note
  wherever a number is invented for a demo. A block of stock faces and
  plausible-sounding biography would be the one piece of fabricated
  information on it, and it would sit directly beneath the section that just
  told the reader what the product cannot do. That trade is not worth making
  for any amount of visual completeness.

  It also matters more here than it would elsewhere. "Two brothers built this"
  is, for an Armenian student choosing between this and a foreign platform,
  probably the single most persuasive fact the page can carry — which is
  exactly why it has to be true, and theirs.

  ── To fill it in ─────────────────────────────────────────────────────────

  1. Put the images in `frontend/public/landing/founders/` as .webp, square,
     no wider than 640px. `public/landing/subjects/` is the reference: eight
     portraits, 172KB total.
  2. Add one entry per person to `FOUNDERS` below.
  3. Nothing else. The layout, the empty guard and the page slot are done, and
     `LandingPage.tsx` already renders this between TrustSection and
     FaqSection.

  Write `bio` as one or two sentences in the student register («դու»), the
  same voice as the rest of the page — see docs/DESIGN.md §4.
*/

type Founder = {
  name: string;
  role: string;
  bio: string;
  /** Path under /landing/founders/, e.g. "/landing/founders/name.webp". */
  photo: string;
};

/** Empty on purpose. See the header above. */
const FOUNDERS: Founder[] = [];

export function FoundersSection() {
  if (FOUNDERS.length === 0) return null;

  return (
    <Section id="founders">
      <SectionHeading kicker="Ովքեր ենք մենք" title="Gitus-ը կառուցում են երկու հոգի։" />

      <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
        {FOUNDERS.map((founder, i) => (
          <Reveal key={founder.name} delay={i * 80}>
            <div className="flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6">
              <img
                src={founder.photo}
                alt=""
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                className="h-24 w-24 rounded-[var(--radius-full)] object-cover"
              />
              <p className="mt-5 text-[length:var(--text-lg)] font-semibold text-text">
                {founder.name}
              </p>
              <p className="mt-1 text-[length:var(--text-sm)] text-text-muted">{founder.role}</p>
              <p className="mt-4 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
                {founder.bio}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
