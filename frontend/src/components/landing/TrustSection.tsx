import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const ITEMS = [
  { icon: "🔒", title: "Անվտանգ հաշիվ", description: "Քո տվյալները և հաշիվը պաշտպանված են։" },
  { icon: "🕵️", title: "Գաղտնիություն", description: "Քո ուսումնական տվյալները չեն կիսվում առանց քո թույլտվության։" },
  { icon: "📊", title: "Թափանցիկ տվյալներ", description: "Միշտ կարող ես տեսնել, թե ինչ ես սովորել և ինչպես ես առաջադիմել։" },
  { icon: "🎧", title: "Աջակցություն", description: "Հարցերի դեպքում՝ Օգնության կենտրոնը միշտ հասանելի է։" },
];

export function TrustSection() {
  return (
    <Section>
      <SectionHeading kicker="Վստահություն" title="Կառուցված ուշադիր և պատասխանատու։" />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={i * 60}>
            <div className="flex h-full flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-6 text-center">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="text-xs text-text-muted">{item.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
