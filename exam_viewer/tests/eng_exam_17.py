# -*- coding: utf-8 -*-
"""English mock exam #17 (AEE-ENG-017). Reading: history of the umbrella.
Cloze: Eli Whitney/cotton gin, autonomous underwater exploration drones by 2090, the Sailing Stones of Death Valley mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 17)"
EXAM_IDX = 17
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Portable protection from rain and sun is nothing new: handheld
2.  umbrellas appear in art and historical records stretching back
3.  thousands of years across several ancient civilizations.
4.      In many early societies, umbrellas were not everyday items at
5.  all. Elaborate parasols carried by attendants signaled that the
6.  person walking beneath them held significant social status or
7.  religious authority, rather than serving a practical purpose alone.
8.      Waterproofing an umbrella proved surprisingly difficult for
9.  centuries. Early frames were covered with paper, silk, or feathers,
10. materials that could shed sunlight reasonably well but collapsed or
11. tore apart quickly once soaked by heavy rain.
12.     Coating fabric with oil or wax eventually solved much of this
13. problem, producing covers that repelled water far more effectively.
14. Even so, early folding mechanisms remained heavy, awkward, and prone
15. to breaking in strong wind.
16.     The introduction of lightweight steel ribs transformed the
17. umbrella into a genuinely practical object. Frames became sturdier
18. and lighter simultaneously, and the familiar collapsible design
19. still used today became widespread.
20.     For a long stretch of history in some cultures, carrying an
21. umbrella in public was considered inappropriate for men, who were
22. expected to tolerate rain without complaint. Attitudes shifted only
23. gradually as manufacturers marketed umbrellas as practical rather
24. than merely decorative.
25.     Mass production during the nineteenth century made umbrellas
26. cheap enough for ordinary households to own several, ending their
27. long association with wealth and status entirely.
28.     Modern umbrella designs continue to evolve, from compact
29. telescoping frames that fit inside a small bag to reinforced
30. structures engineered to survive powerful gusts without inverting.
31.     Despite centuries of refinement, the basic principle behind the
32. umbrella, a covering held above the head on a central pole, remains
33. essentially unchanged since its earliest recorded use.

"""

