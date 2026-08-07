# -*- coding: utf-8 -*-
"""English mock exam #23 (AEE-ENG-023). Reading: history of the piano.
Cloze: Louis Braille, quantum-secured communication networks by 2055, the Devil's Kettle waterfall mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 23)"
EXAM_IDX = 23
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before the piano existed, keyboard musicians had to choose between
2.  two imperfect instruments: one that produced a steady volume no
3.  matter how hard a key was struck, and another whose delicate strings
4.  could not withstand forceful playing.
5.      An Italian instrument maker set out to solve this limitation by
6.  designing a mechanism in which a hammer struck the string rather
7.  than plucking it, then immediately moved away to let the string
8.  vibrate freely.
9.      This hammer mechanism allowed, for the first time, a keyboard
10. instrument capable of playing both loud and soft notes depending on
11. how forcefully a key was pressed, a dramatic expressive improvement
12. over earlier designs.
13.     Despite this innovation, the new instrument spread slowly.
14. Composers and performers, comfortable with existing instruments,
15. took decades to fully embrace the expanded expressive range the
16. hammer mechanism made possible.
17.     As the instrument gained popularity, manufacturers experimented
18. constantly with its design, lengthening the strings, strengthening
19. the frame, and adding pedals that could sustain or soften notes at
20. the performer's command.
21.     A crucial structural advance came with the introduction of a
22. solid metal frame, which allowed strings to be tightened far more
23. than a wooden frame could safely withstand, producing a louder,
24. richer tone capable of filling large concert halls.
25.     By the nineteenth century, the instrument had become a central
26. fixture of middle-class households, valued both for entertainment
27. and as a symbol of cultural refinement.
28.     Manufacturing improvements eventually made instruments
29. affordable enough for widespread ownership, while smaller upright
30. designs made the instrument practical even in modest living spaces.
31.     Despite the rise of electronic keyboards capable of imitating
32. countless sounds, the mechanical instrument remains a standard
33. against which musicians judge expressive touch and tone.

"""

