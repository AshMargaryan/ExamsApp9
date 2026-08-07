# -*- coding: utf-8 -*-
"""English mock exam #7 (AEE-ENG-007). Reading: history of timekeeping/clocks.
Cloze: Walter Hunt/safety pin, atmospheric water harvesting by 2085, Roanoke mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 7)"
EXAM_IDX = 7
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  For most of human history, people tracked the passage of time
2.  using natural cues such as the position of the sun, the phases of
3.  the moon, and the changing seasons. These methods were adequate for
4.  agricultural and religious purposes but offered little precision for
5.  coordinating activities across a single day.
6.      Early mechanical devices such as sundials and water clocks
7.  improved precision somewhat, allowing daylight hours to be divided
8.  into smaller segments. Water clocks, which measured time by the
9.  steady flow of liquid from one container to another, could even
10. function at night or on cloudy days when sundials were useless.
11. Still, these devices required regular adjustment and rarely agreed
12. with one another from one town to the next.
13.     The invention of the mechanical clock in medieval Europe marked
14. a turning point. Driven by a weight-and-gear mechanism regulated by
15. an escapement, these clocks could run continuously without constant
16. human attention. Towns began installing large public clocks in
17. central squares, allowing entire communities to coordinate work,
18. worship, and trade around a shared schedule for the first time.
19.     The seventeenth-century invention of the pendulum clock
20. dramatically improved accuracy, reducing errors to a few seconds per
21. day rather than the many minutes typical of earlier mechanisms.
22. This precision proved essential for navigation, since determining a
23. ship's longitude at sea depended on comparing local time with the
24. exact time at a reference point far away.
25.     The twentieth century introduced quartz and later atomic clocks,
26. each far more accurate than anything mechanical gears could achieve.
27. Atomic clocks, which measure time using the vibrations of atoms,
28. remain accurate to within a fraction of a second over millions of
29. years, forming the backbone of modern satellite navigation systems.
30.     Despite these advances, historians note that the underlying
31. human need has never changed: a reliable way to divide the day into
32. shared, predictable units that communities can coordinate around,
33. whether measured by sunlight, gears, or vibrating atoms."""

