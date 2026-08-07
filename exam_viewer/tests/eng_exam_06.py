# -*- coding: utf-8 -*-
"""English mock exam #6 (AEE-ENG-006). Reading: history of currency and banking.
Cloze: Torricelli/barometer, underwater habitats by 2100, Coral Castle mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 6)"
EXAM_IDX = 6
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Long before coins or paper money existed, communities exchanged
2.  goods directly through barter, trading grain for tools or livestock
3.  for cloth. Barter worked reasonably well in small communities where
4.  everyone knew what their neighbors needed, but it became impractical
5.  as trade expanded across greater distances and among strangers who
6.  had no direct use for each other's goods.
7.      The introduction of standardized coins, first minted from precious
8.  metals, solved much of this problem. A coin's value was recognized
9.  regardless of who issued it or where a trader had come from, making
10. exchange far simpler than negotiating the relative worth of unrelated
11. goods each time. Early banks emerged largely to store these valuable
12. coins safely, issuing receipts that merchants could use instead of
13. carrying heavy sacks of metal across dangerous roads.
14.     Over time, these receipts evolved into paper currency backed by
15. deposits held in a central vault. Governments gradually took over the
16. issuing of currency, establishing central banks responsible for
17. maintaining public confidence in the money supply. This shift allowed
18. economies to expand far beyond what physical gold or silver reserves
19. alone could have supported.
20.     The twentieth century brought further transformation. Checks,
21. credit cards, and eventually electronic transfers reduced the need
22. to carry physical currency at all. Banks began offering loans,
23. investment services, and international transfers, becoming central
24. institutions in nearly every aspect of modern economic life.
25.     Digital technology has continued this evolution. Mobile banking
26. applications now allow instant transfers between accounts, while
27. some governments and private companies have experimented with
28. entirely digital currencies unconnected to any physical coin or note.
29.     Despite these changes, historians note that the core purpose of
30. money has remained constant: providing a trusted, widely accepted
31. way to measure and exchange value. Whether made of metal, paper, or
32. digital code, currency continues to serve the same fundamental
33. function it always has."""

