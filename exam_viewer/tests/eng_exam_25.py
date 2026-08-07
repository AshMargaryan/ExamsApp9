# -*- coding: utf-8 -*-
"""English mock exam #25 (AEE-ENG-025). Reading: history of the sewing machine.
Cloze: Benjamin Franklin/lightning rod, carbon capture direct air facilities by 2070, the Marfa Lights mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 25)"
EXAM_IDX = 25
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before mechanized sewing existed, every stitch in a garment had to
2.  be placed by hand, a slow process that made clothing expensive and
3.  time-consuming to produce.
4.      Early attempts at a mechanical sewing device faced fierce
5.  resistance from tailors who feared the invention would eliminate
6.  their livelihood entirely, sometimes leading to vandalized
7.  workshops and destroyed prototypes.
8.      A crucial design breakthrough came from placing the needle's
9.  eye near its point rather than at the opposite end, allowing the
10. needle to pass through fabric and interlock with a second thread
11. fed from below.
12.     This lockstitch technique created seams far stronger than
13. anything achievable by a single needle and thread alone, since two
14. threads interlocked within the fabric rather than simply passing
15. through it once.
16.     Competing inventors soon claimed rights to similar mechanisms,
17. triggering prolonged legal battles over which design had truly come
18. first and who deserved credit for the innovation.
19.     Eventually, the rival companies agreed to share their patents
20. collectively, allowing manufacturers to combine the best features of
21. each competing design into a single reliable machine.
22.     Once affordable, dependable machines reached the market, they
23. transformed the textile industry, allowing a single worker to
24. produce far more clothing in a day than by hand alone.
25.     The device also transformed home life for many families, as
26. household models allowed mending and clothing production to happen
27. far faster than traditional hand-sewing had ever permitted.
28.     Manufacturers marketed home machines aggressively, offering
29. installment payment plans that made an expensive machine affordable
30. even for households of modest means.
31.     Modern machines now include computerized stitching patterns and
32. automatic thread tension, yet the basic lockstitch mechanism remains
33. essentially unchanged since its nineteenth-century breakthrough.

"""

