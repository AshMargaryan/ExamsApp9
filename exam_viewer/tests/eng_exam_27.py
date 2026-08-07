# -*- coding: utf-8 -*-
"""English mock exam #27 (AEE-ENG-027). Reading: history of the escalator.
Cloze: Willis Carrier/air conditioning, self-healing infrastructure by 2065, the disappearance of Percy Fawcett."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 27)"
EXAM_IDX = 27
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Moving people vertically between floors without stairs or an
2.  enclosed elevator car became possible with the invention of the
3.  escalator, a continuously moving inclined stairway.
4.      Early moving stairways bore little resemblance to modern
5.  escalators, sometimes resembling a moving conveyor belt with
6.  cleated ridges rather than individual steps that stayed level as
7.  they moved.
8.      Riders on these early designs had to time their step carefully,
9.  since the platform's surface tilted continuously along the incline
10. rather than remaining flat like a proper stair tread.
11.     A significant redesign introduced individually hinged steps
12. that stayed level throughout the ride, flattening automatically at
13. the top and bottom before folding away beneath the platform.
14.     This innovation made the escalator dramatically safer and more
15. comfortable, allowing riders to stand naturally without constantly
16. adjusting their balance.
17.     Department stores were early enthusiastic adopters, recognizing
18. that escalators could move shoppers effortlessly between floors,
19. encouraging browsing on levels customers might otherwise skip
20. entirely.
21.     Transit systems soon followed, installing escalators in subway
22. stations to move large crowds quickly during peak travel periods
23. without requiring passengers to climb multiple flights of stairs.
24.     Safety features developed steadily over subsequent decades,
25. including combs that guide the edges of shoes away from moving
26. parts and emergency stop mechanisms accessible to any rider.
27.     Modern escalators now incorporate variable speed controls that
28. slow automatically when no riders are detected, reducing energy
29. consumption during quiet periods.
30.     Despite occasional headlines about malfunctions, escalators
31. remain statistically among the safest methods of moving between
32. floors in high-traffic public spaces.
33.     Few inventions move so many people so quietly every single day.

"""

