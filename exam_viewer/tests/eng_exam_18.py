# -*- coding: utf-8 -*-
"""English mock exam #18 (AEE-ENG-018). Reading: history of the elevator.
Cloze: George Eastman/roll film, personalized 3D-printed prosthetics by 2055, the Toynbee tiles mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 18)"
EXAM_IDX = 18
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Vertical transportation devices existed in some form for centuries
2.  before the modern elevator, typically powered by human or animal
3.  muscle turning a rope-and-pulley system.
4.      These early lifts carried serious risk. If the rope supporting
5.  the platform snapped, there was nothing to stop the car from
6.  plunging to the bottom of the shaft, a danger that kept elevators
7.  largely confined to moving freight rather than passengers.
8.      The invention of a reliable safety brake changed this
9.  completely. The new mechanism used a spring-loaded clamp that
10. gripped the guide rails automatically the instant a supporting rope
11. lost tension, stopping a falling car within a short distance.
12.     To prove the device worked, its inventor famously demonstrated
13. it publicly by riding a platform himself and having the rope cut
14. deliberately in front of a crowd of onlookers.
15.     Once passengers trusted elevators to be safe, the technology
16. transformed how cities could grow. Without a reliable way to move
17. people quickly between floors, buildings taller than a few stories
18. remained impractical, since climbing many flights of stairs
19. discouraged both tenants and visitors alike.
20.     Steam-powered elevators eventually gave way to electric motors,
21. which offered smoother rides, faster speeds, and far greater
22. reliability than earlier mechanical systems.
23.     As elevators became faster and safer, architects designed
24. increasingly tall buildings, confident that residents and workers
25. could reach upper floors within moments rather than climbing for
26. several minutes.
27.     Modern elevator systems now use computerized controls that
28. group passengers heading to nearby floors into the same car,
29. reducing waiting times during busy periods.
30.     Some contemporary buildings have even begun installing elevators
31. that move sideways as well as vertically, allowing multiple cars to
32. operate within a single shaft simultaneously.
33.     Few inventions have shaped the modern city's skyline as profoundly as this one.

"""

