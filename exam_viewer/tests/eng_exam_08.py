# -*- coding: utf-8 -*-
"""English mock exam #8 (AEE-ENG-008). Reading: world's fairs/expositions.
Cloze: Mendeleev/periodic table, AI disaster response by 2075, Antikythera mechanism."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 8)"
EXAM_IDX = 8
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Beginning in the mid-nineteenth century, nations began hosting
2.  large public exhibitions designed to showcase industrial progress,
3.  scientific discovery, and cultural achievement to an international
4.  audience. These events, often called world's fairs, drew millions
5.  of visitors eager to see inventions and ideas from countries they
6.  might otherwise never encounter.
7.      Early fairs served as showcases for the industrial age, featuring
8.  massive halls filled with machinery, textiles, and manufactured
9.  goods from participating nations. Host cities frequently constructed
10. ambitious new buildings specifically for the occasion, some of which,
11. like elaborate iron-and-glass exhibition halls, became lasting
12. symbols of architectural innovation long after the fair itself had
13. closed.
14.     Beyond commerce and industry, world's fairs became platforms for
15. introducing new inventions to a global public for the first time.
16. Visitors encountered telephones, early motion pictures, and other
17. technologies that would later transform daily life, often years
18. before such devices became commercially available in ordinary homes.
19. Fairs also featured pavilions representing individual nations, each
20. designed to project a particular image of that country's culture
21. and achievements.
22.     Organizing a world's fair required enormous coordination and
23. expense, and host governments often justified the cost by pointing
24. to tourism revenue and international prestige. Critics, however,
25. argued that the lavish spending diverted funds from more pressing
26. domestic needs, a tension that persisted across many editions of the
27. event.
28.     As television and international travel made cross-cultural
29. exchange easier, the singular importance of world's fairs gradually
30. declined. Modern expositions continue today, though on a smaller
31. scale and with less cultural significance than during their
32. nineteenth and early twentieth century peak, when they represented
33. one of the only ways to witness the wider world firsthand."""