CLOZE_A = (
    "Before Eli Whitney's invention, removing seeds from raw cotton fiber (11) __________ properly "
    "efficient using the hand-based methods then in use. While visiting a plantation in the southern "
    "United States, Whitney (12) __________ that a mechanical device could separate seeds from fiber "
    "far faster than workers could by hand. He proposed that such a machine (13) __________ transform "
    "the profitability of cotton farming across the region.\n\n"
    "Although his patent faced constant legal challenges, the cotton gin (14) __________ by plantation "
    "owners within just a few years of its invention. Today it is estimated that the invention "
    "(15) __________ the American economy significantly since it was first put into use."
)
CLOZE_B = (
    "By 2090, the way scientists study the deep ocean floor (16) __________ dramatically due to "
    "autonomous drone technology. Currently, engineers (17) __________ to design submersibles capable "
    "of operating independently for months without surfacing. These drones (18) __________ to map "
    "regions of the ocean floor that remain almost entirely unexplored. However, some critics argue "
    "that the technology (19) __________ still be too costly to deploy at scale. If battery efficiency "
    "continues to improve, experts predict that by the end of the century, most deep-ocean research "
    "(20) __________ by autonomous drones rather than crewed submarines."
)
CLOZE_C = (
    "Across a dry, flat lakebed in a remote desert valley, large rocks leave long trails behind them as "
    "though they had moved entirely on their own, with no visible sign of an animal or vehicle involved. "
    "Investigators believe the stones (21) __________ by a thin layer of ice that forms overnight and "
    "later breaks apart under wind pressure. Because the trails sometimes curve or change direction, "
    "some concluded that the movement (22) __________ by unusually strong desert winds acting on wet, "
    "slippery mud. Other theorists argued that the stones (23) __________ by shifting layers of ice "
    "pushed slowly across the surface. Whatever the truth, the exact mechanism behind every trail "
    "(24) __________ officially by geologists, despite years of direct observation. Unless every trail "
    "(25) __________, a few unusual cases may continue to puzzle researchers."
)
WORDFORM_PASSAGE = (
    "Public composting collectives have formed in neighborhoods where residents want to divert food "
    "scraps away from landfills. Their central (38) __________ is to collect kitchen waste from members "
    "and turn it into usable soil for community gardens.\n\n"
    "Such collectives prove especially (39) __________ in dense neighborhoods where individual "
    "households lack outdoor space for their own compost bins.\n\n"
    "Volunteers who run these collectives must track drop-off schedules and pest control to ensure "
    "long-term (40) __________. Where collectives are organized (41) __________, members typically "
    "receive finished compost within a few months.\n\n"
    "Researchers note that composting collectives can strengthen both neighborhood (42) __________ and "
    "soil health citywide."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the umbrella")
    b.passage_mc(PASSAGE, "reading-17", RC_TOPIC, [
        (1, E, "According to the text, in many early societies umbrellas mainly signaled",
         "the social status or religious authority of the person beneath them",
         ["the wealth of the umbrella's manufacturer", "the current weather conditions in the region",
          "the season of the year"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 5-7. «signaled that the person walking beneath them held significant social status or religious authority»:"]),
        (2, M, "The pronoun them in line 6 stands for",
         "umbrellas", ["attendants", "social status", "religious authority"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«Elaborate parasols... the person walking beneath them» — «them» վերաբերում է «parasols/umbrellas»-ին:"]),
        (3, M, "According to paragraph 2 (lines 8-11), early umbrella materials",
         "shed sunlight well but collapsed or tore once soaked by heavy rain",
         ["were too heavy to carry comfortably", "worked perfectly in all weather conditions",
          "were only used indoors"],
         "Փնտրել պարբերության մեջ նշված նկարագրությունը:",
         ["Տողեր 9-11-ը նկարագրում են վաղ նյութերի հատկությունները:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Coating fabric with oil or wax eventually solved much of this problem, producing covers that '
         'repelled water far more effectively."',
         "Waxing or oiling the fabric made umbrella covers much better at repelling water.",
         ["Waxing the fabric made umbrellas absorb more water.", "Oil and wax coatings made no difference to waterproofing.",
          "The problem of waterproofing was never solved."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Ձեթով կամ մոմով ծածկույթը զգալիորեն բարելավեց ջրանթափանցելիությունը:"]),
        (5, M, "How did steel ribs affect umbrella design, according to the text?",
         "They made frames sturdier and lighter, spreading the familiar collapsible design.",
         ["They made umbrellas too heavy for everyday use.", "They eliminated the need for waterproof covers.",
          "They made umbrellas exclusively decorative again."],
         "Փնտրել 4-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 16-19-ը նկարագրում են այս ազդեցությունը:"]),
        (6, M, "The word prone in line 14 may best be replaced by",
         "likely to experience something, usually negative",
         ["completely resistant to damage", "extremely expensive to produce", "brightly colored and decorative"],
         "«Prone» = հակված (բացասական իմաստով):",
         ["«prone to breaking in strong wind» — «prone» = «likely to experience something negative»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Men were always encouraged to carry umbrellas throughout history.",
         ["Umbrellas originally signaled social status or religious authority.", "Steel ribs made umbrella frames sturdier and lighter.",
          "Mass production made umbrellas affordable for ordinary households."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 20-22-ը ասում են, որ տղամարդկանց համար հովանոց կրելը համարվում էր անհարմար, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word inverting in line 30 is closest in meaning to",
         "turning inside out", ["breaking into small pieces", "changing color in sunlight",
          "folding into a compact size"],
         "«Inverting» = շրջվել, ներսուդուրս շրջվել:",
         ["«without inverting» — «inverting» = «turning inside out»:"]),
        (9, M, "Paragraph 8 (lines 28-30) mainly",
         "describes modern innovations in umbrella design, from compact frames to wind-resistant structures",
         ["argues that umbrellas are no longer necessary", "explains the chemical composition of umbrella fabric",
          "lists every company that manufactures umbrellas today"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է ժամանակակից նորարարությունները հովանոցի դիզայնում:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how the umbrella evolved from a status symbol into an everyday practical object",
         ["dismissive of the umbrella's usefulness", "purely technical with no historical context",
          "critical of modern umbrella manufacturers"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է հովանոցի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "eli whitney and the cotton gin")
    b.passage_mc(CLOZE_A, "cloze-whitney", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly efficient»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would transform»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first put into use» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "autonomous underwater exploration drones by 2090")
    b.passage_mc(CLOZE_B, "cloze-oceandrones", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2090» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be conducted", ["will conduct", "is conducted", "have conducted"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be conducted»:"]),
    ])
    b.register_topic("cloze_topics", "the sailing stones of death valley mystery")
    b.passage_mc(CLOZE_C, "cloze-sailingstones", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been moved", ["should be moved", "have to move", "can move"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been moved»:"]),
        (22, M, "Choose the right option for gap (22).", "had been caused", ["had caused", "hasn't been caused", "wasn't causing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been caused»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been pushed", ["may push", "may be pushed", "has to push"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been pushed» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is recorded", ["isn't recorded", "aren't recorded", "will be recorded"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public composting collectives")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-17", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "purpose", ["purposeful", "purposely", "purposes"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «purpose»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "valuable", ["value", "valuably", "devalue"],
         "«Prove especially ___» պահանջում է ածական:", ["«prove + ածական» կառուցվածքում՝ «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "efficiently", ["efficient", "efficiency", "inefficient"],
         "«Are organized ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «efficiently»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "cohesion", ["cohesive", "cohesively", "cohere"],
         "«Neighborhood ___» դիրքում ածականից հետո անհրաժեշտ է գոյական:", ["«neighborhood cohesion» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "mobile produce market programs (vii)")
    t.gen_wordbank(b, rng, 56, "Mobile produce market programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public mural restoration projects (ix)")
    t.gen_wordbank(b, rng, 62, "Public mural restoration projects", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
