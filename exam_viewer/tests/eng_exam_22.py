# -*- coding: utf-8 -*-
"""English mock exam #22 (AEE-ENG-022). Reading: history of refrigeration.
Cloze: Guglielmo Marconi/radio, personalized cancer vaccines by 2060, the disappearance of the SS Waratah."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 22)"
EXAM_IDX = 22
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before mechanical refrigeration existed, people relied on natural
2.  ice, harvested from frozen lakes and rivers during winter, to keep
3.  food cool through warmer months.
4.      This ice trade required enormous effort. Workers cut thick
5.  blocks from frozen surfaces, packed them in sawdust or straw for
6.  insulation, and shipped them by wagon or boat to distant cities
7.  before the ice could melt.
8.      Even with careful insulation, a significant portion of each
9.  shipment melted before reaching its destination, making natural ice
10. an expensive luxury available mainly to wealthy households and
11. commercial businesses.
12.     The invention of mechanical refrigeration eliminated dependence
13. on frozen lakes entirely. Early machines compressed a gas until it
14. turned to liquid, then allowed it to expand and evaporate again,
15. absorbing heat from the surrounding air during the process.
16.     Early refrigeration systems were large, expensive, and
17. sometimes dangerous, since some early refrigerant gases were toxic
18. or flammable if a machine leaked.
19.     Once safer refrigerant chemicals were developed, refrigerators
20. shrank dramatically in size and cost, making them practical for
21. installation inside an ordinary home rather than only in factories
22. and warehouses.
23.     Reliable refrigeration transformed how people ate. Fresh food
24. could be safely stored for days rather than hours, dramatically
25. reducing food waste and the health risks associated with spoiled
26. ingredients.
27.     The same technology also transformed food transportation,
28. allowing perishable goods to travel across entire continents and
29. oceans without spoiling along the way.
30.     Modern refrigeration now extends far beyond the kitchen, playing
31. an essential role in vaccine storage, industrial processes, and
32. climate control in buildings worldwide.
33.     Few inventions have altered daily life as thoroughly as this one.

"""

