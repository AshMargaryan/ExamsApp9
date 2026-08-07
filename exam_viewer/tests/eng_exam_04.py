# -*- coding: utf-8 -*-
"""English mock exam #4 (AEE-ENG-004). Reading: Olympic Games history.
Cloze: Samuel Morse/telegraph, space tourism by 2100, Voynich Manuscript mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 4)"
EXAM_IDX = 4
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  The modern Olympic Games trace their origins to a proposal made in
2.  the late nineteenth century by a French educator who believed that
3.  international sporting competition could promote peace and mutual
4.  understanding among nations. Inspired by the ancient games once held
5.  in Olympia, Greece, organizers revived the tradition in 1896, staging
6.  the first modern Olympics in Athens with athletes from just a handful
7.  of countries.
8.      In the decades that followed, the Games grew steadily in scale and
9.  ambition. New sports were added, host cities competed fiercely for the
10. honor of staging the event, and elaborate ceremonies became central to
11. the opening and closing of each edition. Radio broadcasts, and later
12. television, transformed the Olympics from a gathering witnessed mainly
13. by spectators in the stadium into a global spectacle followed by
14. hundreds of millions of viewers.
15.     Despite this growth, the Games have not been without controversy.
16. Two World Wars forced the cancellation of several planned Olympics,
17. and political tensions during the Cold War led certain nations to
18. boycott specific editions altogether. Questions about the enormous
19. cost of hosting the Games have also prompted some cities to withdraw
20. their bids, wary of the financial burden left behind once the athletes
21. and spectators have gone home.
22.     Nevertheless, the Olympics have continued to evolve in response to
23. changing times. The Winter Games were introduced to showcase sports
24. played on snow and ice, and the Paralympic Games were established to
25. celebrate elite athletes with disabilities. Organizers have gradually
26. expanded the program to include a wider range of sports, reflecting
27. shifts in global sporting culture and public interest.
28.     Today, supporters argue that the Olympics still fulfill their
29. founding purpose by bringing together athletes and spectators from
30. rival nations under a shared set of rules. Critics counter that
31. commercial interests now shape the Games as much as any ideal of
32. friendly competition. Even so, the event remains one of the most
33. widely watched gatherings in the world every two years."""

