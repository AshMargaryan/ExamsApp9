# -*- coding: utf-8 -*-
"""English mock exam #9 (AEE-ENG-009). Reading: history of vaccination.
Cloze: Wright brothers/flight, floating cities by 2110, Amber Room mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 9)"
EXAM_IDX = 9
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before the concept of vaccination existed, diseases such as
2.  smallpox killed millions of people across every continent, leaving
3.  survivors permanently scarred or blind. Some communities had long
4.  observed that people who survived a mild case of certain illnesses
5.  rarely caught the same disease again, though no one understood why
6.  this protection occurred.
7.      In the late eighteenth century, a country doctor noticed that
8.  milkmaids who had previously caught a mild disease from cattle
9.  seemed immune to the far deadlier human version of the illness. He
10. tested this observation by exposing a healthy boy to material from
11. a milkmaid's cowpox blister, then later exposing the same boy to
12. smallpox itself. The boy remained healthy, providing early evidence
13. that deliberate, controlled exposure could train the body's defenses.
14.     Despite this success, early vaccination faced considerable public
15. resistance. Some people distrusted a treatment that involved
16. material from animals, while others worried about unknown long-term
17. effects. Governments gradually built public confidence by funding
18. vaccination campaigns and, in some regions, requiring vaccination
19. for school enrollment or military service.
20.     Throughout the twentieth century, scientists identified the
21. underlying mechanism: vaccines train the immune system to recognize
22. a weakened or harmless version of a pathogen, allowing the body to
23. respond far more quickly if it later encounters the real disease.
24. This understanding allowed researchers to develop vaccines against
25. an expanding range of illnesses, from polio to measles to influenza.
26.     Large-scale vaccination campaigns eventually eliminated smallpox
27. entirely, one of the few diseases humanity has ever completely
28. eradicated. Similar coordinated efforts have brought other diseases
29. close to elimination in many regions of the world.
30.     Despite these achievements, historians note that public trust in
31. vaccination has never been guaranteed automatically, and each new
32. vaccine has required scientists and health officials to demonstrate
33. both its safety and its necessity to a sometimes skeptical public."""

