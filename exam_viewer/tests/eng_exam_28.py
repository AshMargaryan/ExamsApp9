# -*- coding: utf-8 -*-
"""English mock exam #28 (AEE-ENG-028). Reading: history of the calendar.
Cloze: John Logie Baird/television, autonomous reforestation drones by 2055, the Dancing Plague of 1518."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 28)"
EXAM_IDX = 28
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Long before mechanical clocks existed, ancient societies needed
2.  reliable methods for tracking the passage of days, months, and
3.  years to plan planting, harvests, and religious observances.
4.      Early calendars typically followed the visible phases of the
5.  moon, since a lunar cycle provided an easily observable, recurring
6.  unit of time roughly thirty days long.
7.      A persistent problem emerged from this approach: twelve lunar
8.  months add up to slightly less than a full solar year, causing a
9.  purely lunar calendar to drift gradually out of alignment with the
10. seasons over time.
11.     Some cultures solved this drift by periodically inserting an
12. extra month, realigning their calendar with the solar year at
13. irregular intervals determined by astronomical observation.
14.     Other cultures abandoned the lunar approach entirely, basing
15. their calendar instead on the sun's position, producing a year
16. length that stayed consistent with the changing seasons.
17.     Even solar calendars required periodic correction, since a solar
18. year does not divide evenly into a whole number of days, leaving a
19. small remainder that accumulates into a full extra day every few
20. years.
21.     Adding an occasional extra day kept the calendar aligned with
22. the seasons, though the exact rule for when to add this day varied
23. considerably between different calendar systems.
24.     Political and religious authorities often controlled calendar
25. adjustments directly, occasionally manipulating the calendar for
26. non-astronomical reasons, such as extending an official's term in
27. office.
28.     A major reform eventually corrected an accumulated drift of
29. several days, requiring some calendars to skip several dates
30. entirely to catch back up with the solar year.
31.     Modern timekeeping now relies on this refined solar calendar
32. worldwide, coordinated internationally for trade, travel, and
33. communication across every time zone.

"""

