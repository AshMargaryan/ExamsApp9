# -*- coding: utf-8 -*-
"""
English mock exam #1 (AEE-ENG-001), 80 questions, Armenian Unified Entrance
Exam style ("Անգլերեն"). Modeled on the section blueprint of the officially
supplied reference booklets (reading comprehension, tense/modal cloze,
grammar MC, word-form cloze, reported speech, word-bank cloze, question
formation, odd-word detection, passive voice, vocabulary matching, sentence
matching) but every passage, sentence, and answer key below is original
content, independently authored and checked against standard English
grammar rules (not copied, paraphrased, or renumbered from any source).
"""
import json, os

OUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "backend", "apps", "mock_exams",
    "data", "exams", "english",
)
OUT_DIR = os.path.normpath(OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)

ARM = "ԱԲԳԴԵԶԷԸԹԺ"
E, M, H = "հեշտ", "միջին", "բարձր"

CUR = []
_pos_counter = 0
def _correct_pos(nopt=4):
    global _pos_counter
    p = _pos_counter % nopt
    _pos_counter += 1
    return p

def mc(number, topic, diff, question, correct, wrongs, hint, steps, group=None):
    assert len(wrongs) == 3, f"Q{number}: need exactly 3 wrong options"
    opts_set = set(wrongs)
    assert correct not in opts_set, f"Q{number}: correct duplicates a wrong option"
    assert len(opts_set) == 3, f"Q{number}: wrong options not distinct"
    pos = _correct_pos(4)
    opts = wrongs[:]
    opts.insert(pos, correct)
    q = {"number": number, "topic": topic, "group": group, "type": "single_choice",
         "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
         "options": opts, "correct_option": ARM[pos]}
    CUR.append(q)