CLOZE_A = (
    "Before Louis Braille's invention, reading materials (11) __________ properly accessible to blind "
    "readers because existing raised-letter systems were slow and difficult to read by touch. While "
    "adapting a military night-writing code as a student, Braille (12) __________ that a simple grid of "
    "raised dots could represent letters far more efficiently than raised print letters. He proposed "
    "that this dot-based system (13) __________ allow blind readers to read and write with genuine "
    "fluency.\n\n"
    "Although his system faced resistance from sighted educators for years, braille (14) __________ by "
    "schools for the blind within a few decades of its creation. Today it is estimated that the system "
    "(15) __________ literacy among blind readers significantly since it was first taught publicly."
)
CLOZE_B = (
    "By 2055, the way sensitive government and financial data is protected (16) __________ dramatically "
    "due to quantum-secured communication technology. Currently, physicists (17) __________ to refine "
    "methods for detecting any attempt to intercept a transmitted signal. These networks (18) __________ "
    "to make eavesdropping mathematically detectable rather than merely difficult. However, some "
    "critics argue that the technology (19) __________ remain too costly to deploy outside major "
    "institutions. If hardware costs continue to fall, experts predict that by the middle of the "
    "century, sensitive communications (20) __________ using quantum-secured channels rather than "
    "conventional encryption alone."
)
CLOZE_C = (
    "At a river split by a large rock outcrop in a northern forest, one channel flows visibly "
    "downstream while the other plunges into a deep pothole and simply vanishes, with no known outlet "
    "ever found nearby. Investigators believe the water (21) __________ by an underground channel that "
    "eventually rejoins the river far downstream, though dye tests have failed to confirm this. Because "
    "objects dropped into the hole are never recovered anywhere nearby, some concluded that the water "
    "(22) __________ by a cave system large enough to disperse debris across a wide area. Other "
    "theorists argued that the flow (23) __________ by a natural filtration process that breaks "
    "material down before it resurfaces. Whatever the truth, the water's exact path (24) __________ "
    "officially by geologists, despite repeated dye-tracing attempts. Unless a definitive outlet "
    "(25) __________, the mystery may continue to puzzle visitors."
)
WORDFORM_PASSAGE = (
    "Community sourdough starter exchanges have formed among bakers who want to share and preserve "
    "heirloom starter cultures instead of buying new yeast. Their central (38) __________ is to let "
    "members trade portions of long-maintained starters along with the stories behind them.\n\n"
    "Such exchanges prove especially (39) __________ for home bakers who lack the time to cultivate a "
    "starter completely from scratch.\n\n"
    "Volunteers who run these exchanges must track starter feeding schedules and member requests to "
    "ensure long-term (40) __________. Where exchanges are organized (41) __________, new members "
    "typically receive a healthy starter within a single week.\n\n"
    "Researchers note that starter exchanges can strengthen both community (42) __________ and "
    "traditional baking knowledge."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the piano")
    b.passage_mc(PASSAGE, "reading-23", RC_TOPIC, [
        (1, E, "According to the text, before the piano existed, keyboard musicians had to choose between",
         "one instrument with steady volume regardless of force, and one whose strings couldn't withstand forceful playing",
         ["two instruments that both allowed full dynamic range", "instruments that required no manual key pressing at all",
          "instruments made entirely of glass"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-4. «two imperfect instruments»-ի նկարագրությունը:"]),
        (2, M, "The pronoun it in line 7 stands for",
         "the string", ["the hammer", "the mechanism", "the key"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«struck the string rather than plucking it» — «it» վերաբերում է «the string»-ին:"]),
        (3, M, "According to paragraph 3 (lines 9-12), the hammer mechanism allowed",
         "playing both loud and soft notes depending on how forcefully a key was pressed",
         ["playing only at a single fixed volume", "eliminating the need for a keyboard entirely",
          "producing sound without any strings at all"],
         "Փնտրել պարբերության մեջ նշված նորարարությունը:",
         ["Տողեր 9-12-ը նկարագրում են այս հնարավորությունը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Composers and performers, comfortable with existing instruments, took decades to fully '
         'embrace the expanded expressive range the hammer mechanism made possible."',
         "Even though the new mechanism offered more expressive range, musicians took decades to adopt it because they were used to older instruments.",
         ["Musicians immediately abandoned older instruments for the new one.", "The hammer mechanism offered no real improvement in expressiveness.",
          "Composers rejected the new instrument permanently."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Երաժիշտները տասնամյակներ պահանջեցին ընդունելու նոր գործիքի ընդլայնված արտահայտչական հնարավորությունները:"]),
        (5, M, "According to the text, the metal frame allowed",
         "strings to be tightened more than a wooden frame could withstand, producing a louder, richer tone",
         ["the instrument to become significantly quieter", "manufacturers to eliminate the need for strings",
          "the instrument to be played without any hammers"],
         "Փնտրել 6-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 21-24-ը նկարագրում են այս առավելությունը:"]),
        (6, M, "The word refinement in line 27 may best be replaced by",
         "the quality of being cultured and sophisticated",
         ["the process of manufacturing an instrument", "a type of musical composition", "a defect in an instrument's design"],
         "«Refinement» = նրբություն, մշակութային նրբանկատություն:",
         ["«a symbol of cultural refinement» — «refinement» = «the quality of being cultured and sophisticated»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "The new instrument was embraced immediately by all composers and performers.",
         ["Manufacturers experimented with lengthening strings and adding pedals.", "A metal frame allowed strings to be tightened further.",
          "Upright designs made the instrument practical in smaller spaces."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 13-16-ը ասում են, որ գործիքը դանդաղ տարածվեց, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word withstand in line 23 is closest in meaning to",
         "to endure or resist something without being damaged",
         ["to produce a musical sound", "to reduce the size of something", "to combine two different materials"],
         "«Withstand» = դիմակայել:",
         ["«than a wooden frame could safely withstand» — «withstand» = «to endure without being damaged»:"]),
        (9, M, "The eighth paragraph (lines 28-30) mainly",
         "describes manufacturing improvements that made the instrument more affordable and space-efficient",
         ["argues that the instrument should be replaced by electronic keyboards", "explains the exact tuning process for the instrument",
          "lists every manufacturer that produced the instrument"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է արտադրական բարելավումները, որոնք գործիքն ավելի մատչելի դարձրին:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how a mechanical innovation transformed keyboard music",
         ["dismissive of the piano's musical importance", "purely technical with no historical context",
          "critical of modern electronic keyboards"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է դաշնամուրի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "louis braille and the braille system")
    b.passage_mc(CLOZE_A, "cloze-braille", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly accessible»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would allow»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first taught publicly» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "quantum-secured communication networks by 2055")
    b.passage_mc(CLOZE_B, "cloze-quantumcomms", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2055» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be protected", ["will protect", "is protected", "have protected"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be protected»:"]),
    ])
    b.register_topic("cloze_topics", "the devil's kettle waterfall mystery")
    b.passage_mc(CLOZE_C, "cloze-devilskettle", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been carried", ["should be carried", "have to carry", "can carry"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been carried»:"]),
        (22, M, "Choose the right option for gap (22).", "had been absorbed", ["had absorbed", "hasn't been absorbed", "wasn't absorbing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been absorbed»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been slowed", ["may slow", "may be slowed", "has to slow"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been slowed» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "community sourdough starter exchanges")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-23", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "public soil testing labs (vii)")
    t.gen_wordbank(b, rng, 56, "Public soil testing labs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "neighborhood ice rink volunteer programs (ix)")
    t.gen_wordbank(b, rng, 62, "Neighborhood ice rink volunteer programs", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