CLOZE_A = (
    "Long-distance communication (11) __________ dramatically since the early 19th century. Before "
    "the telegraph, urgent news could travel no faster than a horse or ship could carry it. In the "
    "1830s, while Samuel Morse (12) __________ on a way to send electrical signals along a wire, he "
    "developed a code of dots and dashes to represent letters. He realized that short and long "
    "pulses of current (13) __________ distinct letters when received at the other end.\n\n"
    "Although he demonstrated the invention successfully, a nationwide telegraph network "
    "(14) __________ by most cities for another decade. It wasn't until Congress funded an "
    "experimental line between Washington and Baltimore that the technology proved its value. It "
    "was estimated that within a few decades the telegraph (15) __________ how quickly news spread "
    "across the country."
)
CLOZE_B = (
    "By the year 2100, the way ordinary people travel beyond Earth (16) __________ beyond "
    "recognition. Currently, aerospace companies (17) __________ to develop reusable spacecraft "
    "capable of carrying paying passengers into orbit. These spacecraft (18) __________ to make "
    "short orbital trips affordable for a wider range of travelers. However, some critics argue "
    "that such trips (19) __________ be too risky to insure at scale. If safety records continue to "
    "improve, experts predict that by the end of the century, most orbital flights (20) __________ "
    "by fully automated systems rather than human pilots."
)
CLOZE_C = (
    "Discovered in 1912 among a collection of old books, the Voynich Manuscript remains one of the "
    "most puzzling texts ever found. Investigators believe the original author (21) __________ the "
    "script deliberately to disguise sensitive information, as no known language matches its "
    "patterns. Since certain pages contain detailed botanical drawings, some researchers concluded "
    "that the manuscript (22) __________ by a medieval herbalist recording plant remedies. Other "
    "theorists argued that the entire text (23) __________ as an elaborate hoax intended to deceive "
    "a wealthy buyer. Whatever the truth, the manuscript's script (24) __________ officially by any "
    "linguist or codebreaker, despite a century of attempts. Researchers continue to analyze the "
    "ink and parchment for clues. Unless a matching text (25) __________, the manuscript's meaning "
    "may never be confirmed."
)
WORDFORM_PASSAGE = (
    "Bike-share programs have become common in cities seeking alternatives to car-based commuting. "
    "The (38) __________ behind these programs is to give residents short-term access to bicycles "
    "without the cost of ownership. Such programs are especially (39) __________ in dense urban "
    "neighborhoods with limited parking.\n\n"
    "Operators must consider factors like station placement and bicycle maintenance to ensure "
    "long-term (40) __________. When programs are managed (41) __________, ridership often grows "
    "steadily year after year.\n\n"
    "Studies suggest that bike-share programs can improve both (42) __________ health and reduce "
    "traffic congestion."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "Olympic Games history")
    b.passage_mc(PASSAGE, "reading-4", RC_TOPIC, [
        (1, E, "According to the text, the modern Olympic Games were revived in 1896 based on",
         "the ancient games once held in Olympia, Greece",
         ["a proposal from the International Red Cross", "a treaty signed after World War I",
          "an agreement among Cold War rival nations"],
         "Համեմատել «revived the tradition» արտահայտությունը նախորդ նախադասության հետ:",
         ["Տողեր 4-5. «Inspired by the ancient games once held in Olympia, Greece, organizers revived the tradition in 1896»:"]),
        (2, M, "The pronoun their in line 20 stands for",
         "cities", ["athletes", "spectators", "nations"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«...prompted some cities to withdraw their bids» — «their» վերաբերում է «cities»-ին:"]),
        (3, M, "According to paragraph 2 (lines 8-14), radio and television broadcasts changed the Olympics by",
         "turning it into a global spectacle followed by hundreds of millions of viewers",
         ["eliminating the need for host cities", "reducing the number of sports included",
          "ending in-person spectator attendance entirely"],
         "Փնտրել պարբերության վերջին նախադասությունը:",
         ["Տողեր 12-14-ը ասում են, որ հեռարձակումը վերածեց Օլիմպիադան համաշխարհային տեսարանի՝ հարյուրավոր միլիոն դիտողներով:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Inspired by the ancient games once held in Olympia, Greece, organizers revived the tradition '
         'in 1896, staging the first modern Olympics in Athens with athletes from just a handful of countries."',
         "The modern Olympics began in 1896 in Athens as a small revival of the ancient Greek games.",
         ["The Olympics have always included athletes from every country in the world.",
          "The ancient Greek games were larger in scale than the modern Olympics.",
          "Athens hosted the Olympics for the first time in the twentieth century."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ժամանակակից Օլիմպիադան սկսվեց 1896-ին Աթենքում՝ որպես հին խաղերի վերականգնում:"]),
        (5, M, "How did political tensions during the Cold War affect the Olympics, according to the text?",
         "They led some nations to boycott specific editions.",
         ["They caused the permanent cancellation of the Games.", "They had no effect on which countries participated.",
          "They led to the creation of the Paralympic Games."],
         "Փնտրել Սառը պատերազմի հետևանքը 3-րդ պարբերությունում:",
         ["Տողեր 17-18. «political tensions during the Cold War led certain nations to boycott specific editions»:"]),
        (6, M, "The word wary in line 20 may best be replaced by",
         "cautious", ["enthusiastic", "unaware", "grateful"],
         "«Wary» = զգուշավոր, կասկածամիտ:",
         ["«wary of the financial burden» — «wary» = «cautious» (զգուշավոր):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Every planned Olympic Games has been held without cancellation since 1896.",
         ["Two World Wars forced the cancellation of several planned Olympics.",
          "The Winter Games were introduced to showcase snow and ice sports.",
          "Some cities have withdrawn their bids due to hosting costs."],
         "Համեմատել յուրաքանչյուր տարբերակը 3-րդ պարբերության հետ:",
         ["Տողեր 16-17-ը ասում են, որ երկու համաշխարհային պատերազմները հրաժարեցնում էին որոշ Օլիմպիադաներից, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word elaborate in line 10 is closest in meaning to",
         "detailed and complex", ["simple and brief", "inexpensive", "outdated"],
         "«Elaborate» = մանրակրկիտ, բարդ:",
         ["«elaborate ceremonies» — «elaborate» = «detailed and complex» (մանրակրկիտ):"]),
        (9, M, "Paragraph 3 (lines 15-21) mainly",
         "describes controversies and challenges the Olympics have faced over time",
         ["argues that the Olympics should be permanently cancelled",
          "explains the technical rules of Olympic boxing",
          "lists every country that has hosted the Games"],
         "Բացահայտել պարբերության հիմնական բովանդակությունը:",
         ["Պարբերությունը թվարկում է պատերազմները, բոյկոտները և ծախսերի հարցերը՝ վեճերի օրինակներ:"]),
        (10, M, "The overall tone of the text can best be described as",
         "balanced, acknowledging both the achievements and criticisms of the Olympics",
         ["entirely dismissive of the Olympics' value", "purely celebratory with no mention of problems",
          "hostile toward international sporting competition"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը նշում է և՛ նվաճումները (տողեր 28-30), և՛ քննադատությունը (տողեր 30-31), ինչը հավասարակշռված տոն է:"]),
    ])

    b.register_topic("cloze_topics", "Samuel Morse and the telegraph")
    b.passage_mc(CLOZE_A, "cloze-morse", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the early 19th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "were representing", ["had been represented", "have been represented", "are represented"],
         "Ընթացիկ գործընթաց անցյալում:", ["«were representing» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't adopted", ["hasn't been adopted", "is adopted", "had adopted"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«telegraph»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "space tourism by 2100")
    b.passage_mc(CLOZE_B, "cloze-spacetourism", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2100» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be operated", ["will operate", "is operated", "have operated"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be operated»:"]),
    ])
    b.register_topic("cloze_topics", "Voynich Manuscript mystery")
    b.passage_mc(CLOZE_C, "cloze-voynich", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have invented", ["should be invented", "have to invent", "can invent"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա:", ["Modal Perfect «must have invented»:"]),
        (22, M, "Choose the right option for gap (22).", "had been written", ["had written", "hasn't been written", "wasn't writing"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been written»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been created", ["may create", "may be created", "has to create"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been created» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been deciphered", ["isn't deciphered", "hadn't been deciphered", "won't be deciphered"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been deciphered»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "bike-share programs")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-4", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "popular", ["popularly", "popularity", "unpopular"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «popular»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "efficiently", ["efficient", "efficiency", "inefficient"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «efficiently»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "public", ["publicly", "publicity", "publicize"],
         "«___ health» դիրքում գոյականից առաջ անհրաժեշտ է ածական:", ["«public health» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "workplace mentorship programs (VII)")
    t.gen_wordbank(b, rng, 56, "Workplace mentorship programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "public library renovation (IX)")
    t.gen_wordbank(b, rng, 62, "Public library renovation", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
