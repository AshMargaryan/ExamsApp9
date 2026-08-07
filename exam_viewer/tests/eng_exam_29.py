# -*- coding: utf-8 -*-
"""English mock exam #29 (AEE-ENG-029). Reading: history of the vacuum cleaner.
Cloze: Charles Babbage/analytical engine, lab-grown coral reef restoration by 2060, the Kaspar Hauser mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 29)"
EXAM_IDX = 29
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before mechanical carpet cleaning existed, removing dust and dirt
2.  from floor coverings required beating them by hand outdoors, a
3.  physically exhausting task that never fully removed embedded grime.
4.      Early carpet-cleaning machines relied on hand-cranked bellows
5.  or pumps to generate suction, requiring one person to operate the
6.  pump while another guided the cleaning head across the carpet.
7.      These early machines were large, heavy, and often required two
8.  operators working in careful coordination, making them impractical
9.  for widespread household use.
10.     A significant redesign replaced manual pumping with an electric
11. motor, allowing a single operator to generate consistent suction
12. without any physical exertion beyond guiding the machine itself.
13.     This innovation dramatically simplified operation, though early
14. electric models remained heavy and expensive, limiting ownership
15. mainly to wealthier households and commercial cleaning services.
16.     As motors grew smaller and more efficient, manufacturers
17. produced increasingly compact, lightweight models suitable for
18. ordinary homes rather than only large commercial spaces.
19.     Attachments soon followed, allowing a single machine to clean
20. upholstery, curtains, and hard-to-reach corners in addition to open
21. carpet areas.
22.     Bagless designs eventually emerged, using centrifugal force to
23. separate dust from air, eliminating the recurring cost and
24. inconvenience of replacing disposable collection bags.
25.     Cordless, battery-powered models later offered greater
26. convenience still, freeing users from the constraint of staying near
27. an electrical outlet while cleaning.
28.     Robotic models now navigate rooms autonomously, mapping floor
29. plans and avoiding obstacles without any direct human guidance
30. during the cleaning process.
31.     Despite over a century of refinement, the fundamental principle
32. behind the device, using suction to lift dirt from surfaces, remains
33. exactly as it was in the earliest hand-pumped designs.

"""

