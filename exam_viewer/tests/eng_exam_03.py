# -*- coding: utf-8 -*-
"""English mock exam #3 (AEE-ENG-003). Reading: history of the postal service.
Cloze: Gutenberg's printing press, autonomous delivery drones by 2070, Dyatlov
Pass hiking mystery. Mechanical sections (III/V/VI/VII/VIII/IX/X/XI/XII/XIII)
are assembled from eng_templates.py's template engine."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 3)"
EXAM_IDX = 3
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  Before telephones or the internet existed, the postal service was the
2.  primary means by which people separated by distance exchanged news,
3.  conducted business, and maintained personal relationships. Ancient
4.  empires operated relay systems in which messengers on horseback carried
5.  official documents between stations spaced a day's ride apart, allowing
6.  urgent instructions to travel far faster than an ordinary traveler could
7.  manage alone.
8.      The modern postal service as most people recognize it emerged in the
9.  nineteenth century, when governments began offering affordable, uniform
10. rates regardless of distance. Before this reform, the cost of sending a
11. letter often depended on the number of sheets used and the distance
12. traveled, making regular correspondence expensive for ordinary citizens.
13. The introduction of the prepaid postage stamp simplified the system
14. enormously, since senders could now pay a fixed, low price in advance
15. rather than leaving payment to be negotiated upon delivery.
16.     Railways and steamships soon transformed how mail moved between
17. cities and across oceans. Sorting mail became a specialized skill,
18. performed by clerks who worked aboard traveling post offices, organizing
19. letters into destination bundles while the train was still in motion.
20. This constant sorting allowed mail delivered at a station to already be
21. arranged for the next leg of its journey, saving valuable time.
22.     In the twentieth century, airmail further accelerated long-distance
23. delivery, and postal services expanded their responsibilities to include
24. parcels, financial transfers, and even early forms of savings accounts
25. for citizens without access to banks. Many rural communities came to
26. rely on their local post office not just for mail, but as a source of
27. news and a meeting place for neighbors.
28.     Despite competition from email and private courier companies,
29. postal services continue to play an important role, particularly in
30. delivering parcels ordered online. Postal historians note that studying
31. how mail systems evolved offers valuable insight into how communication
32. technology repeatedly reshapes the pace and reach of daily life, long
33. before anyone imagined instant digital messaging."""

