# -*- coding: utf-8 -*-
"""English mock exam #13 (AEE-ENG-013). Reading: history of the bicycle.
Cloze: Louis Pasteur/pasteurization, hyperloop travel by 2060, the Mary Celeste mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 13)"
EXAM_IDX = 13
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  The earliest ancestor of the modern bicycle appeared in the early
2.  nineteenth century as a simple wooden frame with two wheels, propelled
3.  by pushing one's feet directly against the ground rather than pedaling.
4.  Riders straddled the frame and walked or ran while seated, which
5.  earned the machine derisive nicknames from onlookers who found the
6.  sight amusing rather than practical.
7.      Pedals were not added until several decades later, when inventors
8.  attached cranks directly to the front wheel. This design, though
9.  innovative, made the machine difficult to balance and dangerous to
10. ride, since a rider sitting high above an oversized front wheel could
11. be thrown forward by even a small obstacle in the road.
12.     The breakthrough that made cycling accessible to ordinary people
13. was the chain-driven rear wheel, which allowed both wheels to be
14. roughly equal in size. This design, often called the safety bicycle,
15. lowered the rider's center of gravity and made mounting and
16. dismounting far less hazardous.
17.     Pneumatic tires, filled with air rather than solid rubber,
18. followed shortly afterward and dramatically improved comfort by
19. absorbing shocks from uneven road surfaces. Combined with the safety
20. frame, this innovation triggered a cycling boom that swept through
21. cities and countryside alike.
22.     For many people, especially women, the bicycle represented a new
23. kind of independence. It allowed travel without relying on horses,
24. carriages, or someone else's schedule, and contributed to changes in
25. clothing styles as long skirts proved impractical for pedaling.
26.     The twentieth century brought motor vehicles that overshadowed
27. the bicycle as the primary means of transportation in many wealthy
28. countries, though it remained essential in much of the world.
29.     In recent decades, concerns about traffic congestion, pollution,
30. and public health have renewed interest in cycling. Many cities have
31. built dedicated bike lanes and launched bike-share programs,
32. demonstrating that a technology conceived two centuries ago still has
33. much to offer.

"""

