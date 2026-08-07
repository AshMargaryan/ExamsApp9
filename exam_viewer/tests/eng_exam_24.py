# -*- coding: utf-8 -*-
"""English mock exam #24 (AEE-ENG-024). Reading: history of eyeglasses.
Cloze: Thomas Edison/light bulb, biodegradable medical implants by 2060, the Green Children of Woolpit mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 24)"
EXAM_IDX = 24
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Corrective lenses in some form have existed for centuries, though
2.  early versions bore little resemblance to the eyeglasses worn
3.  today.
4.      The earliest wearable lenses were simple pieces of ground glass
5.  held directly against the eye or balanced awkwardly on the nose
6.  without any secure means of staying in place.
7.      Because these early lenses lacked temple arms to hook over the
8.  ears, wearers often had to hold them in position by hand, making
9.  reading or working with both hands nearly impossible.
10.     Craftsmen experimented with various solutions, including rigid
11. frames that pressed against the temples and ribbons tied around the
12. head, none of which proved especially comfortable or reliable.
13.     The breakthrough came with the addition of rigid arms designed
14. to rest securely over the ears, finally allowing eyeglasses to stay
15. in place without constant adjustment by the wearer.
16.     This simple mechanical change transformed eyeglasses from an
17. occasional aid into an object that could be worn continuously
18. throughout the day, dramatically expanding who could benefit from
19. corrective lenses.
20.     For a long period, eyeglasses carried a certain social stigma,
21. sometimes associated with old age or physical weakness rather than
22. viewed as a practical medical tool.
23.     Opticians eventually developed lenses capable of correcting
24. multiple vision problems simultaneously within a single pair of
25. glasses, eliminating the need to switch between separate lenses for
26. different tasks.
27.     Fashion designers later transformed eyeglasses from a purely
28. functional necessity into a genuine accessory, offered in countless
29. frame shapes, colors, and materials.
30.     Contact lenses and corrective surgery eventually offered
31. alternatives to traditional frames, yet eyeglasses remain the most
32. common corrective solution worldwide.
33.     Few inventions have so quietly improved daily life for so many people.

"""

