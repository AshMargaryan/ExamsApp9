import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import {
  SectionNav,
  SectionNavBar,
  scrollToSection,
  useScrollSpy,
  type SectionNavItem,
} from "../components/ui/SectionNav";
import { AppearanceSection } from "../components/settings/AppearanceSection";
import { SecuritySection } from "../components/settings/SecuritySection";
import { PrivacySection } from "../components/settings/PrivacySection";

/*
  What "Settings" was
  -------------------
  Three things: a password form, and two free-form gradient mixers. Above them,
  one line of copy reading "the rest of your account settings are on your
  profile page" — a settings page whose first act is to tell you the settings
  are somewhere else.

  And they genuinely were. Privacy lived in an overlay behind a menu on the
  profile. Active devices lived on their own route reachable from a grey text
  link on the profile. Light/dark lived only as an unlabelled icon in the
  header, on every page except this one. So the page named after settings held
  the two least consequential controls in the product, and the consequential
  ones were each hidden somewhere different.

  What it is now
  --------------
  One place, three sections in descending order of how often a student touches
  them: how it looks, who can get in, who can see what. Each is anchored, so a
  link can point at the part it means (`/settings#devices` from the profile),
  and the nav is a rail on wide screens and a scrolling strip on a phone —
  the same pattern the profile already uses, so it is one product's idea of a
  long page rather than a second one.
*/

const SECTIONS: SectionNavItem[] = [
  { id: "settings-appearance", label: "Տեսք" },
  { id: "settings-security", label: "Անվտանգություն" },
  { id: "settings-privacy", label: "Գաղտնիություն" },
];

/** Hash aliases so older links keep landing somewhere sensible: the profile's
 *  "active devices" item and the retired /account/sessions route both mean the
 *  security section. */
const HASH_TARGETS: Record<string, string> = {
  "#appearance": "settings-appearance",
  "#security": "settings-security",
  "#devices": "settings-security",
  "#privacy": "settings-privacy",
};

/** Height of everything pinned above the content: the 64px app header, plus
 *  the section strip that pins under it below `lg`. Without this a jump lands
 *  the heading underneath the strip that sent you there. */
const STICKY_OFFSET = 124;

function AnchoredSection({
  id,
  title,
  description,
  first = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  /** The first section already has the page header and the nav strip above
   *  it; a full section gap on top of those is dead space on a phone. */
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    // tabIndex=-1 so scrollToSection can move focus here: keyboard and
    // screen-reader users land where sighted users just scrolled.
    <section id={id} tabIndex={-1} className="focus:outline-none">
      <Section title={title} description={description} spacing={first ? "tight" : "loose"}>
        {children}
      </Section>
    </section>
  );
}

export function SettingsPage() {
  const location = useLocation();
  const active = useScrollSpy(SECTIONS.map((s) => s.id));

  useEffect(() => {
    const target = HASH_TARGETS[location.hash];
    if (!target) return;

    // Twice, deliberately. The first pass runs against the skeleton layout,
    // which is close but not final; the sections above the target grow as
    // their data arrives and push it down. The second pass corrects for that,
    // but only if the reader has not taken over scrolling in the meantime —
    // yanking the page out from under someone is worse than landing a little
    // high.
    scrollToSection(target, STICKY_OFFSET);

    // `wheel`/`touchmove`/`keydown`, not `scroll` — a `scroll` listener would
    // be tripped by our own programmatic scroll above and cancel the
    // correction every time. These three only fire for a real gesture.
    let takenOver = false;
    const takeOver = () => {
      takenOver = true;
    };
    const events = ["wheel", "touchmove", "keydown"] as const;
    for (const type of events) window.addEventListener(type, takeOver, { passive: true });

    const timer = window.setTimeout(() => {
      const el = document.getElementById(target);
      if (takenOver || !el) return;
      if (Math.abs(el.getBoundingClientRect().top - STICKY_OFFSET) > 8) scrollToSection(target, STICKY_OFFSET);
    }, 350);

    return () => {
      window.clearTimeout(timer);
      for (const type of events) window.removeEventListener(type, takeOver);
    };
  }, [location.hash]);

  return (
    <div className="mx-auto max-w-6xl px-[var(--space-4)] pb-[var(--space-16)] pt-[var(--space-8)] sm:px-[var(--space-6)]">
      <PageHeader
        title="Կարգավորումներ"
        description="Ինչպես է Gitus-ը երևում, ով կարող է մուտք գործել ձեր հաշիվ և ինչ են տեսնում ուրիշները։"
      />

      {/* The rail turns on at xl, not lg. At 1024 the app's own 200px
          sidebar is already showing, so a 180px rail plus a 40px gutter left
          the settings content about 590px wide and the three mode cards
          wrapped their one-line hints onto two. Below that width the nav is a
          horizontal strip pinned under the top bar instead. */}
      <div className="sticky top-16 z-20 -mx-[var(--space-4)] bg-bg/90 px-[var(--space-4)] backdrop-blur xl:hidden">
        <SectionNavBar items={SECTIONS} active={active} offset={STICKY_OFFSET} className="border-b-0 bg-transparent" />
      </div>

      <div className="gap-[var(--space-10)] xl:grid xl:grid-cols-[180px_minmax(0,1fr)]">
        <div className="hidden xl:block">
          {/* 80px = the 64px fixed header plus a gap. `top-8` would have
              parked the rail behind the header once the page scrolled. */}
          <div className="sticky top-20">
            <SectionNav items={SECTIONS} active={active} offset={96} />
          </div>
        </div>

        <div className="min-w-0">
          <AnchoredSection
            id="settings-appearance"
            first
            title="Տեսք"
            description="Ինչպես է Gitus-ը երևում այս սարքում։ Փոփոխությունները կիրառվում են անմիջապես։"
          >
            <AppearanceSection />
          </AnchoredSection>

          <AnchoredSection
            id="settings-security"
            title="Անվտանգություն"
            description="Ձեր գաղտնաբառը և այն սարքերը, որոնցից հաշիվը մուտք է գործած։"
          >
            <SecuritySection />
          </AnchoredSection>

          <AnchoredSection
            id="settings-privacy"
            title="Գաղտնիություն"
            description="Ինչ են տեսնում այլ աշակերտները ձեր մասին։"
          >
            <PrivacySection />
          </AnchoredSection>
        </div>
      </div>
    </div>
  );
}