def ms(number, topic, diff, question, statements, true_idx, hint, steps):
    labelled = [f"{ARM[i]}) {s}" for i, s in enumerate(statements)]
    idxs = sorted(true_idx)
    if len(idxs) > 1:
        corr = ", ".join(ARM[i] for i in idxs[:-1]) + " և " + ARM[idxs[-1]]
    else:
        corr = ARM[idxs[0]]
    CUR.append({"number": number, "topic": topic, "group": None, "type": "multi_statement",
                "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                "statements": labelled, "correct_option": corr})

def match_q(number, topic, diff, question, lefts, rights, hint, steps):
    """lefts: list of (text, 1-based target index into `rights`). rights: list of text."""
    left_items = [{"label": ARM[i], "text": t, "target": target} for i, (t, target) in enumerate(lefts)]
    right_items = [{"text": t} for t in rights]
    CUR.append({"number": number, "topic": topic, "group": None, "type": "matching",
                "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                "left": left_items, "right": right_items})

def passage_mc(passage, group_key, topic, items):
    """items: list of (number, diff, stub, correct, wrongs, hint, steps).
    The full passage is shown only on the first question of the group (no
    point repeating a 33-line text 10 times); every question in the group,
    including the first, gets the small "Questions N-M refer to the text
    above" callout so it's self-explanatory on its own."""
    first_n = items[0][0]
    last_n = items[-1][0]
    note = (f"Հարցեր {first_n}-{last_n}-ը վերաբերում են վերևում նշված տեքստին։\n"
            f"Questions {first_n}-{last_n} refer to the text above.")
    for i, (number, diff, stub, correct, wrongs, hint, steps) in enumerate(items):
        text = f"{passage}\n\n{stub}\n\n{note}" if i == 0 else f"{stub}\n\n{note}"
        mc(number, topic, diff, text, correct, wrongs, hint, steps, group=group_key)

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

# =========================================================== I. READING (1-10)

PASSAGE = """Line number

1.  Public libraries were once regarded simply as repositories for
2.  books, places where visitors browsed quietly among shelves and borrowed
3.  printed material for a fixed period. In recent decades, however, the role
4.  of the public library has expanded dramatically, driven by changing
5.  community needs and rapid technological change. Libraries in many
6.  cities now function as multipurpose community centers, offering free
7.  internet access, workshops, and meeting spaces alongside traditional
8.  collections of books.
9.      One of the earliest catalysts for this transformation was the digital
10. revolution of the late twentieth century. As personal computers and
11. later smartphones became widespread, some observers predicted that
12. libraries would gradually disappear, made obsolete by instant access
13. to information online. Instead, librarians reinvented their institutions,
14. introducing digital literacy classes, e-book lending platforms, and
15. public computer terminals for residents who lacked reliable internet
16. access at home. Far from becoming irrelevant, libraries proved
17. essential in bridging the so-called digital divide between those who
18. could afford technology and those who could not.
19.     Beyond technology, libraries increasingly serve as social
20. infrastructure. Sociologists have observed that libraries are among the
21. few remaining public spaces where people can spend extended periods
22. of time without being expected to purchase anything. This makes them
23. particularly valuable to elderly residents seeking company, students
24. needing a quiet place to study, and newcomers to a country hoping to
25. practice a new language. Many branches now host citizenship classes,
26. job-search assistance programs, and even seed libraries where
27. gardeners can borrow seeds for the growing season.
28.     Critics sometimes argue that public funding could be better spent
29. elsewhere, given that so much information is freely available online.
30. Yet supporters counter that libraries do something the internet cannot:
31. they provide trained staff who guide visitors through unfamiliar
32. systems, verify the reliability of sources, and create a sense of shared
33. ownership over public knowledge that no private platform can replicate."""

passage_mc(PASSAGE, "reading-1", RC_TOPIC, [
    (1, E, "According to the text, in recent decades the role of the public library has",
     "expanded to include a wider range of community functions",
     ["remained focused exclusively on lending printed books",
      "declined sharply due to competition from bookstores",
      "shifted entirely away from serving local neighborhoods"],
     "Համեմատել առաջին պարբերության սկզբնական և ընդլայնված նկարագրությունը:",
     ["Տողեր 3-8-ը ուղղակիորեն ասում են, որ գրադարանի դերն «ընդլայնվել է շատ», ներառելով ինտերնետ, սեմինարներ և հանդիպումների տարածք:"]),
    (2, M, "The pronoun they in line 31 stands for",
     "libraries",
     ["supporters", "systems", "sources"],
     "Գտնել այն գոյականը, որին վերաբերում է դերանունը` կարդալով նախադասությունը ամբողջությամբ:",
     ["«...libraries do something the internet cannot: they provide trained staff...» — «they»-ն վերաբերում է «libraries»-ին, քանի որ հենց գրադարաններն են ապահովում աշխատակազմը:"]),
    (3, M, "According to paragraph 2 (lines 9-18), libraries responded to predictions of their disappearance by",
     "introducing digital literacy classes and public computer terminals",
     ["closing branches in areas with low internet access",
      "banning smartphones from reading rooms",
      "relying solely on private donations for funding"],
     "Փնտրել պարբերության մեջ նշված կոնկրետ գործողությունները, ոչ թե ենթադրյալները:",
     ["Տողեր 13-16-ը ուղղակիորեն թվարկում են գրագիտության դասընթացներ, էլեկտրոնային գրքեր և հանրային համակարգիչներ որպես գրադարանների պատասխանը:"]),
    (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
     '"In recent decades, however, the role of the public library has expanded dramatically, '
     'driven by changing community needs and rapid technological change."',
     "Libraries have recently taken on many new roles because of shifting needs and technology.",
     ["Technological change has made public libraries unnecessary in recent decades.",
      "Community needs have stayed the same while libraries have changed very little.",
      "Libraries have reduced their services dramatically due to funding cuts."],
     "Բացահայտել նախադասության հիմնական պնդումը` առանց մանրամասների:",
     ["Նախադասությունն ասում է, որ գրադարանի դերն ընդլայնվել է փոփոխվող կարիքների և տեխնոլոգիայի պատճառով. սա ուղիղ վերարտադրում է b) տարբերակը:"]),
    (5, M, "How did the digital revolution affect public libraries, according to the text?",
     "It pushed libraries to add new digital services rather than making them obsolete.",
     ["It caused most libraries to close within a few decades.",
      "It made libraries entirely dependent on private technology companies.",
      "It had no measurable effect on how libraries operated."],
     "Համեմատել կանխատեսումը (կանխատեսում էին անհետանալ) և իրական արդյունքը:",
     ["Տողեր 12-16. կանխատեսումների փոխարեն գրադարանները «reinvented their institutions»` նոր ծառայություններ ավելացնելով, ոչ թե անհետանալով:"]),
    (6, M, "The word catalysts in line 9 may best be replaced by",
     "triggers",
     ["obstacles", "outcomes", "coincidences"],
     "«Catalyst»-ը գործընթաց արագացնող կամ սկսող գործոն է:",
     ["«One of the earliest catalysts for this transformation» = փոփոխությունը սկսող/արագացնող գործոն, հետևաբար հոմանիշը «triggers» է:"]),
    (7, H, "Which of the following statements is NOT true according to the text?",
     "Public libraries have focused only on lending printed books throughout the past decades.",
     ["Libraries now offer citizenship classes and job-search assistance.",
      "Librarians introduced new digital services in response to changing technology.",
      "Sociologists found that libraries allow people to stay without buying anything."],
     "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ. գտնել այն, որը հակասում է տեքստի հիմնական թեզին:",
     ["Ամբողջ տեքստի հիմնական թեզն այն է, որ գրադարանների դերն ընդլայնվել է, ուստի «միայն տպագիր գրքերի» պնդումն ուղղակիորեն հակասում է դրան:"]),
    (8, E, "The word obsolete in line 12 is synonymous to",
     "outdated",
     ["valuable", "expensive", "popular"],
     "«Obsolete» նշանակում է այլևս ոչ օգտագործվող, հնացած:",
     ["«...libraries would gradually disappear, made obsolete by instant access to information online» — «obsolete» = «outdated» (հնացած, անգործածելի):"]),
    (9, M, "Paragraph 3 (lines 19-27) mainly",
     "describes the range of social services libraries provide beyond lending books",
     ["argues that libraries should stop offering social programs",
      "explains why libraries struggle to attract elderly visitors",
      "lists the technical specifications of library computer systems"],
     "Բացահայտել պարբերության հիմնական նպատակը` ուսումնասիրելով նշված օրինակները:",
     ["Պարբերությունը թվարկում է քաղաքացիության դասընթացներ, աշխատանք փնտրելու աջակցություն և սերմերի գրադարան` ցույց տալով սոցիալական ծառայությունների լայն շրջանակ:"]),
    (10, M, "The overall tone of the text can best be described as",
     "appreciative of libraries' evolving role in communities",
     ["dismissive of libraries' continued relevance",
      "purely technical and statistical",
      "uncertain about whether libraries provide any public benefit"],
     "Գնահատել հեղինակի ընդհանուր վերաբերմունքը` ուշադրություն դարձնելով եզրափակիչ պարբերությանը:",
     ["Հեղինակը ներկայացնում է գրադարանների օգուտները և պաշտպանում դրանց շարունակական դերը (տողեր 30-33), ինչը վկայում է դրական, գնահատող տոնի մասին:"]),
])

# =========================================================== II. CLOZE — TENSES/MODALS (11-25)

CLOZE_A = (
    "Medical imaging (11) __________ dramatically since the late 19th century. Before X-rays "
    "were available, doctors often could not diagnose internal injuries without surgery. However, "
    "by the time Wilhelm Röntgen retired, he had already transformed medicine forever. In 1895, "
    "while Röntgen (12) __________ with cathode rays, he noticed something unusual: a screen "
    "across the room began to glow. He realized that the invisible rays passing through the tube "
    "(13) __________ the glow.\n\n"
    "Although he published his findings quickly, the practical use of X-ray imaging (14) "
    "__________ by most hospitals for another few years. It wasn't until physicians began using "
    "the technology in emergency wards that its true value became clear. It was estimated that "
    "within a few decades the discovery (15) __________ countless lives by allowing early diagnosis."
)
passage_mc(CLOZE_A, "cloze-xray", CLOZE_TOPIC, [
    (11, E, "Choose the right option for gap (11).",
     "has changed", ["changed", "is changing", "had changed"],
     "«Since the late 19th century» ցույց է տալիս ժամանակահատված, որը շարունակվում է մինչև հիմա:",
     ["«Since + անցյալ ժամանակահատված» պահանջում է Present Perfect. «has changed» ցույց է տալիս փոփոխություն, որը սկսվել է անցյալում և կապված է ներկայի հետ:"]),
    (12, M, "Choose the right option for gap (12).",
     "was experimenting", ["experimented", "has been experimenting", "had experimented"],
     "Անընդհատ ընթացող ֆոնային գործողություն, որը ընդհատվում է մեկ այլ անցյալ գործողությամբ («he noticed»):",
     ["Past Continuous («was experimenting») օգտագործվում է ֆոնային, ընթացիկ գործողության համար, որը ընդհատվել է «noticed»-ով:"]),
    (13, M, "Choose the right option for gap (13).",
     "were causing", ["had been caused", "have been caused", "are caused"],
     "Ճառագայթներն անցնում էին խողովակով և միաժամանակ առաջացնում փայլը` երկարատև ընթացող պատճառահետևանք:",
     ["«were causing» (Past Continuous, ակտիվ սեռ) ցույց է տալիս ընթացիկ պատճառահետևանքային կապ, որը դիտվում էր այդ պահին:"]),
    (14, M, "Choose the right option for gap (14).",
     "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
     "Կոնկրետ ավարտված անցյալ իրադարձություն («for another few years» ընդգծում է ավարտված ժամանակահատված):",
     ["Past Simple Passive («wasn't adopted») օգտագործվում է, քանի որ խոսքը կոնկրետ, ավարտված անցյալ մասին է, ոչ թե ներկայի հետ կապված:"]),
    (15, H, "Choose the right option for gap (15).",
     "had saved", ["was saved", "had been saved", "would be saved"],
     "«It was estimated that... the discovery ___» — Past Perfect Active ցույց է տալիս գործողություն, որն ավարտված էր հայտարարության պահից առաջ:",
     ["Քանի որ «discovery»-ն ենթական է և ակտիվ սեռով («save lives»), ճիշտ ձևը Past Perfect Active է` «had saved», ոչ թե կրավորական:"]),
])

CLOZE_B = (
    "By the year 2050, the way we generate electricity (16) __________ beyond recognition. "
    "Currently, engineers (17) __________ to develop fusion reactors capable of near-limitless "
    "clean energy. These reactors (18) __________ to eliminate most carbon emissions from power "
    "generation. However, some skeptics argue that such technology (19) __________ be decades away "
    "from commercial use. If research continues at the current pace, scientists predict that by "
    "mid-century, most electricity (20) __________ by fusion and renewable sources combined."
)
passage_mc(CLOZE_B, "cloze-fusion", CLOZE_TOPIC, [
    (16, M, "Choose the right option for gap (16).",
     "will have changed", ["has changed", "is changing", "will be changing"],
     "Ապագայում կոնկրետ ամսաթվին (2050) ավարտված գործողություն` Future Perfect:",
     ["«By the year 2050» ցույց է տալիս ապագայում ավարտված գործողություն, ինչը պահանջում է Future Perfect` «will have changed»:"]),
    (17, E, "Choose the right option for gap (17).",
     "are striving", ["were striving", "have striven", "will have striven"],
     "«Currently» ցույց է տալիս ընթացիկ, հիմա տեղի ունեցող գործողություն:",
     ["«Currently» բառը պահանջում է Present Continuous` «are striving», քանի որ գործողությունն ընթանում է հենց հիմա:"]),
    (18, M, "Choose the right option for gap (18).",
     "are intended", ["intended", "have intended", "had intended"],
     "Ընդհանուր նպատակի նկարագրություն` կրավորական սեռ, ներկա ժամանակ:",
     ["«are intended to» = «նախատեսված են» — Present Simple Passive, քանի որ սա ընդհանուր, ոչ ժամանակային նշում կրող փաստ է:"]),
    (19, M, "Choose the right option for gap (19).",
     "might", ["has to", "are allowed", "ought"],
     "Կասկածամտություն և թույլ հավանականություն արտահայտող մոդալ բայ:",
     ["«might» արտահայտում է թույլ հավանականություն («գուցե»), ինչը համապատասխանում է «skeptics argue» կասկածամիտ համատեքստին:"]),
    (20, H, "Choose the right option for gap (20).",
     "will be generated", ["will generate", "is generated", "have generated"],
     "Ապագայում կանխատեսվող կրավորական գործողություն:",
     ["«Electricity» ենթական է կրավորական իմաստով («generated by fusion»), հետևաբար ճիշտ ձևը Future Simple Passive է` «will be generated»:"]),
])

CLOZE_C = (
    "In 1931, the cargo ship SS Baychimo became trapped in Arctic pack ice off the coast of "
    "Alaska. Investigators believe the crew (21) __________ the vessel in extreme haste, as most "
    "of their possessions were left behind. Since the ship remained visible on the horizon for "
    "days afterward, some sailors believed it (22) __________ by opportunistic scavengers before "
    "it drifted further. Other witnesses argued that the ship (23) __________ safely into open "
    "water once the ice broke apart. Whatever the truth, the Baychimo (24) __________ officially "
    "again after the 1960s, despite sporadic unconfirmed sightings. Researchers are still trying "
    "to trace its final resting place using sonar surveys. Unless conclusive wreckage (25) "
    "__________, the ship's fate may remain uncertain forever."
)
passage_mc(CLOZE_C, "cloze-baychimo", CLOZE_TOPIC, [
    (21, H, "Choose the right option for gap (21).",
     "must have abandoned", ["should be abandoned", "have to abandon", "can abandon"],
     "Հանգիստ, տրամաբանական եզրակացություն անցյալի մասին, հիմնված ապացույցի վրա (belongings were left):",
     ["Modal Perfect «must have abandoned» օգտագործվում է, երբ ապացույցների հիման վրա հանգիստ վստահությամբ եզրակացնում ենք անցյալի իրադարձության մասին:"]),
    (22, M, "Choose the right option for gap (22).",
     "had been salvaged", ["had salvaged", "hasn't been salvaged", "wasn't salvaging"],
     "Համոզմունքն վերաբերում է գործողության, որը կատարվել էր մինչ նավը հետագայում շարունակեց դրեյֆել (նախաանցյալ, կրավորական):",
     ["«had been salvaged» (Past Perfect Passive) ցույց է տալիս գործողություն, որն ավարտված էր մեկ այլ անցյալ գործողությունից («drifted further») առաջ:"]),
    (23, M, "Choose the right option for gap (23).",
     "might have drifted", ["may drift", "may be drifted", "has to drift"],
     "Անվստահ ենթադրություն անցյալի մասին` մոդալ + Perfect Infinitive:",
     ["«might have drifted» արտահայտում է թույլ, անվստահ ենթադրություն անցյալ իրադարձության վերաբերյալ, ինչը համապատասխանում է «witnesses argued» համատեքստին:"]),
    (24, M, "Choose the right option for gap (24).",
     "wasn't sighted", ["isn't sighted", "hadn't sighted", "won't sight"],
     "Ավարտված անցյալ իրադարձության բացակայություն, կրավորական սեռ:",
     ["«wasn't sighted» (Past Simple Passive, ժխտական) նշում է, որ որոշակի ավարտված ժամանակահատվածում («after the 1960s») նավը պաշտոնապես չի հայտնաբերվել:"]),
    (25, H, "Choose the right option for gap (25).",
     "is found", ["isn't found", "aren't found", "will be found"],
     "«Unless» պայմանական նախադասության մեջ ապագայի փոխարեն օգտագործվում է Present Simple:",
     ["«Unless» (= «եթե ոչ») սովորական Zero/First Conditional-ի նման պահանջում է Present Simple («is found»), ոչ թե Future ձև:"]),
])

# =========================================================== III. GRAMMAR MC (26-37)

mc(26, GRAMMAR_TOPIC, M,
   "The old fence is falling apart; it __________.",
   "needs repairing", ["needs to repair", "need repairing", "needs to be repairing"],
   "«Need + գերունդ» ունի կրավորական իմաստ («պետք է վերանորոգվի»):",
   ["«needs repairing» = «needs to be repaired» — «need» եզակի ենթակայի («it») հետ պահանջում է «needs», և գերունդն այստեղ կրավորական իմաստ է կրում:"])

mc(27, GRAMMAR_TOPIC, E,
   '"Does the museum have any exhibits __________ the dinosaur skeletons?"\n'
   '"Yes, there\'s also a gem collection."',
   "besides", ["beside", "except", "apart to"],
   "«Besides» նշանակում է «բացի այդ, նաև», մինչդեռ «beside» նշանակում է «կողքին»:",
   ["Համատեքստը պահանջում է «ի հավելումն» իմաստ («նաև ունի gem collection»), ինչը արտահայտում է «besides», ոչ թե տեղ ցույց տվող «beside»:"])

mc(28, GRAMMAR_TOPIC, M,
   '"I haven\'t finished reading the report yet."\n"__________."',
   "Neither have I", ["So haven't I", "Neither I have", "Nor haven't I"],
   "Բացասական համաձայնության համար օգտագործվում է «Neither + օժանդակ բայ + ենթակա»:",
   ["Բացասական նախադասության հետ համաձայնվելու համար ճիշտ կառուցվածքն է «Neither have I» (Neither + auxiliary + subject):"])

mc(29, GRAMMAR_TOPIC, E,
   '"__________ is the train station from here?"\n"It\'s about a fifteen-minute walk."',
   "How far", ["How long", "How fast", "How much"],
   "Հեռավորության մասին հարցնելիս օգտագործվում է «How far»:",
   ["Պատասխանը («a fifteen-minute walk») ցույց է տալիս հեռավորություն, ուստի հարցը պետք է լինի «How far» (ինչքան հեռու):"])

mc(30, GRAMMAR_TOPIC, M,
   "I wish I could sing __________ as my sister does.",
   "as beautifully", ["as beautiful", "more beautiful", "much more beautiful"],
   "«As + մակբայ + as» կառուցվածքում անհրաժեշտ է մակբայ, ոչ թե ածական:",
   ["Բային («sing») բնութագրելու համար պետք է մակբայ, ուստի ճիշտ ձևը «as beautifully as» է, ածականով «beautiful» սխալ է:"])

mc(31, GRAMMAR_TOPIC, M,
   "The manager arrived late again this morning __________, which annoyed the whole team.",
   "as usual", ["usually", "as usually", "like usual"],
   "«As usual» կայուն արտահայտություն է («ինչպես միշտ»)` առանց «ly»:",
   ["«As usual» ֆիքսված արտահայտություն է. «usually» մակբայ է և չի կարող հետևել «as»-ին այս կառուցվածքում:"])

mc(32, GRAMMAR_TOPIC, M,
   "__________ endangered species has continued to rise despite conservation efforts.",
   "The number of", ["The numbers of", "A number of", "Number of"],
   "«The number of + հոգնակի գոյական» ենթարկվում է եզակի բային («has continued»):",
   ["«The number of» (կոնկրետ թիվը) համաձայնեցվում է եզակի բայի հետ («has continued»), մինչդեռ «A number of» կպահանջեր հոգնակի բայ («have continued»):"])

mc(33, GRAMMAR_TOPIC, M,
   "The committee __________ the sudden drop in donations this year.",
   "is worried about", ["are worried because", "is worried as", "have worried in"],
   "«Committee»-ն հավաքական գոյական է, որը սովորաբար վերցնում է եզակի բայ, և «worried about» կայուն նախդրային կապակցություն է:",
   ["«be worried about» ճիշտ նախդրային կապակցությունն է, և «committee» որպես մեկ միասնական մարմին վերցնում է եզակի «is»:"])

mc(34, GRAMMAR_TOPIC, M,
   'Before germ theory was accepted, physicians __________ that disease was caused by bad air.',
   "used to think", ["were used to think", "got used to think", "used to thinking"],
   "«Used to + բայի հիմնական ձև» արտահայտում է անցյալի սովորական/կրկնվող գործողություն:",
   ["«used to think» ցույց է տալիս անցյալում կրկնվող համոզմունք: «be/get used to» պահանջում է գերունդ, ոչ թե infinitive:"])

mc(35, GRAMMAR_TOPIC, M,
   '"Did Marco manage to fix the printer?"\n"No, he is having __________ understanding the manual."',
   "a hard time", ["hard time", "hard times", "the hard time"],
   "«Have a hard time + գերունդ» կայուն արտահայտություն է, միշտ անորոշ հոդվածով:",
   ["«have a hard time doing something» ֆիքսված արտահայտություն է. հոդվածը («a») պարտադիր է, և գոյականը մնում է եզակի:"])

mc(36, GRAMMAR_TOPIC, M,
   "We need to order __________ for the new conference room.",
   "a great deal of equipment", ["many new equipments", "several equipments", "a few equipment"],
   "«Equipment»-ը անհաշվելի գոյական է. հոգնակի «-s» չի ընդունում:",
   ["«Equipment» անհաշվելի է, ուստի «equipments» սխալ է: «A great deal of» ճիշտ քանակային նշիչ է անհաշվելի գոյականների համար:"])

mc(37, GRAMMAR_TOPIC, E,
   'Deliveries __________ arrive before 9 a.m., so don\'t expect the package too early.',
   "generally", ["in generally", "for general", "as general"],
   "«Generally» ինքնուրույն մակբայ է, առանց նախդրի:",
   ["«Generally» (ընդհանրապես) գործածվում է ուղղակիորեն` առանց նախդրի, մինչդեռ «in generally», «for general», «as general» կառուցվածքային սխալներ են:"])

# =========================================================== IV. WORD-FORM CLOZE (38-42)

WORDFORM_PASSAGE = (
    "Community gardening has become increasingly popular in cities around the world. The (38) "
    "__________ behind these shared spaces is to give residents access to fresh produce while "
    "strengthening neighborhood ties. Such projects are especially (39) __________ in areas with "
    "limited green space.\n\n"
    "Organizers must consider factors such as soil quality, water access, and fair distribution "
    "of plots to ensure long-term (40) __________. When garden spaces are managed (41) "
    "__________, participants tend to stay involved for many seasons.\n\n"
    "Studies suggest that community gardens can improve both (42) __________ well-being and a "
    "sense of belonging among neighbors."
)
passage_mc(WORDFORM_PASSAGE, "wordform-1", WORDFORM_TOPIC, [
    (38, E, "Choose the word form that best fits gap (38).",
     "principle", ["principles", "principled", "principally"],
     "Եզակի ենթական («The ___ ... is») պահանջում է եզակի գոյական:",
     ["Բային («is») նախորդող ենթական պետք է լինի եզակի գոյական, ուստի «principle» (եզակի), ոչ թե «principles» (հոգնակի):"]),
    (39, M, "Choose the word form that best fits gap (39).",
     "valuable", ["valuably", "value", "devalue"],
     "«Are especially ___» պահանջում է ածական (be-բային հետո):",
     ["«be + ածական» կառուցվածքում («are ... valuable») անհրաժեշտ է ածական ձև, ոչ մակբայ կամ գոյական:"]),
    (40, M, "Choose the word form that best fits gap (40).",
     "sustainability", ["sustainable", "sustainably", "unsustainable"],
     "«Long-term ___» դիրքում («ensure long-term ___») անհրաժեշտ է գոյական:",
     ["«ensure» բային հաջորդում է ուղիղ խնդիր (գոյական), ուստի ճիշտ ձևը «sustainability» է:"]),
    (41, M, "Choose the word form that best fits gap (41).",
     "fairly", ["fair", "fairness", "unfair"],
     "«Are managed ___» դիրքում անհրաժեշտ է մակբայ` կրավորական բային բնութագրելու համար:",
     ["Բային («are managed») բնութագրելու համար պետք է մակբայ` «fairly» (արդարացիորեն):"]),
    (42, M, "Choose the word form that best fits gap (42).",
     "communal", ["community", "communities", "communally"],
     "«___ well-being» դիրքում գոյականից («well-being») առաջ անհրաժեշտ է ածական:",
     ["Գոյականից («well-being») առաջ գործածվում է ածական, հետևաբար «communal» (համայնքային), ոչ թե «community» գոյականը:"]),
])

# =========================================================== V. GRAMMAR MC (43-50)

mc(43, COMPLEX_TOPIC, H,
   "Only after the results were published __________ the significance of the experiment.",
   "did he understand", ["he understood", "he had understood", "had understood he"],
   "«Only after» նախադասության սկզբում պահանջում է շրջված (inverted) բառակարգ:",
   ["Բացասական/սահմանափակող մակբայական դարձվածքով («Only after») սկսվող նախադասությունը պահանջում է ենթակա-ստորոգյալ շրջում` «did he understand»:"])

mc(44, COMPLEX_TOPIC, M,
   "__________ leading the research team, she also teaches undergraduate courses.",
   "In addition to", ["Furthermore", "Besides from", "Except to"],
   "«In addition to + գերունդ» կապակցող արտահայտություն է, որին հաջորդում է գոյական կամ գերունդ:",
   ["«In addition to» ընդունում է գերունդ («leading»); «Furthermore» նախադասության սկզբում շաղկապ չէ, այլ մակբայ, և պահանջում է ստորակետից հետո լրիվ նախադասություն:"])

mc(45, COMPLEX_TOPIC, M,
   "The old man spoke about the war __________ he had witnessed it firsthand.",
   "as though", ["because of", "so that", "even so"],
   "«As though» (= «կարծես») ներմուծում է անիրական/ենթադրական համեմատություն:",
   ["«As though/as if» գործածվում է ենթադրական համեմատության համար («կարծես թե ականատես էր եղել»)."])

mc(46, COMPLEX_TOPIC, M,
   "The shipment cannot be released __________.",
   "unless approved by customs", ["while it will be inspected by customs", "until customs won't inspect it", "if not by customs inspected"],
   "«Unless + past participle» կրավորական էլիպսիս է («unless it is approved»):",
   ["«Unless approved by customs» կրավորական էլիպսիսային կառուցվածք է` «unless it is approved by customs», մյուս տարբերակները քերականորեն սխալ են:"])

mc(47, COMPLEX_TOPIC, M,
   "The novelist __________ latest book won several awards will be speaking at the festival.",
   "whose", ["who", "whom", "which"],
   "Անհրաժեշտ է ստացական հարաբերական դերանուն, քանի որ խոսքը վեպագրի գրքի մասին է:",
   ["«whose» ցույց է տալիս պատկանելություն («the novelist's latest book»), ինչը ճիշտ հարաբերական դերանունն է այստեղ:"])

mc(48, COMPLEX_TOPIC, E,
   "__________ the summer months, the coastal town is crowded with visitors.",
   "Throughout", ["While", "Since", "Between"],
   "«Throughout + ժամանակահատված» նշանակում է «ամբողջ ընթացքում»:",
   ["«Throughout the summer months» = ամբողջ ամռան ընթացքում, նախդիր, որին հաջորդում է գոյական, ոչ թե շաղկապ:"])

mc(49, COMPLEX_TOPIC, M,
   "She didn't dismiss the proposal. __________, she praised it enthusiastically.",
   "On the contrary", ["However", "Yet", "Nonetheless"],
   "«On the contrary» ընդգծում է ուղիղ հակադրություն նախորդ պնդմանը:",
   ["«On the contrary» գործածվում է, երբ երկրորդ նախադասությունն ուղիղ հակառակն է հաստատում առաջինից, ոչ միայն հակադրում («However/Yet» չափազանց թույլ են այս համատեքստում)."])

mc(50, COMPLEX_TOPIC, H,
   "All __________ about the delay is that the flight was rescheduled twice.",
   "that I know", ["which I know", "what I don't know", "of which I know"],
   "«All that + ենթակա + բայ» կայուն կառուցվածք է, որին հաջորդում է «is that...»:",
   ["«All that I know is that...» ամրագրված կառուցվածք է. «what» այստեղ ավելորդ է, քանի որ «all» արդեն ցույց է տալիս անորոշ առարկան, որին «that» հարաբերականորեն վերաբերում է:"])

# =========================================================== VI. REPORTED SPEECH (51-55)

ms(51, REPORTED_TOPIC, H,
   "Choose the correctly transformed sentence(s).",
   ['"Why did you cancel the meeting at the last moment?" Karen said to Liam.\n'
    "Karen asked Liam why he had cancelled the meeting at the last moment.",
    '"Don\'t assume that the client will accept the first offer," Mia said to me.\n'
    "Mia warned me not to assume that the client would accept the first offer.",
    "Noah asked me to give a detailed summary of his findings.\n"
    'Noah says to me: "Could you possibly give a detailed summary of my findings?"',
    '"I regret that I didn\'t warn you about the delay," Ella said to me.\n'
    "Ella told me that she regretted not warning me about the delay.",
    '"It\'s quite noisy in here. Maybe we should move our discussion to another room," Priya said.\n'
    "Priya suggested to move our discussion to another room as it was quite noisy in there."],
   {0, 1, 3},
   "Ստուգել ժամանակաձևի հետշարժը (backshift), դերանունների փոփոխությունը, և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
   ["Ա, Բ, Դ ճիշտ են՝ ճշգրիտ backshift և դերանունների փոփոխություն։",
    "Գ սխալ է. «says» ներկա ժամանակն է, մինչդեռ շրջանակային բայը պետք է անցյալ լինի («said»), քանի որ արդեն անուղղակի ձևով նշված է անցյալում («asked»)։",
    "Ե սխալ է. «suggest» բային հաջորդում է գերունդ, ոչ թե infinitive («suggested moving», ոչ թե «suggested to move»)։"])

ms(52, REPORTED_TOPIC, H,
   "Choose the correctly transformed sentence(s).",
   ['"By the time you called, we had already submitted the final draft," Owen said.\n'
    "Owen told that by the time I had called, they had already submitted the final draft.",
    '"Can you tell me why the numbers don\'t add up?" Farah asked her colleague.\n'
    "Farah asked her colleague if he could tell her why the numbers didn't add up.",
    'Leo said to Ana: "I\'m confident the committee will approve your request."\n'
    "Leo assured Ana that the committee would approve her request.",
    'The coach said to the players, "Water boils at 100°C at sea level."\n'
    "The coach told the players that water boils at 100°C at sea level.",
    "The intern begged Mr. Diaz to explain everything he knew about the incident.\n"
    '"I beg you to explain everything I know about the incident, Mr. Diaz," said the intern.'],
   {1, 2, 3, 4},
   "«Tell» միշտ պահանջում է ուղղակի խնդիր (someone), իսկ գիտական փաստերը մնում են ներկա ժամանակով:",
   ["Ա սխալ է. «told» պահանջում է ուղղակի խնդիր՝ «told me», ոչ թե միայն «told that»։",
    "Բ, Գ, Ե ճիշտ backshift և կառուցվածք ունեն։",
    "Դ ճիշտ է. համընդհանուր ճշմարտությունը («water boils at 100°C») մնում է ներկա ժամանակով անուղղակի խոսքում։"])

ms(53, REPORTED_TOPIC, H,
   "Choose the correctly transformed sentence(s).",
   ['"I\'ve just uploaded the files. They\'re already synced," Grace said.\n'
    "Grace told James that she had just uploaded the files and added that they were already synced.",
    '"What time will the workshop start next Friday?" the trainees asked the instructor.\n'
    "The trainees asked the instructor what time the workshop would start the following Friday.",
    '"Once the policy takes effect, employees won\'t be permitted to work remotely," the director said.\n'
    "The director stated that once the policy took effect, employees wouldn't be permitted to work remotely.",
    "Victor apologized to Elena for arriving late the day before.\n"
    '"I\'m sorry for arriving late yesterday," Victor said to Elena.',
    '"If you intend to tour the facility, ask Nora to accompany you," the manager said to Sam.\n'
    "Sam's manager asked Nora to accompany him if he intended to tour the facility."],
   {0, 1, 2, 3},
   "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
   ["Ա, Բ, Գ, Դ ճիշտ են՝ ճշգրիտ backshift և հեռավորության/ժամանակի փոփոխություններ (next Friday → the following Friday, yesterday → the day before)։",
    "Ե սխալ է. բնօրինակում ղեկավարն ասում է Սեմին խնդրել Նորային, ուստի ճիշտ ձևը կլինի «Sam's manager told Sam to ask Nora...», ոչ թե ինքը՝ ղեկավարը, խնդրում է Նորային։"])

ms(54, REPORTED_TOPIC, H,
   "Choose the correctly transformed sentence(s).",
   ['"I will submit my thesis at the conference the day after tomorrow," Dr. Okafor said.\n'
    "Dr. Okafor said that he would submit his thesis at the conference in two days' time.",
    '"If you don\'t finish the audit on time, the client will be notified," Priya said to Tom.\n'
    "Priya told Tom that the client would be notified if he hadn't finished the audit on time.",
    "My colleague warned me not to share my password with anyone as it would compromise security.\n"
    'My colleague said to me: "Don\'t share your password with anyone; it will compromise security."',
    'Farid said, "I will accept the position which is offered to me."\n'
    "Farid said that he would accept the position which was offered to him.",
    '"Will either Nadia or Omar handle the client call tomorrow?" Rosa asked.\n'
    "Rosa asked Nadia whether she or Omar would handle the client call the following day."],
   {0, 2, 3, 4},
   "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if» դրույթը հետշարժվում է պարզ անցյալով, ոչ թե ենթակատարյալով:",
   ["Ա, Գ, Դ, Ե ճիշտ են՝ ճշգրիտ backshift և կառուցվածք։",
    "Բ սխալ է. «if you don't finish» պետք է դառնա «if he didn't finish», ոչ թե «if he hadn't finished» (past perfect-ը սխալ է First Conditional-ի հետշարժման համար)։"])

ms(55, REPORTED_TOPIC, H,
   "Choose the correctly transformed sentence(s).",
   ["The supervisor didn't allow Priya to leave early during the shift.\n"
    'The supervisor says to Priya, "Would you mind staying until the end of the shift?"',
    '"I have been drafting the contract for two weeks. I need to finish it today," Diego said.\n'
    "Diego said he had been drafting the contract for two weeks to finish it that day.",
    "Hana told me that she would like to join the mentorship program.\n"
    'Hana said to me, "I would like to join the mentorship program."',
    'Tariq asked his supervisor, "Must I hand in my badge tonight?"\n'
    "Tariq asked his supervisor to hand in his badge that night.",
    'The visitor said to Lena, "When does the archive close?"\n'
    "The visitor asked Lena when the archive closed."],
   {1, 2, 4},
   "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ուղիղ խոսքի հետ:",
   ["Բ, Գ, Ե ճիշտ են՝ ճշգրիտ backshift և կառուցվածք։",
    "Ա սխալ է. «says» ներկա ժամանակ է, մինչդեռ շրջանակը («didn't allow») անցյալում է, և իմաստը («մի թողեք») պետք է պահպանվի։",
    "Դ սխալ է. «Must I hand in...?» հարց է պարտավորության մասին, ուստի ճիշտ վերակառուցումը կլինի «whether he had to hand in his badge», ոչ թե հրահանգ («asked ... to hand in»)։"])

# =========================================================== VII. WORD-BANK CLOZE (56)

WORDBANK_1 = (
    "Iceland attracts a growing number of international visitors thanks to its dramatic "
    "landscapes. Tourist information centers make it simple to (Ա) __________ up-to-date "
    "details about hiking trails, accommodation, and local customs. Travelling with elderly "
    "relatives is usually manageable, as accessible facilities are fairly (Բ) __________ in the "
    "main tourist areas. In addition, local guides are generally (Գ) __________ to share advice "
    "and practical tips with newcomers.\n\n"
    "Before finalizing an itinerary, it is wise to check (Դ) __________ holidays and festival "
    "dates, since accommodation can become limited during busy periods. Popular tours are "
    "typically reserved well in (Ե) __________, especially throughout the summer season.\n\n"
    "Word bank (two are odd): 1. obtain  2. widespread  3. willing  4. national  5. advance  "
    "6. ignore  7. costly"
)
match_q(56, WORDBANK_TOPIC, M, WORDBANK_1,
    [("blank (Ա): \"make it simple to __________ up-to-date details\"", 1),
     ("blank (Բ): \"accessible facilities are fairly __________\"", 2),
     ("blank (Գ): \"local guides are generally __________ to share advice\"", 3),
     ("blank (Դ): \"check __________ holidays and festival dates\"", 4),
     ("blank (Ե): \"reserved well in __________\"", 5)],
    ["obtain", "widespread", "willing", "national", "advance", "ignore", "costly"],
    "Ամեն բաց թողնված բառի համար ստուգել՝ որ բառը իմաստով և քերականորեն (բայ/ածական/գոյական) համապատասխանում է նախադասությանը:",
    ["(Ա) «obtain» = ստանալ (բայ, «to __________ details»)։ (Բ) «widespread» = տարածված (ածական, «facilities are fairly __________»)։",
     "(Գ) «willing» = պատրաստակամ («are generally __________ to share»)։ (Դ) «national» = ազգային («__________ holidays»)։ (Ե) «advance» = «in advance» կայուն արտահայտություն («ապագայում»)։",
     "«ignore» (անտեսել) և «costly» (թանկարժեք) իմաստով կամ քերականորեն չեն համապատասխանում ոչ մի բացվածքի և մնում են չօգտագործված։"])

# =========================================================== VIII. QUESTION FORMATION (57-61)

ms(57, QFORM_TOPIC, H,
   "Choose the correctly formulated questions.",
   ["There's no reason to worry about the outcome, was there?",
    "I am certain that the plan will succeed, aren't I?",
    "Which department do you report to now?",
    "Did you used to play the violin when you were younger?",
    "Was it your idea or Sana's to change the schedule?"],
   {1, 2, 4},
   "Ստուգել tag-հարցերի ժամանակաձևը/դրական-բացասականությունը և «used to»-ի հետ «did»-ի գործածությունը:",
   ["Բ, Գ, Ե ճիշտ են (անկանոն «aren't I» tag, ազատ հարց, այլընտրանքային հարց)։",
    "Ա սխալ է. «There's» ներկա ժամանակ է, tag-ը պետք է լինի «is there?», ոչ թե «was there?»։",
    "Դ սխալ է. «did»-ից հետո գործածվում է «use to» (առանց «-d»), ոչ թե «used to»։"])

ms(58, QFORM_TOPIC, H,
   "Choose the correctly formulated questions.",
   ["It is crucial to update the records immediately, isn't it?",
    "Do you know how much the new equipment costs?",
    "Had you a talk with Marco about his behavior?",
    "Elena's mother will be attending the ceremony, won't she?",
    "Were you and Leo rehearsing at 8 yesterday?"],
   {0, 1, 3, 4},
   "Ստուգել tag-հարցերի ենթակայի-դերանվան համապատասխանությունը և հնացած կառուցվածքների բացակայությունը:",
   ["Ա, Բ, Դ, Ե ճիշտ են։",
    "Գ սխալ է (հնացած ձև). ժամանակակից անգլերենում ասվում է «Did you have a talk with Marco...?», ոչ թե «Had you a talk...?»։"])

ms(59, QFORM_TOPIC, H,
   "Choose the correctly formulated questions.",
   ["We rarely witness such a spectacular eclipse, do we?",
    "This is the first time I have visited Iceland, isn't this?",
    "How many provinces does Canada consist of?",
    "Who did suggest that the moon influences tides?",
    "Can you finally explain what the delay is about?"],
   {0, 2, 4},
   "«Rarely»-ը բացասական մակբայ է. tag-ը դրական է։ Ենթակայի հարցերում «do/did» չի գործածվում:",
   ["Ա, Գ, Ե ճիշտ են։",
    "Բ սխալ է. tag-ը պետք է լինի «isn't it?», ոչ թե «isn't this» («this» չի կարող կրկնվել tag-ում)։",
    "Դ սխալ է. «who» ենթակա է, ուստի «did»-ի կիրառումն ավելորդ է. ճիշտ է «Who suggested...?»։"])

ms(60, QFORM_TOPIC, H,
   "Choose the correctly formulated questions.",
   ["How often do we need to renew the license?",
    "Please, don't mention today's mistake to anyone, will you?",
    "Will they the documentary or the news watch tonight?",
    "Do you regret missing the workshop last month?",
    "Why Farid teased you during the lesson yesterday?"],
   {0, 1, 3},
   "Ստուգել բառակարգը (word order) և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
   ["Ա, Բ, Դ ճիշտ են։",
    "Գ սխալ է. բային («watch») սխալ դիրք ունի, ճիշտ է «Will they watch the documentary or the news tonight?»։",
    "Ե սխալ է. բացակայում է օժանդակ բայը. ճիշտ է «Why did Farid tease you...?»։"])

ms(61, QFORM_TOPIC, H,
   "Choose the correctly formulated questions.",
   ["Why did she say she was concerned about the results?",
    "Did Karim make fewer mistakes in his essay than Zoe?",
    "Do you think should we let them go home early?",
    "He will surely enjoy the concert, won't it?",
    "Has Maya finalized the arrangements for the trip?"],
   {0, 1, 4},
   "Ներդրված հարցերում («Do you think...») բառակարգը մնում է հաստատական. tag-ի դերանունը պետք է համապատասխանի ենթակային:",
   ["Ա, Բ, Ե ճիշտ են։",
    "Գ սխալ է. ներդրված հարցում («Do you think») բառակարգը պետք է մնա հաստատական. ճիշտ է «Do you think we should let them go home early?»։",
    "Դ սխալ է. tag-ի դերանունը պետք է համապատասխանի «he»-ին, ոչ թե «it»-ին. ճիշտ է «won't he?»։"])

# =========================================================== IX. PREPOSITIONS/ADVERBS CLOZE (62)

WORDBANK_2 = (
    "Marie Curie is remembered (Ա) __________ her pioneering research on radioactivity. From a "
    "young age, she was passionate (Բ) __________ science and spent long hours in makeshift "
    "laboratories testing new materials. During her studies, she combined physics (Գ) __________ "
    "chemistry to develop groundbreaking techniques for isolating radioactive elements.\n\n"
    "Curie recorded her experiments meticulously, often working late into the night, and kept "
    "detailed notebooks that reveal both her scientific rigor and her determination.\n\n"
    "Interestingly, Curie remained devoted (Դ) __________ her research even after being awarded "
    "two Nobel Prizes, believing that scientific knowledge should be shared openly (Ե) "
    "__________ those willing to pursue it further.\n\n"
    "Word bank (two are odd): 1. for  2. about  3. with  4. to  5. among  6. inside  7. from"
)
match_q(62, PREP_TOPIC, M, WORDBANK_2,
    [("blank (Ա): \"remembered __________ her pioneering research\"", 1),
     ("blank (Բ): \"passionate __________ science\"", 2),
     ("blank (Գ): \"combined physics __________ chemistry\"", 3),
     ("blank (Դ): \"remained devoted __________ her research\"", 4),
     ("blank (Ե): \"shared openly __________ those willing\"", 5)],
    ["for", "about", "with", "to", "among", "inside", "from"],
    "Ամեն նախդիր ստուգել իր կայուն արտահայտության մեջ («remembered for», «passionate about», «combine X with Y», «devoted to», «among»):",
    ["«remembered for» (հայտնի/հիշվում է ինչ-որ բանով), «passionate about» (կրքոտ ինչ-որ բանով)՝ երկուսն էլ կայուն նախդրային կապակցություններ են։",
     "«combine X with Y», «devoted to» (նվիրված), «shared among» (կիսվել մի խմբի անդամների միջև)՝ բոլորը ֆիքսված նախդրային օրինաչափություններ են։",
     "«inside» և «from» իմաստով կամ քերականորեն չեն համապատասխանում ոչ մի բացվածքի և մնում են չօգտագործված։"])

# =========================================================== X. ODD WORD (63-67)

ms(63, ODDWORD_TOPIC, M,
   "Choose the sentences with an odd word.",
   ["Successful teams rely by on clear communication rather than individual heroics.",
    "A good mentor listens carefully and offers of constructive feedback.",
    "Collaboration often produces better outcomes than working in isolation.",
    "Every member of the team deserves that recognition for their contribution.",
    "Teams thrive when leaders communicate expectations clearly."],
   {0, 1, 3},
   "Փնտրել ավելորդ նախդիր կամ դերանուն, որը խախտում է բային/գոյականին հաջորդող կայուն կառուցվածքը:",
   ["Ա. «rely by on» — ավելորդ է «by», ճիշտ է «rely on»։",
    "Բ. «offers of constructive feedback» — ավելորդ է «of», ճիշտ է «offers constructive feedback»։",
    "Դ. «deserves that recognition» — ավելորդ է «that», ճիշտ է «deserves recognition»։ Գ և Ե նախադասություններն առանց սխալի են։"])

ms(64, ODDWORD_TOPIC, M,
   "Choose the sentences with an odd word.",
   ["Innovations that shape daily life are often built on ideas that seemed radical decades ago.",
    "Many experts believe that although breakthroughs require years of failed experiments.",
    "Reading widely does not automatically make you an quite intelligent person.",
    "Curiosity is often considered the driving force behind scientific discovery.",
    "An expert is someone who knows which facts does matter and which do not."],
   {1, 2, 4},
   "Փնտրել կրկնվող շաղկապներ, ավելորդ հոդված/մակբայ և ավելորդ օժանդակ բայ:",
   ["Բ. «that although» — երկու շաղկապ միասին ավելորդ է, պետք է լինի կամ «that», կամ «although»։",
    "Գ. «an quite intelligent» — ավելորդ է «quite»-ից առաջ եղած անհամապատասխանությունը, ճիշտ է «a quite intelligent» կամ պարզապես «an intelligent»։",
    "Ե. «which facts does matter» — ավելորդ է «does», ճիշտ է «which facts matter»։ Ա և Դ նախադասություններն առանց սխալի են։"])

ms(65, ODDWORD_TOPIC, M,
   "Choose the sentences with an odd word.",
   ["Noise pollution in cities has measurable effects on both physical and mental health.",
    "Many of these habitats are forced to adapt to rapidly shifting conditions.",
    "Researchers warn that biodiversity loss may seriously threaten ecosystems worldwide.",
    "Synthetic materials that don't never decompose naturally can persist in soil for centuries.",
    "Chemical runoff disrupts aquatic life, which interfering with local fishing communities."],
   {3, 4},
   "Փնտրել կրկնակի ժխտում և հարաբերական նախադասությունում սխալ բայաձև:",
   ["Դ. «don't never» — կրկնակի ժխտում, ավելորդ է «never», ճիշտ է «don't ... decompose» կամ «never decompose»։",
    "Ե. «which interfering» — սխալ բայաձև, ճիշտ է «which interferes»։ Ա, Բ, Գ նախադասություններն առանց սխալի են։"])

ms(66, ODDWORD_TOPIC, M,
   "Choose the sentences with an odd word.",
   ["Regular sleep patterns support both physical recovery and mental clarity.",
    "Many doctors believe that recovery is happening more rapid than expected.",
    "Staying hydrated is essential, especially in regions that suffer from extreme heat.",
    "Regular checkups not only catch problems early but also reduce costs too.",
    "Learning about nutrition science improves decision-making and supports long-term wellbeing."],
   {1, 3},
   "Փնտրել ածական՝ մակբայի փոխարեն և «not only...but also»-ի հետ ավելորդ կրկնություն:",
   ["Բ. «more rapid» — ածական է գործածված մակբայի փոխարեն, ճիշտ է «more rapidly»։",
    "Դ. «not only...but also...too» — «too»-ն ավելորդ է, քանի որ «not only...but also» արդեն ամբողջական է։ Ա, Գ, Ե նախադասություններն առանց սխալի են։"])

ms(67, ODDWORD_TOPIC, M,
   "Choose the sentences with an odd word.",
   ["People who arrive early to a gathering seem eager, while latecomers act like they own the place.",
    "If a computer can process millions of operations every of second, why do errors still happen?",
    "I often write things down because I'm the only reader whose judgment I fully trust.",
    "Habits are like keys: find the one that fits, but don't make me to force yours.",
    "Tell someone a shortcut exists, and they will take it; tell them a warning, and most will ignore about it."],
   {1, 3, 4},
   "Փնտրել ավելորդ նախդիր քանակական արտահայտության մեջ, ավելորդ «to» պատճառական բային («make») հետո, և ավելորդ նախդիր անցողական բային («ignore») հետո:",
   ["Բ. «every of second» — ավելորդ է «of», ճիշտ է «every second»։",
    "Դ. «make me to force» — «make» պատճառական բայից հետո infinitive-ը «to»-ի առանց է, ճիշտ է «make me force»։",
    "Ե. «ignore about it» — «ignore» անցողական բայ է և ուղիղ խնդիր է վերցնում, «about»-ն ավելորդ է. ճիշտ է «ignore it»։ Ա և Գ նախադասություններն առանց սխալի են։"])

# =========================================================== XI. PASSIVE VOICE (68-72)

ms(68, PASSIVE_TOPIC, M,
   "Choose the correctly formulated Passive constructions.",
   ["The quarterly report was reviewed by the board on Friday afternoon.",
    "Pollutants detected in the reservoir are monitoring weekly by inspectors.",
    "The evidence could have been tampered with before investigators arrived.",
    "Does the equipment have to be serviced by a certified technician?",
    "The ceremony will be held in the main auditorium."],
   {0, 2, 3, 4},
   "Ստուգել, թե որ նախադասություններն իրապես կրավորական սեռով են ճիշտ կառուցված («be + past participle»):",
   ["Ա, Գ, Դ, Ե ճիշտ կրավորական կառույցներ են։",
    "Բ սխալ է. կրավորականի փոխարեն օգտագործված է ակտիվ «-ing» ձև («are monitoring»), ճիշտ է «are being monitored» կամ «are monitored»։"])

ms(69, PASSIVE_TOPIC, M,
   "Choose the correctly formulated Passive constructions.",
   ["The manager had the interns update the spreadsheet.",
    "Prices are expected to fall within the next two years.",
    "Will everyone be given a chance to ask questions?",
    "Electricity generated in power plants using various sources.",
    "The existence of the virus was not confirmed until the early 21st century."],
   {1, 2, 4},
   "Ուշադրություն դարձնել՝ արդյոք նախադասությունն ընդհանրապես կրավորական է, և արդյոք այն լրիվ ու քերականորեն ամբողջական է:",
   ["Բ, Գ, Ե ճիշտ կրավորական կառույցներ են։",
    "Ա ակտիվ պատճառական (causative) կառույց է («have someone do something»), ոչ թե կրավորական, ուստի չի ընտրվում։",
    "Դ թերի նախադասություն է (բացակայում է «is» ստորոգյալից. ճիշտ կլիներ «Electricity is generated...»), ուստի ճիշտ կրավորական կառույց չէ։"])

ms(70, PASSIVE_TOPIC, M,
   "Choose the correctly formulated Passive constructions.",
   ["Newton was the most influential physicist of his era.",
    "Thousands of samples tested at the university laboratory every semester.",
    "Antarctica is currently being surveyed by several research teams.",
    "Why has the safety protocol been revised by the committee?",
    "All the invoices had to be verified by the accountant."],
   {2, 3, 4},
   "Ուշադրություն դարձնել՝ արդյոք գործողությունն իրապես կրավորական է, թե պարզապես «be + գոյական/ածական» նկարագրություն է:",
   ["Գ, Դ, Ե ճիշտ կրավորական կառույցներ են։",
    "Ա կրավորական չէ (հայտարարական «be + գոյական» նկարագրություն), ուստի չի ընտրվում։",
    "Բ թերի է (բացակայում է «are». ճիշտ կլիներ «...are tested...»), ուստի ճիշտ կրավորական կառույց չէ։"])

ms(71, PASSIVE_TOPIC, H,
   "Choose the correctly formulated Passive constructions.",
   ["Because of the storm warning at the airport, the flight cancelled.",
    "The applicants were made to complete a background check.",
    "Every minute thousands of messages are exchanged worldwide.",
    "This tower was been designed to withstand strong winds.",
    "The parcel has delivered to the wrong warehouse by mistake."],
   {1, 2},
   "Ստուգել, թե «be» օժանդակ բայն առկա է, և արդյոք չկա կրկնվող կամ բացակայող օժանդակ բայ:",
   ["Բ, Գ ճիշտ կրավորական կառույցներ են։",
    "Ա բացակայում է «was» ստորոգյալից (ճիշտ է «the flight was cancelled»)։",
    "Դ ունի կրկնվող «was been» (ճիշտ է «was designed»)։ Ե բացակայում է «been»-ից (ճիշտ է «has been delivered»)։"])

ms(72, PASSIVE_TOPIC, M,
   "Choose the correctly formulated Passive constructions.",
   ["How thoughtful of you to have surprised the staff with a bonus!",
    "The patients were well cared for by the visiting nurses.",
    "Penicillin was discovered by Alexander Fleming in 1928.",
    "Venice is a popular destination for honeymooners.",
    "Had you double-checked all the figures carefully?"],
   {1, 2},
   "Ուշադրություն դարձնել՝ արդյոք նախադասությունն ընդհանրապես կրավորական սեռով է, թե ակտիվ:",
   ["Բ, Գ ճիշտ կրավորական կառույցներ են։",
    "Ա, Դ, Ե բոլորն ակտիվ սեռով են (ոչ պասիվ կառույցներ), ուստի «Choose the correctly formulated Passive constructions» պահանջին չեն համապատասխանում, թեև քերականորեն ճիշտ նախադասություններ են։"])

# =========================================================== XII. VOCABULARY MATCHING (73-76)

match_q(73, VOCAB_TOPIC, E, "Match the words and their definitions.",
    [("Generosity", 4), ("Curiosity", 3), ("Arrogance", 1), ("Patience", 2)],
    ["the quality of being excessively proud of oneself",
     "the ability to stay calm while waiting or dealing with difficulty",
     "a strong desire to know or learn about something",
     "willingness to give more of something than is strictly necessary",
     "the state of being easily annoyed or irritated"],
    "Ամեն բառի համար գտնել այն սահմանումը, որը ճշգրիտ նկարագրում է դրա իմաստը:",
    ["Generosity = մեծահոգություն → «willingness to give more...» (4)։ Curiosity = հետաքրքրասիրություն → «a strong desire to know...» (3)։",
     "Arrogance = ամբարտավանություն → «excessively proud» (1)։ Patience = համբերություն → «stay calm while waiting» (2)։ Սահմանում 5-ը («easily annoyed») ավելորդ է։"])

match_q(74, VOCAB_TOPIC, M, "Match the words and their definitions.",
    [("Supplier", 2), ("Shareholder", 1), ("Regulator", 3), ("Consultant", 4)],
    ["a person who owns part of a company through shares",
     "an organization that provides goods or materials to a business",
     "an official body that enforces rules within an industry",
     "a person hired to give expert advice to organizations",
     "a person who manages the daily operations of a company"],
    "Ամեն բառը պատկանում է բիզնես-բառապաշարին. զատել դերերը` մատակարար, բաժնետեր, կարգավորող մարմին, խորհրդատու:",
    ["Supplier = մատակարար → «provides goods or materials» (2)։ Shareholder = բաժնետեր → «owns part of a company through shares» (1)։",
     "Regulator = կարգավորող մարմին → «enforces rules» (3)։ Consultant = խորհրդատու → «hired to give expert advice» (4)։ Սահմանում 5-ը («manages daily operations») ավելորդ է։"])

match_q(75, VOCAB_TOPIC, M, "Match the words and their definitions.",
    [("Reliable", 4), ("Skeptical", 3), ("Adaptable", 2), ("Reckless", 1)],
    ["careless about the danger or risk involved in an action",
     "able to adjust easily to new conditions",
     "having doubts about whether something is true",
     "able to be trusted to do what is expected",
     "showing great enthusiasm for something new"],
    "Յուրաքանչյուր ածականի իմաստը կապել համապատասխան վարքագծի կամ մտածելակերպի հետ:",
    ["Reliable = վստահելի → «able to be trusted» (4)։ Skeptical = կասկածամիտ → «having doubts» (3)։",
     "Adaptable = հարմարվողական → «adjust easily to new conditions» (2)։ Reckless = անխոհեմ → «careless about danger» (1)։ Սահմանում 5-ը ավելորդ է։"])

match_q(76, VOCAB_TOPIC, M, "Match the words and their definitions.",
    [("Postpone", 3), ("Acknowledge", 1), ("Overlook", 2), ("Withdraw", 4)],
    ["accept or admit that something is true",
     "fail to notice or deliberately ignore something",
     "delay an event until a later time",
     "take money out of an account, or remove oneself from something",
     "examine something very closely"],
    "Ամեն բայի իմաստը հստակորեն տարբերվում է մյուսներից. ուշադրություն դարձնել «delay», «admit», «ignore», «remove» իմաստներին:",
    ["Postpone = հետաձգել → «delay an event» (3)։ Acknowledge = ընդունել → «accept or admit» (1)։",
     "Overlook = աչքաթող անել → «fail to notice» (2)։ Withdraw = հանել/դուրս գալ → «take money out... or remove oneself» (4)։ Սահմանում 5-ը ավելորդ է։"])

# =========================================================== XIII. SENTENCE MATCHING (77-80)

match_q(77, SENTMATCH_TOPIC, M, "Match the beginning and the end of the sentences.",
    [("Machu Picchu was built high in the Andes", 4),
     ("Despite centuries of erosion,", 3),
     ("The Colosseum remains a symbol", 1),
     ("Many ancient ruins that attract tourism today", 2)],
    ["of Roman engineering and entertainment.",
     "require careful preservation efforts.",
     "the Sphinx still draws visitors from across the world.",
     "to serve as a retreat for Incan rulers.",
     "because of its dramatic mountain setting.",
     "who study the history of empires."],
    "Ամեն նախադասության սկիզբը քերականորեն և իմաստով կապել համապատասխան ավարտի հետ (նպատակ, հակադրություն, նկարագրություն, ենթակա):",
    ["A→4 («built ... to serve as» նպատակ)։ B→3 («Despite» հակադրություն, «the Sphinx still draws»)։",
     "C→1 («remains a symbol of» + գոյական)։ D→2 («ruins that... require preservation»)։ Ավարտներ 5 և 6 ավելորդ են։"])

match_q(78, SENTMATCH_TOPIC, M, "Match the beginning and the end of the sentences.",
    [("Blended learning combines", 5),
     ("Enrolling in a self-paced course allows", 1),
     ("Some employers now offer", 2),
     ("Despite initial doubts about remote assessments,", 3)],
    ["students to progress at their own speed.",
     "tuition support for employees taking evening classes.",
     "many universities have adopted secure online exams.",
     "which tracks attendance automatically.",
     "classroom instruction with digital resources.",
     "that require constant supervision."],
    "Ամեն սկիզբը պահանջում է քերականորեն համապատասխան շարունակություն (allows + ինֆինիտիվ, combines + գոյական, despite + հակասական արդյունք):",
    ["A→5 («combines X with Y»)։ B→1 («allows students to progress»)։",
     "C→2 («offer tuition support»)։ D→3 («Despite doubts,... universities have adopted»)։ Ավարտներ 4 և 6 ավելորդ են։"])

match_q(79, SENTMATCH_TOPIC, H, "Match the beginning and the end of the sentences.",
    [("Each year the World Happiness Report ranks", 2),
     ("Because Norway invests heavily in public services,", 3),
     ("One reason Mandarin is considered difficult", 1),
     ("I was surprised to learn from the report", 4)],
    ["is that it uses a completely different writing system.",
     "countries by measures of well-being and trust.",
     "its citizens often report high life satisfaction.",
     "that education levels strongly predict reported happiness.",
     "because they hope to relocate abroad.",
     "it is widely spoken across several countries."],
    "Ուշադրություն դարձնել պատճառահետևանքային («Because...») և բացատրական («I was surprised to learn... that») կառուցվածքներին:",
    ["A→2 («ranks countries by measures»)։ B→3 («Because... invests,... citizens report high satisfaction»)։",
     "C→1 («One reason... is that»)։ D→4 («surprised to learn... that education levels predict»)։ Ավարտներ 5 և 6 ավելորդ են։"])

match_q(80, SENTMATCH_TOPIC, H, "Match the beginning and the end of the sentences.",
    [("Automakers are expanding electric vehicle production to", 2),
     ("The main obstacle to widespread EV adoption is", 3),
     ("Engineers have developed charging stations", 1),
     ("Provided that the electrical grid is modernized,", 5)],
    ["capable of recharging a vehicle within minutes.",
     "meet growing demand for cleaner transportation.",
     "that the necessary charging infrastructure is still limited.",
     "unless battery costs continue to fall sharply.",
     "the shift to electric transport will accelerate.",
     "will raise the price of raw materials."],
    "Ուշադրություն դարձնել նպատակային («to + բայ»), սահմանիչ («capable of»), և պայմանական («Provided that») կառուցվածքներին:",
    ["A→2 («expanding production to meet demand»)։ B→3 («The main obstacle is that...»)։",
     "C→1 («stations capable of recharging»)։ D→5 («Provided that..., the shift will accelerate»)։ Ավարտներ 4 և 6 ավելորդ են։"])

# =========================================================== VALIDATION + WRITE

assert [q["number"] for q in CUR] == list(range(1, 81)), sorted(q["number"] for q in CUR)

for q in CUR:
    if q["type"] == "single_choice":
        assert len(q["options"]) == 4, q["number"]
        assert len(set(q["options"])) == 4, ("dup options", q["number"])
        assert q["correct_option"] in ARM[:4], q["number"]
    if q["type"] == "multi_statement":
        assert len(q["statements"]) == 5, q["number"]
        assert 1 <= len(set(q["correct_option"].replace(" և ", ", ").split(", "))) <= 4, q["number"]
    if q["type"] == "matching":
        assert 4 <= len(q["left"]) <= 5, q["number"]
        assert len(q["right"]) >= len(q["left"]), q["number"]
        targets = [item["target"] for item in q["left"]]
        assert all(1 <= t <= len(q["right"]) for t in targets), q["number"]
        assert len(set(targets)) == len(targets), ("dup targets", q["number"])

exam = {
    "exam_id": "AEE-ENG-001",
    "title": "Միասնական քննություն — Անգլերեն (թեստ 1)",
    "question_count": 80,
    "subject": "english",
    "questions": CUR,
}

out_path = os.path.join(OUT_DIR, "armenian_entrance_english_01.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(exam, f, ensure_ascii=False, indent=2)
print(f"Wrote {out_path} ({len(CUR)} questions)")

# ---- type distribution sanity ----
from collections import Counter
type_counts = Counter(q["type"] for q in CUR)
diff_counts = Counter(q["difficulty"] for q in CUR)
print("Type distribution:", dict(type_counts))
print("Difficulty distribution:", dict(diff_counts))

# ---- Cyrillic sanity scan (content should be Armenian + English only) ----
import re
cyr = re.compile(r"[Ѐ-ӿ]")
bad = []
for q in CUR:
    blob = json.dumps(q, ensure_ascii=False)
    m = cyr.search(blob)
    if m:
        bad.append((q["number"], m.group(0)))
print(f"Cyrillic-character scan: {len(bad)} hit(s): {bad}")
