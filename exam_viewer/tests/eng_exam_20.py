# -*- coding: utf-8 -*-
"""English mock exam #20 (AEE-ENG-020). Reading: history of paper currency.
Cloze: Hedy Lamarr/frequency-hopping, algae-based biofuel by 2065, the Baghdad Battery mystery."""
import random
from eng_common import E, M, H
import eng_templates as t

TITLE = "Միասնական քննություն — Անգլերեն (թեստ 20)"
EXAM_IDX = 20
RC_TOPIC = "Ընթերցանության ըմբռնում"
CLOZE_TOPIC = "Քերականական լրացում (ժամանակաձևեր)"
WORDFORM_TOPIC = "Բառակազմություն"

PASSAGE = """Line number

1.  For most of recorded history, money took the form of coins made
2.  from precious metals, valuable precisely because the metal itself
3.  carried worth regardless of who issued it.
4.      Carrying large sums of metal coins over long distances,
5.  however, proved heavy, cumbersome, and dangerous, since a robbed
6.  traveler lost everything at once.
7.      The earliest paper money emerged as a practical solution to
8.  this problem. Merchants deposited coins with a trusted authority in
9.  exchange for a paper receipt, which could then be carried easily and
10. exchanged for the deposited coins upon return.
11.     This system relied entirely on trust. A paper note held value
12. only because everyone agreed that it could reliably be exchanged
13. for a fixed amount of metal whenever the holder wished.
14.     Governments eventually recognized the advantages of printed
15. currency and began issuing it directly, though early experiments
16. sometimes failed catastrophically when authorities printed far more
17. notes than they could back with actual metal reserves.
18.     Such episodes of runaway inflation taught hard lessons about
19. the dangers of printing currency without sufficient backing,
20. lessons that shaped monetary policy for centuries afterward.
21.     For a long period, most paper currencies remained tied directly
22. to a fixed quantity of gold or silver, a system intended to prevent
23. governments from printing money without limit.
24.     During the twentieth century, most nations abandoned this
25. direct link entirely, allowing currency values to be determined by
26. broader economic factors rather than a fixed metal reserve.
27.     Modern banknotes now include intricate designs, embedded
28. threads, and color-shifting ink specifically to prevent
29. counterfeiting, a challenge that has existed since paper money was
30. first introduced.
31.     Despite the rise of digital payments, physical currency remains
32. in daily use worldwide, valued for its simplicity and universal
33. acceptance even where technology is unreliable.

"""

CLOZE_A = (
    "Before Hedy Lamarr's invention, radio-guided torpedoes (11) __________ properly protected against "
    "enemy jamming because they transmitted on a single, easily blocked frequency. While collaborating "
    "with composer George Antheil during wartime, Lamarr (12) __________ that rapidly switching between "
    "many frequencies could prevent an enemy from jamming the signal. She proposed that this "
    "frequency-hopping technique (13) __________ make guided weapons far more difficult to disrupt.\n\n"
    "Although the technology faced years of military skepticism, frequency-hopping (14) __________ by "
    "engineers within a few decades of her patent. Today it is estimated that the technique "
    "(15) __________ modern wireless communication significantly since it was first adapted for "
    "civilian use."
)
CLOZE_B = (
    "By 2065, the way transportation fuel is produced for many industries (16) __________ dramatically "
    "due to algae-based biofuel technology. Currently, researchers (17) __________ to refine strains of "
    "algae that produce oil more efficiently under artificial light. These systems (18) __________ to "
    "reduce dependence on fossil fuels without competing with food crops for farmland. However, some "
    "critics argue that the technology (19) __________ still be too costly to scale globally. If "
    "production efficiency continues to improve, experts predict that by the end of the century, a "
    "significant share of transportation fuel (20) __________ from algae rather than petroleum."
)
CLOZE_C = (
    "Discovered near Baghdad in the twentieth century, a small clay jar containing a copper cylinder "
    "and an iron rod has led some researchers to suggest it may have functioned as a simple "
    "electrochemical cell. Investigators believe the object (21) __________ by ancient craftsmen for an "
    "unknown practical or ceremonial purpose. Because the components resemble a basic battery when "
    "filled with an acidic liquid, some concluded that the jar (22) __________ by artisans for "
    "electroplating small decorative objects. Other theorists argued that the jar (23) __________ by "
    "scribes simply as a container for storing sacred scrolls. Whatever the truth, the object's true "
    "function (24) __________ officially by archaeologists, despite decades of laboratory testing. "
    "Unless a similar object with clear context (25) __________, the debate may never be resolved."
)
WORDFORM_PASSAGE = (
    "Neighborhood plant nurseries have opened in areas where residents want affordable access to "
    "seedlings for home gardens. Their central (38) __________ is to propagate native and edible plants "
    "that members can purchase at low cost or trade for seeds of their own.\n\n"
    "Such nurseries prove especially (39) __________ in neighborhoods where commercial garden centers "
    "remain far away or expensive.\n\n"
    "Volunteers who run these nurseries must track watering schedules and seasonal planting windows to "
    "ensure long-term (40) __________. Where nurseries are organized (41) __________, members typically "
    "find healthy seedlings ready whenever planting season begins.\n\n"
    "Researchers note that neighborhood nurseries can strengthen both community (42) __________ and "
    "local food security."
)


