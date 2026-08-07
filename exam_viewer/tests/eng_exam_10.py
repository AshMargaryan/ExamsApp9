# -*- coding: utf-8 -*-
"""English mock exam #10 (AEE-ENG-010). Reading: history of cartography/mapmaking.
Cloze: Banting/insulin, quantum computing by 2075, Georgia crop circles debate."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 10)"
EXAM_IDX = 10
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  For thousands of years, humans have attempted to represent the
2.  world around them on flat surfaces, from crude scratches on cave
3.  walls to elaborate charts guiding sailors across open ocean. Early
4.  maps often mixed accurate local knowledge with pure speculation
5.  about distant, unexplored regions, sometimes filling blank areas
6.  with imagined monsters or mythical lands.
7.      As exploration expanded during the Age of Discovery, mapmakers
8.  faced a persistent challenge: representing a curved planet on a
9.  flat sheet of paper always distorts something, whether it be shape,
10. size, or distance. Different projection methods emerged, each
11. making trade-offs suited to particular purposes, such as accurate
12. sea navigation or realistic land-area comparison.
13.     Advances in surveying instruments gradually improved accuracy.
14. Triangulation, a technique using measured angles between known
15. points, allowed cartographers to calculate distances without
16. physically traversing difficult terrain. National governments began
17. commissioning comprehensive surveys, producing detailed maps used
18. for taxation, military planning, and infrastructure projects.
19.     The twentieth century introduced aerial photography, allowing
20. mapmakers to capture entire landscapes from above with far greater
21. speed and accuracy than ground-based surveying alone could achieve.
22. Later, satellite imagery extended this capability to the entire
23. planet, revealing details that had never been mapped at all.
24.     Digital technology has since transformed cartography completely.
25. Modern mapping software can update routes in real time, incorporate
26. traffic data, and generate custom maps instantly for virtually any
27. purpose imaginable.
28.     Despite these advances, historians note that maps have never
29. been purely neutral records of geography. Every map reflects
30. choices about what to include, exclude, or emphasize, meaning that
31. mapmaking has always carried a subtle element of interpretation,
32. whether drawn by hand on parchment or generated instantly by
33. satellite-fed software.

"""

