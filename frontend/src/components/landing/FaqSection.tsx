import { useState } from "react";
import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "Ի՞նչ է Gitus-ը։",
    a: "Gitus-ը AI ուսումնական հարթակ է հայ դպրոցականների համար։ Այն օգնում է հասկանալ դժվար նյութը, պարապել իրական թեստերով և հետևել քո առաջընթացին։",
  },
  {
    q: "Արդյո՞ք Gitus-ն անվճար է։",
    a: "Կարող ես գրանցվել և սկսել օգտվել հարթակի հիմնական հնարավորություններից անվճար։",
  },
  {
    q: "Ինչպե՞ս է աշխատում AI Tutor-ը։",
    a: "Դու տալիս ես հարցդ, իսկ AI Tutor-ը բացատրում է լուծումը քայլ առ քայլ՝ ոչ թե պարզապես տալիս պատրաստի պատասխան։",
  },
  {
    q: "Ո՞ր առարկաներն են աջակցվում։",
    a: "Ներկայում՝ Մաթեմատիկա, Ֆիզիկա, Քիմիա, Կենսաբանություն և Անգլերեն։ Նոր բովանդակություն կանոնավոր ավելացվում է։",
  },
  {
    q: "Կարո՞ղ է Gitus-ն օգնել քննությանը պատրաստվելիս։",
    a: "Այո։ Մոք-քննություններ, անհատական ուսումնական պլան և թույլ թեմաների վրա կենտրոնացած պարապմունքներ միասին օգնում են կանոնավոր պատրաստվել։",
  },
  {
    q: "Ինչպե՞ս է աշխատում ուսումնական պլանը։",
    a: "Ամեն օր Gitus-ը վերլուծում է քո լուծած խնդիրները և թույլ թեմաները, ապա առաջարկում է կոնկրետ առաջադրանքներ՝ ինչ սովորել հաջորդը։",
  },
  {
    q: "Ինչպե՞ս է հաշվարկվում իմ առաջընթացը։",
    a: "Հիմնված է լուծած խնդիրների քանակի, ճշգրտության և ավարտված թեստերի արդյունքների վրա։",
  },
  {
    q: "Անվտա՞նգ են իմ տվյալները։",
    a: "Այո։ Քո հաշիվը և ուսումնական տվյալները պաշտպանված են և չեն կիսվում երրորդ կողմերի հետ առանց թույլտվության։",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-sm font-medium text-text sm:text-base">{q}</span>
        <span
          className={`flex-none text-lg text-text-muted transition-transform duration-300 ${open ? "rotate-45" : ""}`}
          aria-hidden
        >
          +
        </span>
      </button>
      <div
        aria-hidden={!open}
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="pt-3 text-sm text-text-muted">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  return (
    <Section id="faq">
      <SectionHeading kicker="Հաճախ տրվող հարցեր" title="Հարցեր ունե՞ս։" />

      <Reveal className="mx-auto mt-10 max-w-2xl">
        {FAQS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </Reveal>
    </Section>
  );
}