CLOZE_A = (
    "Before Thomas Edison's improvements, electric lighting (11) __________ properly practical for "
    "everyday households because existing bulb filaments burned out within minutes. While testing "
    "thousands of filament materials in his laboratory, Edison (12) __________ that a carbonized bamboo "
    "fiber could glow reliably for hundreds of hours. He proposed that a complete electrical system, "
    "not just the bulb itself, (13) __________ be necessary to bring lighting into ordinary homes.\n\n"
    "Although his early demonstrations faced skepticism from gas lighting companies, the incandescent "
    "bulb (14) __________ by households within a couple of decades of its introduction. Today it is "
    "estimated that the invention (15) __________ modern life significantly since it was first "
    "commercially sold."
)
CLOZE_B = (
    "By 2060, the way temporary medical implants are removed from patients (16) __________ dramatically "
    "due to biodegradable electronics technology. Currently, engineers (17) __________ to refine "
    "materials that dissolve safely inside the body after their function is complete. These implants "
    "(18) __________ to eliminate the need for a second surgery to remove temporary devices. However, "
    "some critics argue that the technology (19) __________ still face regulatory hurdles before "
    "widespread approval. If material safety testing continues to progress, experts predict that by "
    "the middle of the century, many temporary implants (20) __________ using biodegradable components "
    "rather than permanent materials."
)
CLOZE_C = (
    "According to a medieval English account, two children with unusually green-tinted skin reportedly "
    "appeared near a village, speaking an unfamiliar language and refusing all food except raw beans. "
    "Investigators believe the children (21) __________ by a rare nutritional deficiency that produced "
    "their unusual skin color, a condition that faded once their diet changed. Because the earliest "
    "surviving accounts were written decades after the supposed event, some concluded that the story "
    "(22) __________ by later writers who exaggerated an ordinary case of foreign or displaced "
    "children. Other theorists argued that the tale (23) __________ by a folk legend entirely "
    "unconnected to any real historical event. Whatever the truth, the origin of the story "
    "(24) __________ officially by historians, despite centuries of retelling. Unless an earlier "
    "surviving source (25) __________, the true origin of the legend may never be confirmed."
)
WORDFORM_PASSAGE = (
    "Urban mushroom cultivation cooperatives have formed in cities where members want to grow gourmet "
    "mushrooms using spent coffee grounds and other food waste. Their central (38) __________ is to "
    "convert waste that would otherwise be discarded into a nutritious, locally grown food source.\n\n"
    "Such cooperatives prove especially (39) __________ in dense cities where traditional farmland is "
    "scarce or unavailable.\n\n"
    "Volunteers who run these cooperatives must track humidity levels and harvest schedules to ensure "
    "long-term (40) __________. Where cooperatives are organized (41) __________, members typically "
    "harvest their first batch within a few weeks.\n\n"
    "Researchers note that mushroom cooperatives can strengthen both community (42) __________ and "
    "local food waste reduction."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of eyeglasses")
    b.passage_mc(PASSAGE, "reading-24", RC_TOPIC, [
        (1, E, "According to the text, the earliest wearable lenses were",
         "simple pieces of ground glass held against the eye or balanced on the nose",
         ["large frames with temple arms hooked over the ears", "contact lenses placed directly on the eye's surface",
          "lenses embedded permanently into a headband"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 4-6. «simple pieces of ground glass held directly against the eye or balanced on the nose»:"]),
        (2, M, "The pronoun them in line 8 stands for",
         "early lenses", ["temple arms", "the ears", "craftsmen"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«wearers often had to hold them in position by hand» — «them» վերաբերում է «early lenses»-ին:"]),
        (3, M, "According to paragraph 4 (lines 10-12), craftsmen experimented with",
         "rigid frames pressing against the temples and ribbons tied around the head",
         ["glass lenses ground to different thicknesses", "lenses coated with colored dye", "frames made entirely of gold"],
         "Փնտրել պարբերության մեջ նշված փորձերը:",
         ["Տողեր 10-12-ը նկարագրում են այս փորձերը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This simple mechanical change transformed eyeglasses from an occasional aid into an object '
         'that could be worn continuously throughout the day."',
         "The addition of temple arms let people wear eyeglasses all day instead of only occasionally.",
         ["The mechanical change made eyeglasses less practical for daily wear.", "Eyeglasses could only be worn occasionally even after this change.",
          "This change had no effect on how eyeglasses were used."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Ականջների կողքից ամրացվող բազկերի ավելացումը թույլ տվեց ակնոցները կրել ամբողջ օրվա ընթացքում:"]),
        (5, M, "According to the text, opticians eventually developed lenses that",
         "corrected multiple vision problems simultaneously within a single pair of glasses",
         ["eliminated the need for eyeglasses entirely", "worked only for a single type of vision problem",
          "required switching frames every few hours"],
         "Փնտրել 7-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 23-26-ը նկարագրում են այս զարգացումը:"]),
        (6, M, "The word stigma in line 20 may best be replaced by",
         "a mark of social disapproval associated with something",
         ["a type of protective coating", "a medical procedure for the eyes", "a decorative pattern on a frame"],
         "«Stigma» = խարան, բացասական դրոշմ:",
         ["«a certain social stigma» — «stigma» = «a mark of social disapproval»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Eyeglasses were always viewed as a fashionable accessory throughout history.",
         ["Early lenses lacked temple arms to hook over the ears.", "Opticians developed lenses correcting multiple vision problems at once.",
          "Contact lenses and surgery offered alternatives to traditional frames."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 20-22-ը ասում են, որ ակնոցները երբեմն ասոցացվում էին տարիքի կամ թուլության հետ, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word reliable in line 12 is closest in meaning to",
         "consistently good in quality or performance",
         ["extremely expensive to produce", "brightly colored and decorative", "difficult to manufacture in bulk"],
         "«Reliable» = հուսալի:",
         ["«especially comfortable or reliable» — «reliable» = «consistently good in quality or performance»:"]),
        (9, M, "The paragraph describing fashion designers' role in eyewear mainly",
         "explains how eyeglasses became a fashion accessory beyond their functional purpose",
         ["argues that eyeglasses should remain purely functional", "explains the manufacturing process for glass lenses",
          "lists every eyewear brand in the fashion industry"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը բացատրում է, թե ինչպես ակնոցները դարձան նաև նորաձևության աքսեսուար:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing eyeglasses' evolution from an awkward aid into an accepted, even fashionable, tool",
         ["dismissive of eyeglasses' practical value", "purely technical with no historical context",
          "critical of the fashion industry's role in eyewear"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է ակնոցների էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "thomas edison and the electric light bulb")
    b.passage_mc(CLOZE_A, "cloze-edison", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly practical»:"]),
        (12, E, "Choose the right option for gap (12).", "discovered", ["was discovering", "has discovered", "had discovered"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «discovered»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would be»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first commercially sold» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "biodegradable electronics for medical implants by 2060")
    b.passage_mc(CLOZE_B, "cloze-bioimplants", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2060» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be manufactured", ["will manufacture", "is manufactured", "have manufactured"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be manufactured»:"]),
    ])
    b.register_topic("cloze_topics", "the green children of woolpit mystery")
    b.passage_mc(CLOZE_C, "cloze-greenchildren", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been affected", ["should be affected", "have to affect", "can affect"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been affected»:"]),
        (22, M, "Choose the right option for gap (22).", "had been embellished", ["had embellished", "hasn't been embellished", "wasn't embellishing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been embellished»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been invented", ["may invent", "may be invented", "has to invent"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been invented» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "urban mushroom cultivation cooperatives")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-24", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "neighborhood storm drain stewardship programs (vii)")
    t.gen_wordbank(b, rng, 56, "Neighborhood storm drain stewardship programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public sewing machine lending libraries (ix)")
    t.gen_wordbank(b, rng, 62, "Public sewing machine lending libraries", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
