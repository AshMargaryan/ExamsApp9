# -*- coding: utf-8 -*-
"""English mock exam #14 (AEE-ENG-014). Reading: history of the telescope.
Cloze: Marie Curie/radioactivity, underwater ocean farming by 2070, the Taos Hum mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 14)"
EXAM_IDX = 14
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  The earliest telescopes appeared in the early seventeenth century,
2.  built from simple glass lenses mounted inside a hollow tube. These
3.  instruments could magnify distant objects only a few times, yet they
4.  transformed how people understood the sky almost overnight.
5.      When astronomers first pointed these crude instruments toward
6.  the heavens, they discovered mountains and craters on the moon,
7.  four moons orbiting Jupiter, and countless stars too faint to see
8.  with the naked eye. These observations challenged long-held beliefs
9.  about the structure of the universe.
10.     Early lens-based telescopes suffered from a serious flaw: they
11. produced blurred, rainbow-fringed images because different colors of
12. light bent at slightly different angles as they passed through the
13. glass. Astronomers tried lengthening their telescopes dramatically to
14. reduce this distortion, sometimes building tubes over forty meters
15. long that required scaffolding and pulleys to operate.
16.     The invention of the mirror-based telescope offered a more
17. practical solution. Curved mirrors reflect all colors of light at the
18. same angle, eliminating the rainbow-fringing problem entirely and
19. allowing for far more compact instruments.
20.     As mirror-making techniques improved, telescopes grew steadily
21. larger, permitting astronomers to detect fainter and more distant
22. objects. Massive observatories were built atop remote mountains,
23. chosen for their clear skies and minimal light interference from
24. nearby cities.
25.     The twentieth century introduced an entirely new possibility:
26. placing telescopes above the atmosphere altogether. Instruments in
27. orbit avoid the blurring and absorption caused by Earth's atmosphere,
28. capturing images of a clarity impossible to achieve from the ground.
29.     Radio telescopes, meanwhile, detect wavelengths invisible to the
30. human eye entirely, revealing objects and phenomena that emit no
31. visible light at all.
32.     Each advance expanded what astronomers could observe, gradually
33. transforming a simple hand-held instrument into humanity's window on the universe.

"""