CLOZE_A = (
    "Before Louis Pasteur's research, the causes of food spoilage (11) __________ properly understood "
    "by scientists. While studying why wine and beer sometimes spoiled during fermentation, Pasteur "
    "(12) __________ that microorganisms were responsible for the process. He proposed that heating "
    "liquids to a specific temperature (13) __________ these microorganisms without significantly "
    "altering the taste.\n\n"
    "Although his method faced resistance initially, pasteurization (14) __________ by the food "
    "industry within a few decades of his discovery. Today it is estimated that the technique "
    "(15) __________ countless illnesses since it first became widespread."
)
CLOZE_B = (
    "By 2060, the way people travel between major cities (16) __________ dramatically due to hyperloop "
    "technology. Currently, engineers (17) __________ to solve the technical challenges of maintaining "
    "a vacuum across such long distances. These systems (18) __________ to reduce travel time between "
    "cities to a fraction of what it is today. However, some economists argue that the infrastructure "
    "costs (19) __________ prohibitively expensive for many countries. If technical hurdles continue "
    "to be solved, experts predict that by the middle of the century, most long-distance travel within "
    "hyperloop corridors (20) __________ by high-speed pods rather than airplanes."
)
CLOZE_C = (
    "Discovered adrift in the Atlantic Ocean in 1872, the Mary Celeste was found completely abandoned, "
    "with no sign of struggle or damage to explain the crew's disappearance. Investigators believe the "
    "crew (21) __________ to abandon ship in a hurry, since personal belongings and valuables were left "
    "untouched. Because the lifeboat and navigation instruments were missing, some concluded that the "
    "crew (22) __________ by a sudden storm or a feared explosion aboard. Other theorists argued that "
    "the ship (23) __________ by pirates who later abandoned their plan. Whatever the truth, the fate "
    "of the crew (24) __________ officially by maritime investigators, despite more than a century of "
    "study. Unless new evidence (25) __________, the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "Public seed libraries have appeared in many communities seeking to preserve regional plant "
    "varieties threatened by industrial agriculture. Their central (38) __________ is straightforward: "
    "residents borrow seed packets, grow the plants, and return new seeds harvested at the end of the "
    "season.\n\n"
    "Such libraries prove especially (39) __________ in regions where commercial seed catalogs have "
    "grown less diverse over time.\n\n"
    "Volunteers who run these libraries must track germination rates and regional climate data to "
    "guarantee long-term (40) __________. Where libraries are organized (41) __________, participating "
    "gardeners typically produce dependable harvests.\n\n"
    "Researchers note that seed libraries can strengthen both community (42) __________ and household "
    "food security."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the bicycle")
    b.passage_mc(PASSAGE, "reading-13", RC_TOPIC, [
        (1, E, "According to the text, the earliest ancestor of the bicycle was propelled by",
         "pushing one's feet directly against the ground",
         ["pedals attached to the front wheel", "a chain-driven rear wheel", "an internal motor"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 2-3. «propelled by pushing one's feet directly against the ground rather than pedaling»:"]),
        (2, M, "The pronoun It in line 23 stands for",
         "the bicycle", ["independence", "clothing styles", "horses"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...the bicycle represented a new kind of independence. It allowed travel...» — «It» վերաբերում է «the bicycle»-ին:"]),
        (3, M, "According to paragraph 2 (lines 7-11), attaching pedals directly to the front wheel made the bicycle",
         "difficult to balance and dangerous to ride",
         ["easier to mount and dismount", "much lighter and cheaper to produce",
          "suitable for long-distance travel"],
         "Փնտրել պարբերության մեջ նշված հետևանքը:",
         ["Տողեր 8-9-ը ասում են, որ այս դիզայնը «made the machine difficult to balance and dangerous to ride»:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"This design, often called the safety bicycle, lowered the rider\'s center of gravity and '
         'made mounting and dismounting far less hazardous."',
         "The safety bicycle design made bicycles lower and safer to get on and off.",
         ["The safety bicycle design made bicycles heavier and harder to ride.", "The safety bicycle was more dangerous than earlier designs.",
          "The safety bicycle had no effect on how riders mounted the machine."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ անվտանգության հեծանիվը իջեցրեց ծանրության կենտրոնը և նվազեցրեց վտանգը:"]),
        (5, M, "According to the text, pneumatic tires improved cycling by",
         "absorbing shocks from uneven road surfaces",
         ["making bicycles significantly cheaper to manufacture", "eliminating the need for a chain-driven wheel",
          "allowing riders to travel without any wheels at all"],
         "Փնտրել 3-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 18-19-ը ասում են, որ դրանք «dramatically improved comfort by absorbing shocks from uneven road surfaces»:"]),
        (6, M, "The word derisive in line 5 may best be replaced by",
         "mocking", ["encouraging", "confused", "scientific"],
         "«Derisive» = ծաղրական:",
         ["«earned the machine derisive nicknames» — «derisive» = «mocking» (ծաղրական):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Motor vehicles had no effect on bicycle usage in wealthy countries.",
         ["Pneumatic tires improved comfort by absorbing shocks.", "The safety bicycle allowed both wheels to be roughly equal in size.",
          "Cities have built dedicated bike lanes in recent decades."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 26-28-ը ասում են, որ motor vehicles «overshadowed the bicycle», ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word overshadowed in line 26 is closest in meaning to",
         "made less noticeable or important", ["destroyed completely", "made more popular", "financially supported"],
         "«Overshadowed» = ստվերի տակ դրեց, նվազեցրեց նշանակությունը:",
         ["«motor vehicles that overshadowed the bicycle» — «overshadowed» = «made less noticeable or important»:"]),
        (9, M, "Paragraph 5 (lines 22-25) mainly",
         "explains how the bicycle gave people, especially women, a new sense of independence",
         ["argues that bicycles should be banned from city streets", "describes the chemical composition of bicycle tires",
          "lists every country where bicycles were manufactured"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է, թե ինչպես հեծանիվը մարդկանց, հատկապես կանանց, տվեց նոր անկախության զգացում:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative and appreciative of the bicycle's ongoing relevance",
         ["dismissive of cycling as an impractical activity", "purely satirical and mocking of early inventors",
          "alarmed about the dangers of modern traffic congestion"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով գնահատում է հեծանիվի շարունակական արդիականությունը:"]),
    ])

    b.register_topic("cloze_topics", "louis pasteur and pasteurization")
    b.passage_mc(CLOZE_A, "cloze-pasteur", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly understood»:"]),
        (12, E, "Choose the right option for gap (12).", "discovered", ["was discovering", "has discovered", "had discovered"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «discovered»:"]),
        (13, M, "Choose the right option for gap (13).", "would eliminate", ["eliminates", "will eliminate", "had eliminated"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would eliminate»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has prevented", ["prevented", "had prevented", "was preventing"],
         "«Since» պահանջում է Present Perfect:", ["«since it first became widespread» → Present Perfect՝ «has prevented»:"]),
    ])
    b.register_topic("cloze_topics", "hyperloop travel by 2060")
    b.passage_mc(CLOZE_B, "cloze-hyperloop", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2060» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «economists argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be handled", ["will handle", "is handled", "have handled"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be handled»:"]),
    ])
    b.register_topic("cloze_topics", "the mary celeste ghost ship mystery")
    b.passage_mc(CLOZE_C, "cloze-marycelest", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been forced", ["should be forced", "have to force", "can force"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been forced»:"]),
        (22, M, "Choose the right option for gap (22).", "had been frightened", ["had frightened", "hasn't been frightened", "wasn't frightening"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been frightened»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been boarded", ["may board", "may be boarded", "has to board"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been boarded» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "public seed libraries")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-13", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "purpose", ["purposeful", "purposely", "purposes"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «purpose»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "valuable", ["value", "valuably", "devalue"],
         "«Prove especially ___» պահանջում է ածական:", ["«prove + ածական» կառուցվածքում՝ «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«guarantee» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "efficiently", ["efficient", "efficiency", "inefficient"],
         "«Are organized ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «efficiently»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "cohesion", ["cohesive", "cohesively", "cohere"],
         "«Community ___» դիրքում ածականից հետո անհրաժեշտ է գոյական:", ["«community cohesion» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "urban beekeeping initiatives (vii)")
    t.gen_wordbank(b, rng, 56, "Urban beekeeping initiatives", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "riverfront restoration projects (ix)")
    t.gen_wordbank(b, rng, 62, "Riverfront restoration projects", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