CLOZE_A = (
    "Before Charles Babbage's designs, complex mathematical calculations (11) __________ properly "
    "performed without extensive, error-prone manual computation by human calculators. While reviewing "
    "tables full of calculation errors, Babbage (12) __________ that a mechanical device could perform "
    "arithmetic far more reliably than human calculators. He proposed that a fully programmable "
    "mechanical engine (13) __________ eventually handle any calculation a set of instructions could "
    "describe.\n\n"
    "Although his design faced overwhelming engineering and funding challenges during his lifetime, the "
    "underlying concept (14) __________ by computer scientists as a genuine ancestor of modern "
    "computing within a century of his death. Today it is estimated that his design principles "
    "(15) __________ computer science significantly since they were first documented in his notebooks."
)
CLOZE_B = (
    "By 2060, the way damaged coral reefs are restored (16) __________ dramatically due to lab-grown "
    "coral technology. Currently, marine biologists (17) __________ to refine methods for growing "
    "heat-resistant coral fragments in controlled tanks. These fragments (18) __________ to be "
    "transplanted onto damaged reef sections to accelerate natural recovery. However, some critics "
    "argue that the technology (19) __________ still be too limited in scale to offset widespread reef "
    "bleaching. If production methods continue to improve, experts predict that by the middle of the "
    "century, a meaningful share of reef restoration (20) __________ using lab-grown coral rather than "
    "natural recovery alone."
)
CLOZE_C = (
    "In the early nineteenth century, a teenage boy appeared in a German town square, seemingly unable "
    "to speak more than a few phrases and carrying no identification of any kind. Investigators believe "
    "the boy (21) __________ by someone who kept him isolated from ordinary society for most of his "
    "early life. Because his account of his past changed slightly with each retelling, some concluded "
    "that his story (22) __________ by the boy himself to gain sympathy and attention from local "
    "authorities. Other theorists argued that his origins (23) __________ by a secret connected to a "
    "noble family concerned about inheritance claims. Whatever the truth, his exact identity and "
    "background (24) __________ officially by historians, despite extensive investigation at the time "
    "and since. Unless conclusive documentation (25) __________, his true origins may never be "
    "confirmed."
)
WORDFORM_PASSAGE = (
    "Public film screening co-ops have formed in neighborhoods where residents want free access to "
    "independent and classic films outside commercial theaters. Their central (38) __________ is to "
    "gather members who take turns selecting films and hosting screenings in shared community spaces.\n\n"
    "Such co-ops prove especially (39) __________ in areas where the nearest movie theater has closed "
    "or become too expensive.\n\n"
    "Volunteers who run these co-ops must track licensing permissions and screening schedules to ensure "
    "long-term (40) __________. Where co-ops are organized (41) __________, members typically enjoy a "
    "new film screening every few weeks.\n\n"
    "Researchers note that film screening co-ops can strengthen both community (42) __________ and "
    "access to independent cinema."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the vacuum cleaner")
    b.passage_mc(PASSAGE, "reading-29", RC_TOPIC, [
        (1, E, "According to the text, before mechanical carpet cleaning existed,",
         "removing dust and dirt required beating carpets by hand outdoors",
         ["carpets were washed entirely with soap and water", "carpets were replaced every few months",
          "electric brushes were used to loosen dirt"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-3. «required beating them by hand outdoors»:"]),
        (2, M, "The pronoun them in line 8 stands for",
         "early machines", ["operators", "carpets", "household use"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«making them impractical for widespread household use» — «them» վերաբերում է «early machines»-ին:"]),
        (3, M, "According to paragraph 4 (lines 10-12), the redesign replaced manual pumping with",
         "an electric motor allowing a single operator to generate consistent suction",
         ["a second hand-operated bellows", "a chemical cleaning solution", "a completely silent mechanism"],
         "Փնտրել պարբերության մեջ նշված փոփոխությունը:",
         ["Տողեր 10-12-ը նկարագրում են այս փոփոխությունը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This innovation dramatically simplified operation, though early electric models remained '
         'heavy and expensive, limiting ownership mainly to wealthier households."',
         "The electric motor made the machine much easier to use, but it stayed costly and heavy, so mainly wealthy households owned one at first.",
         ["Electric models were immediately affordable for every household.", "The innovation made the machine more complicated to operate.",
          "Early electric models were lightweight and inexpensive."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Էլեկտրական շարժիչը հեշտացրեց աշխատանքը, բայց մնաց ծանր ու թանկ, ուստի սկզբում հասանելի էր միայն հարուստներին:"]),
        (5, M, "According to the text, bagless designs eliminated",
         "the recurring cost and inconvenience of replacing disposable collection bags",
         ["the need for any suction at all", "the ability to clean upholstery and curtains",
          "the requirement for an electric motor"],
         "Փնտրել 8-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 22-24-ը նկարագրում են այս առավելությունը:"]),
        (6, M, "The word exertion in line 15 may best be replaced by",
         "physical or mental effort",
         ["a type of cleaning attachment", "a financial cost", "a legal requirement"],
         "«Exertion» = ջանք, ուժեղ ճիգ:",
         ["«without any physical exertion» — «exertion» = «physical or mental effort»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Robotic models require constant direct human guidance during cleaning.",
         ["Early machines required two operators working in coordination.", "Bagless designs use centrifugal force to separate dust from air.",
          "Cordless models freed users from staying near an electrical outlet."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 28-30-ը ասում են, որ ռոբոտային մոդելները նավարկվում են ինքնուրույն, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word constraint in line 26 is closest in meaning to",
         "a limitation or restriction on what one can do",
         ["a helpful feature or benefit", "a type of electrical outlet", "a method of cleaning carpets"],
         "«Constraint» = սահմանափակում:",
         ["«freeing users from the constraint» — «constraint» = «a limitation or restriction»:"]),
        (9, M, "The paragraph about robotic models mainly",
         "describes how robotic vacuums navigate and clean rooms autonomously without human guidance",
         ["argues that robotic vacuums are unreliable and impractical", "explains the exact programming code used in robotic models",
          "lists every company that manufactures robotic vacuums"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես ռոբոտային փոշեկուլները ինքնուրույն նավարկվում են:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing the vacuum cleaner's evolution from a two-person hand-pumped device to an autonomous robot",
         ["dismissive of the vacuum cleaner's usefulness", "purely technical with no historical context",
          "critical of modern robotic cleaning technology"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է փոշեկուլի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "charles babbage and the analytical engine")
    b.passage_mc(CLOZE_A, "cloze-babbage", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly performed»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would handle»:"]),
        (14, M, "Choose the right option for gap (14).", "was recognized", ["recognized", "has been recognized", "is recognized"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was recognized»:"]),
        (15, H, "Choose the right option for gap (15).", "have shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect, հոգնակի ենթակա:", ["«since they were first documented» → Present Perfect՝ «have shaped»:"]),
    ])
    b.register_topic("cloze_topics", "lab-grown coral reef restoration by 2060")
    b.passage_mc(CLOZE_B, "cloze-coralreef", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2060» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be conducted", ["will conduct", "is conducted", "have conducted"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be conducted»:"]),
    ])
    b.register_topic("cloze_topics", "the kaspar hauser mystery")
    b.passage_mc(CLOZE_C, "cloze-kasparhauser", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been raised", ["should be raised", "have to raise", "can raise"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been raised»:"]),
        (22, M, "Choose the right option for gap (22).", "had been exaggerated", ["had exaggerated", "hasn't been exaggerated", "wasn't exaggerating"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been exaggerated»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been hidden", ["may hide", "may be hidden", "has to hide"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been hidden» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public film screening co-ops")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-29", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "community weather station monitoring programs (vii)")
    t.gen_wordbank(b, rng, 56, "Community weather station monitoring programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "youth robotics club mentorship programs (ix)")
    t.gen_wordbank(b, rng, 62, "Youth robotics club mentorship programs", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