CLOZE_A = (
    "Everyday household safety (11) __________ dramatically since the mid-19th century. Before the "
    "safety pin, fastening clothing or diapers relied on straight pins that frequently caused "
    "injuries. In 1849, while Walter Hunt (12) __________ on a way to pay off a small debt, he "
    "twisted a piece of wire into a clasp with a protective coil and guard. He realized that the "
    "coiled spring (13) __________ the pin's point safely covered when closed.\n\n"
    "Although he patented the invention quickly, the design (14) __________ by clothing "
    "manufacturers for several more years. It wasn't until mass production made the pins "
    "inexpensive that everyday use became common. It was estimated that within a few decades the "
    "invention (15) __________ how parents and tailors handled everyday fastening."
)
CLOZE_B = (
    "By the year 2085, the way arid regions obtain fresh water (16) __________ beyond recognition. "
    "Currently, engineers (17) __________ to develop devices that extract drinkable water directly "
    "from humidity in the air. These devices (18) __________ to reduce dependence on unreliable "
    "rainfall in drought-prone areas. However, some critics argue that such systems (19) "
    "__________ be too energy-intensive to operate at scale. If efficiency continues to improve, "
    "experts predict that by the end of the century, most desert communities (20) __________ by "
    "atmospheric water harvesters rather than distant pipelines."
)
CLOZE_C = (
    "In 1587, English settlers established a colony on Roanoke Island, but when a supply ship "
    "returned three years later, every colonist had vanished. Investigators believe the settlers "
    "(21) __________ the island in an organized departure, as no signs of violence or struggle were "
    'found. Since the word "Croatoan" was found carved into a post, some concluded that the '
    "colonists (22) __________ by a nearby friendly tribe. Other theorists argued that the settlers "
    "(23) __________ by disease or starvation before ever leaving the island. Whatever the truth, "
    "their exact fate (24) __________ officially by any historian or archaeologist. Researchers "
    "continue to search the region for physical evidence. Unless conclusive artifacts (25) "
    "__________, the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "Green roof installations have become common in cities seeking ways to reduce urban heat. The "
    "(38) __________ behind these roofs is to cover buildings with vegetation that absorbs "
    "rainwater and insulates the structure. Such installations are especially (39) __________ in "
    "cities with limited ground-level green space.\n\n"
    "Building owners must consider factors like structural weight and drainage to ensure long-term "
    "(40) __________. When roofs are maintained (41) __________, plant coverage often thrives for "
    "many years.\n\n"
    "Studies suggest that green roofs can improve both (42) __________ air quality and building "
    "energy efficiency."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of timekeeping and clocks")
    b.passage_mc(PASSAGE, "reading-7", RC_TOPIC, [
        (1, E, "According to the text, before mechanical devices, people tracked time mainly using",
         "natural cues such as the sun, moon phases, and seasons",
         ["water clocks powered by flowing liquid", "atomic vibrations measured with precision instruments",
          "public clocks installed in town squares"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-3. «people tracked the passage of time using natural cues such as the position of the sun»:"]),
        (2, M, "The pronoun these in line 15 stands for",
         "mechanical clocks", ["towns", "gears", "escapements"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...these clocks could run continuously without constant human attention» — «these» վերաբերում է «mechanical clocks»-ին:"]),
        (3, M, "According to paragraph 3 (lines 13-18), public clocks in town squares allowed communities to",
         "coordinate work, worship, and trade around a shared schedule",
         ["eliminate the need for any further timekeeping inventions", "navigate ships across the open ocean",
          "measure time using atomic vibrations"],
         "Փնտրել պարբերության վերջին նախադասությունը:",
         ["Տողեր 17-18-ը ասում են, որ հանրային ժամացույցները թույլ էին տալիս համայնքին համաժամեցնել գործունեությունը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"The seventeenth-century invention of the pendulum clock dramatically improved accuracy, '
         'reducing errors to a few seconds per day rather than the many minutes typical of earlier mechanisms."',
         "The pendulum clock made timekeeping far more precise than earlier mechanical clocks.",
         ["The pendulum clock was less accurate than earlier sundials.", "Errors of several minutes per day only began after the pendulum clock.",
          "The pendulum clock eliminated the need for any further improvements."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ճոճանակավոր ժամացույցը զգալիորեն բարելավեց ճշգրտությունը:"]),
        (5, M, "How did the pendulum clock's precision affect navigation, according to the text?",
         "It allowed sailors to determine longitude by comparing local and reference time.",
         ["It made navigation unnecessary for long ocean voyages.", "It had no connection to maritime navigation.",
          "It replaced the need for maps and compasses entirely."],
         "Փնտրել 4-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 22-24-ը ասում են, որ ճշգրտությունը կարևոր էր, քանի որ երկայնության որոշումը կախված էր ժամանակի համեմատությունից:"]),
        (6, M, "The word adequate in line 3 may best be replaced by",
         "sufficient", ["precise", "outdated", "expensive"],
         "«Adequate» = բավարար, բավականաչափ:",
         ["«These methods were adequate for agricultural and religious purposes» — «adequate» = «sufficient»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Water clocks were more accurate than atomic clocks.",
         ["Atomic clocks measure time using the vibrations of atoms.", "Mechanical clocks used a weight-and-gear mechanism.",
          "Sundials were useless at night or on cloudy days."],
         "Համեմատել յուրաքանչյուր տարբերակը 5-րդ պարբերության հետ:",
         ["Տողեր 25-29-ը ասում են, որ ատոմային ժամացույցներն ամենաճշգրիտն են, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word regulated in line 14 is closest in meaning to",
         "controlled", ["invented", "ignored", "destroyed"],
         "«Regulated» = վերահսկվող, կարգավորվող:",
         ["«regulated by an escapement» — «regulated» = «controlled» (վերահսկվող):"]),
        (9, M, "Paragraph 5 (lines 25-29) mainly",
         "describes how quartz and atomic clocks surpassed mechanical accuracy",
         ["argues that atomic clocks should replace all public clocks",
          "explains the chemical structure of quartz crystals",
          "lists every country that adopted atomic timekeeping"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է քվարցային և ատոմային ժամացույցների բարձր ճշգրտությունը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "appreciative of humanity's continuous pursuit of precise timekeeping",
         ["dismissive of the value of accurate clocks", "purely technical with no historical narrative",
          "critical of modern satellite navigation systems"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը հետևում է ժամանակի չափման էվոլյուցիային՝ շեշտելով մարդկության մշտական ձգտումը ճշգրտության:"]),
    ])

    b.register_topic("cloze_topics", "Walter Hunt and the safety pin")
    b.passage_mc(CLOZE_A, "cloze-safetypin", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-19th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was keeping", ["had been kept", "have been kept", "is kept"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was keeping» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "atmospheric water harvesting by 2085")
    b.passage_mc(CLOZE_B, "cloze-waterharvesting", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2085» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be supplied", ["will supply", "is supplied", "have supplied"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be supplied»:"]),
    ])
    b.register_topic("cloze_topics", "the disappearance of the Roanoke colony")
    b.passage_mc(CLOZE_C, "cloze-roanoke", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have left", ["should be left", "have to leave", "can leave"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա:", ["Modal Perfect «must have left»:"]),
        (22, M, "Choose the right option for gap (22).", "had been sheltered", ["had sheltered", "hasn't been sheltered", "wasn't sheltering"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been sheltered»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been killed", ["may kill", "may be killed", "has to kill"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been killed» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "green roof installations")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-7", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "popular", ["popularly", "popularity", "unpopular"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «popular»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "properly", ["proper", "propriety", "improper"],
         "«Are maintained ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «properly»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "urban", ["urbanize", "urbanization", "urbanely"],
         "«___ air quality» դիրքում գոյականից առաջ անհրաժեշտ է ածական:", ["«urban air quality» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "community mentorship for at-risk youth (VII)")
    t.gen_wordbank(b, rng, 56, "Community mentorship for at-risk youth", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "language revitalization workshops (IX)")
    t.gen_wordbank(b, rng, 62, "Language revitalization workshops", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
