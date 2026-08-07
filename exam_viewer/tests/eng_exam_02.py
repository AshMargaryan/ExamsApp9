# -*- coding: utf-8 -*-
"""English mock exam #2 (AEE-ENG-002). Reading: lighthouse history/automation.
Cloze: telephone invention, vertical farming by 2060, Flannan Isles mystery.
All content independently authored, distinct topics/words from exam 1."""
from eng_common import E, M, H

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 2)"

RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
GRAMMAR_TOPIC = "Քերականական ընտրություն"
WORDFORM_TOPIC = "Բառակազմություն"
COMPLEX_TOPIC = "Բարդ նախադասության կառուցվածք"
REPORTED_TOPIC = "Անուղղակի խոսք"
WORDBANK_TOPIC = "Բառապաշարի լրացում"
QFORM_TOPIC = "Հարցական նախադասություններ"
PREP_TOPIC = "Նախդիրներ և մակբայներ"
ODDWORD_TOPIC = "Ավելորդ բառի հայտնաբերում"
PASSIVE_TOPIC = "Կրավորական սեռ"
VOCAB_TOPIC = "Բառապաշար (համապատասխանեցում)"
SENTMATCH_TOPIC = "Նախադասությունների միավորում"

PASSAGE = """Line number

1.  For centuries, lighthouses stood as one of the most important
2.  safety systems available to sailors, warning ships away from rocky
3.  coastlines and marking the entrances to busy harbors. Early lighthouses
4.  were often simple bonfires maintained on hilltops, but by the eighteenth
5.  century, engineers had begun constructing tall stone towers fitted with
6.  oil lamps and, later, rotating lenses that could project light for
7.  many kilometers across open water.
8.      Operating a lighthouse was demanding and often isolated work.
9.  Keepers were responsible for cleaning the lens, trimming wicks, winding
10. the clockwork mechanisms that rotated the light, and maintaining detailed
11. logbooks recording weather and passing vessels. Many lighthouses stood
12. on remote islands or exposed headlands, and keepers sometimes lived there
13. with their families for months at a time, cut off from the mainland
14. whenever storms made the surrounding waters impassable.
15.     The invention of electric lighting in the late nineteenth century
16. gradually transformed the profession. Electric lamps burned brighter and
17. required far less maintenance than oil-fueled ones, and by the mid-twentieth
18. century, many lighthouses had been converted to run on generators or
19. underwater cables connected to the mainland grid. This reduced the workload
20. considerably, though keepers still needed to inspect the equipment regularly.
21.     The most significant change came with automation. Starting in the
22. 1960s, engineers developed systems that could detect equipment failures,
23. adjust the light automatically, and alert maintenance crews without any
24. permanent staff on site. Over the following decades, one lighthouse after
25. another was automated, and by the close of the twentieth century, almost
26. none retained a full-time human keeper.
27.     Despite automation, lighthouses have not lost their significance.
28. Many coastal communities have restored decommissioned lighthouses as
29. museums and tourist attractions, preserving the buildings and the stories
30. of the keepers who once lived in them. Maritime historians argue that
31. these structures represent an important chapter in the history of
32. navigation, one that deserves to be remembered even as satellite systems
33. have taken over most of the safety functions lighthouses once performed."""

CLOZE_A = (
    "Long-distance communication (11) __________ dramatically since the mid-19th century. Before "
    "the telephone, urgent messages depended on the telegraph, which could only transmit coded "
    "signals. In 1876, while Alexander Graham Bell (12) __________ on a device to transmit multiple "
    "telegraph signals at once, he discovered that voice itself could be carried electrically along "
    "a wire. He realized that vibrations in the receiver (13) __________ the original sound.\n\n"
    "Although he patented the invention quickly, telephone service (14) __________ by most "
    "households for several more decades. It wasn't until long-distance lines connected major "
    "cities that the telephone became commonplace. It was estimated that by the mid-20th century "
    "the invention (15) __________ communication across the globe."
)

CLOZE_B = (
    "By the year 2060, the way we produce food (16) __________ beyond recognition. Currently, "
    "agricultural engineers (17) __________ to develop vertical farms that grow crops indoors using "
    "minimal water. These farms (18) __________ to reduce the need for long-distance food "
    "transport. However, some critics argue that such systems (19) __________ be too costly to "
    "scale nationally. If investment continues at the current pace, experts predict that by "
    "mid-century, most leafy vegetables (20) __________ in urban vertical farms rather than open fields."
)

CLOZE_C = (
    "In December 1900, a relief boat arrived at the Flannan Isles lighthouse to find all three "
    "keepers missing. Investigators believe the men (21) __________ the lighthouse in a sudden "
    "emergency, as an overturned chair and an unfinished meal were found inside. Since the "
    "storm-battered west landing showed signs of damage, some concluded that a keeper (22) "
    "__________ by a rogue wave while securing equipment. Other theorists argued that all three men "
    "(23) __________ together in a single accident while inspecting the crane. Whatever the truth, "
    "the missing keepers (24) __________ officially again, and their disappearance remains unsolved. "
    "Researchers continue to study the weather records from that week. Unless new evidence (25) "
    "__________, the mystery may never be resolved."
)

WORDFORM_PASSAGE = (
    "Urban rewilding has gained attention as cities look for ways to restore natural habitats. The "
    "(38) __________ behind these projects is to reintroduce native plants and animals into city "
    "spaces. Such initiatives are especially (39) __________ in areas that have lost most of their "
    "green cover.\n\n"
    "Planners must consider factors like soil contamination and public safety to ensure long-term "
    "(40) __________. When rewilding projects are managed (41) __________, local wildlife "
    "populations often recover within a few years.\n\n"
    "Studies suggest that urban rewilding can improve both (42) __________ biodiversity and "
    "residents' mental health."
)

WORDBANK_1 = (
    "Many first-time entrepreneurs find it hard to (Ա) __________ enough funding before their "
    "savings run out. Investors are typically more (Բ) __________ to support a business once it has "
    "shown steady demand. A clear plan can also help founders (Գ) __________ unnecessary expenses "
    "during the first year.\n\n"
    "Local chambers of commerce often (Դ) __________ workshops for new business owners, covering "
    "topics from taxation to marketing. Experienced mentors advise setting money aside well in "
    "(Ե) __________, since unexpected costs are almost guaranteed to arise.\n\n"
    "Word bank (two are odd): 1. secure  2. inclined  3. avoid  4. host  5. advance  6. dismiss  "
    "7. reluctant"
)