CLOZE_A = (
    "Chemical classification (11) __________ dramatically since the mid-19th century. Before the "
    "periodic table, chemists organized elements with no consistent system, making patterns "
    "difficult to predict. In 1869, while Dmitri Mendeleev (12) __________ on a way to arrange all "
    "known elements by atomic weight, he noticed that similar chemical properties repeated at "
    "regular intervals. He realized that leaving gaps in his table (13) __________ room for "
    "elements not yet discovered.\n\n"
    "Although he published his table quickly, the arrangement (14) __________ by the wider "
    "scientific community for several more years. It wasn't until predicted elements were actually "
    "discovered that skepticism faded. It was estimated that within a few decades the invention "
    "(15) __________ how chemists understood the relationships between elements."
)
CLOZE_B = (
    "By the year 2075, the way emergency services respond to natural disasters (16) __________ "
    "beyond recognition. Currently, engineers (17) __________ to develop AI systems capable of "
    "predicting disaster zones and coordinating rescue efforts within minutes. These systems "
    "(18) __________ to reduce response times in areas that are difficult for humans to reach "
    "quickly. However, some critics argue that such systems (19) __________ be too unreliable "
    "during communication blackouts. If reliability continues to improve, experts predict that by "
    "the end of the century, most disaster response (20) __________ by AI-coordinated teams rather "
    "than manual planning alone."
)
CLOZE_C = (
    "In 1901, divers recovered a corroded bronze device from an ancient shipwreck near the Greek "
    "island of Antikythera. Investigators believe the mechanism (21) __________ intricate bronze "
    "gears to predict astronomical positions, as X-ray imaging revealed dozens of interlocking "
    "components. Since no comparable device had ever been found from that era, some concluded that "
    "it (22) __________ by a single exceptionally skilled craftsman. Other theorists argued that "
    "the mechanism (23) __________ using knowledge passed down from a now-lost tradition of "
    "instrument makers. Whatever the truth, its exact purpose (24) __________ officially by any "
    "historian, though most agree it functioned as an astronomical calculator. Researchers continue "
    "to study fragments recovered from the wreck. Unless a similar device (25) __________, the full "
    "scope of ancient Greek engineering may remain uncertain."
)
WORDFORM_PASSAGE = (
    "Digital detox retreats have become common among people seeking a break from constant "
    "connectivity. The (38) __________ behind these retreats is to give participants extended time "
    "away from screens and notifications. Such retreats are especially (39) __________ among "
    "professionals experiencing high levels of stress.\n\n"
    "Organizers must consider factors like guest comfort and structured activities to ensure "
    "long-term (40) __________. When retreats are planned (41) __________, participants often "
    "report lasting improvements in focus.\n\n"
    "Studies suggest that digital detox retreats can improve both (42) __________ wellbeing and "
    "sleep quality."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "world's fairs and international expositions")
    b.passage_mc(PASSAGE, "reading-8", RC_TOPIC, [
        (1, E, "According to the text, world's fairs were designed to showcase",
         "industrial progress, scientific discovery, and cultural achievement",
         ["only military technology and defense innovations", "exclusively agricultural techniques",
          "only the host nation's own achievements"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 2-4. «designed to showcase industrial progress, scientific discovery, and cultural achievement»:"]),
        (2, M, "The pronoun each in line 20 stands for",
         "pavilions", ["visitors", "nations", "fairs"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...pavilions representing individual nations, each designed to project...» — «each» վերաբերում է «pavilions»-ին:"]),
        (3, M, "According to paragraph 3 (lines 14-21), world's fairs served as platforms for",
         "introducing new inventions to a global public for the first time",
         ["banning new technologies from public display", "eliminating the need for national pavilions",
          "replacing television as the main form of entertainment"],
         "Փնտրել պարբերության առաջին նախադասությունը:",
         ["Տողեր 14-15-ը ասում են, որ ցուցահանդեսները հանդիսացան հարթակներ նոր գյուտերի ներկայացման համար:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"These events, often called world\'s fairs, drew millions of visitors eager to see '
         'inventions and ideas from countries they might otherwise never encounter."',
         "World's fairs attracted huge crowds curious about foreign inventions and ideas.",
         ["World's fairs were attended only by government officials.", "Visitors already knew about every invention shown at the fairs.",
          "World's fairs discouraged international curiosity."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ցուցահանդեսները ներգրավում էին միլիոնավոր այցելուների՝ հետաքրքրված այլ երկրների գյուտերով:"]),
        (5, M, "How did television and international travel affect world's fairs, according to the text?",
         "They reduced the fairs' singular importance for cross-cultural exchange.",
         ["They caused world's fairs to grow even larger than before.", "They had no connection to the popularity of world's fairs.",
          "They eliminated the need for national pavilions entirely."],
         "Փնտրել 5-րդ պարբերության առաջին նախադասությունը:",
         ["Տողեր 28-29-ը ասում են, որ հեռուստատեսությունը և ճամփորդությունը նվազեցրին ցուցահանդեսների եզակի կարևորությունը:"]),
        (6, M, "The word lavish in line 25 may best be replaced by",
         "extremely generous", ["extremely limited", "entirely secret", "very predictable"],
         "«Lavish» = շռայլ, չափազանց առատ:",
         ["«the lavish spending diverted funds» — «lavish» = «extremely generous» (շռայլ):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "World's fairs have grown steadily larger and more significant every year since their peak.",
         ["Host cities often constructed ambitious new buildings for fairs.", "Visitors encountered telephones and early motion pictures at fairs.",
          "Critics argued that fair spending diverted funds from domestic needs."],
         "Համեմատել յուրաքանչյուր տարբերակը եզրափակիչ պարբերության հետ:",
         ["Տողեր 29-31-ը ասում են, որ ցուցահանդեսների նշանակությունը նվազել է, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word prestige in line 24 is closest in meaning to",
         "high reputation", ["financial loss", "physical danger", "public criticism"],
         "«Prestige» = հեղինակություն, բարձր համբավ:",
         ["«tourism revenue and international prestige» — «prestige» = «high reputation» (հեղինակություն):"]),
        (9, M, "Paragraph 4 (lines 22-27) mainly",
         "discusses the cost of hosting fairs and the resulting public criticism",
         ["argues that fairs should never charge admission",
          "explains the architectural techniques used in exhibition halls",
          "lists every invention displayed at world's fairs"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը քննարկում է ցուցահանդեսների կազմակերպման ծախսերը և դրանց քննադատությունը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "balanced, presenting both the achievements and criticisms of world's fairs",
         ["entirely dismissive of the value of world's fairs", "purely celebratory with no mention of criticism",
          "hostile toward international cultural exchange"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը նշում է և՛ ցուցահանդեսների նվաճումները, և՛ դրանց քննադատությունը, ինչը հավասարակշռված տոն է:"]),
    ])

    b.register_topic("cloze_topics", "Dmitri Mendeleev and the periodic table")
    b.passage_mc(CLOZE_A, "cloze-mendeleev", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-19th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was leaving", ["had been left", "have been left", "is left"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was leaving» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't accepted", ["hasn't been accepted", "is accepted", "had accepted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "AI-assisted disaster response by 2075")
    b.passage_mc(CLOZE_B, "cloze-aidisaster", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2075» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be coordinated", ["will coordinate", "is coordinated", "have coordinated"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be coordinated»:"]),
    ])
    b.register_topic("cloze_topics", "the Antikythera mechanism mystery")
    b.passage_mc(CLOZE_C, "cloze-antikythera", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have used", ["should be used", "have to use", "can use"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա:", ["Modal Perfect «must have used»:"]),
        (22, M, "Choose the right option for gap (22).", "had been built", ["had built", "hasn't been built", "wasn't building"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been built»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been constructed", ["may construct", "may be constructed", "has to construct"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been constructed» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "digital detox retreats")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-8", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "popular", ["popularly", "popularity", "unpopular"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «popular»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "carefully", ["careful", "carefulness", "careless"],
         "«Are planned ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «carefully»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "mental", ["mentally", "mentality", "mentalize"],
         "«___ wellbeing» դիրքում գոյականից առաջ անհրաժեշտ է ածական:", ["«mental wellbeing» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "urban night market revival (VII)")
    t.gen_wordbank(b, rng, 56, "Urban night market revival", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "citizen science data collection (IX)")
    t.gen_wordbank(b, rng, 62, "Citizen science data collection", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