def build(b, seed_offset=13):
    rng = random.Random(EXAM_IDX * 97 + seed_offset)

    b.register_topic("reading_topics", "history of paper currency")
    b.passage_mc(PASSAGE, "reading-20", RC_TOPIC, [
        (1, E, "According to the text, for most of recorded history, money took the form of",
         "coins made from precious metals",
         ["paper receipts issued by merchants", "digital records stored electronically",
          "stone tablets carved with symbols"],
         "Փնտրել առաջին պարբերության հիմնական պնդումը:",
         ["Տողեր 1-2. «money took the form of coins made from precious metals»:"]),
        (2, M, "The pronoun it in line 12 stands for",
         "a paper note", ["a trusted authority", "the deposited coins", "a robbed traveler"],
         "Գտնել այն գոյականը, որին վերաբերում է դերանունը:",
         ["«A paper note held value only because everyone agreed that it could be exchanged» — «it» վերաբերում է «a paper note»-ին:"]),
        (3, M, "According to paragraph 3 (lines 7-10), the earliest paper money emerged as",
         "a receipt given in exchange for coins deposited with a trusted authority",
         ["a government-issued currency backed by nothing", "a form of decorative art with no monetary use",
          "a replacement for all metal coins immediately"],
         "Փնտրել պարբերության մեջ նշված սկզբնական գործառույթը:",
         ["Տողեր 7-10-ը նկարագրում են այս գործընթացը:"]),
        (4, E, 'Which of the sentences gives the main idea of the following sentence?\n'
         '"Such episodes of runaway inflation taught hard lessons about the dangers of printing '
         'currency without sufficient backing."',
         "Runaway inflation showed governments the risks of printing money without enough backing to support it.",
         ["Runaway inflation proved that printing unlimited currency was always safe.", "These episodes had no lasting effect on monetary policy.",
          "Governments learned that gold backing was completely unnecessary."],
         "Բացահայտել նախադասության հիմնական պնդումը:",
         ["Անվերահսկելի գնաճը ցույց տվեց արժույթի տպագրման վտանգները առանց բավարար ապահովման:"]),
        (5, M, "According to the text, during the twentieth century, most nations",
         "abandoned the direct link between currency and a fixed metal reserve",
         ["returned entirely to using metal coins", "banned the use of paper currency completely",
          "fixed their currencies permanently to gold"],
         "Փնտրել 6-րդ պարբերության հիմնական պնդումը:",
         ["Տողեր 24-26-ը նկարագրում են այս փոփոխությունը:"]),
        (6, M, "The word cumbersome in line 5 may best be replaced by",
         "difficult to carry or handle because of size or weight",
         ["extremely valuable and rare", "brightly decorated and colorful", "quickly and easily exchanged"],
         "«Cumbersome» = ծանրաշարժ, դժվար կրելի:",
         ["«proved heavy, cumbersome, and dangerous» — «cumbersome» = «difficult to carry or handle»:"]),
        (7, H, "Which of the following statements is NOT true according to the text?",
         "Modern banknotes include no special features to prevent counterfeiting.",
         ["Early paper money began as a receipt for deposited coins.", "Runaway inflation occurred when notes exceeded metal reserves.",
          "Physical currency remains in daily use despite digital payments."],
         "Համեմատել յուրաքանչյուր տարբերակը տեքստի հետ:",
         ["Տողեր 27-29-ը ասում են, որ ժամանակակից թղթադրամներն ունեն կեղծարարությունը կանխող առանձնահատկություններ, ինչը հակասում է a) տարբերակին:"]),
        (8, M, "The word catastrophically in line 16 is closest in meaning to",
         "in a way that causes extreme or disastrous harm",
         ["in a slow and gradual manner", "in a way that benefits everyone equally", "in a way that is barely noticeable"],
         "«Catastrophically» = աղետալիորեն:",
         ["«sometimes failed catastrophically» — «catastrophically» = «in a way that causes extreme harm»:"]),
        (9, M, "Paragraph 10 (lines 27-30) mainly",
         "describes modern anti-counterfeiting features included in banknotes",
         ["argues that banknotes should be abolished entirely", "explains the exact ink formula used in printing",
          "lists every country that has experienced counterfeiting"],
         "Բացահայտել պարբերության հիմնական թեման:",
         ["Պարբերությունը նկարագրում է ժամանակակից թղթադրամների կեղծարարությունը կանխող առանձնահատկությունները:"]),
        (10, M, "The overall tone of the text can best be described as",
         "informative, tracing paper currency's evolution from a trust-based receipt to a secured modern banknote",
         ["dismissive of paper currency's continued relevance", "purely technical with no historical context",
          "alarmed about the risks of digital payments"],
         "Գնահատել հեղինակի վերաբերմունքը ամբողջ տեքստի հիման վրա:",
         ["Հեղինակը տեղեկատվական ձևով հետևում է թղթադրամի էվոլյուցիային:"]),
    ])

    b.register_topic("cloze_topics", "hedy lamarr and frequency-hopping")
    b.passage_mc(CLOZE_A, "cloze-lamarr", CLOZE_TOPIC, [
        (11, H, "Choose the right option for gap (11).", "had not been", ["was not being", "have not been", "did not understand"],
         "Անցյալից առաջ ընթացող չեզոքացված գործողություն, կրավորական:", ["Past Perfect Passive՝ «had not been properly protected»:"]),
        (12, E, "Choose the right option for gap (12).", "realized", ["was realizing", "has realized", "had realized"],
         "Հաջորդական գործողություն անցյալում, պարզ ձև:", ["Past Simple՝ «realized»:"]),
        (13, M, "Choose the right option for gap (13).", "would", ["will", "is", "had"],
         "Անուղղակի ապագա անցյալի մեջ («proposed that»):", ["Reported-speech backshift՝ «would make»:"]),
        (14, M, "Choose the right option for gap (14).", "was adopted", ["adopted", "has been adopted", "is adopted"],
         "Կրավորական, կոնկրետ ավարտված անցյալ ժամանակահատված:", ["Past Simple Passive՝ «was adopted»:"]),
        (15, H, "Choose the right option for gap (15).", "has shaped", ["shaped", "had shaped", "was shaping"],
         "«Since» պահանջում է Present Perfect:", ["«since it was first adapted for civilian use» → Present Perfect՝ «has shaped»:"]),
    ])
    b.register_topic("cloze_topics", "algae-based biofuel production by 2065")
    b.passage_mc(CLOZE_B, "cloze-algaebiofuel", CLOZE_TOPIC, [
        (16, M, "Choose the right option for gap (16).", "will have changed", ["has changed", "is changing", "will be changing"],
         "Ապագայում ավարտված գործողություն՝ Future Perfect:", ["«By 2065» պահանջում է Future Perfect:"]),
        (17, E, "Choose the right option for gap (17).", "are working", ["were working", "have worked", "will have worked"],
         "«Currently» ցույց է տալիս ընթացիկ գործողություն:", ["Present Continuous՝ «are working»:"]),
        (18, M, "Choose the right option for gap (18).", "are designed", ["designed", "have designed", "had designed"],
         "Ընդհանուր նպատակի կրավորական նկարագրություն:", ["Present Simple Passive՝ «are designed to»:"]),
        (19, M, "Choose the right option for gap (19).", "might", ["has to", "are allowed", "ought"],
         "Թույլ հավանականություն:", ["«might» — թույլ ենթադրություն, «critics argue» համատեքստում:"]),
        (20, H, "Choose the right option for gap (20).", "will be sourced", ["will source", "is sourced", "have sourced"],
         "Ապագայում կանխատեսվող կրավորական գործողություն:", ["Future Simple Passive՝ «will be sourced»:"]),
    ])
    b.register_topic("cloze_topics", "the baghdad battery mystery")
    b.passage_mc(CLOZE_C, "cloze-baghdadbattery", CLOZE_TOPIC, [
        (21, H, "Choose the right option for gap (21).", "must have been made", ["should be made", "have to make", "can make"],
         "Հանգիստ եզրակացություն ապացույցի հիման վրա, կրավորական:", ["Modal Perfect Passive՝ «must have been made»:"]),
        (22, M, "Choose the right option for gap (22).", "had been used", ["had used", "hasn't been used", "wasn't using"],
         "Կրավորական, նախաանցյալ գործողություն:", ["Past Perfect Passive՝ «had been used»:"]),
        (23, M, "Choose the right option for gap (23).", "might have been used", ["may use", "may be used", "has to use"],
         "Անվստահ ենթադրություն անցյալի մասին:", ["«might have been used» — մոդալ + Perfect Passive Infinitive:"]),
        (24, M, "Choose the right option for gap (24).", "hasn't been confirmed", ["isn't confirmed", "hadn't been confirmed", "won't be confirmed"],
         "Շարունակվող անորոշություն մինչև հիմա:", ["Present Perfect Passive, ժխտական՝ «hasn't been confirmed»:"]),
        (25, H, "Choose the right option for gap (25).", "is found", ["isn't found", "aren't found", "will be found"],
         "«Unless» պայմանական նախադասության մեջ Present Simple:", ["«Unless» պահանջում է Present Simple, ոչ Future:"]),
    ])

    b.register_topic("wordform_topics", "neighborhood plant nurseries")
    b.passage_mc(WORDFORM_PASSAGE, "wordform-20", WORDFORM_TOPIC, [
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
    b.register_topic("wordbank_topics", "small-scale hydropower cooperative programs (vii)")
    t.gen_wordbank(b, rng, 56, "Small-scale hydropower cooperative programs", EXAM_IDX, frame_idx=0)
    t.gen_section_viii(b, EXAM_IDX)
    b.register_topic("wordbank_topics", "youth radio broadcasting workshops (ix)")
    t.gen_wordbank(b, rng, 62, "Youth radio broadcasting workshops", EXAM_IDX, frame_idx=1)
    t.gen_section_x(b, rng, EXAM_IDX)
    t.gen_section_xi(b, rng, EXAM_IDX)
    t.gen_section_xii(b, rng, EXAM_IDX)
    t.gen_section_xiii(b, rng, EXAM_IDX)