WORDBANK_2 = (
    "Nikola Tesla is remembered (Ա) __________ his groundbreaking work on alternating current. From "
    "a young age, he was fascinated (Բ) __________ electricity and spent hours sketching designs "
    "for machines he had only imagined. During his career, he combined engineering (Գ) __________ "
    "bold, sometimes theatrical, public demonstrations.\n\n"
    "Tesla filed hundreds of patents and left behind detailed notebooks describing inventions far "
    "ahead of his time.\n\n"
    "Interestingly, Tesla remained committed (Դ) __________ his research even after losing "
    "financial backing, believing that free energy should eventually reach people (Ե) __________ "
    "every background.\n\n"
    "Word bank (two are odd): 1. for  2. with  3. by  4. to  5. from  6. inside  7. about"
)


def build(b):
    # =================================================== I. READING (1-10)
    b.register_topic("reading_topics", "lighthouse history and automation")
    b.passage_mc(PASSAGE, "reading-2", RC_TOPIC, [
        (1, E, "According to the text, early lighthouses were typically",
         "simple bonfires kept on hilltops",
         ["tall stone towers with rotating lenses",
          "electric beacons connected to underwater cables",
          "automated systems with no human keeper"],
         "Համեմատել «early lighthouses» նկարագրությունը հետագա զարգացումների հետ:",
         ["Տողեր 3-4. «Early lighthouses were often simple bonfires maintained on hilltops» — մյուս տարբերակները հետագա փուլերի նկարագրություններ են:"]),
        (2, M, "The pronoun them in line 30 stands for",
         "buildings",
         ["museums", "communities", "stories"],
         "Գտնել այն գոյականը, որին վերաբերում է «them»-ը` կարդալով ամբողջ նախադասությունը:",
         ["«...preserving the buildings and the stories of the keepers who once lived in them» — «them»-ը վերաբերում է «buildings»-ին, քանի որ պահապանները ապրում էին հենց շենքերում:"]),
        (3, M, "According to paragraph 2 (lines 8-14), a lighthouse keeper's duties included",
         "cleaning the lens and maintaining logbooks of weather and vessels",
         ["installing satellite navigation equipment",
          "training new sailors in navigation",
          "repairing ships damaged by storms"],
         "Փնտրել պարբերության մեջ ուղղակիորեն թվարկված պարտականությունները:",
         ["Տողեր 9-11-ը թվարկում են ոսպնյակի մաքրում, պատրույգների կարգավորում և եղանակի/նավերի գրանցամատյան վարում:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"The invention of electric lighting in the late nineteenth century gradually transformed the profession."',
         "Electric lighting changed how lighthouse keepers worked over time.",
         ["Electric lighting had no effect on lighthouse keeping.",
          "Lighthouse keepers invented electric lighting themselves.",
          "The profession disappeared as soon as electricity was invented."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ էլեկտրական լուսավորությունը աստիճանաբար փոխեց մասնագիտությունը, ինչը ուղիղ համապատասխանում է a) տարբերակին:"]),
        (5, M, "How did automation affect lighthouse staffing, according to the text?",
         "It gradually eliminated the need for full-time keepers.",
         ["It required hiring more full-time keepers.",
          "It had no effect on staffing levels.",
          "It immediately closed all lighthouses permanently."],
         "Համեմատել ավտոմատացումից առաջ և հետո եղած իրավիճակը:",
         ["Տողեր 24-26. «one lighthouse after another was automated... almost none retained a full-time human keeper» — ցույց է տալիս աստիճանական վերացում:"]),
        (6, M, "The word impassable in line 14 may best be replaced by",
         "impossible to cross",
         ["extremely shallow", "always calm", "rarely visited"],
         "«Impassable» = «-passable» (անցանելի) + «im-» (ժխտական նախածանց):",
         ["«whenever storms made the surrounding waters impassable» — ջրերն անանցանելի էին դառնում փոթորիկների ժամանակ, հետևաբար՝ «impossible to cross»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "By the end of the twentieth century, most lighthouses still had full-time keepers.",
         ["Lighthouse keepers had to maintain detailed logbooks.",
          "Electric lighting reduced the maintenance keepers needed to perform.",
          "Some decommissioned lighthouses now function as museums."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ, հատկապես ավտոմատացման մասին հատվածի հետ:",
         ["Տողերը 24-26 ասում են, որ գրեթե ոչ մի փարոս 20-րդ դարի վերջում մշտական պահապան չուներ, ինչը ուղիղ հակասում է d) տարբերակին:"]),
        (8, E, "The word decommissioned in line 28 is synonymous to",
         "taken out of active service",
         ["newly built", "frequently visited", "privately owned"],
         "«Decommissioned» = ծառայությունից հանված, այլևս գործող չէ:",
         ["«Many coastal communities have restored decommissioned lighthouses as museums» — decommissioned = այլևս ակտիվ ծառայության մեջ չգտնվող:"]),
        (9, M, "Paragraph 4 (lines 27-33) mainly",
         "argues that lighthouses remain historically significant despite no longer being operationally necessary",
         ["explains the technical process of automating a lighthouse",
          "argues that lighthouses should be demolished now that they are automated",
          "lists the exact dates when each lighthouse was automated"],
         "Բացահայտել վերջին պարբերության հիմնական փաստարկը:",
         ["Պարբերությունը շեշտում է, որ չնայած ավտոմատացմանը, փարոսները պահպանում են պատմական և մշակութային արժեք (թանգարաններ, զբոսաշրջություն):"]),
        (10, M, "The overall tone of the text can best be described as",
         "appreciative of lighthouses' historical and cultural value",
         ["dismissive of lighthouses' continued relevance",
          "purely technical and statistical",
          "critical of the decision to automate lighthouses"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը շեշտում է փարոսների պատմական նշանակությունը և պահպանման արժեքը, ինչը դրական, գնահատող տոն է:"]),
    ])

    # =================================================== II. CLOZE (11-25)
    b.register_topic("cloze_topics", "telephone invention (Bell)")
    b.passage_mc(CLOZE_A, "cloze-telephone", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).",
         "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-19th century» պահանջում է Present Perfect:",
         ["«Since» + անցյալ ժամանակահատված → Present Perfect. «has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).",
         "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն, ընդհատված «he discovered»-ով:",
         ["Past Continuous («was working») ցույց է տալիս ընթացիկ ֆոնային գործողություն, որը ընդհատվել է մեկ այլ անցյալ գործողությամբ:"]),
        (13, M, "Choose the right option for gap (13).",
         "were reproducing", ["had been reproduced", "have been reproduced", "are reproduced"],
         "Ընթացիկ պատճառահետևանքային կապ անցյալում:",
         ["«were reproducing» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց, որը դիտվել է այդ պահին:"]),
        (14, M, "Choose the right option for gap (14).",
         "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված («for several more decades»):",
         ["Past Simple Passive («wasn't adopted») օգտագործվում է կոնկրետ, ավարտված անցյալ իրադարձության համար:"]),
        (15, H, "Choose the right option for gap (15).",
         "had revolutionized", ["was revolutionized", "had been revolutionized", "would be revolutionized"],
         "Ակտիվ սեռով Past Perfect, ավարտված մինչև հայտարարության պահը:",
         ["«discovery»-ն ենթական է ակտիվ իմաստով («revolutionize communication»), ուստի ճիշտ ձևը՝ «had revolutionized»:"]),
    ])
    b.register_topic("cloze_topics", "vertical farming by 2060")
    b.passage_mc(CLOZE_B, "cloze-verticalfarm", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).",
         "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում կոնկրետ տարեթվին ավարտված գործողություն՝ Future Perfect:",
         ["«By the year 2060» պահանջում է Future Perfect՝ «will have changed»:"]),
        (17, E, "Choose the right option for gap (17).",
         "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:",
         ["«Currently» պահանջում է Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).",
         "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի նկարագրություն՝ կրավորական, ներկա ժամանակ:",
         ["«are designed to» = «նախատեսված են» — Present Simple Passive, ընդհանուր փաստի նկարագրություն:"]),
        (19, M, "Choose the right option for gap (19).",
         "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն արտահայտող մոդալ բայ:",
         ["«might» արտահայտում է թույլ ենթադրություն, ինչը համապատասխանում է «critics argue» կասկածամիտ համատեքստին:"]),
        (20, H, "Choose the right option for gap (20).",
         "will be grown", ["will grow", "is grown", "have grown"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:",
         ["«vegetables» ենթական է կրավորական իմաստով («grown in farms»), ուստի ճիշտ ձևը՝ Future Simple Passive «will be grown»:"]),
    ])
    b.register_topic("cloze_topics", "Flannan Isles lighthouse mystery")
    b.passage_mc(CLOZE_C, "cloze-flannan", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).",
         "must have left", ["should be left", "have to leave", "can leave"],
         "Հանգիստ եզրակացություն անցյալի մասին՝ հիմնված ապացույցի վրա (chair, unfinished meal):",
         ["Modal Perfect «must have left» օգտագործվում է ապացույցի հիման վրա եզրակացնելիս:"]),
        (22, M, "Choose the right option for gap (22).",
         "had been swept away", ["had swept away", "hasn't been swept away", "wasn't sweeping away"],
         "Կրավորական, նախաանցյալ գործողություն:",
         ["«had been swept away» (Past Perfect Passive) — գործողություն, որն ավարտված էր մեկ այլ անցյալ գործողությունից առաջ:"]),
        (23, M, "Choose the right option for gap (23).",
         "might have been lost", ["may lose", "may be lost", "has to lose"],
         "Անվստահ ենթադրություն անցյալի մասին՝ մոդալ + Perfect Passive Infinitive:",
         ["«might have been lost» արտահայտում է թույլ ենթադրություն անցյալ կրավորական իրադարձության մասին:"]),
        (24, M, "Choose the right option for gap (24).",
         "weren't seen", ["aren't seen", "hadn't seen", "won't see"],
         "Ավարտված անցյալ բացակայություն, կրավորական սեռ:",
         ["«weren't seen» (Past Simple Passive, ժխտական) — պահապանները երբեք չեն հայտնաբերվել:"]),
        (25, H, "Choose the right option for gap (25).",
         "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple, ոչ Future:",
         ["«Unless» պահանջում է Present Simple («is found»), ինչպես Zero/First Conditional-ում:"]),
    ])

    # =================================================== III. GRAMMAR MC (26-37)
    b.mc(26, GRAMMAR_TOPIC, M,
         "The old boiler is making strange noises; it __________.",
         "needs replacing", ["needs to replace", "need replacing", "needs to be replacing"],
         "«Need + գերունդ» ունի կրավորական իմաստ:",
         ["«needs replacing» = «needs to be replaced» — «it»-ի հետ պահանջվում է եզակի «needs»:"])
    b.mc(27, GRAMMAR_TOPIC, E,
         'Does the gallery have any artists __________ the two headliners?"\n'
         '"Yes, several local painters too."',
         "besides", ["beside", "except", "apart to"],
         "«Besides» = «ի հավելումն», «beside» = «կողքին»:",
         ["Համատեքստը պահանջում է «ի հավելումն» իմաստ, ինչը արտահայտում է «besides»:"])
    b.mc(28, GRAMMAR_TOPIC, M,
         '"I haven\'t tried the new software yet."\n"__________."',
         "Neither have I", ["So haven't I", "Neither I have", "Nor haven't I"],
         "Բացասական համաձայնության համար՝ «Neither + օժանդակ բայ + ենթակա»:",
         ["Ճիշտ կառուցվածքն է «Neither have I» (Neither + auxiliary + subject):"])
    b.mc(29, GRAMMAR_TOPIC, E,
         '"__________ is the museum from the hotel?"\n"Just a ten-minute taxi ride."',
         "How far", ["How long", "How fast", "How much"],
         "Հեռավորության հարցում՝ «How far»:",
         ["Պատասխանը հեռավորության մասին է, ուստի հարցը՝ «How far»:"])
    b.mc(30, GRAMMAR_TOPIC, M,
         "I wish I could dance __________ as my partner does.",
         "as gracefully", ["as graceful", "more graceful", "much more graceful"],
         "«As + մակբայ + as» պահանջում է մակբայ, ոչ ածական:",
         ["Բային («dance») բնութագրելու համար պետք է մակբայ՝ «as gracefully as»:"])
    b.mc(31, GRAMMAR_TOPIC, M,
         "The intern submitted the report late again __________, frustrating the whole team.",
         "as usual", ["usually", "as usually", "like usual"],
         "«As usual» ֆիքսված արտահայտություն է, առանց «ly»:",
         ["«As usual» կայուն արտահայտություն է, «usually» չի կարող հետևել «as»-ին:"])
    b.mc(32, GRAMMAR_TOPIC, M,
         "__________ shipwrecks discovered off this coast has grown steadily.",
         "The number of", ["The numbers of", "A number of", "Number of"],
         "«The number of + հոգնակի» ենթարկվում է եզակի բային:",
         ["«The number of» համաձայնեցվում է եզակի բայի հետ («has grown»):"])
    b.mc(33, GRAMMAR_TOPIC, M,
         "The board __________ the recent decline in membership.",
         "is worried about", ["are worried because", "is worried as", "have worried in"],
         "«Board» հավաքական գոյական է, «worried about» կայուն կապակցություն է:",
         ["«be worried about» ճիշտ նախդրային կապակցությունն է, «board» վերցնում է եզակի «is»:"])
    b.mc(34, GRAMMAR_TOPIC, M,
         "Before germ theory, sailors __________ that scurvy was caused by bad air at sea.",
         "used to think", ["were used to think", "got used to think", "used to thinking"],
         "«Used to + հիմնական բայ» = անցյալի կրկնվող գործողություն:",
         ["«used to think» ցույց է տալիս անցյալում տարածված համոզմունք:"])
    b.mc(35, GRAMMAR_TOPIC, M,
         '"Did Lena finish the crossword?"\n"No, she is having __________ solving the last clue."',
         "a hard time", ["hard time", "hard times", "the hard time"],
         "«Have a hard time + գերունդ» միշտ անորոշ հոդվածով:",
         ["«have a hard time doing something» ֆիքսված արտահայտություն է՝ «a hard time»:"])
    b.mc(36, GRAMMAR_TOPIC, M,
         "We need to buy __________ for the new kitchen.",
         "a great deal of cutlery", ["many new cutleries", "several cutleries", "a few cutlery"],
         "«Cutlery»-ն անհաշվելի գոյական է:",
         ["«Cutlery» անհաշվելի է, հոգնակի «-s» չի ընդունում. «a great deal of» ճիշտ քանակային նշիչ է:"])
    b.mc(37, GRAMMAR_TOPIC, E,
         "Trains __________ depart on time, so arrive early.",
         "generally", ["in generally", "for general", "as general"],
         "«Generally» ինքնուրույն մակբայ է, առանց նախդրի:",
         ["«Generally» գործածվում է ուղղակիորեն, առանց նախդրի:"])

    # =================================================== IV. WORD-FORM CLOZE (38-42)
    b.register_topic("wordform_topics", "urban rewilding")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-2", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).",
         "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական («The ___ ... is») պահանջում է եզակի գոյական:",
         ["«is»-ից առաջ պետք է եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).",
         "valuable", ["valuably", "value", "devalue"],
         "«Are especially ___» պահանջում է ածական:",
         ["«be + ածական» կառուցվածքում անհրաժեշտ է «valuable»:"]),
        (40, M, "Choose the word form that best fits gap (40).",
         "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» դիրքում անհրաժեշտ է գոյական:",
         ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).",
         "carefully", ["careful", "carefulness", "uncareful"],
         "«Are managed ___» դիրքում անհրաժեշտ է մակբայ:",
         ["Կրավորական բային («are managed») բնութագրելու համար պետք է մակբայ՝ «carefully»:"]),
        (42, M, "Choose the word form that best fits gap (42).",
         "local", ["locality", "locally", "localize"],
         "«___ biodiversity» դիրքում գոյականից առաջ անհրաժեշտ է ածական:",
         ["Գոյականից («biodiversity») առաջ գործածվում է ածական՝ «local»:"]),
    ])

    # =================================================== V. GRAMMAR MC (43-50)
    b.mc(43, COMPLEX_TOPIC, H,
         "Only after the storm passed __________ the extent of the damage.",
         "did he realize", ["he realized", "he had realized", "had realized he"],
         "«Only after» սկզբում պահանջում է շրջված բառակարգ:",
         ["Սահմանափակող դարձվածքով («Only after») սկսվող նախադասությունը պահանջում է «did he realize»:"])
    b.mc(44, COMPLEX_TOPIC, M,
         "__________ managing the lab, she also mentors junior researchers.",
         "In addition to", ["Furthermore", "Besides from", "Except to"],
         "«In addition to + գերունդ» կապակցող արտահայտություն է:",
         ["«In addition to» ընդունում է գերունդ («managing»):"])
    b.mc(45, COMPLEX_TOPIC, M,
         "The captain spoke about the voyage __________ he had sailed it a hundred times.",
         "as though", ["because of", "so that", "even so"],
         "«As though» ներմուծում է ենթադրական համեմատություն:",
         ["«As though» = «կարծես թե», արտահայտում է ենթադրական համեմատություն:"])
    b.mc(46, COMPLEX_TOPIC, M,
         "The vessel cannot leave port __________.",
         "unless cleared by customs", ["while it will be cleared by customs", "until customs won't clear it", "if not by customs cleared"],
         "«Unless + past participle» կրավորական էլիպսիս է:",
         ["«unless cleared by customs» = «unless it is cleared by customs»:"])
    b.mc(47, COMPLEX_TOPIC, M,
         "The engineer __________ design won the competition will present at the conference.",
         "whose", ["who", "whom", "which"],
         "Անհրաժեշտ է ստացական հարաբերական դերանուն:",
         ["«whose» ցույց է տալիս պատկանելություն («the engineer's design»):"])
    b.mc(48, COMPLEX_TOPIC, E,
         "__________ the monsoon season, the harbor remains busy with fishing boats.",
         "Throughout", ["While", "Since", "Between"],
         "«Throughout + ժամանակահատված» = «ամբողջ ընթացքում»:",
         ["«Throughout» նախդիր է, հաջորդում է գոյական («the monsoon season»):"])
    b.mc(49, COMPLEX_TOPIC, M,
         "She didn't reject the plan. __________, she expanded it considerably.",
         "On the contrary", ["However", "Yet", "Nonetheless"],
         "«On the contrary» ընդգծում է ուղիղ հակադրություն:",
         ["«On the contrary» գործածվում է, երբ երկրորդ նախադասությունն ուղիղ հակառակն է հաստատում:"])
    b.mc(50, COMPLEX_TOPIC, H,
         "All __________ about the wreck is that it sank during a storm.",
         "that I know", ["which I know", "what I don't know", "of which I know"],
         "«All that + ենթակա + բայ» կայուն կառուցվածք է:",
         ["«All that I know is that...» ամրագրված կառուցվածք է:"])

    # =================================================== VI. REPORTED SPEECH (51-55)
    b.ms(51, REPORTED_TOPIC, H, "Choose the correctly transformed sentence(s).",
         ['"Why did you postpone the inspection until Friday?" Karen said to Liam.\n'
          "Karen asked Liam why he had postponed the inspection until Friday.",
          '"Don\'t assume that the crew will follow the new schedule," Mia said to me.\n'
          "Mia warned me not to assume that the crew would follow the new schedule.",
          "Noah asked me to summarize the inspection report.\n"
          'Noah says to me: "Could you possibly summarize the inspection report?"',
          '"I regret that I didn\'t check the equipment sooner," Ella said to me.\n'
          "Ella told me that she regretted not checking the equipment sooner.",
          '"It\'s rather foggy outside. Maybe we should delay the departure," Priya said.\n'
          "Priya suggested to delay the departure as it was rather foggy outside."],
         {0, 1, 3},
         "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
         ["Ա, Բ, Դ ճիշտ են՝ ճշգրիտ backshift։",
          "Գ սխալ է. «says» ներկա է, մինչդեռ շրջանակը արդեն անցյալում է («asked»)։",
          "Ե սխալ է. «suggest» պահանջում է գերունդ, ոչ թե infinitive («suggested delaying»)։"])
    b.ms(52, REPORTED_TOPIC, H, "Choose the correctly transformed sentence(s).",
         ['"By the time you arrived, we had already repaired the beacon," Owen said.\n'
          "Owen told that by the time I had arrived, they had already repaired the beacon.",
          '"Can you tell me why the readings don\'t match?" Farah asked her colleague.\n'
          "Farah asked her colleague if he could tell her why the readings didn't match.",
          'Leo said to Ana: "I\'m confident the harbor master will approve your request."\n'
          "Leo assured Ana that the harbor master would approve her request.",
          'The instructor said to the trainees, "Storms form over warm ocean water."\n'
          "The instructor told the trainees that storms form over warm ocean water.",
          "The apprentice begged the keeper to explain everything he knew about the tides.\n"
          '"I beg you to explain everything you know about the tides," said the apprentice.'],
         {1, 2, 3, 4},
         "«Tell» պահանջում է ուղղակի խնդիր, գիտական փաստերը մնում են ներկա ժամանակով:",
         ["Ա սխալ է. «told» պահանջում է «told me», ոչ միայն «told that»։",
          "Բ, Գ, Դ, Ե ճիշտ են։"])
    b.ms(53, REPORTED_TOPIC, H, "Choose the correctly transformed sentence(s).",
         ['"I\'ve just finished the inspection. Everything\'s in order," Grace said.\n'
          "Grace told James that she had just finished the inspection and added that everything was in order.",
          '"What time will the ferry depart next Friday?" the tourists asked the captain.\n'
          "The tourists asked the captain what time the ferry would depart the following Friday.",
          '"Once the new regulations start, boats won\'t be allowed to dock overnight," the officer said.\n'
          "The officer stated that once the new regulations started, boats wouldn't be allowed to dock overnight.",
          "Victor apologized to Elena for missing the meeting the day before.\n"
          '"I\'m sorry for missing the meeting yesterday," Victor said to Elena.',
          '"If you plan to visit the lighthouse, ask Sam to guide you," the warden said to Nora.\n'
          "Nora's warden asked Sam to guide her if she planned to visit the lighthouse."],
         {0, 1, 2, 3},
         "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
         ["Ա, Բ, Գ, Դ ճիշտ են։",
          "Ե սխալ է. բնօրինակում պահապանն ասում է Նորային, ուստի ճիշտ ձևը՝ «Nora's warden told Nora to ask Sam...», ոչ թե ինքը՝ պահապանը, խնդրում է Սեմին։"])
    b.ms(54, REPORTED_TOPIC, H, "Choose the correctly transformed sentence(s).",
         ['"I will present my findings at the conference the day after tomorrow," Dr. Reyes said.\n'
          "Dr. Reyes said that he would present his findings at the conference in two days' time.",
          '"If you don\'t secure the cargo properly, the shipment will be delayed," Priya said to Tom.\n'
          "Priya told Tom that the shipment would be delayed if he hadn't secured the cargo properly.",
          "My colleague warned me not to leave the hatch open as it would flood the deck.\n"
          '"Don\'t leave the hatch open; it will flood the deck," my colleague said to me.',
          'Farid said, "I will take the route which is recommended to me."\n'
          "Farid said that he would take the route which was recommended to him.",
          '"Will either Nadia or Omar inspect the engine room tomorrow?" Rosa asked.\n'
          "Rosa asked Nadia whether she or Omar would inspect the engine room the following day."],
         {0, 2, 3, 4},
         "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
         ["Ա, Գ, Դ, Ե ճիշտ են։",
          "Բ սխալ է. «if you don't secure» պետք է դառնա «if he didn't secure», ոչ թե «hadn't secured»։"])
    b.ms(55, REPORTED_TOPIC, H, "Choose the correctly transformed sentence(s).",
         ["The supervisor didn't allow Priya to leave the dock early.\n"
          'The supervisor says to Priya, "Would you mind staying at the dock until the end of the shift?"',
          '"I have been repairing the generator for two weeks. I need to finish it today," Diego said.\n'
          "Diego said he had been repairing the generator for two weeks to finish it that day.",
          "Hana told me that she would like to join the coast guard training.\n"
          'Hana said to me, "I would like to join the coast guard training."',
          'Tariq asked his supervisor, "Must I log the readings tonight?"\n'
          "Tariq asked his supervisor to log the readings that night.",
          'The visitor said to Lena, "When does the ferry leave?"\n'
          "The visitor asked Lena when the ferry left."],
         {1, 2, 4},
         "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
         ["Բ, Գ, Ե ճիշտ են։",
          "Ա սխալ է. «says» ներկա է, մինչդեռ շրջանակը («didn't allow») անցյալում է։",
          "Դ սխալ է. «Must I log...?» պարտավորության մասին հարց է, ճիշտ է «whether he had to log»։"])

    # =================================================== VII. WORD-BANK CLOZE (56)
    b.register_topic("wordbank_topics", "starting a small business")
    b.match_q(56, WORDBANK_TOPIC, M, WORDBANK_1,
        [("blank (Ա): \"find it hard to __________ enough funding\"", 1),
         ("blank (Բ): \"investors are typically more __________ to support\"", 2),
         ("blank (Գ): \"a clear plan can help founders __________ unnecessary expenses\"", 3),
         ("blank (Դ): \"chambers of commerce often __________ workshops\"", 4),
         ("blank (Ե): \"setting money aside well in __________\"", 5)],
        ["secure", "inclined", "avoid", "host", "advance", "dismiss", "reluctant"],
        "Ամեն բացվածքի համար ստուգել բառի իմաստն ու քերականական դերը (բայ/ածական):",
        ["(Ա) «secure» = ապահովել ֆինանսավորում։ (Բ) «inclined» = հակված («more inclined to support»)։",
         "(Գ) «avoid» = խուսափել ծախսերից։ (Դ) «host» = կազմակերպել սեմինարներ։ (Ե) «advance» = «in advance» (նախապես)։",
         "«dismiss» և «reluctant» իմաստով չեն համապատասխանում ոչ մի բացվածքի և մնում են չօգտագործված։"])

    # =================================================== VIII. QUESTION FORMATION (57-61)
    b.ms(57, QFORM_TOPIC, H, "Choose the correctly formulated questions.",
         ["There's no reason to doubt the captain's judgment, was there?",
          "I am certain that the forecast is accurate, aren't I?",
          "Which channel do you monitor most closely?",
          "Did you used to work night shifts when you started?",
          "Was it you or the first mate who logged the error?"],
         {1, 2, 4},
         "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
         ["Բ, Գ, Ե ճիշտ են։",
          "Ա սխալ է. tag-ը պետք է լինի «is there?», ոչ թե «was there?»։",
          "Դ սխալ է. «did»-ից հետո՝ «use to» (առանց -d)։"])
    b.ms(58, QFORM_TOPIC, H, "Choose the correctly formulated questions.",
         ["It is essential to secure the cargo immediately, isn't it?",
          "Do you know how much the new radar system costs?",
          "Had you a word with the mechanic about the leak?",
          "The captain's log will be reviewed tomorrow, won't it?",
          "Were you and Dara on watch at midnight yesterday?"],
         {0, 1, 3, 4},
         "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
         ["Ա, Բ, Դ, Ե ճիշտ են։",
          "Գ սխալ է (հնացած ձև). ճիշտ է «Did you have a word with the mechanic...?»։"])
    b.ms(59, QFORM_TOPIC, H, "Choose the correctly formulated questions.",
         ["We seldom witness such a calm crossing, do we?",
          "This is the first time I have sailed this route, isn't this?",
          "How many knots does this vessel typically reach?",
          "Who did report the malfunction first?",
          "Can you finally tell me what caused the delay?"],
         {0, 2, 4},
         "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
         ["Ա, Գ, Ե ճիշտ են։",
          "Բ սխալ է. tag-ը պետք է լինի «isn't it?», ոչ թե «isn't this»։",
          "Դ սխալ է. «who» ենթակա է, «did»-ի կիրառումն ավելորդ է. ճիշտ է «Who reported...?»։"])
    b.ms(60, QFORM_TOPIC, H, "Choose the correctly formulated questions.",
         ["How often do we need to inspect the hull?",
          "Please, don't mention the incident to the passengers, will you?",
          "Will they the cargo or the mail load first?",
          "Do you regret skipping the safety briefing?",
          "Why the officer questioned you yesterday?"],
         {0, 1, 3},
         "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
         ["Ա, Բ, Դ ճիշտ են։",
          "Գ սխալ է. ճիշտ է «Will they load the cargo or the mail first?»։",
          "Ե սխալ է. բացակայում է օժանդակ բայը. ճիշտ է «Why did the officer question you...?»։"])
    b.ms(61, QFORM_TOPIC, H, "Choose the correctly formulated questions.",
         ["Why did he say he was worried about the tide?",
          "Did Marco chart fewer errors than Elena this month?",
          "Do you think should we delay the departure?",
          "He will surely enjoy the voyage, won't it?",
          "Has the crew finalized the manifest?"],
         {0, 1, 4},
         "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
         ["Ա, Բ, Ե ճիշտ են։",
          "Գ սխալ է. ճիշտ է «Do you think we should delay the departure?»։",
          "Դ սխալ է. tag-ը պետք է լինի «won't he?», ոչ թե «won't it?»։"])

    # =================================================== IX. PREPOSITIONS CLOZE (62)
    b.register_topic("wordbank_topics", "Nikola Tesla (prepositions)")
    b.match_q(62, PREP_TOPIC, M, WORDBANK_2,
        [("blank (Ա): \"remembered __________ his groundbreaking work\"", 1),
         ("blank (Բ): \"fascinated __________ electricity\"", 3),
         ("blank (Գ): \"combined engineering __________ bold demonstrations\"", 2),
         ("blank (Դ): \"remained committed __________ his research\"", 4),
         ("blank (Ե): \"reach people __________ every background\"", 5)],
        ["for", "with", "by", "to", "from", "inside", "about"],
        "Ամեն նախդիր ստուգել իր կայուն արտահայտության մեջ («remembered for», «fascinated by», «combine X with Y», «committed to», «from every background»):",
        ["«remembered for» (հայտնի է ինչ-որ բանով), «fascinated by» (հիացած ինչ-որ բանով)՝ կայուն կապակցություններ են։",
         "«combine X with Y», «committed to» (նվիրված), «people from every background» (տարբեր միջավայրերից)՝ ֆիքսված օրինաչափություններ են։",
         "«inside» և «about» չեն համապատասխանում ոչ մի բացվածքի և մնում են չօգտագործված։"])

    # =================================================== X. ODD WORD (63-67)
    b.ms(63, ODDWORD_TOPIC, M, "Choose the sentences with an odd word.",
         ["Skilled captains rely by on instinct as well as instruments.",
          "A good mate listens carefully and offers of practical advice.",
          "Teamwork often prevents mistakes that cost time and money.",
          "Every sailor aboard deserves that recognition for their effort.",
          "Crews thrive when officers communicate expectations clearly."],
         {0, 1, 3},
         "Փնտրել ավելորդ նախդիր/դերանուն, որը խախտում է կայուն կառուցվածքը:",
         ["Ա. «rely by on» — ավելորդ է «by»։ Բ. «offers of practical advice» — ավելորդ է «of»։ Դ. «deserves that recognition» — ավելորդ է «that»։ Գ և Ե՝ առանց սխալի։"])
    b.ms(64, ODDWORD_TOPIC, M, "Choose the sentences with an odd word.",
         ["Charts that guide modern sailors are based on surveys conducted decades ago.",
          "Many navigators believe that although storms can form without warning.",
          "Reading tide tables does not automatically make you an quite skilled navigator.",
          "Patience is often considered essential for long ocean voyages.",
          "A good captain knows which readings does matter and which do not."],
         {1, 2, 4},
         "Փնտրել կրկնվող շաղկապ, ավելորդ մակբայ և ավելորդ օժանդակ բայ:",
         ["Բ. «that although» — երկու շաղկապ միասին ավելորդ է։ Գ. «an quite skilled» — ավելորդ է «quite»։ Ե. «readings does matter» — ավելորդ է «does»։ Ա և Դ՝ առանց սխալի։"])
    b.ms(65, ODDWORD_TOPIC, M, "Choose the sentences with an odd word.",
         ["Coastal erosion has measurable effects on both harbors and wildlife.",
          "Many of these species are forced to adapt to shifting currents.",
          "Scientists warn that warming seas may seriously threaten fish stocks.",
          "Vessels that don't never carry proper safety gear risk heavy fines.",
          "Pollution disrupts marine life, which interfering with local fisheries."],
         {3, 4},
         "Փնտրել կրկնակի ժխտում և հարաբերական նախադասությունում սխալ բայաձև:",
         ["Դ. «don't never» — կրկնակի ժխտում։ Ե. «which interfering» — սխալ ձև, ճիշտ է «which interferes»։ Ա, Բ, Գ՝ առանց սխալի։"])
    b.ms(66, ODDWORD_TOPIC, M, "Choose the sentences with an odd word.",
         ["Regular maintenance supports both engine performance and crew safety.",
          "Many engineers believe repairs are happening more rapid than planned.",
          "Staying alert is essential, especially in regions prone to fog.",
          "Routine checks not only catch problems early but also save money too.",
          "Learning about weather patterns improves decision-making at sea."],
         {1, 3},
         "Փնտրել ածական՝ մակբայի փոխարեն և «not only...but also»-ի հետ ավելորդ կրկնություն:",
         ["Բ. «more rapid» — ածական մակբայի փոխարեն, ճիշտ է «more rapidly»։ Դ. «but also...too» — «too»-ն ավելորդ է։ Ա, Գ, Ե՝ առանց սխալի։"])
    b.ms(67, ODDWORD_TOPIC, M, "Choose the sentences with an odd word.",
         ["Sailors who arrive early to their shift seem reliable, while latecomers act like they own the deck.",
          "If a sonar system can scan the seabed every of second, why do errors still happen?",
          "I often check the barometer because it's the only instrument I fully trust.",
          "Rules are like anchors: choose the right one, but don't make me to drop yours.",
          "Tell someone the current is strong, and they will avoid it; tell them a theory, and most will ignore about it."],
         {1, 3, 4},
         "Փնտրել ավելորդ նախդիր քանակական արտահայտության մեջ, ավելորդ «to» պատճառական բային հետո, և ավելորդ նախդիր անցողական բային հետո:",
         ["Բ. «every of second» — ավելորդ է «of»։ Դ. «make me to drop» — ավելորդ է «to»։ Ե. «ignore about it» — ավելորդ է «about»։ Ա և Գ՝ առանց սխալի։"])

    # =================================================== XI. PASSIVE VOICE (68-72)
    b.ms(68, PASSIVE_TOPIC, M, "Choose the correctly formulated Passive constructions.",
         ["The weather report was reviewed by the crew at dawn.",
          "Debris found near the reef are monitoring weekly by divers.",
          "The cable could have been damaged before the storm arrived.",
          "Does the engine have to be serviced by a licensed technician?",
          "The ceremony will be held at the old lighthouse."],
         {0, 2, 3, 4},
         "Ստուգել, թե որ նախադասություններն են իրապես ճիշտ կրավորական սեռով կառուցված:",
         ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է. ճիշտ է «are being monitored» կամ «are monitored», ոչ թե «are monitoring»։"])
    b.ms(69, PASSIVE_TOPIC, M, "Choose the correctly formulated Passive constructions.",
         ["The captain had the crew double-check the moorings.",
          "Fuel prices are expected to rise within the next year.",
          "Will everyone be given a chance to inspect the gear?",
          "Electricity generated by the turbine using tidal flow.",
          "The wreck's location was not confirmed until divers searched it."],
         {1, 2, 4},
         "Ուշադրություն դարձնել՝ արդյոք նախադասությունն ընդհանրապես կրավորական է:",
         ["Բ, Գ, Ե ճիշտ կրավորական կառույցներ են։ Ա ակտիվ պատճառական կառույց է (ոչ պասիվ)։ Դ թերի է (բացակայում է «is»)։"])
    b.ms(70, PASSIVE_TOPIC, M, "Choose the correctly formulated Passive constructions.",
         ["Tesla was the most inventive engineer of his generation.",
          "Hundreds of samples tested at the marine laboratory every season.",
          "The strait is currently being surveyed by two research vessels.",
          "Why has the safety protocol been revised by the harbor authority?",
          "All the manifests had to be checked by customs."],
         {2, 3, 4},
         "Ուշադրություն դարձնել՝ արդյոք գործողությունն իրապես կրավորական է, թե պարզապես նկարագրություն:",
         ["Գ, Դ, Ե ճիշտ են։ Ա կրավորական չէ (նկարագրական «be + գոյական»)։ Բ թերի է (բացակայում է «are»)։"])
    b.ms(71, PASSIVE_TOPIC, H, "Choose the correctly formulated Passive constructions.",
         ["Because of the sudden squall, the crossing cancelled.",
          "The recruits were made to complete a swimming test.",
          "Every hour dozens of vessels are tracked by satellite.",
          "This hull was been reinforced to withstand collisions.",
          "The manifest has delivered to the wrong terminal by mistake."],
         {1, 2},
         "Ստուգել՝ առկա է «be» օժանդակ բայը, և չկա կրկնվող կամ բացակայող օժանդակ բայ:",
         ["Բ, Գ ճիշտ են։ Ա բացակայում է «was»-ից։ Դ ունի կրկնվող «was been»։ Ե բացակայում է «been»-ից։"])
    b.ms(72, PASSIVE_TOPIC, M, "Choose the correctly formulated Passive constructions.",
         ["How thoughtful of you to have warned the crew in advance!",
          "The passengers were well looked after by the stewards.",
          "The lighthouse was built by local stonemasons in 1868.",
          "Lisbon is a popular destination for sailors.",
          "Had you double-checked all the coordinates carefully?"],
         {1, 2},
         "Ուշադրություն դարձնել՝ արդյոք նախադասությունն ընդհանրապես կրավորական սեռով է:",
         ["Բ, Գ ճիշտ կրավորական կառույցներ են։ Ա, Դ, Ե բոլորն ակտիվ սեռով են, թեև քերականորեն ճիշտ։"])

    # =================================================== XII. VOCAB MATCHING (73-76)
    for w in ["Diligence", "Empathy", "Stubbornness", "Naivety", "Contractor", "Freelancer", "Auditor",
              "Investor", "Resilient", "Impulsive", "Meticulous", "Indifferent", "Retrieve", "Neglect",
              "Endorse", "Undermine"]:
        b.register_topic("vocab_words", w)
    b.match_q(73, VOCAB_TOPIC, E, "Match the words and their definitions.",
        [("Diligence", 3), ("Empathy", 4), ("Stubbornness", 2), ("Naivety", 1)],
        ["lack of experience or worldly wisdom",
         "refusal to change one's opinion despite good reasons",
         "careful and persistent effort in one's work",
         "the ability to understand and share another person's feelings",
         "excessive trust in strangers"],
        "Ամեն բառի համար գտնել ճշգրիտ սահմանումը:",
        ["Diligence = ջանասիրություն → «careful and persistent effort» (3)։ Empathy = կարեկցանք → «understand and share feelings» (4)։",
         "Stubbornness = համառություն → «refusal to change opinion» (2)։ Naivety = միամտություն → «lack of experience» (1)։ Սահմանում 5-ը ավելորդ է։"])
    b.match_q(74, VOCAB_TOPIC, M, "Match the words and their definitions.",
        [("Contractor", 4), ("Freelancer", 3), ("Auditor", 1), ("Investor", 2)],
        ["a person who checks financial records for accuracy",
         "a person who puts money into a project hoping for profit",
         "a self-employed person who works for different clients",
         "a company hired to carry out building or repair work",
         "a person who manages a company's daily budget"],
        "Ամեն բառը պատկանում է բիզնես-բառապաշարին:",
        ["Contractor = կապալառու → «hired to carry out building work» (4)։ Freelancer = ազատ մասնագետ → «self-employed» (3)։",
         "Auditor = աուդիտոր → «checks financial records» (1)։ Investor = ներդրող → «puts money into a project» (2)։ Սահմանում 5-ը ավելորդ է։"])
    b.match_q(75, VOCAB_TOPIC, M, "Match the words and their definitions.",
        [("Resilient", 3), ("Impulsive", 1), ("Meticulous", 4), ("Indifferent", 2)],
        ["acting suddenly without thinking about consequences",
         "showing no interest or concern",
         "able to recover quickly from difficulties",
         "extremely careful and precise about details",
         "easily influenced by others' opinions"],
        "Ամեն ածականի իմաստը կապել համապատասխան վարքագծի հետ:",
        ["Resilient = դիմացկուն → «recover quickly» (3)։ Impulsive = ազդակային → «act suddenly» (1)։",
         "Meticulous = մանրակրկիտ → «careful and precise» (4)։ Indifferent = անտարբեր → «no interest or concern» (2)։ Սահմանում 5-ը ավելորդ է։"])
    b.match_q(76, VOCAB_TOPIC, M, "Match the words and their definitions.",
        [("Retrieve", 4), ("Neglect", 2), ("Endorse", 3), ("Undermine", 1)],
        ["weaken or damage something gradually",
         "fail to take care of something properly",
         "publicly support or approve of something",
         "get something back after it has been lost",
         "examine something in great detail"],
        "Ամեն բայի իմաստը հստակորեն տարբերվում է մյուսներից:",
        ["Retrieve = վերադարձնել/ետ բերել → «get back» (4)։ Neglect = անտեսել → «fail to take care» (2)։",
         "Endorse = հավանություն տալ → «publicly support» (3)։ Undermine = խաթարել → «weaken gradually» (1)։ Սահմանում 5-ը ավելորդ է։"])

    # =================================================== XIII. SENTENCE MATCHING (77-80)
    for t in ["historic ships / exploration (Titanic, Mayflower, Vasa)",
              "renewable ocean energy", "marine biology discoveries", "port city trade / logistics"]:
        b.register_topic("sentence_matching_topics", t)
    b.match_q(77, SENTMATCH_TOPIC, M, "Match the beginning and the end of the sentences.",
        [("The Titanic was believed", 4), ("Despite being centuries old,", 3),
         ("The Mayflower is remembered", 2), ("Many shipwrecks that lie undiscovered", 1)],
        ["still hold clues about historical trade routes.",
         "for carrying settlers across the Atlantic in 1620.",
         "the Vasa warship remains remarkably well preserved.",
         "to be unsinkable before its first voyage.",
         "because sailors feared crossing open water.",
         "who study maritime archaeology."],
        "Ուշադրություն դարձնել քերականական համապատասխանությանը (to be + ածական, remembered for, despite + հակասական արդյունք):",
        ["A→4 («believed to be unsinkable»)։ B→3 («Despite... the Vasa remains preserved»)։",
         "C→2 («remembered for carrying settlers»)։ D→1 («shipwrecks... still hold clues»)։ Ավարտներ 5, 6 ավելորդ են։"])
    b.match_q(78, SENTMATCH_TOPIC, M, "Match the beginning and the end of the sentences.",
        [("Tidal power plants generate electricity by", 1), ("Building offshore wind farms allows engineers to", 5),
         ("Some countries now combine wave and solar energy", 2), ("Despite early doubts about reliability,", 3)],
        ["harnessing the natural rise and fall of the sea.",
         "to create more stable renewable power grids.",
         "many coastal nations have invested heavily in tidal projects.",
         "which reduces dependence on fossil fuels.",
         "capture stronger, more consistent wind speeds.",
         "though maintenance costs remain high."],
        "Ուշադրություն դարձնել «by + գերունդ», «allow + infinitive», և «Despite» կառուցվածքներին:",
        ["A→1 («generate electricity by harnessing»)։ B→5 («allows engineers to capture»)։",
         "C→2 («combine wave and solar energy to create»)։ D→3 («Despite doubts,... nations have invested»)։ Ավարտներ 4, 6 ավելորդ են։"])
    b.match_q(79, SENTMATCH_TOPIC, M, "Match the beginning and the end of the sentences.",
        [("Each year marine biologists document", 2), ("Because deep-sea vents support unique ecosystems,", 3),
         ("One reason giant squid are rarely observed", 1), ("I was surprised to learn from the documentary", 4)],
        ["is that they live at extreme ocean depths.",
         "hundreds of previously unknown species.",
         "scientists study them to understand extreme life.",
         "that some fish can survive without sunlight.",
         "because they hope to find rare specimens.",
         "it is widely studied across several countries."],
        "Ուշադրություն դարձնել պատճառահետևանքային և բացատրական կառուցվածքներին:",
        ["A→2 («document hundreds of species»)։ B→3 («Because... scientists study them»)։",
         "C→1 («One reason... is that»)։ D→4 («surprised to learn... that»)։ Ավարտներ 5, 6 ավելորդ են։"])
    b.match_q(80, SENTMATCH_TOPIC, H, "Match the beginning and the end of the sentences.",
        [("Modern ports are expanding their facilities to", 2), ("The main challenge with container shipping is", 3),
         ("Engineers have designed cranes capable of", 1), ("Provided that customs procedures are simplified,", 5)],
        ["lifting several containers simultaneously.",
         "handle growing volumes of global trade.",
         "that delays at one port can disrupt entire supply chains.",
         "unless shipping costs continue to rise.",
         "international trade will move even faster.",
         "will raise the price of imported goods."],
        "Ուշադրություն դարձնել նպատակային, սահմանիչ և պայմանական կառուցվածքներին:",
        ["A→2 («expanding to handle demand»)։ B→3 («The main challenge is that»)։",
          "C→1 («cranes capable of lifting»)։ D→5 («Provided that..., trade will accelerate»)։ Ավարտներ 4, 6 ավելորդ են։"])
