# -*- coding: utf-8 -*-
"""English mock exam #5 (AEE-ENG-005). Reading: national parks/conservation.
Cloze: Alfred Nobel/dynamite, gene editing by 2080, Wow! signal mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 5)"
EXAM_IDX = 5
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  The idea of setting aside land specifically to remain wild and
2.  undeveloped is relatively recent in human history. For most of
3.  recorded time, forests, rivers, and mountains were valued chiefly
4.  for the resources they could provide, from timber and minerals to
5.  hunting grounds. It was only in the nineteenth century that a
6.  formal movement to protect certain landscapes from development
7.  began to take shape.
8.      Early advocates argued that some places possessed a scenic or
9.  scientific value that outweighed their potential for extraction or
10. settlement. Following years of lobbying, governments began setting
11. aside large tracts of wilderness as protected reserves, establishing
12. rules that limited logging, mining, and unrestricted hunting within
13. their boundaries. These early reserves were often created with
14. little input from the indigenous communities who had lived on and
15. managed the land for generations, a shortcoming that later
16. reformers would spend decades trying to address.
17.     As the twentieth century progressed, the purpose of protected
18. areas expanded beyond simple preservation. Rangers were trained not
19. only to prevent poaching and illegal logging but also to educate
20. visitors, maintain trails, and monitor the health of local
21. ecosystems. Scientific research conducted within park boundaries
22. contributed valuable data on wildlife populations, climate patterns,
23. and the long-term effects of human activity on undisturbed habitats.
24.     Funding protected areas has always presented a challenge.
25. Some governments rely heavily on entrance fees paid by tourists,
26. while others depend on general tax revenue or private donations
27. to cover the costs of maintenance and staffing. Debates continue
28. over how to balance public access with the need to limit
29. environmental damage caused by growing numbers of visitors.
30.     Today, supporters of the movement argue that protected
31. landscapes remain essential for preserving biodiversity and
32. offering future generations a connection to unspoiled nature that
33. might otherwise be lost entirely to development."""