CLOZE_A = (
    "Before Benjamin Franklin's experiments, buildings (11) __________ properly protected against "
    "destructive lightning strikes during severe storms. While flying a kite during a thunderstorm, "
    "Franklin (12) __________ that electrical charge could be drawn safely from storm clouds through a "
    "conductive material. He proposed that a metal rod mounted above a structure (13) __________ direct "
    "dangerous electrical charge safely into the ground.\n\n"
    "Although his theory faced skepticism from some contemporaries, the lightning rod (14) __________ "
    "by builders within a couple of decades of his experiments. Today it is estimated that the "
    "invention (15) __________ countless buildings from fire damage since it was first installed."
)
CLOZE_B = (
    "By 2070, the way industries offset unavoidable carbon emissions (16) __________ dramatically due "
    "to direct air capture technology. Currently, engineers (17) __________ to refine filters capable "
    "of extracting carbon dioxide directly from ambient air. These facilities (18) __________ to store "
    "captured carbon underground for permanent removal from the atmosphere. However, some critics argue "
    "that the technology (19) __________ remain too energy-intensive to deploy at a meaningful scale. "
    "If energy efficiency continues to improve, experts predict that by the end of the century, a "
    "significant share of excess atmospheric carbon (20) __________ by direct air capture facilities "
    "rather than natural absorption alone."
)
CLOZE_C = (
    "For over a century, observers in a stretch of remote desert grassland have reported strange "
    "glowing orbs that flicker, drift, and occasionally split apart before fading from view. "
    "Investigators believe the lights (21) __________ by vehicle headlights refracted across long "
    "desert distances under specific atmospheric conditions. Because sightings were reported decades "
    "before automobiles existed in the region, some concluded that the lights (22) __________ by static "
    "electricity or gases released from the desert floor. Other theorists argued that the phenomenon "
    "(23) __________ by a combination of temperature layers bending distant light sources. Whatever the "
    "truth, a single confirmed explanation for every sighting (24) __________ officially by "
    "researchers, despite decades of scientific study. Unless a consistent pattern (25) __________, "
    "the lights may continue to draw curious visitors indefinitely."
)
WORDFORM_PASSAGE = (
    "Public 3D printing access hubs have opened in libraries and community centers where residents "
    "want to prototype small projects without owning expensive equipment. Their central (38) __________ "
    "is to let members reserve printer time and receive basic guidance from trained volunteers.\n\n"
    "Such hubs prove especially (39) __________ for students and inventors who need occasional access "
    "rather than a personal machine.\n\n"
    "Volunteers who run these hubs must track printer maintenance and material inventory to ensure "
    "long-term (40) __________. Where hubs are organized (41) __________, members typically complete a "
    "project within a single visit.\n\n"
    "Researchers note that 3D printing hubs can strengthen both community (42) __________ and access to "
    "hands-on technical skills."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the sewing machine")
    b.passage_mc(PASSAGE, "reading-25", RC_TOPIC, [
        (1, E, "According to the text, before mechanized sewing, every stitch had to be",
         "placed by hand",
         ["cut using a specialized machine", "woven directly into the fabric", "printed using heat transfer"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-2. «every stitch in a garment had to be placed by hand»:"]),
        (2, M, "The pronoun they in line 23 stands for",
         "machines", ["tailors", "rival companies", "patents"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«Once affordable, dependable machines reached the market, they transformed» — «they» վերաբերում է «machines»-ին:"]),
        (3, M, "According to paragraph 4 (lines 12-15), the lockstitch technique created",
         "seams far stronger than a single needle and thread could achieve",
         ["seams that could only be used for delicate fabric", "a slower sewing process than hand-sewing",
          "fabric that could not be washed"],
         "Փնտրել պարբերության մեջ նշված առավելությունը:",
         ["Տողեր 12-15-ը նկարագրում են այս առավելությունը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Eventually, the rival companies agreed to share their patents collectively, allowing '
         'manufacturers to combine the best features of each competing design."',
         "The competing companies eventually agreed to pool their patents so manufacturers could combine the best features of each design.",
         ["The rival companies refused to cooperate under any circumstances.", "Sharing patents made manufacturers unable to build any machines.",
          "Only one company was allowed to use any patented feature."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Մրցակից ընկերությունները վերջապես համաձայնեցին կիսվել իրենց արտոնագրերով:"]),
        (5, M, "According to the text, the device transformed home life by",
         "allowing mending and clothing production to happen far faster than hand-sewing",
         ["eliminating the need for clothing entirely", "making clothing production illegal at home",
          "requiring specialized factory training for home use"],
         "Փնտրել 5-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 25-27-ը նկարագրում են այս ազդեցությունը:"]),
        (6, M, "The word livelihood in line 6 may best be replaced by",
         "a means of earning a living",
         ["a type of sewing needle", "a legal document", "a piece of fabric"],
         "«Livelihood» = ապրուստի միջոց:",
         ["«eliminate their livelihood entirely» — «livelihood» = «a means of earning a living»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Tailors universally welcomed the sewing machine as soon as it was invented.",
         ["The lockstitch technique used two interlocking threads.", "Rival companies eventually agreed to share their patents.",
          "Installment payment plans made home machines more affordable."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 4-7-ը ասում են, որ դերձակները դիմադրում էին գյուտին, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word aggressively in line 28 is closest in meaning to",
         "in a forceful and determined way",
         ["in a slow and careful way", "in a confusing and unclear way", "at an extremely low cost"],
         "«Aggressively» = ագրեսիվորեն, եռանդուն:",
         ["«marketed home machines aggressively» — «aggressively» = «in a forceful and determined way»:"]),
        (9, M, "The paragraph about modern sewing machines mainly",
         "notes that the basic lockstitch mechanism remains largely unchanged despite modern computerized features",
         ["argues that modern machines are worse than early designs", "explains the exact wiring diagram of a modern machine",
          "lists every brand that manufactures sewing machines today"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նշում է, որ հիմնական մեխանիզմը մեծապես անփոփոխ է մնացել:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how the sewing machine overcame resistance to transform both industry and home life",
         ["dismissive of the sewing machine's importance", "purely technical with no historical context",
          "critical of modern computerized machines"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է կարի մեքենայի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "benjamin franklin and the lightning rod")
    b.passage_mc(CLOZE_A, "cloze-franklin", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly protected»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would direct»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has protected", ["protected", "had protected", "was protecting"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first installed» → Present Perfect՝ «has protected»:"]),
    ])
    b.register_topic("cloze_topics", "carbon capture direct air facilities by 2070")
    b.passage_mc(CLOZE_B, "cloze-carboncapture", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2070» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be removed", ["will remove", "is removed", "have removed"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be removed»:"]),
    ])
    b.register_topic("cloze_topics", "the marfa lights mystery")
    b.passage_mc(CLOZE_C, "cloze-marfalights", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been caused", ["should be caused", "have to cause", "can cause"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been caused»:"]),
        (22, M, "Choose the right option for gap (22).", "had been produced", ["had produced", "hasn't been produced", "wasn't producing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been produced»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been caused", ["may cause", "may be caused", "has to cause"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been caused» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is identified", ["isn't identified", "aren't identified", "will be identified"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public 3d printing access hubs")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-25", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "purpose", ["purposeful", "purposely", "purposes"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «purpose»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "valuable", ["value", "valuably", "devalue"],
         "«Prove especially ___» պահանջում է ածական:", ["«prove + ածական» կառուցվածքում՝ «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "efficiently", ["efficient", "efficiency", "inefficient"],
         "«Are organized ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «efficiently»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "cohesion", ["cohesive", "cohesively", "cohere"],
         "«Community ___» դիրքում ածականից հետո անհրաժեշտ է գոյական:", ["«community cohesion» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "community rain barrel installation programs (vii)")
    t.gen_wordbank(b, rng, 56, "Community rain barrel installation programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "youth chess club mentorship programs (ix)")
    t.gen_wordbank(b, rng, 62, "Youth chess club mentorship programs", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