CLOZE_A = (
    "Before George Eastman's invention, photography (11) __________ properly accessible to amateur "
    "enthusiasts because of the cumbersome glass plates then required. While experimenting with "
    "flexible materials in his kitchen laboratory, Eastman (12) __________ that a coated paper roll "
    "could hold multiple images in a single lightweight package. He proposed that a simple, affordable "
    "camera (13) __________ make photography accessible to ordinary people for the first time.\n\n"
    "Although his early prototypes faced technical setbacks, roll film (14) __________ by amateur "
    "photographers within a few years of its release. Today it is estimated that Eastman's invention "
    "(15) __________ popular photography significantly since it was first introduced."
)
CLOZE_B = (
    "By 2055, the way amputees receive prosthetic limbs (16) __________ dramatically due to advances "
    "in 3D-printing technology. Currently, engineers (17) __________ to refine scanning methods that "
    "capture a patient's exact limb measurements. These prosthetics (18) __________ to fit each patient "
    "far more precisely than mass-produced models ever could. However, some critics argue that the "
    "technology (19) __________ still be too expensive for many healthcare systems. If material costs "
    "continue to fall, experts predict that by the middle of the century, most prosthetic limbs "
    "(20) __________ using custom 3D-printed designs rather than standardized parts."
)
CLOZE_C = (
    "Embedded into the asphalt of city streets across several countries, small plaques bearing a "
    "cryptic message about resurrecting the dead on a distant planet have puzzled passersby for "
    "decades. Investigators believe the tiles (21) __________ by a single individual working alone "
    "late at night over several decades. Because the exact wording and materials remain remarkably "
    "consistent across locations, some concluded that the project (22) __________ by someone with "
    "access to specialized paving equipment. Other theorists argued that the tiles (23) __________ by "
    "a small group rather than one person, given how many cities are involved. Whatever the truth, the "
    "identity of the creator (24) __________ officially by researchers, despite considerable "
    "investigative effort. Unless a definitive confession (25) __________, the mystery may never be "
    "resolved."
)
WORDFORM_PASSAGE = (
    "Public art supply lending libraries have opened in communities where residents want to try "
    "creative projects without buying expensive materials outright. Their central (38) __________ is "
    "to let members borrow paints, tools, and equipment the way a traditional library lends books.\n\n"
    "Such libraries prove especially (39) __________ for students and hobbyists who only need "
    "specialized materials occasionally.\n\n"
    "Volunteers who run these libraries must track equipment condition and return schedules to ensure "
    "long-term (40) __________. Where libraries are organized (41) __________, members typically find "
    "the exact materials they need without delay.\n\n"
    "Researchers note that art supply libraries can strengthen both community (42) __________ and "
    "access to creative resources."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the elevator")
    b.passage_mc(PASSAGE, "reading-18", RC_TOPIC, [
        (1, E, "According to the text, early lifts carried serious risk because",
         "there was nothing to stop the car from plunging if the rope snapped",
         ["they moved too slowly to be practical", "they required electricity that was not yet available",
          "they could only travel a few centimeters at a time"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 4-6. «there was nothing to stop the car from plunging to the bottom of the shaft»:"]),
        (2, M, "The pronoun it in line 13 stands for",
         "the safety brake device", ["the platform", "the rope", "the crowd of onlookers"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«To prove the device worked, its inventor... demonstrated it publicly» — «it» վերաբերում է «the device»-ին:"]),
        (3, M, "According to paragraph 3 (lines 8-11), the safety brake worked by",
         "gripping the guide rails automatically when a supporting rope lost tension",
         ["sounding an alarm to warn nearby workers", "slowly lowering the car using a secondary motor",
          "cutting power to the building's electrical system"],
         "Փնտրել պարբերության մեջ նշված մեխանիզմը:",
         ["Տողեր 9-11-ը նկարագրում են այս մեխանիզմը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Without a reliable way to move people quickly between floors, buildings taller than a few '
         'stories remained impractical."',
         "Buildings couldn't practically be built very tall until there was a fast, dependable way to move people between floors.",
         ["Tall buildings were common even before reliable elevators existed.", "Moving between floors quickly made buildings shorter.",
          "Building height had no relation to elevator technology."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Բարձր շենքեր հնարավոր չէին առանց հարկերի միջև արագ տեղաշարժման հուսալի միջոցի:"]),
        (5, M, "According to the text, electric motors improved elevators by providing",
         "smoother rides, faster speeds, and far greater reliability",
         ["quieter operation but slower speeds", "lower cost but less safety",
          "the ability to move sideways for the first time"],
         "Փնտրել 5-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 20-22-ը նկարագրում են այս բարելավումները:"]),
        (6, M, "The word confined in line 6 may best be replaced by",
         "restricted or limited to a particular use", ["expanded to a much broader use", "completely banned by regulators",
          "improved dramatically in speed"],
         "«Confined» = սահմանափակված:",
         ["«kept elevators largely confined to moving freight» — «confined» = «restricted or limited to a particular use»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Steam-powered elevators offered smoother rides than electric motors.",
         ["Early lifts were powered by human or animal muscle.", "The safety brake gripped guide rails when a rope lost tension.",
          "Modern elevators can group passengers heading to nearby floors."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 20-22-ը ասում են, որ էլեկտրական շարժիչներն ապահովում էին ավելի սահուն ընթացք, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word profoundly in line 33 is closest in meaning to",
         "very greatly or deeply", ["very briefly or temporarily", "in a confusing or unclear way",
          "at great financial cost"],
         "«Profoundly» = խորապես, մեծապես:",
         ["«shaped... as profoundly as this one» — «profoundly» = «very greatly or deeply»:"]),
        (9, M, "Paragraph 9 (lines 30-32) mainly",
         "describes a modern innovation allowing elevators to move sideways as well as vertically",
         ["argues that vertical elevators should be replaced entirely", "explains the wiring diagram of a modern elevator",
          "lists every building that has installed sideways elevators"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է կողային տեղաշարժման հնարավորությամբ ժամանակակից նորարարությունը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how safety innovations enabled the modern skyline",
         ["dismissive of the elevator's importance", "purely technical with no historical context",
          "skeptical about the safety of modern elevators"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է, թե ինչպես անվտանգության նորարարությունները հնարավոր դարձրեցին ժամանակակից քաղաքի սիլուետը:"]),
    ])

    b.register_topic("cloze_topics", "george eastman and roll film")
    b.passage_mc(CLOZE_A, "cloze-eastman", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly accessible»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would make»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first introduced» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "personalized 3d-printed prosthetics by 2055")
    b.passage_mc(CLOZE_B, "cloze-prosthetics", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2055» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be produced", ["will produce", "is produced", "have produced"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be produced»:"]),
    ])
    b.register_topic("cloze_topics", "the toynbee tiles mystery")
    b.passage_mc(CLOZE_C, "cloze-toynbeetiles", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been installed", ["should be installed", "have to install", "can install"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been installed»:"]),
        (22, M, "Choose the right option for gap (22).", "had been carried out", ["had carried out", "hasn't been carried out", "wasn't carrying out"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been carried out»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been created", ["may create", "may be created", "has to create"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been created» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public art supply lending libraries")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-18", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "backyard habitat certification programs (vii)")
    t.gen_wordbank(b, rng, 56, "Backyard habitat certification programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "community canning and preservation workshops (ix)")
    t.gen_wordbank(b, rng, 62, "Community canning and preservation workshops", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
