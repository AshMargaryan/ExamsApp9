# -*- coding: utf-8 -*-
"""English mock exam #15 (AEE-ENG-015). Reading: history of glassmaking.
Cloze: Alexander Fleming/penicillin, brain-computer interfaces by 2065, the Bermuda Triangle disappearances."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 15)"
EXAM_IDX = 15
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Glassmaking is one of humanity's oldest crafts, with the earliest
2.  known glass objects dating back several thousand years to regions
3.  around the eastern Mediterranean and Mesopotamia.
4.      Early glass was made by heating sand, ash, and other minerals
5.  together at extremely high temperatures until they fused into a
6.  molten liquid. Because early furnaces struggled to reach consistent
7.  temperatures, the resulting glass was often cloudy, bubbled, and
8.  difficult to shape into anything beyond small beads and simple
9.  vessels.
10.     A major breakthrough came with the invention of glassblowing,
11. a technique that allowed craftsmen to shape molten glass by blowing
12. air through a long hollow tube. This method dramatically sped up
13. production, making glass vessels affordable enough for ordinary
14. households rather than only the wealthy.
15.     For centuries afterward, glassmaking remained a closely guarded
16. trade secret in many regions, with skilled artisans forbidden from
17. leaving their cities under penalty of severe punishment, in order to
18. prevent rival regions from learning their techniques.
19.     The development of clearer, more transparent glass eventually
20. made possible one of the craft's most significant contributions to
21. science: the lens. Ground and polished glass lenses enabled the
22. invention of eyeglasses, microscopes, and telescopes, extending human
23. vision in ways previously unimaginable.
24.     Industrialization transformed glassmaking from a slow, skilled
25. craft into a mechanized process. Machines could now produce
26. identical bottles, windows, and jars at speeds no human glassblower
27. could match, making glass one of the cheapest and most common
28. materials in everyday life.
29.     Today, specialized glass serves purposes far beyond windows and
30. containers, from fiber optic cables that carry information at the
31. speed of light to heat-resistant glass used in spacecraft.
32.     Despite these advances, some artisans continue to practice
33. traditional hand-blowing techniques, valuing the craft as an art form in its own right.

"""

