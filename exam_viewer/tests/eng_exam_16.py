# -*- coding: utf-8 -*-
"""English mock exam #16 (AEE-ENG-016). Reading: history of the compass.
Cloze: George Westinghouse/AC power, lab-grown organ transplants by 2070, the Nazca Lines mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 16)"
EXAM_IDX = 16
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Long before satellite navigation existed, sailors and travelers
2.  relied on a simple device to find their way across open water and
3.  featureless terrain: the magnetic compass.
4.      The earliest compasses were not built for navigation at all.
5.  Ancient scholars discovered that a naturally magnetic mineral, when
6.  allowed to float freely or hang from a thread, would consistently
7.  align itself in the same direction. This property was first used for
8.  divination and geomancy rather than practical travel.
9.      It took centuries before sailors recognized that this same
10. property could guide a ship across open ocean, far from any visible
11. coastline. A magnetized needle, floated on water or balanced on a
12. pivot, freed navigators from having to rely solely on stars, which
13. were often hidden by clouds or invisible during the day.
14.     Early compasses were far from perfect. Magnetic north and true
15. geographic north are not identical, and the difference between them
16. varies depending on location, sometimes by many degrees. Sailors who
17. ignored this discrepancy could find themselves dangerously far off
18. course after a long voyage.
19.     As instrument makers improved their craft, compasses were
20. mounted on gimbals, rings that kept the needle level even as a ship
21. pitched and rolled in rough seas. This innovation made compasses
22. reliable enough for use aboard warships and merchant vessels alike.
23.     The compass transformed exploration. Sailors no longer needed
24. to stay within sight of land, opening ocean routes that connected
25. distant continents and reshaped global trade.
26.     The twentieth century introduced the gyrocompass, which points
27. toward true geographic north rather than magnetic north, and relies
28. on a spinning wheel rather than magnetism entirely.
29.     Today, satellite positioning has largely replaced the compass
30. for everyday navigation, yet compasses remain standard equipment on
31. ships and aircraft as a reliable backup when electronic systems fail.
32.     Despite thousands of years of advancement, the basic principle
33. behind the compass remains as simple and dependable as ever.

"""

