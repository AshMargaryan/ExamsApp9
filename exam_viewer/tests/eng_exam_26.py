# -*- coding: utf-8 -*-
"""English mock exam #26 (AEE-ENG-026). Reading: history of the automobile.
Cloze: Rudolf Diesel/diesel engine, urban vertical wind turbines by 2050, the Winchester Mystery House."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 26)"
EXAM_IDX = 26
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before the automobile existed, long-distance travel depended
2.  entirely on horses, trains, or one's own two feet, each with
3.  significant limitations in speed, cost, or flexibility.
4.      Early self-propelled vehicles were powered by steam, requiring
5.  lengthy startup times and constant attention to maintain sufficient
6.  pressure, making them impractical for casual everyday use.
7.      The development of a compact internal combustion engine changed
8.  this entirely, offering a lighter, faster-starting alternative to
9.  bulky steam-powered machinery.
10.     Early automobiles remained expensive, hand-built machines
11. affordable only to the wealthy, assembled slowly by skilled
12. craftsmen working on a single vehicle at a time.
13.     A manufacturing breakthrough came with the introduction of the
14. moving assembly line, which broke vehicle construction into small,
15. repeatable tasks performed by workers stationed along a continuously
16. moving production line.
17.     This approach dramatically reduced the time and cost required
18. to build each vehicle, transforming automobiles from a luxury item
19. into a purchase within reach of ordinary working families.
20.     As automobile ownership spread, governments faced pressure to
21. build paved roads capable of handling far more traffic than existing
22. dirt paths designed for horse-drawn wagons.
23.     Widespread automobile ownership reshaped how cities grew,
24. enabling residential neighborhoods to spread far beyond areas
25. reachable by foot or public transit.
26.     Safety features developed gradually over subsequent decades,
27. including seatbelts, padded dashboards, and eventually airbags,
28. dramatically reducing fatalities from collisions.
29.     Emissions regulations later pushed manufacturers toward cleaner
30. engines, eventually leading to hybrid and fully electric vehicles
31. offered alongside traditional gasoline models.
32.     Few inventions have reshaped daily life, city design, and
33. global industry as thoroughly as the automobile.

"""