CLOZE_A = (
    "Human transportation (11) __________ dramatically since the early 20th century. Before "
    "powered flight, traveling long distances quickly depended entirely on trains and ships. In "
    "1903, while the Wright brothers (12) __________ on a lightweight engine capable of powering a "
    "fixed-wing aircraft, they discovered that careful wing design could provide stable lift and "
    "control. They realized that a moving rudder (13) __________ the aircraft turn predictably in "
    "the air.\n\n"
    "Although they demonstrated powered flight successfully, the technology (14) __________ by the "
    "public as a practical means of travel for several more years. It wasn't until commercial "
    "airlines began operating regular routes that flying became common. It was estimated that "
    "within a few decades the invention (15) __________ how people and goods moved across the globe."
)
CLOZE_B = (
    "By the year 2110, the way coastal populations adapt to rising seas (16) __________ beyond "
    "recognition. Currently, engineers (17) __________ to develop floating platforms capable of "
    "supporting entire self-sufficient neighborhoods. These platforms (18) __________ to reduce the "
    "risk of flooding for vulnerable coastal communities. However, some critics argue that such "
    "structures (19) __________ be too expensive to maintain over decades. If construction costs "
    "continue to fall, experts predict that by the end of the century, most vulnerable coastal "
    "cities (20) __________ by partially floating districts rather than traditional land expansion."
)
CLOZE_C = (
    "Created in the 18th century as an ornate chamber paneled with gold-backed amber, the Amber "
    "Room was looted by soldiers during the Second World War and has never been found. "
    "Investigators believe the panels (21) __________ from their original palace in extreme haste, "
    "as witnesses reported crates being loaded within days. Since the trail went cold near a "
    "coastal city late in the war, some concluded that the room (22) __________ by a shipwreck or "
    "bombing raid during transport. Other theorists argued that the panels (23) __________ in a "
    "hidden bunker that has never been located. Whatever the truth, the room's fate (24) "
    "__________ officially by any historian, despite decades of searching. Researchers continue to "
    "investigate wartime shipping records for clues. Unless the original panels (25) __________, "
    "the mystery may never be resolved."
)
WORDFORM_PASSAGE = (
    "Community refrigerators have become common in neighborhoods seeking to reduce food waste. The "
    "(38) __________ behind these refrigerators is to let residents share surplus food freely with "
    "neighbors in need. Such refrigerators are especially (39) __________ in areas with limited "
    "access to affordable groceries.\n\n"
    "Organizers must consider factors like food safety and regular cleaning to ensure long-term "
    "(40) __________. When refrigerators are maintained (41) __________, community trust in the "
    "program often grows steadily.\n\n"
    "Studies suggest that community refrigerators can improve both (42) __________ security and "
    "neighborhood connection."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of vaccination and immunization")
    b.passage_mc(PASSAGE, "reading-9", RC_TOPIC, [
        (1, E, "According to the text, before vaccination existed, communities had observed that",
         "people who survived a mild case of certain illnesses rarely caught the same disease again",
         ["milkmaids were the only people ever affected by smallpox", "governments required vaccination for school enrollment",
          "vaccines trained the immune system to recognize pathogens"],
         "Փնտրել առաջին պարբերության հիմնական դիտարկումը:",
         ["Տողեր 3-6. «people who survived a mild case of certain illnesses rarely caught the same disease again»:"]),
        (2, M, "The pronoun it in line 23 stands for",
         "the immune system", ["the disease", "the vaccine", "the pathogen"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...allowing the body to respond... if it later encounters the real disease» — «it» վերաբերում է «the immune system»-ին:"]),
        (3, M, "According to paragraph 3 (lines 14-19), early vaccination faced public resistance because",
         "some distrusted material from animals and worried about long-term effects",
         ["governments banned vaccination entirely", "no one had ever tested vaccination before",
          "vaccines were too expensive for most people"],
         "Փնտրել պարբերության մեջ նշված պատճառները:",
         ["Տողեր 15-17-ը ասում են, որ մարդիկ չէին վստահում կենդանական նյութին և անհանգստանում էին երկարաժամկետ ազդեցություններից:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"The boy remained healthy, providing early evidence that deliberate, controlled exposure '
         'could train the body\'s defenses."',
         "A controlled test showed that exposure to a mild illness could build immunity.",
         ["The boy became seriously ill after the experiment.", "No evidence was ever gathered about immunity.",
          "The experiment proved that exposure to disease always causes illness."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ վերահսկվող ազդեցությունը կարող էր մարզել մարմնի պաշտպանությունը:"]),
        (5, M, "How did understanding the immune mechanism affect vaccine development, according to the text?",
         "It allowed researchers to develop vaccines against an expanding range of illnesses.",
         ["It made further vaccine research unnecessary.", "It had no impact on medical research.",
          "It caused researchers to abandon vaccination entirely."],
         "Փնտրել 4-րդ պարբերության վերջին նախադասությունը:",
         ["Տողեր 24-25-ը ասում են, որ այս ըմբռնումը թույլ տվեց հետազոտողներին մշակել պատվաստանյութեր ավելի ու ավելի շատ հիվանդությունների դեմ:"]),
        (6, M, "The word eradicated in line 28 may best be replaced by",
         "completely eliminated", ["partially reduced", "temporarily delayed", "widely spread"],
         "«Eradicate» = ամբողջությամբ վերացնել:",
         ["«one of the few diseases humanity has ever completely eradicated» — «eradicated» = «completely eliminated»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Public trust in vaccination has always been automatic and unquestioning.",
         ["Smallpox was eventually eliminated through large-scale vaccination campaigns.",
          "Some governments required vaccination for school enrollment.",
          "Early vaccination faced considerable public resistance."],
         "Համեմատել յուրաքանչյուր տարբերակը եզրափակիչ պարբերության հետ:",
         ["Տողեր 30-31-ը ասում են, որ հասարակական վստահությունը երբեք ինքնաբերաբար երաշխավորված չի եղել, ինչը հակասում է d) տարբերակին:"]),
        (8, M, "The word skeptical in line 33 is closest in meaning to",
         "doubtful", ["enthusiastic", "grateful", "indifferent"],
         "«Skeptical» = կասկածամիտ:",
         ["«a sometimes skeptical public» — «skeptical» = «doubtful» (կասկածամիտ):"]),
        (9, M, "Paragraph 5 (lines 26-29) mainly",
         "describes how coordinated vaccination campaigns eliminated smallpox",
         ["argues that vaccination campaigns should be discontinued",
          "explains the biological structure of the smallpox virus",
          "lists every country that eliminated smallpox first"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է ծաղկախտի ամբողջական վերացումը համակարգված պատվաստումների միջոցով:"]),
        (10, M, "The overall tone of the text can best be described as",
         "respectful of scientific progress while acknowledging ongoing public trust challenges",
         ["dismissive of the value of vaccination", "purely celebratory with no mention of resistance",
          "hostile toward modern public health policy"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը գնահատում է գիտական առաջընթացը՝ ընդունելով նաև հանրային վստահության շարունակական մարտահրավերները:"]),
    ])

    b.register_topic("cloze_topics", "the Wright brothers and powered flight")
    b.passage_mc(CLOZE_A, "cloze-wrightbrothers", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the early 20th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was helping", ["had been helped", "have been helped", "is helped"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was helping» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't accepted", ["hasn't been accepted", "is accepted", "had accepted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "floating cities by 2110")
    b.passage_mc(CLOZE_B, "cloze-floatingcities", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2110» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be served", ["will serve", "is served", "have served"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be served»:"]),
    ])
    b.register_topic("cloze_topics", "the disappearance of the Amber Room")
    b.passage_mc(CLOZE_C, "cloze-amberroom", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been removed", ["should remove", "have to remove", "can remove"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive «must have been removed»:"]),
        (22, M, "Choose the right option for gap (22).", "had been destroyed", ["had destroyed", "hasn't been destroyed", "wasn't destroying"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been destroyed»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been hidden", ["may hide", "may be hidden", "has to hide"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been hidden» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "are found", ["aren't found", "isn't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple, հոգնակի ենթակա:", ["«Unless» պահանջում է Present Simple, ոչ Future; «panels» հոգնակի է:"]),
    ])

    b.register_topic("wordform_topics", "community refrigerators")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-9", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "popular", ["popularly", "popularity", "unpopular"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «popular»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "properly", ["proper", "propriety", "improper"],
         "«Are maintained ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «properly»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "food", ["fed", "feeding", "foodless"],
         "«___ security» դիրքում գոյականից առաջ անհրաժեշտ է գոյական-որոշիչ:", ["«food security» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "apprenticeship program expansion (VII)")
    t.gen_wordbank(b, rng, 56, "Apprenticeship program expansion", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "community theater fundraising (IX)")
    t.gen_wordbank(b, rng, 62, "Community theater fundraising", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