CLOZE_A = (
    "Before George Westinghouse's work, electricity (11) __________ properly distributed across long "
    "distances by the direct-current systems then in use. While studying the limitations of existing "
    "power networks, Westinghouse (12) __________ that alternating current could travel much farther "
    "with far less energy loss. He proposed that widespread adoption of the technology (13) __________ "
    "transform how cities delivered electricity to homes and factories.\n\n"
    "Although his approach faced fierce resistance initially, alternating current (14) __________ by "
    "the electrical industry within a couple of decades. Today it is estimated that this system "
    "(15) __________ the modern power grid significantly since it was first commercially deployed."
)
CLOZE_B = (
    "By 2070, the way patients receive replacement organs (16) __________ dramatically due to "
    "lab-grown tissue technology. Currently, researchers (17) __________ to refine techniques for "
    "growing functional organs from a patient's own cells. These methods (18) __________ to eliminate "
    "the risk of organ rejection that donor transplants often carry. However, some critics argue that "
    "the technology (19) __________ remain too expensive for widespread use. If production costs "
    "continue to fall, experts predict that by the end of the century, most organ transplants "
    "(20) __________ from lab-grown tissue rather than human donors."
)
CLOZE_C = (
    "Carved into the arid plains of southern Peru, hundreds of massive geometric shapes and animal "
    "figures are visible only from high above the ground. Investigators believe the lines "
    "(21) __________ by removing dark surface stones to reveal the lighter soil underneath. Because "
    "many figures can only be recognized from the air, some concluded that the designs (22) __________ "
    "by their creators for religious ceremonies aimed at sky deities. Other theorists argued that the "
    "lines (23) __________ by ancient astronomers tracking the movement of stars. Whatever the truth, "
    "a single agreed purpose for the lines (24) __________ officially by archaeologists, despite nearly "
    "a century of study. Unless new evidence (25) __________, the true purpose of the Nazca Lines may "
    "never be resolved."
)
WORDFORM_PASSAGE = (
    "Public repair cafes have opened in towns where residents want to fix broken appliances instead of "
    "discarding them. Their central (38) __________ is to connect people who own broken items with "
    "volunteers who can help repair them for free.\n\n"
    "Such cafes prove especially (39) __________ in communities concerned about the amount of waste "
    "sent to landfills.\n\n"
    "Volunteers who run these cafes must track spare parts and tool inventories to ensure long-term "
    "(40) __________. Where cafes are organized (41) __________, visitors typically leave with a "
    "working item the same afternoon.\n\n"
    "Researchers note that repair cafes can strengthen both community (42) __________ and household "
    "savings."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the compass")
    b.passage_mc(PASSAGE, "reading-16", RC_TOPIC, [
        (1, E, "According to the text, the earliest compasses were originally used for",
         "divination and geomancy rather than practical travel",
         ["long-distance ocean navigation", "military communication between ships",
          "measuring the height of mountains"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 7-8. «This property was first used for divination and geomancy rather than practical travel»:"]),
        (2, M, "The pronoun them in line 15 stands for",
         "magnetic north and true geographic north", ["sailors and navigators", "early compasses", "stars and clouds"],
         "Գտնել այն գոյականները, որոնց վերաբերում է դերանունը:",
         ["«Magnetic north and true geographic north are not identical, and the difference between them» — «them» վերաբերում է դրանց:"]),
        (3, M, "According to paragraph 4 (lines 14-18), early compasses were imperfect because",
         "magnetic north and true geographic north are not identical",
         ["they were too heavy to carry on ships", "they only worked during the daytime",
          "they required electricity to function"],
         "Փնտրել պարբերության մեջ նշված պատճառը:",
         ["Տողեր 14-16-ը նկարագրում են այս խնդիրը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This innovation made compasses reliable enough for use aboard warships and merchant vessels alike."',
         "The gimbal innovation made compasses dependable enough for both military and trading ships.",
         ["The gimbal innovation made compasses too unreliable for any ships.", "Only warships could use compasses after this innovation.",
          "This innovation had no effect on how ships used compasses."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Գիմբալի նորարարությունը դարձրեց կողմնացույցները հուսալի ինչպես ռազմական, այնպես էլ առևտրային նավերի համար:"]),
        (5, M, "How did the compass affect exploration, according to the text?",
         "It let sailors travel out of sight of land, opening new ocean trade routes.",
         ["It eliminated the need for ships to cross oceans.", "It made sailors dependent on visible coastlines.",
          "It slowed the connection between distant continents."],
         "Փնտրել 6-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 23-25-ը նկարագրում են այս ազդեցությունը:"]),
        (6, M, "The word discrepancy in line 17 may best be replaced by",
         "a difference between two things that should match",
         ["a type of navigational instrument", "a sudden storm at sea", "a long and difficult voyage"],
         "«Discrepancy» = անհամապատասխանություն:",
         ["«ignored this discrepancy» — «discrepancy» = «a difference between two things that should match»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "The gyrocompass relies on magnetism rather than a spinning wheel.",
         ["Early compasses were first used for divination rather than travel.", "Gimbals kept compass needles level in rough seas.",
          "Compasses remain standard backup equipment on ships and aircraft."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 26-28-ը ասում են, որ gyrocompass-ը հենվում է պտտվող անիվի, ոչ մագնիսականության վրա, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word pitched in line 21 is closest in meaning to",
         "moved up and down at the front and back", ["sailed at very high speed", "remained perfectly still",
          "was repaired at a shipyard"],
         "«Pitched» = ալեկոծվեց, թեքվեց ցից-ցից:",
         ["«as a ship pitched and rolled» — «pitched» = «moved up and down at the front and back»:"]),
        (9, M, "Paragraph 8 (lines 29-31) mainly",
         "explains that satellites replaced compasses for daily use, but compasses remain a reliable backup",
         ["argues that compasses are now completely obsolete", "describes how satellite systems are manufactured",
          "lists every country that still requires compasses on ships"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը բացատրում է, որ արբանյակները փոխարինեցին կողմնացույցներին, բայց դրանք մնում են պահուստային:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing the compass's evolution from ancient curiosity to enduring navigational tool",
         ["dismissive of the compass's continued relevance", "purely technical with no historical context",
          "skeptical about the accuracy of satellite navigation"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է կողմնացույցի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "george westinghouse and alternating current")
    b.passage_mc(CLOZE_A, "cloze-westinghouse", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly distributed»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would transform»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first commercially deployed» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "lab-grown organ transplants by 2070")
    b.passage_mc(CLOZE_B, "cloze-organtransplants", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2070» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be sourced", ["will source", "is sourced", "have sourced"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be sourced»:"]),
    ])
    b.register_topic("cloze_topics", "the nazca lines mystery")
    b.passage_mc(CLOZE_C, "cloze-nazca", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been created", ["should be created", "have to create", "can create"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been created»:"]),
        (22, M, "Choose the right option for gap (22).", "had been intended", ["had intended", "hasn't been intended", "wasn't intending"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been intended»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been used", ["may use", "may be used", "has to use"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been used» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public repair cafes")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-16", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "artisan cheese cooperative programs (vii)")
    t.gen_wordbank(b, rng, 56, "Artisan cheese cooperative programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "community kayak launch restoration (ix)")
    t.gen_wordbank(b, rng, 62, "Community kayak launch restoration", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