CLOZE_A = (
    "Before Alexander Fleming's discovery, effective treatments for many bacterial infections "
    "(11) __________ properly available to doctors. While examining a contaminated petri dish in his "
    "laboratory, Fleming (12) __________ that a mold growing on the dish had killed the surrounding "
    "bacteria. He proposed that the mold (13) __________ responsible for producing a substance that "
    "could fight infection.\n\n"
    "Although his findings faced skepticism initially, penicillin (14) __________ by the medical "
    "community within two decades of his discovery. Today it is estimated that antibiotics "
    "(15) __________ millions of lives since penicillin was first mass-produced."
)
CLOZE_B = (
    "By 2065, the way people with severe paralysis communicate (16) __________ dramatically due to "
    "brain-computer interface technology. Currently, researchers (17) __________ to refine implants "
    "that translate neural signals directly into text or speech. These devices (18) __________ to "
    "restore a degree of independence to patients who have lost the ability to speak or move. However, "
    "some ethicists argue that the technology (19) __________ raise serious questions about mental "
    "privacy. If safety standards continue to improve, experts predict that by the middle of the "
    "century, communication for paralyzed patients (20) __________ by neural implants rather than "
    "eye-tracking or assistive switches."
)
CLOZE_C = (
    "For decades, sailors and pilots have reported that a stretch of ocean between three points in the "
    "western Atlantic has an unusually high number of unexplained disappearances. Investigators believe "
    "several incidents (21) __________ by sudden, severe storms that developed faster than ships could "
    "react to. Because compasses sometimes behave unpredictably in the region, some concluded that the "
    "disappearances (22) __________ by magnetic anomalies affecting navigation equipment. Other "
    "theorists argued that the losses (23) __________ by simple human error, given how heavily "
    "trafficked the area has always been. Whatever the truth, a single definitive cause for every "
    "incident (24) __________ officially by maritime investigators, despite decades of study. Unless "
    "new wreckage (25) __________, several of the most famous cases may never be resolved."
)
WORDFORM_PASSAGE = (
    "Community bike repair co-ops have opened in cities where residents want an affordable alternative "
    "to commercial repair shops. Their central (38) __________ is to teach basic maintenance skills "
    "while sharing tools members could not otherwise afford individually.\n\n"
    "Such co-ops prove especially (39) __________ in neighborhoods where public transit options remain "
    "limited.\n\n"
    "Volunteers who run these co-ops must track tool inventories and repair requests to ensure "
    "long-term (40) __________. Where co-ops are organized (41) __________, members typically leave "
    "with a working bicycle the same day.\n\n"
    "Researchers note that bike co-ops can strengthen both community (42) __________ and household "
    "transportation costs."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of glassmaking")
    b.passage_mc(PASSAGE, "reading-15", RC_TOPIC, [
        (1, E, "According to the text, the earliest known glass objects date back to regions around",
         "the eastern Mediterranean and Mesopotamia",
         ["northern Europe and Scandinavia", "the Amazon rainforest basin", "the Australian outback"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 2-3. «regions around the eastern Mediterranean and Mesopotamia»:"]),
        (2, M, "The pronoun their in line 16 stands for",
         "the artisans", ["the wealthy households", "rival regions", "the trade secrets"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«skilled artisans forbidden from leaving their cities» — «their» վերաբերում է «artisans»-ին:"]),
        (3, M, "According to paragraph 2 (lines 4-9), early glass was often",
         "cloudy, bubbled, and difficult to shape into anything beyond small beads",
         ["perfectly clear and easy to shape into large windows", "stronger than modern industrial glass",
          "used exclusively for scientific instruments"],
         "Փնտրել պարբերության մեջ նշված նկարագրությունը:",
         ["Տողեր 7-9-ը նկարագրում են վաղ ապակու հատկությունները:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This method dramatically sped up production, making glass vessels affordable enough for '
         'ordinary households rather than only the wealthy."',
         "Glassblowing made production faster, so ordinary people, not just the wealthy, could afford glass vessels.",
         ["Glassblowing slowed production, making glass more expensive.", "Only wealthy households could ever afford glass vessels.",
          "Glassblowing had no effect on who could afford glass."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Ապակիփչման տեխնիկան արագացրեց արտադրությունը, ուստի սովորական մարդիկ ևս կարողացան ձեռք բերել ապակե իրեր:"]),
        (5, M, "How did clearer glass contribute to science, according to the text?",
         "It made possible the invention of lenses used in eyeglasses, microscopes, and telescopes.",
         ["It eliminated the need for glassblowing entirely.", "It made glass too fragile for scientific instruments.",
          "It slowed the development of eyeglasses and telescopes."],
         "Փնտրել 4-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 19-23-ը նկարագրում են ոսպնյակների գյուտի ազդեցությունը:"]),
        (6, M, "The word guarded in line 15 may best be replaced by",
         "carefully protected", ["publicly shared", "completely forgotten", "poorly organized"],
         "«Guarded» = պահպանված, գաղտնի պահված:",
         ["«closely guarded trade secret» — «guarded» = «carefully protected»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Industrialization made glassblowing slower and more expensive than hand methods.",
         ["Early glass was often cloudy and difficult to shape.", "Glassblowing allowed ordinary households to afford glass vessels.",
          "Fiber optic cables use specialized glass to carry information."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 24-28-ը ասում են, որ ինդուստրացումն արագացրեց և էժանացրեց արտադրությունը, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word mechanized in line 25 is closest in meaning to",
         "operated by machines rather than by hand", ["extremely fragile and delicate", "kept as a closely guarded secret",
          "limited to scientific instruments only"],
         "«Mechanized» = մեքենայացված:",
         ["«a mechanized process» — «mechanized» = «operated by machines rather than by hand»:"]),
        (9, M, "Paragraph 7 (lines 29-31) mainly",
         "describes modern specialized uses of glass beyond windows and containers",
         ["argues that traditional glassblowing should be banned", "explains the chemical formula of glass",
          "lists every country that produces glass today"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է ապակու ժամանակակից մասնագիտացված կիրառությունները:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing the evolution of glassmaking from ancient craft to modern technology",
         ["dismissive of modern industrial glass production", "purely technical with no historical context",
          "critical of artisans who still hand-blow glass"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է ապակեգործության զարգացմանը:"]),
    ])

    b.register_topic("cloze_topics", "alexander fleming and penicillin")
    b.passage_mc(CLOZE_A, "cloze-fleming", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly available»:"]),
        (12, E, "Choose the right option for gap (12).", "noticed", ["was noticing", "has noticed", "had noticed"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «noticed»:"]),
        (13, M, "Choose the right option for gap (13).", "would be", ["is", "will be", "had been"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would be»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "have saved", ["saved", "had saved", "were saving"],
         "«Since» պահանջում է Present Perfect:", ["«since penicillin was first mass-produced» → Present Perfect՝ «have saved»:"]),
    ])
    b.register_topic("cloze_topics", "brain-computer interfaces by 2065")
    b.passage_mc(CLOZE_B, "cloze-bci", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2065» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «ethicists argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be handled", ["will handle", "is handled", "have handled"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be handled»:"]),
    ])
    b.register_topic("cloze_topics", "the bermuda triangle disappearances")
    b.passage_mc(CLOZE_C, "cloze-bermuda", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been caused", ["should be caused", "have to cause", "can cause"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been caused»:"]),
        (22, M, "Choose the right option for gap (22).", "had been explained", ["had explained", "hasn't been explained", "wasn't explaining"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been explained»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been caused", ["may cause", "may be caused", "has to cause"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been caused» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "community bike repair co-ops")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-15", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "public orchard planting programs (vii)")
    t.gen_wordbank(b, rng, 56, "Public orchard planting programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "neighborhood tool-sharing networks (ix)")
    t.gen_wordbank(b, rng, 62, "Neighborhood tool-sharing networks", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