CLOZE_A = (
    "Before John Logie Baird's demonstrations, transmitting moving images over a distance "
    "(11) __________ properly achieved using any practical mechanical or electronic method. While "
    "experimenting with spinning discs and photocells in a makeshift attic laboratory, Baird "
    "(12) __________ that a rapidly scanning mechanism could convert an image into a transmittable "
    "signal. He proposed that this scanning technique (13) __________ eventually allow moving pictures "
    "to be broadcast into ordinary homes.\n\n"
    "Although his mechanical system faced fierce competition from electronic rivals, television "
    "(14) __________ by broadcasters within a couple of decades of his first public demonstration. "
    "Today it is estimated that the technology (15) __________ global media and communication "
    "significantly since it was first broadcast publicly."
)
CLOZE_B = (
    "By 2055, the way large deforested areas are replanted (16) __________ dramatically due to "
    "autonomous drone swarm technology. Currently, engineers (17) __________ to refine drones capable "
    "of identifying suitable planting spots from the air. These swarms (18) __________ to plant seed "
    "pods across terrain too steep or remote for human planting crews to access safely. However, some "
    "critics argue that the technology (19) __________ still struggle with survival rates compared to "
    "hand-planted seedlings. If planting accuracy continues to improve, experts predict that by the "
    "middle of the century, a significant share of large-scale reforestation (20) __________ using "
    "autonomous drone swarms rather than human planting crews alone."
)
CLOZE_C = (
    "In a city in the summer of 1518, a single woman reportedly began dancing in the street without "
    "apparent reason, and within weeks dozens of other residents had joined her, some continuing until "
    "they reportedly collapsed from exhaustion. Investigators believe the episode (21) __________ by a "
    "form of mass psychological stress triggered by famine, disease, and social hardship at the time. "
    "Because contaminated grain was common in the period, some concluded that the dancing "
    "(22) __________ by a toxic mold capable of causing hallucinations and involuntary movement. Other "
    "theorists argued that the outbreak (23) __________ by a religious fervor connected to a local "
    "saint associated with dancing compulsions. Whatever the truth, the precise trigger behind the "
    "event (24) __________ officially by historians, despite extensive study of surviving records. "
    "Unless a definitive contemporary account (25) __________, the exact cause may never be confirmed."
)
WORDFORM_PASSAGE = (
    "Community woodworking shops have opened in neighborhoods where residents want access to power "
    "tools without owning a full workshop themselves. Their central (38) __________ is to provide "
    "shared equipment and basic safety training so members can complete their own furniture and repair "
    "projects.\n\n"
    "Such shops prove especially (39) __________ for renters and apartment dwellers who lack space for "
    "large tools at home.\n\n"
    "Volunteers who run these shops must track tool maintenance and safety certifications to ensure "
    "long-term (40) __________. Where shops are organized (41) __________, members typically complete "
    "a small project within their first few visits.\n\n"
    "Researchers note that community woodworking shops can strengthen both neighborhood (42) __________ "
    "and practical skill-sharing."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the calendar")
    b.passage_mc(PASSAGE, "reading-28", RC_TOPIC, [
        (1, E, "According to the text, early calendars typically followed",
         "the visible phases of the moon",
         ["the position of nearby stars only", "the migration patterns of birds", "the changing color of tree leaves"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 4-6. «Early calendars typically followed the visible phases of the moon»:"]),
        (2, M, "The pronoun this in line 11 stands for",
         "the drift out of alignment with the seasons", ["the moon's visible phases", "the solar year", "astronomical observation"],
         "Գտնել այն երևույթը, որին վերաբերում է դերանունը:",
         ["«Some cultures solved this drift» — «this» վերաբերում է նախորդ նախադասության «drift»-ին:"]),
        (3, M, "According to paragraph 3 (lines 7-10), twelve lunar months add up to",
         "slightly less than a full solar year, causing gradual drift from the seasons",
         ["exactly the same length as a solar year", "significantly more than a full solar year",
          "an unpredictable length that varies every year"],
         "Փնտրել պարբերության մեջ նշված խնդիրը:",
         ["Տողեր 7-10-ը նկարագրում են այս խնդիրը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Even solar calendars required periodic correction, since a solar year does not divide '
         'evenly into a whole number of days."',
         "Solar calendars also needed occasional adjustments because a year isn't made up of an exact whole number of days.",
         ["Solar calendars never needed any correction at all.", "A solar year divides perfectly into a whole number of days.",
          "Only lunar calendars ever required correction."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Արևային օրացույցներն ևս պահանջում էին պարբերական ուղղում, քանի որ տարին ամբողջական թվով օրերի չի բաժանվում:"]),
        (5, M, "According to the text, political and religious authorities sometimes",
         "manipulated the calendar for non-astronomical reasons, such as extending a term in office",
         ["refused to ever adjust the calendar for any reason", "were legally forbidden from adjusting calendars",
          "relied entirely on scientists to make every decision"],
         "Փնտրել 8-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 24-27-ը նկարագրում են այս երևույթը:"]),
        (6, M, "The word drift in line 9 may best be replaced by",
         "a gradual movement away from an original position or alignment",
         ["a sudden, dramatic change", "a type of religious ceremony", "a method of measuring distance"],
         "«Drift» = աստիճանական շեղում:",
         ["«drift gradually out of alignment» — «drift» = «a gradual movement away from alignment»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Solar calendars never required any correction once established.",
         ["Early calendars typically followed the phases of the moon.", "Some cultures inserted an extra month to realign with the solar year.",
          "A major reform corrected an accumulated drift of several days."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 17-20-ը ասում են, որ արևային օրացույցներն ևս պահանջում էին ուղղում, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word accumulates in line 19 is closest in meaning to",
         "gradually increases or builds up over time",
         ["suddenly disappears completely", "remains exactly the same", "decreases steadily over time"],
         "«Accumulates» = կուտակվում է:",
         ["«a small remainder that accumulates» — «accumulates» = «gradually increases or builds up»:"]),
        (9, M, "The paragraph about the major calendar reform mainly",
         "describes how a reform corrected accumulated drift by skipping several dates",
         ["argues that calendar reform should never be attempted", "explains the exact mathematics of orbital mechanics",
          "lists every country that adopted the reform simultaneously"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես բարեփոխումը ուղղեց կուտակված շեղումը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how calendars evolved to stay aligned with astronomical reality",
         ["dismissive of the importance of accurate calendars", "purely technical with no historical context",
          "critical of political interference in calendar systems"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է օրացույցների էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "john logie baird and television")
    b.passage_mc(CLOZE_A, "cloze-baird", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly achieved»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would allow»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first broadcast publicly» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "autonomous reforestation drone swarms by 2055")
    b.passage_mc(CLOZE_B, "cloze-reforestdrones", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2055» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be conducted", ["will conduct", "is conducted", "have conducted"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be conducted»:"]),
    ])
    b.register_topic("cloze_topics", "the dancing plague of 1518 mystery")
    b.passage_mc(CLOZE_C, "cloze-dancingplague", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been triggered", ["should be triggered", "have to trigger", "can trigger"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been triggered»:"]),
        (22, M, "Choose the right option for gap (22).", "had been caused", ["had caused", "hasn't been caused", "wasn't causing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been caused»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been fueled", ["may fuel", "may be fueled", "has to fuel"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been fueled» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "community woodworking shops")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-28", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "public telescope lending libraries (vii)")
    t.gen_wordbank(b, rng, 56, "Public telescope lending libraries", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "neighborhood puppet theater programs (ix)")
    t.gen_wordbank(b, rng, 62, "Neighborhood puppet theater programs", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
