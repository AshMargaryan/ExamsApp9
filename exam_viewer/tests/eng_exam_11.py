# -*- coding: utf-8 -*-
"""English mock exam #11 (AEE-ENG-011). Reading: public transportation systems.
Cloze: Otis/elevator brake, autonomous cargo shipping by 2075, Oak Island mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 11)"
EXAM_IDX = 11
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  As cities grew rapidly during the industrial era, moving large
2.  numbers of people efficiently became an urgent practical problem.
3.  Early solutions relied on horse-drawn carriages running along fixed
4.  routes, but the limited speed and capacity of horses could not keep
5.  pace with expanding urban populations.
6.      The introduction of steam-powered and later electric railways
7.  transformed urban mobility. Streetcars running on fixed rails could
8.  carry far more passengers than carriages, and their predictable
9.  routes allowed workers to live farther from city centers while
10. still commuting reliably each day. Some cities went further,
11. building underground railways to avoid congested surface streets
12. entirely, allowing trains to move quickly regardless of traffic above.
13.     Buses offered a more flexible alternative, since routes could be
14. adjusted without laying new tracks. This flexibility made buses
15. particularly useful for connecting newer neighborhoods not yet
16. served by rail lines, though buses generally carried fewer
17. passengers per vehicle than trains.
18.     Public transportation systems required enormous investment, and
19. debates over funding have persisted throughout their history. Some
20. argue that governments should heavily subsidize fares to keep
21. transportation accessible to lower-income riders, while others
22. contend that systems should operate closer to self-sufficiency
23. through fare revenue alone.
24.     In recent decades, cities have experimented with light rail,
25. bus rapid transit, and integrated ticketing systems that allow
26. passengers to switch between different modes of transport
27. seamlessly using a single payment method.
28.     Despite ongoing challenges, transportation planners generally
29. agree that efficient public transit remains essential for reducing
30. traffic congestion, lowering emissions, and ensuring that mobility
31. does not depend entirely on private vehicle ownership, particularly
32. for residents who cannot afford or are unable to drive a car of
33. their own.

"""