CLOZE_A = (
    "Printed information (11) __________ dramatically since the mid-15th century. Before movable "
    "type, every book had to be copied out by hand, a process that could take months. Around 1450, "
    "while Johannes Gutenberg (12) __________ on a way to cast individual metal letters quickly and "
    "reliably, he realized that reusable type could be arranged and rearranged for any text. He "
    "found that a wine-press mechanism, adapted for printing, (13) __________ ink onto paper "
    "evenly.\n\n"
    "Although he perfected the technique, mass literacy (14) __________ across Europe for another "
    "few centuries. It wasn't until public education expanded that widespread reading became "
    "common. It was estimated that within a few generations the invention (15) __________ how "
    "knowledge spread across the continent."
)
CLOZE_B = (
    "By the year 2070, the way we receive parcels (16) __________ beyond recognition. Currently, "
    "logistics companies (17) __________ to develop autonomous drones capable of delivering small "
    "packages directly to doorsteps. These drones (18) __________ to reduce delivery times in "
    "congested cities. However, some critics argue that such systems (19) __________ be too risky "
    "to operate near airports. If regulation keeps pace with the technology, experts predict that "
    "by mid-century, most local parcels (20) __________ by autonomous vehicles rather than human couriers."
)
CLOZE_C = (
    "In February 1959, a group of nine experienced hikers died mysteriously while crossing the "
    "Ural Mountains at a site later named Dyatlov Pass. Investigators believe the hikers "
    "(21) __________ their tent in extreme haste, as it was found cut open from the inside. Since "
    "several bodies showed unexplained injuries, some concluded that the group (22) __________ by "
    "a sudden avalanche during the night. Other theorists argued that the hikers (23) __________ by "
    "a nearby military test gone wrong. Whatever the truth, the exact cause of the tragedy "
    "(24) __________ officially confirmed, and the case remains one of the most debated mysteries "
    "in exploration history. Researchers continue to review the original case files. Unless new "
    "forensic evidence (25) __________, a definitive explanation may never emerge."
)
WORDFORM_PASSAGE = (
    "Co-working spaces have become common in cities with large numbers of freelance and remote "
    "workers. The (38) __________ behind these shared offices is to give independent professionals "
    "access to facilities they could not justify renting alone. Such spaces are especially "
    "(39) __________ in neighborhoods with high numbers of small startups.\n\n"
    "Operators must consider factors like noise control and reliable internet access to ensure "
    "long-term (40) __________. When shared spaces are managed (41) __________, members often "
    "report feeling more productive and less isolated.\n\n"
    "Studies suggest that co-working spaces can improve both (42) __________ collaboration and "
    "individual job satisfaction."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of the postal service")
    b.passage_mc(PASSAGE, "reading-3", RC_TOPIC, [
        (1, E, "According to the text, ancient relay messenger systems allowed",
         "urgent instructions to travel faster than a lone traveler could manage",
         ["letters to be delivered for a single fixed low price",
          "parcels to be sorted automatically without clerks",
          "mail to be transported mainly by steamship"],
         "Համեմատել relay-համակարգի նպատակը հետագա բարեփոխումների հետ:",
         ["Տողեր 4-7. հերթափոխային մեսենջերները թույլ էին տալիս հրահանգներին տարածվել ավելի արագ, քան մեկ ճամփորդ կկարողանար:"]),
        (2, M, "The pronoun this in line 20 stands for",
         "the constant sorting of mail during the journey",
         ["the invention of the postage stamp", "the expansion of railways", "the rise of email"],
         "Գտնել այն գործողությունը, որին վերաբերում է «this»-ը:",
         ["«This constant sorting allowed mail... to already be arranged» — «this» վերաբերում է նախորդ նախադասության շարունակական տեսակավորմանը:"]),
        (3, M, "According to paragraph 2 (lines 8-15), the prepaid postage stamp simplified the system by",
         "letting senders pay a fixed, low price in advance",
         ["eliminating the need for postal workers entirely",
          "making mail delivery instant across all distances",
          "requiring payment to be negotiated upon delivery"],
         "Փնտրել պարբերության մեջ նշված կոնկրետ բարեփոխումը:",
         ["Տողեր 13-15-ը ասում են, որ դրոշմանիշը թույլ էր տալիս նախապես վճարել ֆիքսված գնով:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"The modern postal service as most people recognize it emerged in the nineteenth century, '
         'when governments began offering affordable, uniform rates regardless of distance."',
         "Today's postal service took shape when governments made mailing prices fair and consistent.",
         ["The postal service has always charged the same fixed rate throughout history.",
          "Governments stopped regulating mail prices in the nineteenth century.",
          "The postal service became more expensive once uniform rates were introduced."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Նախադասությունն ասում է, որ ժամանակակից փոստը ձևավորվեց, երբ կառավարությունները սահմանեցին մատչելի, միասնական սակագներ:"]),
        (5, M, "How did railways affect mail sorting, according to the text?",
         "It allowed clerks to sort mail into destination bundles while the train was moving.",
         ["It made sorting unnecessary since mail went directly to homes.",
          "It slowed down mail delivery compared to horseback relay.",
          "It required mail to be sorted only after arrival at the final station."],
         "Համեմատել գնացքով փոստի կազմակերպումը հին եղանակների հետ:",
         ["Տողեր 17-21-ը նկարագրում են, թե ինչպես էին գործավարները տեսակավորում նամակները գնացքի ընթացքի ժամանակ:"]),
        (6, M, "The word enormously in line 14 may best be replaced by",
         "greatly",
         ["slightly", "rarely", "temporarily"],
         "«Enormously» = մեծապես, զգալիորեն:",
         ["«simplified the system enormously» — «enormously» = «greatly» (մեծապես):"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Postal services stopped playing any role once email became widespread.",
         ["Airmail accelerated long-distance delivery in the twentieth century.",
          "Some rural communities used their local post office as a meeting place.",
          "Postal services expanded to include parcels and financial transfers."],
         "Համեմատել յուրաքանչյուր տարբերակը եզրափակիչ պարբերության հետ:",
         ["Տողեր 28-30-ը ասում են, որ փոստային ծառայությունները շարունակում են կարևոր դեր խաղալ, ինչը հակասում է d) տարբերակին:"]),
        (8, E, "The word rely in line 26 is closest in meaning to",
         "depend",
         ["compete", "object", "hesitate"],
         "«Rely on» = կախված լինել, հենվել:",
         ["«came to rely on their local post office» — «rely» = «depend» (կախված լինել):"]),
        (9, M, "Paragraph 3 (lines 22-27) mainly",
         "describes how postal services expanded their role beyond simply delivering letters",
         ["argues that airmail should be discontinued",
          "explains the technical mechanics of sorting machines",
          "lists the exact dates when each postal reform occurred"],
         "Բացահայտել պարբերության հիմնական նպատակը:",
         ["Պարբերությունը թվարկում է ծանրոցներ, դրամական փոխանցումներ և խնայողական հաշիվներ՝ ցույց տալով դերի ընդլայնումը:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative and appreciative of the postal service's historical role",
         ["dismissive of the postal service's continued relevance",
          "purely statistical and technical",
          "critical of governments for regulating mail prices"],
         "Գնահատել հեղինակի վերաբերմունքը եզրափակիչ պարբերության հիման վրա:",
         ["Հեղինակը շեշտում է փոստի պատմական և շարունակական նշանակությունը, ինչը դրական, տեղեկատվական տոն է:"]),
    ])

    b.register_topic("cloze_topics", "Gutenberg printing press")
    b.passage_mc(CLOZE_A, "cloze-gutenberg", CLOZE_TOPIC, [
        (11, E, "Choose the right option for gap (11).", "has changed", ["changed", "is changing", "had changed"],
         "«Since the mid-15th century» պահանջում է Present Perfect:", ["«has changed» ցույց է տալիս ներկայի հետ կապված փոփոխություն:"]),
        (12, M, "Choose the right option for gap (12).", "was working", ["worked", "has been working", "had worked"],
         "Ֆոնային ընթացող գործողություն:", ["Past Continuous ցույց է տալիս ընթացիկ ֆոնային գործողություն:"]),
        (13, M, "Choose the right option for gap (13).", "was pressing", ["had been pressed", "has been pressed", "is pressed"],
         "Ընթացիկ գործընթաց անցյալում:", ["«was pressing» (Past Continuous, ակտիվ) ցույց է տալիս ընթացիկ գործընթաց:"]),
        (14, M, "Choose the right option for gap (14).", "wasn't achieved", ["hasn't been achieved", "is achieved", "had achieved"],
         "Կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive կոնկրետ, ավարտված անցյալի համար:"]),
        (15, H, "Choose the right option for gap (15).", "had transformed", ["was transformed", "had been transformed", "would be transformed"],
         "Ակտիվ սեռով Past Perfect:", ["«invention»-ը ենթական է ակտիվ իմաստով, ուստի՝ «had transformed»:"]),
    ])
    b.register_topic("cloze_topics", "autonomous delivery drones by 2070")
    b.passage_mc(CLOZE_B, "cloze-drones", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2070» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are striving", ["were striving", "have striven", "will have striven"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are striving»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be delivered", ["will deliver", "is delivered", "have delivered"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be delivered»:"]),
    ])
    b.register_topic("cloze_topics", "Dyatlov Pass hiking mystery")
    b.passage_mc(CLOZE_C, "cloze-dyatlov", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have left", ["should be left", "have to leave", "can leave"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա:", ["Modal Perfect «must have left»:"]),
        (22, M, "Choose the right option for gap (22).", "had been buried", ["had buried", "hasn't been buried", "wasn't burying"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been buried»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been affected", ["may affect", "may be affected", "has to affect"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been affected» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been", ["isn't", "hadn't been", "won't be"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been officially confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "emerges", ["doesn't emerge", "emerged", "will emerge"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "co-working spaces")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-3", WORDFORM_TOPIC, [
        (38, E, "Choose the word form that best fits gap (38).", "principle", ["principles", "principled", "principally"],
         "Եզակի ենթական պահանջում է եզակի գոյական:", ["«is»-ից առաջ եզակի գոյական՝ «principle»:"]),
        (39, M, "Choose the word form that best fits gap (39).", "common", ["commonly", "commonness", "uncommon"],
         "«Are especially ___» պահանջում է ածական:", ["«be + ածական» կառուցվածքում՝ «common»:"]),
        (40, M, "Choose the word form that best fits gap (40).", "sustainability", ["sustainable", "sustainably", "unsustainable"],
         "«Long-term ___» պահանջում է գոյական:", ["«ensure» բային հաջորդում է գոյական՝ «sustainability»:"]),
        (41, M, "Choose the word form that best fits gap (41).", "effectively", ["effective", "effectiveness", "ineffective"],
         "«Are managed ___» պահանջում է մակբայ:", ["Կրավորական բային բնութագրելու համար՝ մակբայ «effectively»:"]),
        (42, M, "Choose the word form that best fits gap (42).", "workplace", ["workplaces", "working", "worked"],
         "«___ collaboration» դիրքում գոյականից առաջ անհրաժեշտ է ածական-դեր կրող գոյական:", ["«workplace collaboration» կայուն կապակցություն է:"]),
    ])

    t.gen_section_iii(b, rng)
    t.gen_section_v(b, rng)
    t.gen_section_vi(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "renewable materials research (VII)")
    t.gen_wordbank(b, rng, 56, "Renewable materials research", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "coastal zoning reform (IX)")
    t.gen_wordbank(b, rng, 62, "Coastal zoning reform", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