CLOZE_A = (
    "Before Rudolf Diesel's invention, industrial engines (11) __________ properly efficient because "
    "steam engines wasted a large proportion of their fuel as unused heat. While researching more "
    "efficient combustion methods, Diesel (12) __________ that compressing air until it became "
    "extremely hot could ignite fuel without a spark plug. He proposed that this compression-ignition "
    "design (13) __________ dramatically improve fuel efficiency compared to existing engines.\n\n"
    "Although his early prototypes suffered dangerous malfunctions, the diesel engine (14) __________ "
    "by shipping and manufacturing industries within a couple of decades of its invention. Today it is "
    "estimated that the design (15) __________ heavy industry significantly since it was first "
    "commercially produced."
)
CLOZE_B = (
    "By 2050, the way dense cities generate a share of their own electricity (16) __________ "
    "dramatically due to vertical wind turbine technology. Currently, engineers (17) __________ to "
    "refine turbine designs quiet enough for installation near residential buildings. These turbines "
    "(18) __________ to capture wind moving unpredictably between tall buildings, unlike traditional "
    "horizontal turbines. However, some critics argue that the technology (19) __________ still "
    "produce too little power to justify the installation cost. If design efficiency continues to "
    "improve, experts predict that by the middle of the century, many dense cities (20) __________ by "
    "a meaningful share of turbine-generated electricity."
)
CLOZE_C = (
    "For decades, a wealthy widow directed continuous construction on a sprawling mansion, adding "
    "staircases that lead nowhere, doors that open onto blank walls, and corridors that loop back on "
    "themselves. Investigators believe the unusual design (21) __________ by a superstitious belief "
    "that ongoing construction would ward off misfortune. Because building records from the period are "
    "incomplete, some concluded that many odd features (22) __________ by ordinary changes in "
    "architectural fashion over several decades of construction. Other theorists argued that the layout "
    "(23) __________ by a series of different architects who never coordinated their individual "
    "additions. Whatever the truth, the original motivation behind the house's design (24) __________ "
    "officially by historians, despite extensive research into surviving records. Unless personal "
    "letters explaining the design (25) __________, the true reasoning behind the house may never be "
    "confirmed."
)
WORDFORM_PASSAGE = (
    "Community glass recycling art programs have started in cities where artists want to transform "
    "discarded bottles into mosaics, sculptures, and stained glass pieces. Their central (38) __________ "
    "is to collect glass waste from residents and turn it into public art installations.\n\n"
    "Such programs prove especially (39) __________ in cities looking for creative ways to reduce "
    "landfill waste.\n\n"
    "Volunteers who run these programs must track glass sorting and kiln schedules to ensure long-term "
    "(40) __________. Where programs are organized (41) __________, participating artists typically "
    "complete a finished piece within a single season.\n\n"
    "Researchers note that glass recycling art programs can strengthen both community (42) __________ "
    "and waste reduction awareness."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the automobile")
    b.passage_mc(PASSAGE, "reading-26", RC_TOPIC, [
        (1, E, "According to the text, before the automobile existed, long-distance travel depended on",
         "horses, trains, or one's own two feet",
         ["bicycles exclusively", "steam-powered ships only", "hot air balloons"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-3. «depended entirely on horses, trains, or one's own two feet»:"]),
        (2, M, "The pronoun them in line 6 stands for",
         "early self-propelled vehicles (steam vehicles)", ["horses", "trains", "one's own two feet"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«requiring lengthy startup times... making them impractical» — «them» վերաբերում է «steam-powered vehicles»-ին:"]),
        (3, M, "According to paragraph 3 (lines 7-9), the internal combustion engine offered",
         "a lighter, faster-starting alternative to bulky steam-powered machinery",
         ["a slower but cheaper alternative to steam engines", "an engine that required no maintenance at all",
          "a way to eliminate the need for wheels"],
         "Փնտրել պարբերության մեջ նշված առավելությունը:",
         ["Տողեր 7-9-ը նկարագրում են այս առավելությունը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This approach dramatically reduced the time and cost required to build each vehicle, '
         'transforming automobiles from a luxury item into a purchase within reach of ordinary working '
         'families."',
         "The assembly line made cars cheaper and faster to build, so ordinary families could finally afford them.",
         ["The assembly line made automobiles more expensive than before.", "Automobiles remained a luxury item even after the assembly line.",
          "The assembly line had no effect on who could afford a car."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Հավաքման գիծը դարձրեց ավտոմեքենաները ավելի էժան և արագ արտադրվող, ուստի սովորական ընտանիքները կարողացան ձեռք բերել դրանք:"]),
        (5, M, "According to the text, widespread automobile ownership reshaped cities by",
         "enabling residential neighborhoods to spread far beyond areas reachable by foot or public transit",
         ["forcing all residents to live within city centers", "eliminating the need for any roads at all",
          "making public transit the only viable option"],
         "Փնտրել 6-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 23-25-ը նկարագրում են այս ազդեցությունը:"]),
        (6, M, "The word fatalities in line 28 may best be replaced by",
         "deaths resulting from an accident or disaster",
         ["injuries that heal completely", "financial losses from an accident", "delays caused by traffic congestion"],
         "«Fatalities» = մահեր (վթարից):",
         ["«dramatically reducing fatalities from collisions» — «fatalities» = «deaths resulting from an accident»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Emissions regulations had no influence on automobile engine design.",
         ["Early automobiles were expensive, hand-built machines.", "The assembly line reduced the time and cost to build vehicles.",
          "Safety features like seatbelts and airbags reduced fatalities."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 29-31-ը ասում են, որ արտանետումների կանոնակարգումը ազդեց շարժիչների նախագծման վրա, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word bulky in line 9 is closest in meaning to",
         "large and difficult to move due to size",
         ["extremely lightweight and compact", "inexpensive to manufacture", "resistant to damage"],
         "«Bulky» = ծանրակշիռ, ծավալուն:",
         ["«bulky steam-powered machinery» — «bulky» = «large and difficult to move due to size»:"]),
        (9, M, "The paragraph about emissions regulations mainly",
         "explains how regulations pushed manufacturers toward hybrid and electric vehicles",
         ["argues that gasoline engines should be banned immediately", "explains the exact chemical composition of vehicle emissions",
          "lists every country that has passed emissions regulations"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը բացատրում է, թե ինչպես կանոնակարգումները մղեցին արտադրողներին դեպի հիբրիդային և էլեկտրական մեքենաներ:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how the automobile transformed transportation, manufacturing, and city design",
         ["dismissive of the automobile's importance", "purely technical with no historical context",
          "alarmed about the dangers of automobile travel"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է ավտոմեքենայի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "rudolf diesel and the diesel engine")
    b.passage_mc(CLOZE_A, "cloze-diesel", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly efficient»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would improve»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first commercially produced» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "urban vertical wind turbines by 2050")
    b.passage_mc(CLOZE_B, "cloze-verticalwind", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2050» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be powered", ["will power", "is powered", "have powered"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be powered»:"]),
    ])
    b.register_topic("cloze_topics", "the winchester mystery house construction mystery")
    b.passage_mc(CLOZE_C, "cloze-winchester", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been influenced", ["should be influenced", "have to influence", "can influence"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been influenced»:"]),
        (22, M, "Choose the right option for gap (22).", "had been caused", ["had caused", "hasn't been caused", "wasn't causing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been caused»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been created", ["may create", "may be created", "has to create"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been created» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "community glass recycling art programs")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-26", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "urban owl nest box programs (vii)")
    t.gen_wordbank(b, rng, 56, "Urban owl nest box programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "neighborhood mural design contests (ix)")
    t.gen_wordbank(b, rng, 62, "Neighborhood mural design contests", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