CLOZE_A = (
    "Medical treatment for diabetes (11) __________ dramatically since the early 20th century. "
    "Before insulin, a diagnosis of severe diabetes was almost always fatal within a short time. "
    "In 1921, while Frederick Banting (12) __________ on a way to extract a hormone from the "
    "pancreas, he discovered that the extract could lower blood sugar levels in diabetic animals. "
    "He realized that purified insulin (13) __________ dying patients back to health within days.\n\n"
    "Although he demonstrated the treatment quickly, insulin (14) __________ by hospitals worldwide "
    "for another few years. It wasn't until manufacturing methods improved that widespread "
    "distribution became possible. It was estimated that within a decade the discovery "
    "(15) __________ how diabetes was treated across the globe."
)
CLOZE_B = (
    "By the year 2075, the way scientists solve complex computational problems (16) __________ "
    "beyond recognition. Currently, physicists (17) __________ to develop quantum processors "
    "capable of performing calculations far beyond the reach of classical computers. These "
    "processors (18) __________ to reduce the time needed for tasks like drug discovery and "
    "climate modeling. However, some critics argue that such systems (19) __________ be too "
    "unstable to operate reliably outside a laboratory. If stability continues to improve, experts "
    "predict that by the end of the century, most complex simulations (20) __________ by quantum "
    "systems rather than traditional supercomputers."
)
CLOZE_C = (
    "In 1969, a farmer near a small Georgia town reported finding a perfectly circular pattern of "
    "flattened crops in his field overnight. Investigators believe the pattern (21) __________ "
    "using simple tools such as boards and rope, as similar patterns were later replicated by "
    "volunteers using ordinary equipment. Since no machinery tracks were found nearby, some "
    "concluded that the circle (22) __________ by strong, swirling winds during a passing storm. "
    "Other theorists argued that the pattern (23) __________ deliberately by pranksters familiar "
    "with the field's layout. Whatever the truth, the exact method (24) __________ officially by "
    "any investigator who visited the site. Researchers continue to study similar patterns reported "
    "in other regions. Unless a witness (25) __________, the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "E-waste recycling programs have become common in cities dealing with growing amounts of "
    "discarded electronics. The (38) __________ behind these programs is to recover valuable "
    "materials before devices end up in landfills. Such programs are especially (39) __________ in "
    "areas with strict environmental regulations.\n\n"
    "Operators must consider factors like data security and safe material handling to ensure "
    "long-term (40) __________. When programs are managed (41) __________, participation often "
    "grows steadily each year.\n\n"
    "Studies suggest that e-waste recycling can improve both (42) __________ safety and resource "
    "conservation."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of cartography and mapmaking")
    b.passage_mc(PASSAGE, "reading-10", RC_TOPIC, [
        (1, E, "According to the text, early maps often combined",
         "accurate local knowledge with speculation about unexplored regions",
         ["satellite imagery and aerial photography", "triangulation data and digital software",
          "only mythical content with no factual basis"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 4-6. «Early maps often mixed accurate local knowledge with pure speculation about distant, unexplored regions»:"]),
        (2, M, "The pronoun this in line 22 stands for",
         "the capability to capture landscapes from above", ["ground-based surveying", "national governments", "triangulation"],
         "Գտնել այն հասկացությունը, որին վերաբերում է դերանունը:",
         ["«...satellite imagery extended this capability to the entire planet» — «this» վերաբերում է վերևից նկարահանելու ունակությանը:"]),
        (3, M, "According to paragraph 3 (lines 13-18), triangulation allowed cartographers to",
         "calculate distances without physically traversing difficult terrain",
         ["eliminate the need for any further surveying", "replace maps entirely with written descriptions",
          "avoid using measured angles altogether"],
         "Փնտրել պարբերության մեջ նշված տեխնիկայի նպատակը:",
         ["Տողեր 14-16-ը ասում են, որ եռանկյունաչափությունը թույլ էր տալիս հաշվարկել հեռավորությունները առանց ֆիզիկապես անցնելու տեղանքով:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Every map reflects choices about what to include, exclude, or emphasize, meaning that '
         'mapmaking has always carried a subtle element of interpretation."',
         "Maps are never fully neutral because mapmakers must choose what to show.",
         ["Maps are always completely objective and unbiased.", "Modern software has eliminated all interpretation from mapmaking.",
          "Mapmakers never make choices about what to include."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ամեն քարտեզ պարունակում է մեկնաբանության տարր, քանի որ ընտրություններ են արվում:"]),
        (5, M, "How did aerial photography affect mapmaking, according to the text?",
         "It allowed mapmakers to capture landscapes with far greater speed and accuracy than ground surveying.",
         ["It eliminated the need for satellite imagery entirely.", "It had no effect on the accuracy of maps.",
          "It replaced triangulation as a legal requirement."],
         "Փնտրել 4-րդ պարբերության առաջին նախադասությունը:",
         ["Տողեր 19-21-ը ասում են, որ օդային լուսանկարումը թույլ էր տալիս գրավել լանդշաֆտները շատ ավելի արագ և ճշգրիտ:"]),
        (6, M, "The word persistent in line 8 may best be replaced by",
         "ongoing", ["temporary", "minor", "resolved"],
         "«Persistent» = մշտական, շարունակական:",
         ["«mapmakers faced a persistent challenge» — «persistent» = «ongoing» (մշտական):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Maps have always been purely neutral records with no interpretation involved.",
         ["Triangulation uses measured angles between known points.", "Satellite imagery extended mapping capability to the entire planet.",
          "Modern mapping software can update routes in real time."],
         "Համեմատել յուրաքանչյուր տարբերակը եզրափակիչ պարբերության հետ:",
         ["Տողեր 28-31-ը ասում են, որ քարտեզները երբեք զուտ չեզոք չեն եղել, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word traversing in line 15 is closest in meaning to",
         "crossing", ["mapping", "measuring", "avoiding"],
         "«Traverse» = անցնել, հատել:",
         ["«without physically traversing difficult terrain» — «traversing» = «crossing» (անցնել):"]),
        (9, M, "Paragraph 5 (lines 24-27) mainly",
         "describes how digital technology has transformed modern cartography",
         ["argues that digital maps should be banned", "explains the chemical composition of parchment",
          "lists every country that adopted satellite mapping first"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես թվային տեխնոլոգիան ամբողջությամբ փոխակերպեց քարտեզագրությունը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing cartography's evolution while noting its inherent subjectivity",
         ["dismissive of the value of modern mapping technology", "purely technical with no historical context",
          "hostile toward the use of satellite imagery"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը հետևում է քարտեզագրության էվոլյուցիային՝ նշելով նաև դրա մեկնաբանական բնույթը:"]),
    ])

    b.register_topic("cloze_topics", "Frederick Banting and insulin")
    b.passage_mc(CLOZE_A, "cloze-banting", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the early 20th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was bringing", ["had been brought", "have been brought", "is brought"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was bringing» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«discovery»-ն ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "quantum computing by 2075")
    b.passage_mc(CLOZE_B, "cloze-quantumcomputing", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2075» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be run", ["will run", "is run", "have run"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be run»:"]),
    ])
    b.register_topic("cloze_topics", "the Georgia crop circles debate")
    b.passage_mc(CLOZE_C, "cloze-cropcircles", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been created", ["should be created", "have to create", "can create"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive «must have been created»:"]),
        (22, M, "Choose the right option for gap (22).", "had been formed", ["had formed", "hasn't been formed", "wasn't forming"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been formed»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been made", ["may make", "may be made", "has to make"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been made» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "comes forward", ["doesn't come forward", "came forward", "will come forward"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "e-waste recycling")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-10", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "common", ["commonly", "commonness", "uncommon"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «common»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "effectively", ["effective", "effectiveness", "ineffective"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «effectively»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "public", ["publicly", "publicity", "publicize"],
         "«___ safety» դիրքում գոյականից առաջ անհրաժեշտ է ածական:", ["«public safety» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "urban composting cooperatives (VII)")
    t.gen_wordbank(b, rng, 56, "Urban composting cooperatives", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "amateur radio emergency networks (IX)")
    t.gen_wordbank(b, rng, 62, "Amateur radio emergency networks", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