CLOZE_A = (
    "Before Guglielmo Marconi's experiments, long-distance communication (11) __________ properly "
    "possible without physical wires connecting two locations. While testing transmitting equipment on "
    "his family's estate, Marconi (12) __________ that electromagnetic waves could carry signals across "
    "increasing distances without any wire connection at all. He proposed that this wireless technology "
    "(13) __________ eventually allow messages to cross entire oceans.\n\n"
    "Although his early demonstrations faced considerable scientific doubt, wireless telegraphy "
    "(14) __________ by shipping companies within just a few years of his first successful "
    "transmission. Today it is estimated that the technology (15) __________ global communication "
    "significantly since it was first demonstrated publicly."
)
CLOZE_B = (
    "By 2060, the way doctors treat certain forms of cancer (16) __________ dramatically due to "
    "personalized vaccine technology. Currently, researchers (17) __________ to refine methods for "
    "analyzing the unique genetic mutations within a patient's tumor. These vaccines (18) __________ to "
    "train a patient's own immune system to target cancer cells specifically. However, some critics "
    "argue that the technology (19) __________ still be too expensive for widespread use. If production "
    "speed continues to improve, experts predict that by the middle of the century, many cancer "
    "treatments (20) __________ using personalized vaccines rather than standardized chemotherapy alone."
)
CLOZE_C = (
    "Sailing along the coast of southern Africa in the early twentieth century, a large passenger "
    "steamship vanished without sending a distress signal, and no confirmed wreckage was ever recovered "
    "despite extensive searches. Investigators believe the ship (21) __________ by a sudden, violent "
    "storm that overwhelmed it before the crew could respond. Because the vessel had reportedly listed "
    "heavily on an earlier stretch of its voyage, some concluded that the sinking (22) __________ by a "
    "design flaw affecting the ship's stability. Other theorists argued that the ship (23) __________ "
    "by a rogue wave capable of capsizing even a large steamship instantly. Whatever the truth, the "
    "exact cause of the sinking (24) __________ officially by maritime investigators, despite numerous "
    "search expeditions. Unless definitive wreckage (25) __________, the disappearance may never be "
    "fully explained."
)
WORDFORM_PASSAGE = (
    "Youth beekeeping apprenticeship programs have started in communities where mentors want to pass "
    "hive management skills on to a new generation. Their central (38) __________ is to pair young "
    "apprentices with experienced beekeepers who guide them through a full season of hive care.\n\n"
    "Such programs prove especially (39) __________ in areas where local beekeepers are aging out of "
    "the practice without successors.\n\n"
    "Coordinators who run these programs must track hive health and apprentice progress to ensure "
    "long-term (40) __________. Where programs are organized (41) __________, apprentices typically "
    "manage their own hive independently by the second season.\n\n"
    "Researchers note that beekeeping apprenticeships can strengthen both community (42) __________ and "
    "local pollinator populations."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of refrigeration")
    b.passage_mc(PASSAGE, "reading-22", RC_TOPIC, [
        (1, E, "According to the text, before mechanical refrigeration, people relied on",
         "natural ice harvested from frozen lakes and rivers during winter",
         ["chemical cooling agents developed in laboratories", "underground cellars dug beneath every house",
          "salt water pumped directly from the ocean"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-3. «relied on natural ice, harvested from frozen lakes and rivers during winter»:"]),
        (2, M, "The pronoun it in line 14 stands for",
         "gas", ["heat", "the surrounding air", "early machines"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«compressed a gas until it turned to liquid, then allowed it to expand» — «it» վերաբերում է «gas»-ին:"]),
        (3, M, "According to paragraph 3 (lines 8-11), natural ice was expensive because",
         "a significant portion melted before reaching its destination",
         ["it required specialized chemical processing", "governments taxed it heavily during transport",
          "it could only be harvested once per year"],
         "Փնտրել պարբերության մեջ նշված պատճառը:",
         ["Տողեր 8-9-ը նկարագրում են այս պատճառը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Once safer refrigerant chemicals were developed, refrigerators shrank dramatically in size '
         'and cost, making them practical for installation inside an ordinary home."',
         "Safer refrigerant chemicals allowed refrigerators to become smaller and cheaper, so ordinary homes could use them.",
         ["Safer chemicals made refrigerators larger and more expensive.", "Refrigerators remained impractical for home use even after safer chemicals appeared.",
          "The size of refrigerators had no connection to refrigerant safety."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Ավելի անվտանգ քիմիական նյութերը թույլ տվեցին սառնարանները դառնալ ավելի փոքր ու էժան:"]),
        (5, M, "According to the text, reliable refrigeration transformed food transportation by",
         "allowing perishable goods to travel across continents and oceans without spoiling",
         ["eliminating the need to transport food at all", "making food transportation more dangerous",
          "restricting food transport to short local distances only"],
         "Փնտրել 7-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 27-29-ը նկարագրում են այս ազդեցությունը:"]),
        (6, M, "The word perishable in line 28 may best be replaced by",
         "likely to decay or spoil quickly",
         ["extremely valuable and rare", "difficult to transport due to weight", "packaged in sealed containers"],
         "«Perishable» = փչացող, կարճատև պահպանվող:",
         ["«perishable goods» — «perishable» = «likely to decay or spoil quickly»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Early refrigeration systems were always completely safe to operate.",
         ["Natural ice was mainly available to wealthy households.", "Mechanical refrigeration eliminated dependence on frozen lakes.",
          "Modern refrigeration plays a role in vaccine storage."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 16-18-ը ասում են, որ վաղ սառնարանային համակարգերը երբեմն վտանգավոր էին, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word toxic in line 17 is closest in meaning to",
         "poisonous or harmful if absorbed by the body",
         ["extremely expensive to produce", "difficult to compress into liquid", "resistant to changes in temperature"],
         "«Toxic» = թունավոր:",
         ["«some early refrigerant gases were toxic» — «toxic» = «poisonous or harmful»:"]),
        (9, M, "Paragraph 10 (lines 30-32) mainly",
         "describes how modern refrigeration extends beyond the kitchen into vaccine storage and industry",
         ["argues that refrigeration should be limited to home use only", "explains the exact chemical formula of modern refrigerants",
          "lists every company that manufactures refrigerators today"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես ժամանակակից սառեցումը դուրս է գալիս խոհանոցի սահմաններից:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing refrigeration's evolution from harvested ice to an essential modern technology",
         ["dismissive of refrigeration's importance", "purely technical with no historical context",
          "alarmed about the dangers of refrigerant chemicals"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է սառեցման տեխնոլոգիայի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "guglielmo marconi and radio transmission")
    b.passage_mc(CLOZE_A, "cloze-marconi", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly possible»:"]),
        (12, E, "Choose the right option for gap (12).", "discovered", ["was discovering", "has discovered", "had discovered"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «discovered»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would allow»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first demonstrated publicly» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "personalized cancer vaccines by 2060")
    b.passage_mc(CLOZE_B, "cloze-cancervaccines", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2060» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be conducted", ["will conduct", "is conducted", "have conducted"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be conducted»:"]),
    ])
    b.register_topic("cloze_topics", "the disappearance of the ss waratah")
    b.passage_mc(CLOZE_C, "cloze-waratah", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been overwhelmed", ["should be overwhelmed", "have to overwhelm", "can overwhelm"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been overwhelmed»:"]),
        (22, M, "Choose the right option for gap (22).", "had been caused", ["had caused", "hasn't been caused", "wasn't causing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been caused»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been capsized", ["may capsize", "may be capsized", "has to capsize"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been capsized» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "youth beekeeping apprenticeship programs")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-22", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "urban food forest planting programs (vii)")
    t.gen_wordbank(b, rng, 56, "Urban food forest planting programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public knitting and textile circles (ix)")
    t.gen_wordbank(b, rng, 62, "Public knitting and textile circles", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
