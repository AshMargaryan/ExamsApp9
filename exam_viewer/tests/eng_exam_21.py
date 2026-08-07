# -*- coding: utf-8 -*-
"""English mock exam #21 (AEE-ENG-021). Reading: history of soap and hygiene.
Cloze: James Watt/steam engine, smart contact lenses by 2055, the disappearance of Amelia Earhart."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 21)"
EXAM_IDX = 21
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Cleaning the body with some form of soap-like substance is an
2.  ancient practice, with early recipes combining fats or oils with
3.  ash or other alkaline materials to produce a substance capable of
4.  lifting dirt and grease from skin and cloth.
5.      For centuries, soap remained a labor-intensive, small-batch
6.  product made at home or by local craftsmen, using whatever fats and
7.  ashes happened to be available locally.
8.      Understanding exactly why soap worked took far longer than
9.  making it. Soap molecules have a structure that allows one end to
10. attach to grease while the other end attaches to water, letting
11. water rinse away dirt that would otherwise resist plain water alone.
12.     For much of history, regular bathing was not universally
13. considered healthy. In some periods, physicians actually warned that
14. frequent washing could open the skin to dangerous illness, advice
15. that discouraged widespread soap use even where it was available.
16.     Attitudes shifted dramatically once scientists established a
17. clear link between germs and disease. Handwashing with soap suddenly
18. became a matter of public health rather than simple comfort or
19. vanity, and campaigns promoting the practice spread quickly.
20.     Industrial manufacturing eventually transformed soap from a
21. household chore into a mass-produced commercial product, available
22. in standardized bars at a fraction of the previous cost.
23.     Advertising played a significant role in this transition,
24. as companies competed to convince consumers that their particular
25. brand offered superior cleanliness or a more pleasant scent.
26.     Liquid soaps and specialized formulations followed, developed
27. for everything from delicate skin to heavy industrial grease.
28.     Today, research continues into antibacterial formulations and
29. environmentally friendly ingredients that minimize the ecological
30. impact of soap production and disposal.
31.     Despite thousands of years of refinement, the basic chemistry
32. behind soap, a molecule that bridges grease and water, remains
33. exactly as it was in the earliest recorded recipes.

"""