CLOZE_A = (
    "Before Marie Curie's research, the properties of radioactive elements (11) __________ properly "
    "understood by scientists. While studying pitchblende ore with her husband Pierre, Curie "
    "(12) __________ that it contained more radioactivity than could be explained by its uranium "
    "content alone. She proposed that a new, undiscovered element (13) __________ responsible for the "
    "extra radioactivity.\n\n"
    "Although her methods faced skepticism initially, her discovery of radium (14) __________ by the "
    "scientific community within a few years. Today it is estimated that her research "
    "(15) __________ modern medicine significantly since her findings were first published."
)
CLOZE_B = (
    "By 2070, the way seafood is produced for coastal cities (16) __________ dramatically due to "
    "underwater farming technology. Currently, marine engineers (17) __________ to design submerged "
    "structures capable of growing kelp and shellfish at scale. These farms (18) __________ to reduce "
    "the environmental impact of traditional fishing fleets. However, some critics argue that the "
    "structures (19) __________ be vulnerable to storm damage. If engineering costs continue to fall, "
    "experts predict that by the end of the century, most coastal seafood (20) __________ from "
    "underwater farms rather than open-ocean fishing."
)
CLOZE_C = (
    "Since the late 1980s, some residents of a small town have reported hearing a persistent, "
    "low-frequency hum that outside visitors often cannot detect at all. Investigators believe the "
    "sound (21) __________ by underground industrial equipment operating nearby, though no confirmed "
    "source has ever been located. Because only a small percentage of residents can hear the hum, some "
    "concluded that the phenomenon (22) __________ by unusually sensitive hearing in a subset of the "
    "population. Other theorists argued that the hum (23) __________ by natural seismic or atmospheric "
    "activity unique to the region. Whatever the truth, the source of the hum (24) __________ "
    "officially by acoustic researchers, despite decades of investigation. Unless a definitive "
    "recording (25) __________, the debate may never be resolved."
)
WORDFORM_PASSAGE = (
    "Neighborhood tool libraries have opened in many communities seeking to reduce the cost and "
    "clutter of owning rarely-used equipment. Their central (38) __________ is simple: residents "
    "borrow tools for a project, then return them for the next member to use.\n\n"
    "Such libraries prove especially (39) __________ for people who rent homes and lack storage space "
    "for large equipment.\n\n"
    "Volunteers who run these libraries must track maintenance schedules and usage logs to ensure "
    "long-term (40) __________. Where libraries are organized (41) __________, members typically find "
    "the tools they need without long waits.\n\n"
    "Researchers note that tool libraries can strengthen both neighborhood (42) __________ and "
    "household savings."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the telescope")
    b.passage_mc(PASSAGE, "reading-14", RC_TOPIC, [
        (1, E, "According to the text, early telescopes were built from",
         "simple glass lenses mounted inside a hollow tube",
         ["curved mirrors polished by hand", "electronic sensors and digital displays",
          "large radio antennas pointed at the sky"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-2. «built from simple glass lenses mounted inside a hollow tube»:"]),
        (2, M, "The pronoun they in line 6 stands for",
         "astronomers", ["these crude instruments", "the heavens", "mountains and craters"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«When astronomers first pointed these crude instruments... they discovered» — «they» վերաբերում է «astronomers»-ին:"]),
        (3, M, "According to paragraph 3 (lines 10-15), lens-based telescopes suffered from",
         "blurred, rainbow-fringed images caused by light bending at different angles",
         ["overheating during long observation sessions", "difficulty detecting radio wavelengths",
          "excessive weight that made them impossible to move"],
         "Փնտրել պարբերության մեջ նշված թերությունը:",
         ["Տողեր 10-12-ը նկարագրում են այս խնդիրը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Curved mirrors reflect all colors of light at the same angle, eliminating the '
         'rainbow-fringing problem entirely."',
         "Mirrors solved the color-distortion problem that lenses had, because all light reflects at one angle.",
         ["Mirrors caused more color distortion than lenses did.", "Mirrors could only reflect a single color of light.",
          "Mirrors made rainbow-fringing worse than before."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Հայելիները լուծեցին գունային աղավաղման խնդիրը, քանի որ ամբողջ լույսը անդրադառնում է նույն անկյան տակ:"]),
        (5, M, "How did placing telescopes in orbit improve astronomy, according to the text?",
         "It let instruments avoid atmospheric blurring and absorption, producing clearer images.",
         ["It allowed telescopes to detect only radio wavelengths.", "It made telescopes lighter and easier to build on Earth.",
          "It eliminated the need for mirror-based telescopes."],
         "Փնտրել 6-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 26-28-ը ասում են, որ ուղեծրում գտնվող գործիքները խուսափում են մթնոլորտային աղավաղումից:"]),
        (6, M, "The word distortion in line 14 may best be replaced by",
         "a change that makes something appear unclear or inaccurate",
         ["a bright and colorful appearance", "a sudden increase in size", "a type of scaffolding used for support"],
         "«Distortion» = աղավաղում:",
         ["«reduce this distortion» — «distortion» = պատկերի աղավաղում/անհստակություն:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Radio telescopes can only detect the same wavelengths as the human eye.",
         ["Early telescopes could magnify distant objects only a few times.", "Massive observatories were built on remote mountains for clear skies.",
          "Mirror-based telescopes eliminated the rainbow-fringing problem."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 29-31-ը ասում են, որ ռադիոաստղադիտակները հայտնաբերում են մարդու աչքին անտեսանելի ալիքներ, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word compact in line 19 is closest in meaning to",
         "small and space-saving", ["extremely expensive", "brightly colored", "difficult to operate"],
         "«Compact» = կոմպակտ, փոքր չափերով:",
         ["«far more compact instruments» — «compact» = «small and space-saving»:"]),
        (9, M, "Paragraph 6 (lines 25-28) mainly",
         "explains how placing telescopes in orbit avoided problems caused by Earth's atmosphere",
         ["argues that ground-based telescopes should be abandoned", "describes the materials used to build observatory domes",
          "lists every satellite launched to carry a telescope"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես ուղեծրում տեղադրումը խուսափեց մթնոլորտային խնդիրներից:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing how each technological advance expanded astronomical observation",
         ["dismissive of early lens-based telescopes", "purely technical with no historical context",
          "skeptical about the value of space telescopes"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է, թե ինչպես յուրաքանչյուր առաջընթաց ընդլայնեց դիտարկման հնարավորությունները:"]),
    ])

    b.register_topic("cloze_topics", "marie curie and radioactivity")
    b.passage_mc(CLOZE_A, "cloze-curie", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly understood»:"]),
        (12, E, "Choose the right option for gap (12).", "discovered", ["was discovering", "has discovered", "had discovered"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «discovered»:"]),
        (13, M, "Choose the right option for gap (13).", "would be", ["is", "will be", "had been"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would be»:"]),
        (14, M, "Choose the right option for gap (14).", "was recognized", ["recognized", "has been recognized", "is recognized"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was recognized»:"]),
        (15, H, "Choose the right option for gap (15).", "has advanced", ["advanced", "had advanced", "was advancing"],
         "«Since» պահանջում է Present Perfect:", ["«since her findings were first published» → Present Perfect՝ «has advanced»:"]),
    ])
    b.register_topic("cloze_topics", "underwater ocean farming by 2070")
    b.passage_mc(CLOZE_B, "cloze-oceanfarming", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2070» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be sourced", ["will source", "is sourced", "have sourced"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be sourced»:"]),
    ])
    b.register_topic("cloze_topics", "the taos hum mystery")
    b.passage_mc(CLOZE_C, "cloze-taoshum", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been caused", ["should be caused", "have to cause", "can cause"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been caused»:"]),
        (22, M, "Choose the right option for gap (22).", "had been explained", ["had explained", "hasn't been explained", "wasn't explaining"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been explained»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been caused", ["may cause", "may be caused", "has to cause"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been caused» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is made", ["isn't made", "aren't made", "will be made"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "neighborhood tool libraries")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-14", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "purpose", ["purposeful", "purposely", "purposes"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «purpose»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "valuable", ["value", "valuably", "devalue"],
         "«Prove especially ___» պահանջում է ածական:", ["«prove + ածական» կառուցվածքում՝ «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "efficiently", ["efficient", "efficiency", "inefficient"],
         "«Are organized ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «efficiently»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "cohesion", ["cohesive", "cohesively", "cohere"],
         "«Neighborhood ___» դիրքում ածականից հետո անհրաժեշտ է գոյական:", ["«neighborhood cohesion» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "solar desalination cooperatives (vii)")
    t.gen_wordbank(b, rng, 56, "Solar desalination cooperatives", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "community darkroom photography studios (ix)")
    t.gen_wordbank(b, rng, 62, "Community darkroom photography studios", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
