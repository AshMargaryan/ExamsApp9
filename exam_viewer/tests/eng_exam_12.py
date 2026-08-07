# -*- coding: utf-8 -*-
"""English mock exam #12 (AEE-ENG-012). Reading: history of photography.
Cloze: Percy Spencer/microwave, asteroid mining by 2110, Kensington Runestone."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 12)"
EXAM_IDX = 12
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before photography existed, the only way to preserve a visual
2.  record of a person, place, or event was through drawing or
3.  painting, a process that required considerable skill and time.
4.  Wealthy families could commission portraits, but most people had
5.  no lasting visual record of themselves or their surroundings at all.
6.      Early photographic processes in the nineteenth century required
7.  exposure times lasting several minutes, meaning subjects had to
8.  remain perfectly still or risk a blurred image. This made portrait
9.  photography an uncomfortable, formal occasion, quite unlike the
10. casual snapshots people take today. Photographers also worked with
11. fragile glass plates coated in chemicals, developing each image by
12. hand in darkened rooms using hazardous substances.
13.     The introduction of flexible film simplified photography
14. enormously. Cameras became smaller, lighter, and easier to operate,
15. putting photography within reach of ordinary people for the first
16. time rather than remaining a specialized profession. Family
17. photographs, once rare and expensive, became an ordinary part of
18. everyday life.
19.     Color photography developed more slowly than black-and-white
20. processes, partly because early color methods were complicated and
21. expensive to produce reliably. Once affordable color film became
22. widely available, it transformed how people documented personal
23. memories, advertising, and journalism alike.
24.     The shift to digital photography in the late twentieth century
25. eliminated the need for film entirely. Photographers could review
26. images instantly, delete unwanted shots, and share pictures
27. electronically without waiting for development.
28.     Today, smartphones have placed a capable camera in nearly every
29. pocket, and billions of photographs are taken daily worldwide.
30. Historians note that despite this technological transformation, the
31. underlying human desire that drove the invention of photography has
32. never changed: the wish to capture and preserve a fleeting moment
33. before it disappears forever.

"""

