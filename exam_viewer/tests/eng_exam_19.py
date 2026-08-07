# -*- coding: utf-8 -*-
"""English mock exam #19 (AEE-ENG-019). Reading: history of the zipper.
Cloze: Charles Goodyear/vulcanized rubber, autonomous air taxis by 2050, the Piri Reis map mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 19)"
EXAM_IDX = 19
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before the zipper existed, clothing relied entirely on buttons,
2.  hooks, laces, and pins to stay closed, all of which required time
3.  and dexterity to fasten correctly.
4.      Early attempts at a mechanical fastener were unreliable and
5.  prone to popping open unexpectedly, earning the invention a
6.  reputation for embarrassment rather than convenience.
7.      A major redesign replaced the original hook-and-eye approach
8.  with interlocking teeth that gripped each other far more securely
9.  when a sliding tab moved along the track. This simple change
10. transformed an unreliable novelty into a genuinely dependable
11. fastener.
12.     Despite this improvement, manufacturers struggled for years to
13. convince the public that the device deserved trust. Many people
14. still preferred traditional buttons, associating the new fastener
15. with cheap, mass-produced goods rather than quality craftsmanship.
16.     The fastener's fortunes changed when it was adopted for boots
17. and tobacco pouches, allowing users to open and close them quickly
18. without fumbling with laces or buttons in awkward conditions.
19.     Fashion designers eventually embraced the fastener as well,
20. incorporating it into clothing lines and demonstrating that it could
21. be both functional and stylish rather than purely utilitarian.
22.     Mass production during the twentieth century made the fastener
23. cheap enough to appear in everyday clothing worldwide, from jackets
24. and trousers to luggage and tents.
25.     Modern versions now come in countless variations, from
26. waterproof designs used in outdoor gear to miniature fasteners
27. small enough for delicate garments.
28.     Despite dramatic improvements in materials and manufacturing,
29. the basic mechanism, two rows of interlocking teeth drawn together
30. by a sliding tab, remains essentially unchanged since its
31. successful redesign over a century ago.
32.     Few everyday objects are used as often or noticed as rarely as
33. this simple mechanical fastener.

"""