CLOZE_A = (
    "Industrial safety (11) __________ dramatically since the mid-19th century. Before dynamite, "
    "blasting for mining and construction relied on unstable explosives that caused frequent "
    "accidents. In the 1860s, while Alfred Nobel (12) __________ on a safer way to handle "
    "nitroglycerin, he discovered that mixing it with an absorbent mineral made it far more stable. "
    "He found that the resulting paste (13) __________ predictable, controlled explosions when "
    "detonated.\n\n"
    "Although he patented the invention quickly, dynamite (14) __________ by mining companies "
    "across Europe for another few years. It wasn't until several high-profile demonstrations "
    "proved its safety that adoption accelerated. It was estimated that within a few decades the "
    "invention (15) __________ how large-scale construction and mining were carried out worldwide."
)
CLOZE_B = (
    "By the year 2080, the treatment of inherited diseases (16) __________ beyond recognition. "
    "Currently, biotechnology firms (17) __________ to develop gene-editing therapies capable of "
    "correcting harmful mutations before birth. These therapies (18) __________ to eliminate "
    "certain hereditary conditions entirely. However, some critics argue that such treatments "
    "(19) __________ be too expensive for widespread use. If costs continue to fall, experts "
    "predict that by the end of the century, most inherited disorders (20) __________ by targeted "
    "genetic treatment rather than lifelong medication."
)
CLOZE_C = (
    "In August 1977, a radio telescope in Ohio recorded an unusually strong burst of radio waves "
    "lasting seventy-two seconds. Investigators believe the signal (21) __________ from a source "
    "outside our solar system, as no known satellite or aircraft matched its position. Since the "
    "signal never repeated despite years of follow-up observation, some concluded that it "
    "(22) __________ by a brief, one-time astronomical event. Other theorists argued that the "
    "burst (23) __________ by a passing comet reflecting solar radio emissions. Whatever the "
    "truth, the exact origin of the signal (24) __________ officially by any subsequent search, "
    "and the case remains one of the most debated puzzles in radio astronomy. Researchers continue "
    "to scan the same region of sky for similar bursts. Unless a matching signal (25) __________, "
    "the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "Community solar programs have become common in areas where residents cannot install panels on "
    "their own roofs. The (38) __________ behind these programs is to let neighbors share the "
    "output of a single large solar array. Such programs are especially (39) __________ in regions "
    "with high electricity costs.\n\n"
    "Organizers must consider factors like billing accuracy and equal access to ensure long-term "
    "(40) __________. When programs are managed (41) __________, participation often grows "
    "steadily each year.\n\n"
    "Studies suggest that community solar programs can improve both (42) __________ affordability "
    "and local environmental outcomes."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "national parks and the conservation movement")
    b.passage_mc(PASSAGE, "reading-5", RC_TOPIC, [
        (1, E, "According to the text, before the nineteenth century, forests and mountains were valued mainly for",
         "the resources they could provide, such as timber and minerals",
         ["their scenic beauty and scientific importance", "their role in indigenous cultural practices",
          "their potential as tourist destinations"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 3-5. «forests, rivers, and mountains were valued chiefly for the resources they could provide»:"]),
        (2, M, "The pronoun their in line 12 stands for",
         "reserves", ["governments", "hunting grounds", "settlements"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«rules that limited logging, mining... within their boundaries» — «their» վերաբերում է «reserves»-ին:"]),
        (3, M, "According to paragraph 3 (lines 17-23), by the twentieth century, rangers' responsibilities expanded to include",
         "educating visitors and monitoring ecosystem health",
         ["granting mining permits to local companies", "eliminating all human access to parks",
          "setting national tax policy"],
         "Փնտրել պարբերության մեջ նշված նոր պարտականությունները:",
         ["Տողեր 18-21-ը թվարկում են այցելուների կրթումը, արահետների պահպանումը և էկոհամակարգերի մոնիտորինգը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"It was only in the nineteenth century that a formal movement to protect certain landscapes '
         'from development began to take shape."',
         "Organized efforts to protect natural landscapes are a relatively modern development.",
         ["Landscapes have always been formally protected throughout history.",
          "The nineteenth century saw the end of all conservation efforts.",
          "Development of natural landscapes only began in the nineteenth century."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ բնության պաշտպանության կազմակերպված շարժումը համեմատաբար նոր երևույթ է:"]),
        (5, M, "How did the creation of early reserves affect indigenous communities, according to the text?",
         "They were often created without meaningful input from those communities.",
         ["They were designed entirely by indigenous leaders.", "They had no impact on indigenous communities at all.",
          "They immediately granted full land rights to indigenous communities."],
         "Փնտրել 2-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 13-16-ը ասում են, որ վաղ արգելոցները հաճախ ստեղծվում էին բնիկ համայնքների քիչ մասնակցությամբ:"]),
        (6, M, "The word outweighed in line 9 may best be replaced by",
         "was more important than", ["was less important than", "was identical to", "was unrelated to"],
         "«Outweigh» = գերազանցել կարևորությամբ:",
         ["«scenic or scientific value that outweighed their potential for extraction» — «outweighed» = «was more important than»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Every protected area in the world is funded entirely through private donations.",
         ["Rangers are trained to educate visitors and maintain trails.",
          "Early reserves limited logging, mining, and unrestricted hunting.",
          "Funding for protected areas varies between governments."],
         "Համեմատել յուրաքանչյուր տարբերակը 4-րդ պարբերության հետ:",
         ["Տողեր 25-27-ը ասում են, որ ֆինանսավորումը տարբերվում է երկրից երկիր, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word unrestricted in line 12 is closest in meaning to",
         "without limits", ["carefully regulated", "completely banned", "rarely practiced"],
         "«Unrestricted» = առանց սահմանափակման:",
         ["«unrestricted hunting» — «unrestricted» = «without limits» (անսահմանափակ):"]),
        (9, M, "Paragraph 4 (lines 24-29) mainly",
         "discusses the financial and access challenges involved in maintaining protected areas",
         ["argues that entrance fees should be eliminated entirely",
          "explains the biology of endangered species",
          "lists every government that funds national parks"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը քննարկում է ֆինանսավորման աղբյուրները և հանրային մուտքի հավասարակշռման խնդիրները:"]),
        (10, M, "The overall tone of the text can best be described as",
         "supportive of conservation while acknowledging its historical shortcomings and ongoing challenges",
         ["entirely dismissive of the conservation movement", "purely celebratory with no mention of problems",
          "hostile toward government involvement in land protection"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը նշում է և՛ շարժման արժեքը, և՛ պատմական թերությունները (տողեր 13-16), ինչը հավասարակշռված տոն է:"]),
    ])

    b.register_topic("cloze_topics", "Alfred Nobel and dynamite")
    b.passage_mc(CLOZE_A, "cloze-nobel", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-19th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was producing", ["had been produced", "have been produced", "is produced"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was producing» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "gene editing therapies by 2080")
    b.passage_mc(CLOZE_B, "cloze-geneediting", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2080» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be treated", ["will treat", "is treated", "have treated"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be treated»:"]),
    ])
    b.register_topic("cloze_topics", "the Wow! signal radio mystery")
    b.passage_mc(CLOZE_C, "cloze-wowsignal", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have come", ["should be come", "have to come", "can come"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա:", ["Modal Perfect «must have come»:"]),
        (22, M, "Choose the right option for gap (22).", "had been caused", ["had caused", "hasn't been caused", "wasn't causing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been caused»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been caused", ["may cause", "may be caused", "has to cause"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been caused» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been explained", ["isn't explained", "hadn't been explained", "won't be explained"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been explained»:"]),
        (25, H, "Choose the right option for gap (25).", "is detected", ["isn't detected", "aren't detected", "will be detected"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "community solar programs")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-5", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "popular", ["popularly", "popularity", "unpopular"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «popular»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "fairly", ["fair", "fairness", "unfair"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «fairly»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "energy", ["energetic", "energetically", "energize"],
         "«___ affordability» դիրքում գոյականից առաջ անհրաժեշտ է գոյական-որոշիչ:", ["«energy affordability» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "volunteer firefighting recruitment (VII)")
    t.gen_wordbank(b, rng, 56, "Volunteer firefighting recruitment", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "museum digitization projects (IX)")
    t.gen_wordbank(b, rng, 62, "Museum digitization projects", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