CLOZE_A = (
    "Before Willis Carrier's invention, humidity and temperature inside factories (11) __________ "
    "properly controlled during hot, humid months, causing paper and printed materials to warp and "
    "wrinkle. While troubleshooting a printing plant's climate problems, Carrier (12) __________ that "
    "cooling air below its dew point could remove excess moisture reliably. He proposed that a "
    "mechanical system built around this principle (13) __________ solve humidity problems across many "
    "different industries.\n\n"
    "Although his early systems remained large and expensive, air conditioning (14) __________ by "
    "manufacturers within a couple of decades of its invention. Today it is estimated that the "
    "technology (15) __________ daily life significantly since it was first installed commercially."
)
CLOZE_B = (
    "By 2065, the way cities repair cracked roads and bridges (16) __________ dramatically due to "
    "self-healing material technology. Currently, engineers (17) __________ to refine concrete embedded "
    "with capsules that release sealant when cracks form. These materials (18) __________ to extend "
    "infrastructure lifespan by repairing minor damage before it worsens. However, some critics argue "
    "that the technology (19) __________ still be too expensive for widespread municipal adoption. If "
    "manufacturing costs continue to fall, experts predict that by the middle of the century, much new "
    "infrastructure (20) __________ using self-healing materials rather than conventional concrete."
)
CLOZE_C = (
    "While searching for the ruins of an ancient lost city deep in the Amazon rainforest, an "
    "experienced explorer and his son vanished without a confirmed trace, despite numerous rescue "
    "expeditions launched over subsequent decades. Investigators believe the expedition (21) __________ "
    "by hostile conditions, disease, or an encounter with an isolated indigenous group protecting their "
    "territory. Because a few unconfirmed sightings were reported years later, some concluded that the "
    "explorer (22) __________ by local communities who chose not to reveal his location. Other "
    "theorists argued that the party (23) __________ by the sheer difficulty of the terrain long before "
    "reaching their intended destination. Whatever the truth, the expedition's final fate "
    "(24) __________ officially by historians, despite dozens of subsequent search attempts. Unless "
    "conclusive remains (25) __________, the disappearance may never be fully resolved."
)
WORDFORM_PASSAGE = (
    "Public herb garden co-ops have opened in neighborhoods where residents want free access to fresh "
    "culinary and medicinal herbs. Their central (38) __________ is to maintain a shared garden bed "
    "where members can harvest what they need and replant cuttings for others.\n\n"
    "Such co-ops prove especially (39) __________ in apartment-heavy neighborhoods where residents lack "
    "their own outdoor growing space.\n\n"
    "Volunteers who run these co-ops must track planting rotations and harvest limits to ensure "
    "long-term (40) __________. Where co-ops are organized (41) __________, members typically find "
    "fresh herbs available throughout the growing season.\n\n"
    "Researchers note that herb garden co-ops can strengthen both neighborhood (42) __________ and "
    "access to fresh food."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the escalator")
    b.passage_mc(PASSAGE, "reading-27", RC_TOPIC, [
        (1, E, "According to the text, early moving stairways resembled",
         "a moving conveyor belt with cleated ridges rather than individual level steps",
         ["a modern elevator car", "a stationary staircase with a handrail", "a series of automatic doors"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 4-7. «resembling a moving conveyor belt with cleated ridges»:"]),
        (2, M, "The pronoun they in line 7 stands for",
         "steps", ["ridges", "riders", "escalators"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«individual steps that stayed level as they moved» — «they» վերաբերում է «steps»-ին:"]),
        (3, M, "According to paragraph 3 (lines 8-10), riders on early designs had to",
         "time their step carefully since the platform's surface tilted continuously",
         ["pay an extra fee to use the escalator", "wait for an attendant to operate it manually",
          "remove their shoes before stepping on"],
         "Փնտրել պարբերության մեջ նշված պահանջը:",
         ["Տողեր 8-10-ը նկարագրում են այս պահանջը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This innovation made the escalator dramatically safer and more comfortable, allowing riders '
         'to stand naturally without constantly adjusting their balance."',
         "The hinged-step redesign made escalators safer and more comfortable because riders no longer had to keep adjusting their balance.",
         ["The redesign made escalators more dangerous than before.", "Riders still had to constantly adjust their balance after the redesign.",
          "The innovation had no effect on rider comfort or safety."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Կցագլաններով աստիճանների նորարարությունը դարձրեց էսկալատորները ավելի անվտանգ ու հարմարավետ:"]),
        (5, M, "According to the text, department stores adopted escalators because they",
         "could move shoppers effortlessly between floors, encouraging browsing on levels customers might otherwise skip",
         ["eliminated the need for any staff in the store", "made shopping significantly slower",
          "were required by new government regulations"],
         "Փնտրել 5-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 17-20-ը նկարագրում են այս պատճառը:"]),
        (6, M, "The word cleated in line 5 may best be replaced by",
         "having raised ridges for grip or traction",
         ["extremely smooth and polished", "brightly painted and decorative", "folded into a compact space"],
         "«Cleated» = ատամնավոր, ելուստավոր:",
         ["«cleated ridges» — «cleated» = «having raised ridges for grip or traction»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Escalators are statistically among the most dangerous ways to move between floors.",
         ["Early moving stairways used cleated ridges rather than level steps.", "Department stores were early adopters of escalators.",
          "Modern escalators can slow automatically when no riders are detected."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 30-32-ը ասում են, որ էսկալատորները վիճակագրորեն ամենաանվտանգ միջոցներից են, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word incorporate in line 27 is closest in meaning to",
         "to include something as part of a whole",
         ["to remove something from a system", "to sell something at a discount", "to repair something that is broken"],
         "«Incorporate» = ընդգրկել, ներառել:",
         ["«now incorporate variable speed controls» — «incorporate» = «to include something as part of a whole»:"]),
        (9, M, "The paragraph about safety features mainly",
         "describes safety mechanisms like combs and emergency stops developed over time",
         ["argues that escalators should be replaced by elevators", "explains the exact wiring diagram of an escalator motor",
          "lists every accident ever caused by an escalator"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է անվտանգության մեխանիզմները, որոնք զարգացան տարիների ընթացքում:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing the escalator's evolution into a safe, efficient way to move crowds",
         ["dismissive of the escalator's usefulness", "purely technical with no historical context",
          "alarmed about the dangers of escalators"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է էսկալատորի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "willis carrier and air conditioning")
    b.passage_mc(CLOZE_A, "cloze-carrier", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly controlled»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would solve»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first installed commercially» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "self-healing infrastructure materials by 2065")
    b.passage_mc(CLOZE_B, "cloze-selfhealing", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2065» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be constructed", ["will construct", "is constructed", "have constructed"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be constructed»:"]),
    ])
    b.register_topic("cloze_topics", "the disappearance of percy fawcett in the amazon")
    b.passage_mc(CLOZE_C, "cloze-fawcett", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been overwhelmed", ["should be overwhelmed", "have to overwhelm", "can overwhelm"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been overwhelmed»:"]),
        (22, M, "Choose the right option for gap (22).", "had been sheltered", ["had sheltered", "hasn't been sheltered", "wasn't sheltering"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been sheltered»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been defeated", ["may defeat", "may be defeated", "has to defeat"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been defeated» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public herb garden co-ops")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-27", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "backyard chicken-keeping cooperative programs (vii)")
    t.gen_wordbank(b, rng, 56, "Backyard chicken-keeping cooperative programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public podcast recording studio access (ix)")
    t.gen_wordbank(b, rng, 62, "Public podcast recording studio access", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