CLOZE_A = (
    "Building safety (11) __________ dramatically since the mid-19th century. Before reliable "
    "elevators, tall buildings were impractical since climbing many flights of stairs discouraged "
    "upper-floor use. In 1852, while Elisha Otis (12) __________ on a way to prevent elevator cars "
    "from falling if a cable snapped, he designed a mechanism that gripped guide rails "
    "automatically. He realized that a spring-loaded safety catch (13) __________ the car firmly in "
    "place the instant tension was lost.\n\n"
    "Although he demonstrated the device successfully, elevators (14) __________ by the public as "
    "genuinely safe for several more years. It wasn't until dramatic public demonstrations proved "
    "the mechanism's reliability that skepticism faded. It was estimated that within a few decades "
    "the invention (15) __________ how tall buildings could be designed and used."
)
CLOZE_B = (
    "By the year 2075, the way goods travel across oceans (16) __________ beyond recognition. "
    "Currently, engineers (17) __________ to develop autonomous cargo ships capable of navigating "
    "shipping routes without a human crew. These ships (18) __________ to reduce both labor costs "
    "and human error during long voyages. However, some critics argue that such vessels "
    "(19) __________ be too vulnerable to cyberattacks while at sea. If security continues to "
    "improve, experts predict that by the end of the century, most international freight "
    "(20) __________ by autonomous fleets rather than crewed vessels."
)
CLOZE_C = (
    "Since 1795, treasure hunters have dug numerous shafts into Oak Island searching for a fortune "
    "some believe lies buried deep underground. Investigators believe the original shaft "
    "(21) __________ deliberately with wooden platforms at regular intervals, as searchers "
    "repeatedly found layers of logs while digging. Since the shaft consistently floods with "
    "seawater at a certain depth, some concluded that it (22) __________ by a hidden tunnel "
    "connected to the nearby coast. Other theorists argued that the flooding pattern "
    "(23) __________ by nothing more than natural underground water channels. Whatever the truth, "
    "the shaft's original purpose (24) __________ officially by any excavation conducted so far. "
    "Researchers continue to fund new expeditions to the island. Unless conclusive evidence "
    "(25) __________, the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "Food rescue organizations have become common in cities seeking to reduce edible food waste. "
    "The (38) __________ behind these organizations is to collect surplus food from restaurants "
    "and grocers before it is discarded. Such organizations are especially (39) __________ in "
    "areas with high rates of food insecurity.\n\n"
    "Coordinators must consider factors like food safety and reliable transportation to ensure "
    "long-term (40) __________. When operations are managed (41) __________, the amount of rescued "
    "food often grows steadily each year.\n\n"
    "Studies suggest that food rescue organizations can improve both (42) __________ nutrition and "
    "environmental outcomes."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "development of public transportation systems")
    b.passage_mc(PASSAGE, "reading-11", RC_TOPIC, [
        (1, E, "According to the text, early urban transport relied on",
         "horse-drawn carriages running along fixed routes",
         ["underground electric railways", "autonomous buses with flexible routes",
          "integrated ticketing systems"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 3-4. «Early solutions relied on horse-drawn carriages running along fixed routes»:"]),
        (2, M, "The pronoun their in line 8 stands for",
         "streetcars", ["carriages", "workers", "routes"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...their predictable routes allowed workers to live farther from city centers» — «their» վերաբերում է «streetcars»-ին:"]),
        (3, M, "According to paragraph 3 (lines 13-17), buses were particularly useful for",
         "connecting newer neighborhoods not yet served by rail lines",
         ["replacing underground railways entirely", "carrying more passengers than trains",
          "eliminating the need for fixed routes"],
         "Փնտրել պարբերության մեջ նշված ավտոբուսների առավելությունը:",
         ["Տողեր 14-16-ը ասում են, որ ավտոբուսների ճկունությունը հատկապես օգտակար էր նոր թաղամասերի սպասարկման համար:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Streetcars running on fixed rails could carry far more passengers than carriages, and '
         'their predictable routes allowed workers to live farther from city centers."',
         "Streetcars increased both passenger capacity and where workers could afford to live.",
         ["Streetcars reduced the number of people who could commute to work.", "Carriages could carry more passengers than streetcars.",
          "Streetcars had no effect on where people chose to live."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ տրամվայները մեծացրին տարողությունը և թույլ տվեցին բնակվել ավելի հեռու:"]),
        (5, M, "How did underground railways affect urban mobility, according to the text?",
         "They allowed trains to move quickly regardless of surface traffic congestion.",
         ["They eliminated the need for any surface transportation.", "They had no impact on commuting patterns.",
          "They were built only in cities without streetcars."],
         "Փնտրել 2-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 11-12-ը ասում են, որ ստորգետնյա երկաթուղիները թույլ էին տալիս գնացքներին շարժվել արագ՝ անկախ վերգետնյա երթևեկությունից:"]),
        (6, M, "The word congested in line 11 may best be replaced by",
         "crowded", ["empty", "modern", "expensive"],
         "«Congested» = խցանված, մարդաշատ:",
         ["«congested surface streets» — «congested» = «crowded» (խցանված):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "There has never been any disagreement about how to fund public transportation.",
         ["Streetcars ran on fixed rails and carried more passengers than carriages.",
          "Buses could adjust routes without laying new tracks.",
          "Some cities built underground railways to avoid surface congestion."],
         "Համեմատել յուրաքանչյուր տարբերակը 4-րդ պարբերության հետ:",
         ["Տողեր 18-19-ը ասում են, որ ֆինանսավորման վեճերը շարունակվել են, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word seamlessly in line 27 is closest in meaning to",
         "smoothly", ["expensively", "rarely", "dangerously"],
         "«Seamlessly» = անխափան, հարթ:",
         ["«switch between different modes of transport seamlessly» — «seamlessly» = «smoothly» (անխափան):"]),
        (9, M, "Paragraph 4 (lines 18-23) mainly",
         "discusses the ongoing debate over how to fund public transportation",
         ["argues that all public transportation should be free",
          "explains the mechanics of electric railway motors",
          "lists every city that has built an underground railway"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը քննարկում է հանրային տրանսպորտի ֆինանսավորման շուրջ շարունակվող բանավեճը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, emphasizing public transit's continued importance despite funding challenges",
         ["dismissive of the value of public transportation", "purely technical with no discussion of policy",
          "hostile toward private vehicle ownership"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը շեշտում է հանրային տրանսպորտի կարևորությունը՝ ընդունելով նաև ֆինանսավորման խնդիրները:"]),
    ])

    b.register_topic("cloze_topics", "Elisha Otis and the elevator safety brake")
    b.passage_mc(CLOZE_A, "cloze-otis", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-19th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was holding", ["had been held", "have been held", "is held"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was holding» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "weren't trusted", ["haven't been trusted", "aren't trusted", "hadn't trusted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված, հոգնակի ենթակա:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար; «elevators» հոգնակի է:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "autonomous cargo shipping by 2075")
    b.passage_mc(CLOZE_B, "cloze-cargoshipping", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2075» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be transported", ["will transport", "is transported", "have transported"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be transported»:"]),
    ])
    b.register_topic("cloze_topics", "the Oak Island money pit mystery")
    b.passage_mc(CLOZE_C, "cloze-oakisland", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been built", ["should be built", "have to build", "can build"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive «must have been built»:"]),
        (22, M, "Choose the right option for gap (22).", "had been connected", ["had connected", "hasn't been connected", "wasn't connecting"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been connected»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been caused", ["may cause", "may be caused", "has to cause"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been caused» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "food rescue organizations")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-11", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "valuable", ["valuably", "value", "devalue"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "efficiently", ["efficient", "efficiency", "inefficient"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «efficiently»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "community", ["communities", "communal", "communally"],
         "«___ nutrition» դիրքում գոյականից առաջ անհրաժեշտ է գոյական-որոշիչ:", ["«community nutrition» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "neighborhood watch technology upgrades (VII)")
    t.gen_wordbank(b, rng, 56, "Neighborhood watch technology upgrades", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "historic shipwreck preservation (IX)")
    t.gen_wordbank(b, rng, 62, "Historic shipwreck preservation", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