CLOZE_A = (
    "Weather measurement (11) __________ dramatically since the mid-17th century. Before the "
    "barometer, predicting atmospheric changes relied entirely on observing clouds and wind by eye. "
    "In 1643, while Evangelista Torricelli (12) __________ on why suction pumps could not lift water "
    "beyond a certain height, he filled a tube with mercury and inverted it in a basin. He realized "
    "that the surrounding air pressure (13) __________ the mercury column at a measurable "
    "height.\n\n"
    "Although he demonstrated the effect quickly, the barometer (14) __________ by sailors and "
    "farmers for practical forecasting for several more decades. It wasn't until instrument makers "
    "produced reliable, portable versions that everyday use became common. It was estimated that "
    "within a century the invention (15) __________ how weather could be anticipated and prepared for."
)
CLOZE_B = (
    "By the year 2100, the way researchers study ocean ecosystems (16) __________ beyond "
    "recognition. Currently, marine engineers (17) __________ to develop permanent underwater "
    "habitats capable of housing scientists for months at a time. These habitats (18) __________ to "
    "reduce the cost of long-term deep-sea research. However, some critics argue that such "
    "structures (19) __________ be too dangerous to maintain at extreme depths. If engineering "
    "advances continue, experts predict that by the end of the century, most deep-ocean research "
    "(20) __________ from permanent underwater stations rather than surface vessels."
)
CLOZE_C = (
    "Between 1923 and 1951, a Latvian immigrant single-handedly carved and moved hundreds of tons "
    "of coral limestone to build a structure known as Coral Castle. Investigators believe the "
    "builder (21) __________ simple hand tools and clever leverage, as no heavy machinery was ever "
    "seen at the site. Since he worked alone at night and refused to let anyone watch, some "
    "concluded that he (22) __________ by a technique he never revealed to anyone. Other theorists "
    "argued that the massive stones (23) __________ using methods borrowed from ancient monument "
    "builders. Whatever the truth, his construction method (24) __________ officially by any "
    "engineer who studied the site. Researchers continue to examine the tool marks left on the "
    "stones. Unless his private notes (25) __________, the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "Skill-exchange time banking has become common in communities looking for alternatives to "
    "traditional paid services. The (38) __________ behind these systems is to let members trade "
    "hours of one skill for hours of another. Such systems are especially (39) __________ in "
    "neighborhoods with limited access to affordable services.\n\n"
    "Organizers must consider factors like fair valuation and member trust to ensure long-term "
    "(40) __________. When systems are managed (41) __________, participation often grows steadily "
    "each year.\n\n"
    "Studies suggest that time banking can improve both (42) __________ resilience and a sense of "
    "community."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of currency and banking")
    b.passage_mc(PASSAGE, "reading-6", RC_TOPIC, [
        (1, E, "According to the text, barter became impractical mainly because",
         "trade expanded across distances among strangers with no direct use for each other's goods",
         ["governments began issuing standardized coins", "banks started offering loans and investment services",
          "digital currencies made physical exchange unnecessary"],
         "Փնտրել առաջին պարբերության պատճառական նախադասությունը:",
         ["Տողեր 4-6. «it became impractical as trade expanded across greater distances and among strangers»:"]),
        (2, M, "The pronoun these in line 14 stands for",
         "receipts", ["coins", "banks", "merchants"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...these receipts evolved into paper currency» — «these» վերաբերում է «receipts»-ին:"]),
        (3, M, "According to paragraph 2 (lines 7-13), coins simplified exchange because",
         "their value was recognized regardless of who issued them",
         ["they eliminated the need for banks entirely", "they could only be used within one town",
          "they were lighter than paper receipts"],
         "Փնտրել պարբերության մեջ նշված պատճառը:",
         ["Տողեր 8-9-ը ասում են, որ մետաղադրամի արժեքը ճանաչված էր անկախ թողարկողից:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Barter worked reasonably well in small communities where everyone knew what their neighbors '
         'needed, but it became impractical as trade expanded across greater distances."',
         "Barter suited small, familiar communities but failed to scale as trade grew wider.",
         ["Barter worked equally well regardless of trade distance.", "Barter was replaced immediately by digital currency.",
          "Small communities never engaged in barter at all."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ապրանքափոխանակումը հարմար էր փոքր համայնքների համար, բայց դարձավ անհարմար մեծ առևտրի դեպքում:"]),
        (5, M, "How did the introduction of coins affect early banks, according to the text?",
         "Banks emerged largely to store coins safely and issue receipts for them.",
         ["Banks disappeared once coins became widespread.", "Banks began issuing entirely digital currency.",
          "Banks had no connection to the use of coins."],
         "Փնտրել 2-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 11-13-ը ասում են, որ վաղ բանկերը ստեղծվել են մետաղադրամները անվտանգ պահելու համար:"]),
        (6, M, "The word impractical in line 4 may best be replaced by",
         "not workable", ["highly efficient", "extremely popular", "legally required"],
         "«Impractical» = ոչ գործնական, դժվար կիրառելի:",
         ["«it became impractical as trade expanded» — «impractical» = «not workable»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Barter remained the dominant method of exchange throughout the twentieth century.",
         ["Central banks became responsible for maintaining confidence in the money supply.",
          "Mobile banking applications allow instant transfers between accounts.",
          "Early banks issued receipts that merchants could use instead of carrying coins."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի ողջ ընթացքի հետ:",
         ["Տեքստն ամբողջությամբ նկարագրում է դրամական համակարգի էվոլյուցիան՝ ապրանքափոխանակությունից այն կողմ, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word unconnected in line 28 is closest in meaning to",
         "not linked", ["directly tied", "fully backed", "widely accepted"],
         "«Unconnected» = կապ չունեցող:",
         ["«digital currencies unconnected to any physical coin or note» — «unconnected» = «not linked»:"]),
        (9, M, "Paragraph 5 (lines 25-28) mainly",
         "describes how digital technology has continued transforming banking",
         ["argues that digital currencies should be banned",
          "explains the chemical composition of early coins",
          "lists every bank that offers mobile applications"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է բջջային բանկային հավելվածները և թվային արժույթների փորձարկումը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing currency's evolution while emphasizing continuity of purpose",
         ["dismissive of the value of modern banking", "purely technical with no historical context",
          "hostile toward the idea of digital currency"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը հետևում է դրամի էվոլյուցիային և շեշտում նպատակի շարունակականությունը, ինչը տեղեկատվական տոն է:"]),
    ])

    b.register_topic("cloze_topics", "Evangelista Torricelli and the barometer")
    b.passage_mc(CLOZE_A, "cloze-torricelli", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-17th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was supporting", ["had been supported", "have been supported", "is supported"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was supporting» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "underwater habitats by 2100")
    b.passage_mc(CLOZE_B, "cloze-underwaterhabitats", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2100» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be conducted", ["will conduct", "is conducted", "have conducted"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be conducted»:"]),
    ])
    b.register_topic("cloze_topics", "the Coral Castle construction mystery")
    b.passage_mc(CLOZE_C, "cloze-coralcastle", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have used", ["should be used", "have to use", "can use"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա:", ["Modal Perfect «must have used»:"]),
        (22, M, "Choose the right option for gap (22).", "had been guided", ["had guided", "hasn't been guided", "wasn't guiding"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been guided»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been moved", ["may move", "may be moved", "has to move"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been moved» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been explained", ["isn't explained", "hadn't been explained", "won't be explained"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been explained»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "skill-exchange time banking (wordform)")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-6", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "popular", ["popularly", "popularity", "unpopular"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «popular»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "fairly", ["fair", "fairness", "unfair"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «fairly»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "economic", ["economically", "economy", "economize"],
         "«___ resilience» դիրքում գոյականից առաջ անհրաժեշտ է ածական:", ["«economic resilience» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public transit accessibility upgrades (VII)")
    t.gen_wordbank(b, rng, 56, "Public transit accessibility upgrades", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "archival preservation techniques (IX)")
    t.gen_wordbank(b, rng, 62, "Archival preservation techniques", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