CLOZE_A = (
    "Before James Watt's improvements, early steam engines (11) __________ properly efficient because "
    "they wasted enormous amounts of heat with each cycle. While repairing a steam engine model at a "
    "university workshop, Watt (12) __________ that adding a separate condenser could prevent the main "
    "cylinder from constantly losing heat. He proposed that this modification (13) __________ "
    "dramatically increase the engine's fuel efficiency.\n\n"
    "Although his patent faced years of costly legal disputes, the improved steam engine (14) __________ "
    "by factory owners within a few decades of its introduction. Today it is estimated that the "
    "invention (15) __________ industrial production significantly since it was first put into "
    "widespread use."
)
CLOZE_B = (
    "By 2055, the way doctors monitor chronic health conditions (16) __________ dramatically due to "
    "smart contact lens technology. Currently, engineers (17) __________ to refine sensors small enough "
    "to fit comfortably on the surface of the eye. These lenses (18) __________ to track blood sugar "
    "and other biomarkers without requiring needles or blood samples. However, some critics argue that "
    "the technology (19) __________ raise serious concerns about data privacy. If manufacturing costs "
    "continue to fall, experts predict that by the middle of the century, chronic condition monitoring "
    "(20) __________ by wearable sensors rather than periodic clinical tests."
)
CLOZE_C = (
    "During an attempt to fly around the world, an experienced aviator and her navigator vanished over "
    "the Pacific Ocean without a confirmed trace, despite an extensive search launched immediately "
    "afterward. Investigators believe the aircraft (21) __________ by running out of fuel while "
    "searching for a small island runway that proved difficult to locate. Because scattered radio "
    "transmissions were reported after the last confirmed contact, some concluded that the flight "
    "(22) __________ by a forced landing on a different, uninhabited island. Other theorists argued "
    "that the aircraft (23) __________ by a navigational error that carried it far off its intended "
    "course. Whatever the truth, the exact fate of the flight (24) __________ officially by "
    "investigators, despite decades of searches and expeditions. Unless conclusive wreckage "
    "(25) __________, the disappearance may never be fully resolved."
)
WORDFORM_PASSAGE = (
    "Urban pollinator garden networks have formed in cities where residents want to support declining "
    "bee and butterfly populations. Their central (38) __________ is to connect small garden plots "
    "across a city so pollinators can travel safely between food sources.\n\n"
    "Such networks prove especially (39) __________ in areas where large green spaces have been "
    "replaced by buildings and pavement.\n\n"
    "Volunteers who run these networks must track native plant species and bloom schedules to ensure "
    "long-term (40) __________. Where networks are organized (41) __________, participating gardens "
    "typically attract pollinators within the first growing season.\n\n"
    "Researchers note that pollinator networks can strengthen both neighborhood (42) __________ and "
    "local biodiversity."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of soap and hygiene practices")
    b.passage_mc(PASSAGE, "reading-21", RC_TOPIC, [
        (1, E, "According to the text, early soap recipes combined",
         "fats or oils with ash or other alkaline materials",
         ["synthetic chemicals with purified water", "clay minerals with volcanic ash",
          "plant fibers with animal hide"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 2-4. «combining fats or oils with ash or other alkaline materials»:"]),
        (2, M, "The pronoun it in line 15 stands for",
         "soap", ["illness", "the skin", "physicians"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«discouraged widespread soap use even where it was available» — «it» վերաբերում է «soap»-ին:"]),
        (3, M, "According to paragraph 3 (lines 8-11), soap works because",
         "molecules attach to grease on one end and water on the other",
         ["it dissolves completely into the skin", "it contains natural antibacterial minerals",
          "it changes the chemical structure of water permanently"],
         "Փնտրել պարբերության մեջ նշված մեխանիզմը:",
         ["Տողեր 9-11-ը նկարագրում են այս մեխանիզմը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Handwashing with soap suddenly became a matter of public health rather than simple comfort '
         'or vanity."',
         "Once germs were linked to disease, handwashing was seen as essential for public health, not just comfort.",
         ["Handwashing was always considered essential for public health.", "The link between germs and disease made handwashing less important.",
          "Handwashing remained purely a matter of personal comfort."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Երբ մանրէները կապվեցին հիվանդության հետ, ձեռքերի լվացումը դարձավ հանրային առողջության հարց:"]),
        (5, M, "According to the text, industrial manufacturing transformed soap into",
         "a mass-produced commercial product available in standardized bars",
         ["an expensive luxury item reserved for the wealthy", "a product banned for medical reasons",
          "an ingredient used only in industrial cleaning"],
         "Փնտրել 5-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 20-22-ը նկարագրում են այս փոփոխությունը:"]),
        (6, M, "The word vanity in line 19 may best be replaced by",
         "excessive concern with one's appearance",
         ["a serious medical condition", "a type of industrial equipment", "a chemical compound found in soap"],
         "«Vanity» = ունայնություն, արտաքինի հանդեպ ավելորդ մտահոգություն:",
         ["«comfort or vanity» — «vanity» = «excessive concern with one's appearance»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Physicians always encouraged frequent bathing throughout history.",
         ["Soap molecules attach to both grease and water.", "Advertising played a role in soap's commercial transition.",
          "Liquid soaps were developed for a variety of specialized uses."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 13-15-ը ասում են, որ բժիշկները երբեմն զգուշացնում էին հաճախակի լվացումից, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word bridges in line 32 is closest in meaning to",
         "connects two different things",
         ["completely dissolves something", "destroys or breaks apart something", "measures the distance between two points"],
         "«Bridges» (բայ) = կապում է, միացնում է:",
         ["«a molecule that bridges grease and water» — «bridges» = «connects two different things»:"]),
        (9, M, "Paragraph 8 (lines 28-30) of the text mainly",
         "describes ongoing research into antibacterial and environmentally friendly soap formulations",
         ["argues that soap production should be banned entirely", "explains the exact chemical formula of modern soap",
          "lists every company that manufactures soap today"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է ընթացիկ հետազոտությունները հականեկուղժ և բնապահպանական բանաձևերի ուղղությամբ:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing soap's evolution from a home craft to a scientifically understood public health tool",
         ["dismissive of soap's importance to public health", "purely technical with no historical context",
          "alarmed about modern soap manufacturing"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է օճառի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "james watt and the steam engine")
    b.passage_mc(CLOZE_A, "cloze-watt", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly efficient»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would increase»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first put into widespread use» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "smart contact lenses for health monitoring by 2055")
    b.passage_mc(CLOZE_B, "cloze-smartlenses", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2055» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be handled", ["will handle", "is handled", "have handled"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be handled»:"]),
    ])
    b.register_topic("cloze_topics", "the disappearance of amelia earhart")
    b.passage_mc(CLOZE_C, "cloze-earhart", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been lost", ["should be lost", "have to lose", "can lose"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been lost»:"]),
        (22, M, "Choose the right option for gap (22).", "had been followed", ["had followed", "hasn't been followed", "wasn't following"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been followed»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been thrown", ["may throw", "may be thrown", "has to throw"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been thrown» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "urban pollinator garden networks")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-21", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "neighborhood snow removal cooperatives (vii)")
    t.gen_wordbank(b, rng, 56, "Neighborhood snow removal cooperatives", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public instrument lending programs (ix)")
    t.gen_wordbank(b, rng, 62, "Public instrument lending programs", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