CLOZE_A = (
    "Before Charles Goodyear's discovery, natural rubber (11) __________ properly durable enough for "
    "practical use because it became brittle in cold weather and sticky in heat. While experimenting "
    "with rubber and sulfur compounds in his kitchen, Goodyear (12) __________ that accidentally "
    "overheating the mixture produced a material far more stable than raw rubber. He proposed that the "
    "treated rubber (13) __________ transform manufacturing across a wide range of industries.\n\n"
    "Although his process faced years of financial hardship, vulcanized rubber (14) __________ by "
    "manufacturers within a couple of decades of his discovery. Today it is estimated that the material "
    "(15) __________ modern industry significantly since it was first commercially produced."
)
CLOZE_B = (
    "By 2050, the way people travel short distances within cities (16) __________ dramatically due to "
    "autonomous air taxi technology. Currently, engineers (17) __________ to refine electric motors "
    "capable of vertical takeoff and landing in dense urban areas. These aircraft (18) __________ to "
    "reduce travel time across congested cities dramatically. However, some critics argue that the "
    "technology (19) __________ raise serious concerns about noise and airspace safety. If regulatory "
    "approval continues to progress, experts predict that by the middle of the century, short-distance "
    "urban travel (20) __________ by air taxis rather than ground vehicles in many congested cities."
)
CLOZE_C = (
    "Drawn on gazelle skin in the early sixteenth century, an old nautical chart shows coastlines that "
    "some claim resemble regions its creator could not have known about using the sources available at "
    "the time. Investigators believe the map (21) __________ by compiling dozens of older, now-lost "
    "source charts gathered from sailors and explorers. Because certain coastal details remain "
    "difficult to identify with confidence, some concluded that the disputed sections (22) __________ "
    "by inaccurate guesswork rather than genuine knowledge. Other theorists argued that the map "
    "(23) __________ by information from sources that have simply not survived to the present day. "
    "Whatever the truth, the exact sources behind every detail (24) __________ officially by "
    "historians, despite extensive study of the surviving fragment. Unless additional source charts "
    "(25) __________, several disputed sections may never be fully explained."
)
WORDFORM_PASSAGE = (
    "Community language exchange circles have formed in cities where residents want to practice new "
    "languages with native speakers for free. Their central (38) __________ is to pair members who are "
    "learning each other's native language so both can practice together.\n\n"
    "Such circles prove especially (39) __________ for newcomers who want to build local connections "
    "while improving their language skills.\n\n"
    "Volunteers who run these circles must track member pairings and meeting schedules to ensure "
    "long-term (40) __________. Where circles are organized (41) __________, members typically find a "
    "conversation partner within the first session.\n\n"
    "Researchers note that language exchange circles can strengthen both community (42) __________ and "
    "cross-cultural understanding."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the zipper")
    b.passage_mc(PASSAGE, "reading-19", RC_TOPIC, [
        (1, E, "According to the text, before the zipper existed, clothing relied on",
         "buttons, hooks, laces, and pins",
         ["electric fasteners powered by small batteries", "adhesive strips that could be reused",
          "magnetic clasps hidden inside the fabric"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-2. «clothing relied entirely on buttons, hooks, laces, and pins»:"]),
        (2, M, "The pronoun them in line 17 stands for",
         "boots and tobacco pouches", ["laces or buttons", "awkward conditions", "manufacturers"],
         "Գտնել այն գոյականները, որոնց վերաբերում է դերանունը:",
         ["«adopted for boots and tobacco pouches, allowing users to open and close them» — «them» վերաբերում է դրանց:"]),
        (3, M, "According to paragraph 3 (lines 7-11), the major redesign replaced hook-and-eye with",
         "interlocking teeth that gripped each other more securely",
         ["a row of small magnets", "a strip of adhesive tape", "a simple button and loop system"],
         "Փնտրել պարբերության մեջ նշված փոփոխությունը:",
         ["Տողեր 7-9-ը նկարագրում են այս փոփոխությունը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Despite this improvement, manufacturers struggled for years to convince the public that the '
         'device deserved trust."',
         "Even though the fastener worked better, it took manufacturers years to earn public trust in it.",
         ["The public trusted the fastener immediately after the redesign.", "Manufacturers never tried to promote the improved fastener.",
          "The improvement made no difference to public opinion."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Չնայած բարելավմանը, արտադրողներին տարիներ պահանջվեցին հանրության վստահությունը ձեռք բերելու համար:"]),
        (5, M, "According to the text, the fastener's fortunes changed when it was adopted for",
         "boots and tobacco pouches",
         ["military uniforms exclusively", "children's toys", "kitchen appliances"],
         "Փնտրել 5-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 16-17-ը նկարագրում են այս փոփոխությունը:"]),
        (6, M, "The word utilitarian in line 21 may best be replaced by",
         "designed to be useful rather than attractive",
         ["extremely expensive to produce", "brightly colored and decorative", "difficult to manufacture in large quantities"],
         "«Utilitarian» = պրակտիկ, օգտակարային:",
         ["«purely utilitarian» — «utilitarian» = «designed to be useful rather than attractive»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "The public trusted the fastener immediately when it was first invented.",
         ["Early fasteners were prone to popping open unexpectedly.", "The fastener was eventually adopted for boots and tobacco pouches.",
          "Fashion designers eventually incorporated the fastener into clothing."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 4-6-ը ասում են, որ վաղ ֆաստեներները անվստահելի էին, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word dexterity in line 3 is closest in meaning to",
         "skill in performing tasks with the hands",
         ["a type of clothing material", "a feeling of embarrassment", "the cost of a manufactured item"],
         "«Dexterity» = ճարպկություն (ձեռքերով):",
         ["«required time and dexterity to fasten» — «dexterity» = «skill in performing tasks with the hands»:"]),
        (9, M, "Paragraph 9 (lines 28-31) mainly",
         "explains that the basic mechanism has remained largely unchanged since its successful redesign",
         ["argues that the fastener should be redesigned again", "describes the exact chemical composition of the teeth",
          "lists every company that manufactures fasteners today"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը բացատրում է, որ հիմնական մեխանիզմը գրեթե անփոփոխ է մնացել:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how the fastener overcame public skepticism to become an everyday object",
         ["dismissive of the fastener's usefulness", "purely technical with no historical context",
          "critical of modern fastener manufacturers"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է, թե ինչպես ֆաստեները հաղթահարեց հանրության կասկածամտությունը:"]),
    ])

    b.register_topic("cloze_topics", "charles goodyear and vulcanized rubber")
    b.passage_mc(CLOZE_A, "cloze-goodyear", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly durable»:"]),
        (12, E, "Choose the right option for gap (12).", "discovered", ["was discovering", "has discovered", "had discovered"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «discovered»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would transform»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first commercially produced» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "autonomous vertical takeoff air taxis by 2050")
    b.passage_mc(CLOZE_B, "cloze-airtaxis", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2050» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be handled", ["will handle", "is handled", "have handled"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be handled»:"]),
    ])
    b.register_topic("cloze_topics", "the piri reis map mystery")
    b.passage_mc(CLOZE_C, "cloze-pirireis", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been created", ["should be created", "have to create", "can create"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been created»:"]),
        (22, M, "Choose the right option for gap (22).", "had been caused", ["had caused", "hasn't been caused", "wasn't causing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been caused»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been informed", ["may inform", "may be informed", "has to inform"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been informed» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "community language exchange circles")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-19", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "urban raptor rehabilitation programs (vii)")
    t.gen_wordbank(b, rng, 56, "Urban raptor rehabilitation programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public clay studio access initiatives (ix)")
    t.gen_wordbank(b, rng, 62, "Public clay studio access initiatives", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