CLOZE_A = (
    "Kitchen technology (11) __________ dramatically since the mid-20th century. Before the "
    "microwave oven, reheating food quickly with minimal effort was simply not possible. In 1945, "
    "while Percy Spencer (12) __________ near an active radar set, he noticed that a chocolate bar "
    "in his pocket had melted unexpectedly. He realized that microwave radiation (13) __________ "
    "food molecules rapidly enough to generate heat from within.\n\n"
    "Although he patented the discovery quickly, the microwave oven (14) __________ by most "
    "households for several more decades. It wasn't until manufacturing costs dropped that "
    "widespread adoption became possible. It was estimated that within a few decades the invention "
    "(15) __________ how people prepared everyday meals."
)
CLOZE_B = (
    "By the year 2110, the way rare metals are obtained for industry (16) __________ beyond "
    "recognition. Currently, aerospace companies (17) __________ to develop spacecraft capable of "
    "extracting valuable minerals from passing asteroids. These spacecraft (18) __________ to "
    "reduce the environmental impact of mining on Earth. However, some critics argue that such "
    "missions (19) __________ be too costly to justify economically. If launch costs continue to "
    "fall, experts predict that by the end of the century, most rare industrial metals "
    "(20) __________ from asteroid mining rather than terrestrial excavation."
)
CLOZE_C = (
    "Discovered by a farmer in Minnesota in 1898, the Kensington Runestone bears an inscription "
    "claiming to record a Scandinavian expedition through the region centuries earlier. "
    "Investigators believe the stone (21) __________ carved using period-accurate tools, as "
    "microscopic analysis of the letter grooves matched techniques available at the time. Since "
    "the runic alphabet used contains some unusual symbols, some concluded that the inscription "
    "(22) __________ by someone attempting an elaborate hoax in the nineteenth century. Other "
    "theorists argued that the stone (23) __________ by genuine medieval travelers using regional "
    "dialect variations. Whatever the truth, the stone's authenticity (24) __________ officially by "
    "the wider community of runic scholars, despite over a century of study. Researchers continue "
    "to analyze the stone's mineral weathering patterns. Unless a comparable inscription "
    "(25) __________, the debate may never be resolved."
)
WORDFORM_PASSAGE = (
    "Urban wildlife rehabilitation centers have become common in cities dealing with injured or "
    "displaced animals. The (38) __________ behind these centers is to treat and release wild "
    "animals back into suitable habitats. Such centers are especially (39) __________ in areas "
    "where urban development has reduced natural habitat.\n\n"
    "Staff must consider factors like species-specific care and release timing to ensure long-term "
    "(40) __________. When centers are managed (41) __________, recovered animals often survive "
    "successfully after release.\n\n"
    "Studies suggest that wildlife rehabilitation centers can improve both (42) __________ "
    "awareness and local biodiversity."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of photography")
    b.passage_mc(PASSAGE, "reading-12", RC_TOPIC, [
        (1, E, "According to the text, before photography existed, visual records depended on",
         "drawing or painting, which required considerable skill and time",
         ["glass plates coated in chemicals", "flexible film and small cameras",
          "digital images shared electronically"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-3. «the only way to preserve a visual record... was through drawing or painting»:"]),
        (2, M, "The pronoun it in line 22 stands for",
         "affordable color film", ["black-and-white processes", "advertising", "journalism"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«Once affordable color film became widely available, it transformed...» — «it» վերաբերում է «affordable color film»-ին:"]),
        (3, M, "According to paragraph 2 (lines 6-12), early photography required subjects to",
         "remain perfectly still to avoid a blurred image",
         ["pose only outdoors in natural light", "pay for expensive glass plates themselves",
          "smile continuously throughout the exposure"],
         "Փնտրել պարբերության մեջ նշված պահանջը:",
         ["Տողեր 7-8-ը ասում են, որ երկարատև ազդեցության ժամանակ սուբյեկտները պետք է անշարժ մնային:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"The introduction of flexible film simplified photography enormously, putting photography '
         'within reach of ordinary people for the first time."',
         "Flexible film made photography accessible to everyday people, not just professionals.",
         ["Flexible film made photography more complicated than before.", "Only professional photographers could ever use flexible film.",
          "Flexible film had no effect on who could take photographs."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ճկուն ժապավենը հասանելի դարձրեց լուսանկարչությունը սովորական մարդկանց համար:"]),
        (5, M, "How did digital photography affect photographers, according to the text?",
         "It allowed them to review images instantly and share pictures without waiting for development.",
         ["It eliminated photography as a hobby entirely.", "It required longer exposure times than film.",
          "It made cameras heavier and harder to use."],
         "Փնտրել 5-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 25-27-ը ասում են, որ լուսանկարիչները կարող էին ակնթարթորեն դիտել պատկերները և կիսվել դրանցով:"]),
        (6, M, "The word fragile in line 11 may best be replaced by",
         "easily broken", ["extremely heavy", "very cheap", "brightly colored"],
         "«Fragile» = փխրուն, հեշտությամբ կոտրվող:",
         ["«fragile glass plates coated in chemicals» — «fragile» = «easily broken» (փխրուն):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Color photography developed more quickly and easily than black-and-white processes.",
         ["Digital photography eliminated the need for film entirely.", "Early exposure times could last several minutes.",
          "Smartphones have placed a capable camera in nearly every pocket."],
         "Համեմատել յուրաքանչյուր տարբերակը 4-րդ պարբերության հետ:",
         ["Տողեր 19-20-ը ասում են, որ գունավոր լուսանկարչությունը զարգացավ ավելի դանդաղ, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word hazardous in line 12 is closest in meaning to",
         "dangerous", ["expensive", "colorful", "reliable"],
         "«Hazardous» = վտանգավոր:",
         ["«hazardous substances» — «hazardous» = «dangerous» (վտանգավոր):"]),
        (9, M, "Paragraph 4 (lines 24-27) mainly",
         "describes how digital technology changed the practice of photography",
         ["argues that film photography should be banned", "explains the chemical composition of film",
          "lists every company that manufactured digital cameras"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես թվային տեխնոլոգիան փոխեց լուսանկարչության պրակտիկան:"]),
        (10, M, "The overall tone of the text can best be described as",
         "appreciative of photography's evolution while noting a constant underlying human motivation",
         ["dismissive of the value of digital photography", "purely technical with no historical narrative",
          "critical of the shift away from film photography"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը գնահատում է լուսանկարչության էվոլյուցիան՝ նշելով մարդկային մշտական ցանկությունը:"]),
    ])

    b.register_topic("cloze_topics", "Percy Spencer and the microwave oven")
    b.passage_mc(CLOZE_A, "cloze-spencer", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-20th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was standing", ["stood", "has been standing", "had stood"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was exciting", ["had been excited", "have been excited", "is excited"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was exciting» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "asteroid mining by 2110")
    b.passage_mc(CLOZE_B, "cloze-asteroidmining", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2110» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be sourced", ["will source", "is sourced", "have sourced"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be sourced»:"]),
    ])
    b.register_topic("cloze_topics", "the Kensington Runestone authenticity debate")
    b.passage_mc(CLOZE_C, "cloze-runestone", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been carved", ["should be carved", "have to carve", "can carve"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive «must have been carved»:"]),
        (22, M, "Choose the right option for gap (22).", "had been created", ["had created", "hasn't been created", "wasn't creating"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been created»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been carved", ["may carve", "may be carved", "has to carve"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been carved» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "urban wildlife rehabilitation centers")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-12", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "valuable", ["valuably", "value", "devalue"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "carefully", ["careful", "carefulness", "careless"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «carefully»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "public", ["publicly", "publicity", "publicize"],
         "«___ awareness» դիրքում գոյականից առաջ անհրաժեշտ է ածական:", ["«public awareness» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "independent bookstore preservation (VII)")
    t.gen_wordbank(b, rng, 56, "Independent bookstore preservation", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "seasonal farmworker housing reform (IX)")
    t.gen_wordbank(b, rng, 62, "Seasonal farmworker housing reform", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
