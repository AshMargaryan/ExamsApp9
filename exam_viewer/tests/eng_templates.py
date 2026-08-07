# -*- coding: utf-8 -*-
"""
Parameterized template engine for the mechanical sections of the English
mock exams (grammar MC, flaw-detection multi-statement, vocab/sentence
matching, word-bank cloze). Each template is verified-correct by
construction (the grammar rule is fixed; only lexical filler varies), so
calling a template with a different `rng` seed produces a fresh, still-
correct item instead of hand-typing every sentence. Reading passages and
cloze narratives are NOT templated here (real prose still needs a human).
"""
import random

GRAMMAR_TOPIC = "Քերականական ընտրություն"
COMPLEX_TOPIC = "Բարդ նախադասության կառուցվածք"
REPORTED_TOPIC = "Անուղղակի խոսք"
QFORM_TOPIC = "Հարցական նախադասություններ"
ODDWORD_TOPIC = "Ավելորդ բառի հայտնաբերում"
PASSIVE_TOPIC = "Կրավորական սեռ"
VOCAB_TOPIC = "Բառապաշար (համապատասխանեցում)"
SENTMATCH_TOPIC = "Նախադասությունների միավորում"
WORDBANK_TOPIC = "Բառապաշարի լրացում"
ARM_LOCAL = "ԱԲԳԴԵԶԷԸԹԺ"

# ---------------------------------------------------------------------- pools
PEOPLE = ["the manager", "the professor", "the coach", "the analyst", "the pilot", "the editor",
          "the architect", "the surgeon", "the diplomat", "the curator", "the technician", "the chef",
          "the librarian", "the accountant", "the biologist", "the journalist", "the electrician",
          "the choreographer", "the geologist", "the paramedic", "the translator", "the zookeeper",
          "the referee", "the florist", "the locksmith", "the cartographer", "the beekeeper", "the notary", "the historian", "the botanist", "the sommelier", "the upholsterer", "the taxidermist", "the falconer", "the glassblower", "the vintner", "the arborist", "the calligrapher", "the puppeteer", "the blacksmith", "the cobbler", "the milliner", "the potter", "the astronomer", "the seismologist", "the cryptographer", "the entomologist", "the ornithologist", "the ecologist", "the meteorologist", "the archaeologist", "the paleontologist", "the numismatist", "the appraiser", "the cellist", "the violinist", "the sculptor", "the illustrator", "the stagehand", "the projectionist", "the sound engineer", "the lighting designer", "the set designer"]
PLACES = ["the terminal", "the campus", "the workshop", "the clinic", "the archive", "the studio",
          "the depot", "the observatory", "the warehouse", "the theatre", "the greenhouse", "the vineyard",
          "the shipyard", "the quarry", "the aquarium", "the mill", "the foundry", "the orchard",
          "the hangar", "the sanctuary", "the courthouse", "the refinery", "the cannery", "the atelier", "the boathouse", "the granary", "the tannery", "the smokehouse", "the brewery", "the distillery", "the armory", "the conservatory", "the arboretum", "the apiary", "the kiln", "the forge", "the dockyard", "the switchyard", "the hatchery", "the reservoir", "the substation", "the silo", "the stockroom", "the annex", "the rotunda", "the amphitheater", "the pavilion", "the loft", "the cellar"]
EVENTS = ["the summit", "the audit", "the rehearsal", "the expedition", "the tournament", "the ceremony",
          "the negotiation", "the excavation", "the festival", "the trial run", "the fundraiser", "the briefing",
          "the inspection", "the referendum", "the seminar", "the pageant", "the internship", "the auction",
          "the residency", "the symposium", "the pilgrimage", "the recital", "the census", "the merger", "the workshop session", "the debate", "the vigil", "the parade", "the exhibition", "the retreat", "the hackathon", "the graduation", "the initiation", "the vernissage", "the screening", "the premiere", "the induction", "the coronation", "the tasting", "the harvest festival", "the regatta", "the marathon", "the caucus", "the tribunal", "the colloquium", "the site visit", "the muster", "the drill"]
THINGS = ["contract", "engine", "manuscript", "proposal", "vaccine", "prototype", "budget", "itinerary",
          "software", "harvest", "sculpture", "recording", "blueprint", "database", "treaty", "ledger",
          "antenna", "compass", "turbine", "tapestry", "algorithm", "manifesto", "spreadsheet", "circuit", "ventilator", "generator", "telescope", "microscope", "battery", "irrigation system", "filtration unit", "solar panel", "wind turbine", "prosthetic", "exoskeleton", "drone", "submersible", "satellite dish", "loom", "printing plate", "engraving", "mosaic", "chandelier", "violin", "clock mechanism", "gearbox", "transmission", "diagram", "harness", "coupling", "valve", "sensor array", "control panel", "hydraulic line", "circuit board", "converter", "regulator", "amplifier", "spool", "gauge", "bracket", "mounting frame"]

def pick(rng, pool, k=1):
    return rng.sample(pool, k) if k > 1 else rng.choice(pool)


# ============================================================ III/V GRAMMAR
# Each returns (question, correct, wrongs, hint, steps).

def tpl_need_gerund(rng):
    thing = pick(rng, THINGS)
    return (f"The old {thing} is falling apart; it __________.",
            "needs fixing", ["needs to fix", "need fixing", "needs to be fixing"],
            "«Need + գերունդ» ունի կրավորական իմաստ։",
            ["«needs fixing» = «needs to be fixed»; եզակի ենթակայի հետ՝ «needs»։"])

def tpl_besides(rng):
    p = pick(rng, PEOPLE)
    return (f'"Does {p} have any assistants besides the two interns?"\n"Yes, a part-time researcher too."'.replace("besides", "__________"),
            "besides", ["beside", "except", "apart to"],
            "«Besides» = «ի հավելումն», «beside» = «կողքին»։",
            ["Համատեքստը պահանջում է «ի հավելումն» իմաստ՝ «besides»։"])

def tpl_neither(rng):
    v = pick(rng, ["reviewed the draft", "signed the form", "tested the sample", "called the client",
                    "checked the figures", "confirmed the booking", "filed the report", "read the manual",
                    "updated the schedule", "approved the invoice", "packed the boxes", "labeled the samples",
                    "audited the accounts", "proofread the draft", "scheduled the meeting", "verified the address",
                    "backed up the files", "restocked the shelves", "calibrated the equipment", "archived the emails",
                    "inspected the wiring", "translated the document", "watered the plants", "sorted the mail",
                    "cleaned the equipment", "measured the room", "printed the tickets", "counted the inventory",
                    "reset the password", "notarized the papers"])
    return (f'"I haven\'t {v} yet."\n"__________."',
            "Neither have I", ["So haven't I", "Neither I have", "Nor haven't I"],
            "Բացասական համաձայնություն՝ «Neither + auxiliary + subject»։",
            ["Ճիշտ կառուցվածքն է «Neither have I»։"])

def tpl_how_far(rng):
    pl = pick(rng, PLACES)
    return (f'"How far is {pl} from here?"\n"Just a short walk away."'.replace("How far", "__________"),
            "How far", ["How long", "How fast", "How much"],
            "Հեռավորության հարցում՝ «How far»։",
            ["Պատասխանը հեռավորության մասին է, ուստի՝ «How far»։"])

def tpl_wish_adverb(rng):
    v = pick(rng, ["paint", "negotiate", "translate", "improvise", "present", "cook",
                    "sketch", "juggle", "narrate", "sculpt", "debate", "sing"])
    p = pick(rng, PEOPLE)
    return (f"I wish I could {v} __________ as {p} does.",
            "as skillfully", ["as skillful", "more skillful", "much more skillful"],
            "«As + մակբայ + as» պահանջում է մակբայ, ոչ ածական։",
            ["Բային բնութագրելու համար պետք է մակբայ՝ «as skillfully as»։"])

def tpl_as_usual(rng):
    p = pick(rng, PEOPLE)
    ev = pick(rng, EVENTS)
    return (f"{p.capitalize()} arrived late again to {ev} __________, frustrating the whole team.",
            "as usual", ["usually", "as usually", "like usual"],
            "«As usual» ֆիքսված արտահայտություն է։",
            ["«As usual» կայուն է, «usually» չի հետևում «as»-ին։"])

def tpl_number_of(rng):
    thing = pick(rng, ["complaints filed", "errors detected", "applicants shortlisted", "delays reported",
                        "permits issued", "claims submitted", "requests approved", "incidents logged",
                        "contracts renewed", "volunteers registered"])
    pl = pick(rng, PLACES)
    return (f"__________ {thing} at {pl} this quarter has grown steadily.",
            "The number of", ["The numbers of", "A number of", "Number of"],
            "«The number of + հոգնակի» ենթարկվում է եզակի բային։",
            ["«The number of» համաձայնեցվում է եզակի բայի հետ («has grown»)։"])

def tpl_worried_about(rng):
    ev = pick(rng, EVENTS)
    return (f"The committee __________ the sudden delay to {ev}.",
            "is worried about", ["are worried because", "is worried as", "have worried in"],
            "«Committee» հավաքական գոյական է, «worried about» կայուն կապակցություն է։",
            ["«be worried about» ճիշտ նախդրային կապակցությունն է։"])

def tpl_used_to(rng):
    belief = pick(rng, ["the earth was flat", "metals could turn into gold", "diseases spread through bad air",
                         "the sun orbited the earth", "heavier objects always fell faster",
                         "the brain's only role was cooling the blood", "comets predicted disasters",
                         "spontaneous generation produced living creatures"])
    who = pick(rng, ["many people", "most scholars", "ordinary citizens", "even trained physicians"])
    return (f"Before modern science, {who} __________ that {belief}.",
            "used to think", ["were used to think", "got used to think", "used to thinking"],
            "«Used to + հիմնական բայ» = անցյալի կրկնվող համոզմունք։",
            ["«used to think» ցույց է տալիս անցյալում տարածված համոզմունք։"])

def tpl_hard_time(rng):
    thing = pick(rng, THINGS)
    return (f'"Did she finish reviewing the {thing}?"\n"No, she is having __________ understanding it."',
            "a hard time", ["hard time", "hard times", "the hard time"],
            "«Have a hard time + գերունդ» միշտ անորոշ հոդվածով։",
            ["Ֆիքսված արտահայտություն է՝ «a hard time»։"])

def tpl_uncountable(rng):
    noun = pick(rng, ["luggage", "cutlery", "equipment", "furniture"])
    pl = pick(rng, PLACES)
    return (f"We need to buy __________ for {pl}.",
            f"a great deal of {noun}", [f"many new {noun}s", f"several {noun}s", f"a few {noun}"],
            f"«{noun.capitalize()}»-ը անհաշվելի գոյական է։",
            [f"«{noun}» անհաշվելի է, հոգնակի «-s» չի ընդունում։"])

def tpl_adverb_place(rng):
    subj = pick(rng, ["Flights", "Deliveries", "Trains", "Ferries"])
    pl = pick(rng, PLACES)
    return (f"{subj} from {pl} __________ depart on time, so arrive early.",
            "generally", ["in generally", "for general", "as general"],
            "«Generally» ինքնուրույն մակբայ է, առանց նախդրի։",
            ["Գործածվում է ուղղակիորեն, առանց նախդրի։"])

def tpl_inversion_only_after(rng):
    p = pick(rng, PEOPLE)
    return (f"Only after {p} left the room __________ the mistake in the figures.",
            "did we notice", ["we noticed", "we had noticed", "had noticed we"],
            "«Only after» սկզբում պահանջում է շրջված բառակարգ։",
            ["Սահմանափակող դարձվածքով սկսվող նախադասությունը պահանջում է «did we notice»։"])

def tpl_in_addition_to(rng):
    ev = pick(rng, EVENTS)
    return (f"__________ organizing {ev}, she also handles the budget.",
            "In addition to", ["Furthermore", "Besides from", "Except to"],
            "«In addition to + գերունդ» կապակցող արտահայտություն է։",
            ["«In addition to» ընդունում է գերունդ։"])

def tpl_as_though(rng):
    p = pick(rng, PEOPLE)
    return (f"{p.capitalize()} spoke about the plan __________ it had already succeeded.",
            "as though", ["because of", "so that", "even so"],
            "«As though» ներմուծում է ենթադրական համեմատություն։",
            ["«As though» = «կարծես թե»։"])

def tpl_unless_passive(rng):
    thing = pick(rng, THINGS)
    return (f"The {thing} cannot be finalized __________.",
            "unless approved by the board", ["while it will be approved by the board", "until the board won't approve it", "if not by the board approved"],
            "«Unless + past participle» կրավորական էլիպսիս է։",
            ["«unless approved by the board» = «unless it is approved by the board»։"])

def tpl_whose(rng):
    p = pick(rng, PEOPLE)
    return (f"{p.capitalize()} __________ proposal won the grant will speak at the ceremony.",
            "whose", ["who", "whom", "which"],
            "Անհրաժեշտ է ստացական հարաբերական դերանուն։",
            ["«whose» ցույց է տալիս պատկանելություն։"])

def tpl_throughout(rng):
    ev = pick(rng, EVENTS)
    pl = pick(rng, PLACES)
    return (f"__________ {ev}, {pl} remained fully staffed.",
            "Throughout", ["While", "Since", "Between"],
            "«Throughout + ժամանակահատված» = «ամբողջ ընթացքում»։",
            ["Նախդիր է, հաջորդում է գոյական։"])

def tpl_on_the_contrary(rng):
    p = pick(rng, PEOPLE)
    return (f"{p.capitalize()} didn't reject the offer. __________, they expanded it considerably.",
            "On the contrary", ["However", "Yet", "Nonetheless"],
            "«On the contrary» ընդգծում է ուղիղ հակադրություն։",
            ["Օգտագործվում է, երբ երկրորդ նախադասությունն ուղիղ հակառակն է հաստատում։"])

def tpl_all_that(rng):
    thing = pick(rng, THINGS)
    return (f"All __________ about the {thing} is that it was delivered late.",
            "that I know", ["which I know", "what I don't know", "of which I know"],
            "«All that + ենթակա + բայ» կայուն կառուցվածք է։",
            ["«All that I know is that...» ամրագրված կառուցվածք է։"])

GRAMMAR_TEMPLATES_MEDIUM = [tpl_need_gerund, tpl_besides, tpl_neither, tpl_wish_adverb, tpl_as_usual,
                            tpl_number_of, tpl_worried_about, tpl_used_to, tpl_hard_time, tpl_uncountable]
GRAMMAR_TEMPLATES_EASY = [tpl_how_far, tpl_adverb_place]
COMPLEX_TEMPLATES = [tpl_inversion_only_after, tpl_in_addition_to, tpl_as_though, tpl_unless_passive,
                     tpl_whose, tpl_throughout, tpl_on_the_contrary, tpl_all_that]


def _gen_mc_no_dupe(b, rng, tpl, n, topic, diff):
    """Call tpl(rng) and retry (fresh random words) up to 25x if the resulting
    question text already exists in the registry or earlier in this exam."""
    for _ in range(25):
        q, correct, wrongs, hint, steps = tpl(rng)
        key = _norm_local(q)
        if key not in b.registry["single_choice"] and key not in b.new_topics["single_choice"]:
            break
    b.mc(n, topic, diff, q, correct, wrongs, hint, steps)


def gen_section_iii(b, rng, start_num=26):
    """12 grammar MC items (Section III), difficulty E/M mix."""
    import eng_common as ec
    pool = GRAMMAR_TEMPLATES_MEDIUM[:]
    rng.shuffle(pool)
    chosen = GRAMMAR_TEMPLATES_EASY + pool
    rng.shuffle(chosen)
    for i, tpl in enumerate(chosen):
        n = start_num + i
        diff = ec.E if tpl in GRAMMAR_TEMPLATES_EASY else ec.M
        _gen_mc_no_dupe(b, rng, tpl, n, GRAMMAR_TOPIC, diff)


def gen_section_v(b, rng, start_num=43):
    """8 grammar MC items (Section V), from COMPLEX_TEMPLATES, difficulty M/H."""
    import eng_common as ec
    chosen = COMPLEX_TEMPLATES[:]
    rng.shuffle(chosen)
    for i, tpl in enumerate(chosen[:8]):
        n = start_num + i
        diff = ec.H if i % 3 == 0 else ec.M
        _gen_mc_no_dupe(b, rng, tpl, n, COMPLEX_TOPIC, diff)


# ============================================================ XII/XIII BANKS
def _shuffle_options(rng, word_def_pairs, extra_defs):
    """word_def_pairs: list of (word, correct_def). extra_defs: distractor defs.
    Returns (lefts, right_defs) with targets recomputed after shuffling."""
    all_defs = [d for _, d in word_def_pairs] + list(extra_defs)
    order = list(range(len(all_defs)))
    rng.shuffle(order)
    shuffled = [all_defs[i] for i in order]
    lefts = [(word, shuffled.index(d) + 1) for word, d in word_def_pairs]
    return lefts, shuffled


VOCAB_SETS = [
    ([("Ambition", "a strong desire to achieve success or a particular goal"),
      ("Modesty", "the quality of not boasting about one's own achievements"),
      ("Deceit", "the act of making someone believe something that is not true"),
      ("Gratitude", "the feeling of being thankful for something")],
     ["the state of having no fixed opinion on a matter"]),
    ([("Landlord", "a person who owns property and rents it to others"),
      ("Tenant", "a person who pays to live in or use another person's property"),
      ("Broker", "a person who arranges deals between buyers and sellers for a fee"),
      ("Appraiser", "a person who estimates the value of property")],
     ["a person who designs the interior of buildings"]),
    ([("Versatile", "able to adapt to many different functions or situations"),
      ("Erratic", "not consistent or predictable in behavior"),
      ("Diligent", "showing care and effort in one's work or duties"),
      ("Complacent", "showing excessive satisfaction with one's own achievements")],
     ["having a strong, unpleasant smell"]),
    ([("Postpone", "to delay an event until a later time"),
      ("Enforce", "to make sure a law or rule is obeyed"),
      ("Anticipate", "to expect or predict that something will happen"),
      ("Compensate", "to give something to make up for a loss or damage")],
     ["to examine something in order to find hidden faults"]),
    ([("Compassion", "a strong feeling of sympathy for someone who is suffering"),
      ("Vanity", "excessive pride in one's own appearance or achievements"),
      ("Resentment", "bitter indignation at having been treated unfairly"),
      ("Contentment", "a state of peaceful happiness and satisfaction")],
     ["a sudden strong feeling of fear"]),
    ([("Wholesaler", "a business that sells goods in large quantities to retailers"),
      ("Retailer", "a business that sells goods directly to consumers"),
      ("Distributor", "a company that supplies goods to shops from a manufacturer"),
      ("Manufacturer", "a company that produces goods from raw materials")],
     ["a company that insures other businesses against loss"]),
    ([("Candid", "truthful and straightforward; frank"),
      ("Evasive", "avoiding giving a direct answer"),
      ("Articulate", "able to express thoughts and ideas clearly and effectively"),
      ("Pompous", "behaving in a way that is too serious and self-important")],
     ["showing great attention to small details"]),
    ([("Extract", "to remove or take out something, often with effort"),
      ("Distribute", "to give shares of something to a number of people"),
      ("Compile", "to collect information from different sources into one document"),
      ("Fabricate", "to invent false information in order to deceive")],
     ["to reduce the size or amount of something gradually"]),
    ([("Empathetic", "able to understand and share the feelings of others"),
      ("Apathetic", "showing no interest, enthusiasm, or concern"),
      ("Assertive", "confident and direct in stating one's opinions"),
      ("Timid", "lacking courage or confidence; easily frightened")],
     ["quick to become angry or irritated"]),
    ([("Subsidy", "money given by a government to help an industry or business"),
      ("Tariff", "a tax charged on goods imported from another country"),
      ("Surplus", "an amount left over after what is needed has been used"),
      ("Deficit", "the amount by which spending is greater than income")],
     ["the total value of goods produced within a country"]),
    ([("Ecosystem", "a community of living things interacting with their environment"),
      ("Habitat", "the natural home or environment of an animal or plant"),
      ("Extinction", "the state of a species having died out completely"),
      ("Migration", "the seasonal movement of animals from one region to another")],
     ["the process by which plants convert sunlight into energy"]),
    ([("Verdict", "the formal decision made by a jury in a court case"),
      ("Testimony", "a formal statement given as evidence in a court of law"),
      ("Plaintiff", "the person who brings a case against another in a court"),
      ("Defendant", "the person accused of a crime in a court of law")],
     ["a document that formally grants ownership of property"]),
    ([("Symmetry", "a balanced arrangement of parts on either side of a line"),
      ("Density", "the amount of mass contained in a given volume"),
      ("Velocity", "the speed of something in a given direction"),
      ("Friction", "the resistance one surface encounters when moving over another")],
     ["the ability of a material to return to its original shape"]),
    ([("Curriculum", "the subjects that make up a course of study"),
      ("Literacy", "the ability to read and write"),
      ("Tuition", "the fee charged for instruction, especially at a university"),
      ("Scholarship", "money awarded to a student to help pay for their education")],
     ["a formal test used to measure a student's knowledge"]),
    ([("Symptom", "a sign that indicates the presence of an illness"),
      ("Remedy", "a medicine or treatment for a disease or injury"),
      ("Immunity", "the body's ability to resist a particular infection"),
      ("Diagnosis", "the identification of an illness through examination")],
     ["a substance used to prevent infection in a wound"]),
    ([("Improvise", "to create or perform something without preparation"),
      ("Rehearse", "to practice a performance before presenting it publicly"),
      ("Compose", "to create a piece of music or writing"),
      ("Critique", "to give a detailed analysis and assessment of something")],
     ["to imitate someone's voice or manner for comic effect"]),
    ([("Diligent", "showing careful and persistent effort in one's work"),
      ("Frugal", "careful about spending money or using resources"),
      ("Impartial", "not favoring one side over another; fair"),
      ("Tenacious", "holding firmly to a purpose despite difficulty")],
     ["easily persuaded to change an opinion"]),
    ([("Middleman", "a person who arranges deals between producers and buyers"),
      ("Shareholder", "a person who owns shares in a company"),
      ("Creditor", "a person or company to whom money is owed"),
      ("Debtor", "a person or company that owes money")],
     ["a person who manages a company's public image"]),
    ([("Ambiguous", "open to more than one interpretation"),
      ("Redundant", "no longer needed; superfluous"),
      ("Coherent", "logical and consistent; easy to follow"),
      ("Concise", "expressed in few words; brief and clear")],
     ["difficult to understand because of poor organization"]),
    ([("Withhold", "to refuse to give something that is due"),
      ("Disclose", "to make information known publicly"),
      ("Allocate", "to distribute resources for a particular purpose"),
      ("Reimburse", "to pay back money that someone has spent")],
     ["to reduce something gradually over time"]),
    ([("Empathy", "the ability to understand and share another's feelings"),
      ("Skepticism", "an attitude of doubting claims without evidence"),
      ("Optimism", "a tendency to expect the best possible outcome"),
      ("Humility", "a modest view of one's own importance")],
     ["a strong feeling of pride in one's achievements"]),
    ([("Wholesale", "the selling of goods in large quantities to retailers"),
      ("Retail", "the selling of goods directly to consumers"),
      ("Franchise", "a license to operate a business under an established brand"),
      ("Merger", "the combination of two companies into a single organization")],
     ["a formal agreement to end a business partnership"]),
    ([("Volatile", "likely to change rapidly and unpredictably"),
      ("Static", "not moving or changing; stationary"),
      ("Resilient", "able to recover quickly from difficulties"),
      ("Fragile", "easily broken or damaged")],
     ["capable of being shaped or molded easily"]),
    ([("Prosecute", "to bring legal action against someone in court"),
      ("Acquit", "to declare someone not guilty of a crime"),
      ("Testify", "to give evidence as a witness in a court of law"),
      ("Convict", "to declare someone guilty of a criminal offense")],
     ["to postpone a court hearing to a later date"]),
    ([("Habitat", "the natural environment in which an organism lives"),
      ("Predator", "an animal that hunts other animals for food"),
      ("Camouflage", "coloring or patterns that help an animal blend in"),
      ("Migration", "the seasonal movement of animals between regions")],
     ["the process by which a species gradually changes over generations"]),
    ([("Enroll", "to register officially as a member or participant"),
      ("Graduate", "to complete a course of study successfully"),
      ("Withdraw", "to remove oneself from a course or program"),
      ("Audit", "to attend a course without receiving formal credit")],
     ["to repeat a course after failing it previously"]),
    ([("Prescribe", "to recommend a treatment or medicine formally"),
      ("Diagnose", "to identify the nature of an illness through examination"),
      ("Recover", "to return to a normal state of health"),
      ("Relapse", "to suffer a return of illness after improvement")],
     ["to prevent an illness before it develops"]),
    ([("Rehearsal", "a practice session before a public performance"),
      ("Improvisation", "a performance created spontaneously without preparation"),
      ("Ensemble", "a group of musicians or performers who work together"),
      ("Repertoire", "the range of works a performer is prepared to present")],
     ["a written record of a musical composition"]),
    ([("Erode", "to gradually wear away by natural forces"),
      ("Conserve", "to protect something from harm or overuse"),
      ("Deplete", "to use up a resource until little remains"),
      ("Restore", "to bring something back to its original condition")],
     ["to increase the amount of something rapidly"]),
    ([("Delegate", "to give a task or responsibility to another person"),
      ("Supervise", "to oversee and direct the work of others"),
      ("Collaborate", "to work jointly with others on a task"),
      ("Micromanage", "to control every small detail of a task closely")],
     ["to avoid taking responsibility for a decision"]),
    ([("Inflation", "a general rise in prices across an economy"),
      ("Recession", "a period of temporary economic decline"),
      ("Surplus", "an amount of something left over after use"),
      ("Deficit", "the amount by which expenses exceed income")],
     ["the total value of goods and services produced annually"]),
    ([("Nomadic", "moving from place to place rather than settling"),
      ("Sedentary", "involving little physical movement; settled"),
      ("Indigenous", "originating naturally in a particular region"),
      ("Migratory", "moving periodically from one region to another")],
     ["belonging to a distant, unfamiliar culture"]),
    ([("Verify", "to confirm that something is true or accurate"),
      ("Falsify", "to alter information to make it false or misleading"),
      ("Corroborate", "to support a claim with additional evidence"),
      ("Speculate", "to form an opinion without firm evidence")],
     ["to reveal a secret unintentionally"]),
    ([("Petition", "a formal written request signed by many people"),
      ("Referendum", "a public vote on a single political question"),
      ("Amendment", "a formal change made to a law or document"),
      ("Legislation", "laws considered collectively")],
     ["a formal accusation brought against a public official"]),
    ([("Congested", "crowded to the point of difficulty moving"),
      ("Vacant", "empty; not occupied or in use"),
      ("Accessible", "able to be easily reached or entered"),
      ("Secluded", "hidden away from other people or places")],
     ["extremely busy with constant activity or noise"]),
    ([("Amplify", "to increase the strength or volume of something"),
      ("Dampen", "to reduce the intensity or force of something"),
      ("Filter", "to remove unwanted elements from something"),
      ("Distort", "to change the shape or sound of something unnaturally")],
     ["to combine two separate signals into one"]),
    ([("Fluent", "able to speak or write a language easily and accurately"),
      ("Bilingual", "able to speak two languages fluently"),
      ("Literate", "able to read and write"),
      ("Articulate", "able to express thoughts clearly and effectively")],
     ["unable to understand a spoken language"]),
    ([("Excavate", "to dig out earth to uncover something buried"),
      ("Preserve", "to keep something in its original state"),
      ("Restore", "to return something to an earlier good condition"),
      ("Catalogue", "to make an organized list of items")],
     ["to destroy evidence of a past civilization"]),
    ([("Transparent", "easy to see through, or open and honest"),
      ("Deceptive", "likely to mislead someone"),
      ("Candid", "truthful and direct in expressing opinions"),
      ("Evasive", "avoiding giving a direct answer")],
     ["completely unaware of the true situation"]),
    ([("Momentum", "the force gained by a moving object or process"),
      ("Inertia", "a tendency to remain unchanged or resist motion"),
      ("Velocity", "the speed of an object in a given direction"),
      ("Acceleration", "the rate at which speed increases over time")],
     ["the resistance encountered when moving through a fluid"]),
    ([("Innovative", "introducing new ideas or methods"),
      ("Conventional", "based on what is generally done or believed"),
      ("Obsolete", "no longer in use because something newer exists"),
      ("Pioneering", "being among the first to develop or use something")],
     ["temporarily out of order due to a technical fault"]),
    ([("Custody", "the legal right or duty to care for someone"),
      ("Litigation", "the process of taking legal action in court"),
      ("Jurisdiction", "the official power to make legal decisions"),
      ("Testimony", "a formal statement given as evidence")],
     ["a written agreement signed by two or more parties"]),
    ([("Sediment", "solid material that settles at the bottom of a liquid"),
      ("Erosion", "the gradual wearing away of rock or soil"),
      ("Deposition", "the process by which material is laid down"),
      ("Weathering", "the breaking down of rock by natural forces")],
     ["the sudden collapse of an underground cavity"]),
    ([("Subsidize", "to support financially, often using public funds"),
      ("Regulate", "to control an activity through rules"),
      ("Privatize", "to transfer ownership from government to private hands"),
      ("Nationalize", "to bring an industry under government control")],
     ["to divide a large company into smaller independent parts"]),
    ([("Perishable", "likely to decay or spoil quickly"),
      ("Durable", "able to withstand wear and last a long time"),
      ("Disposable", "designed to be thrown away after use"),
      ("Reusable", "able to be used again after initial use")],
     ["produced using only natural, unprocessed ingredients"]),
    ([("Assertive", "confident and direct in expressing opinions"),
      ("Passive", "accepting what happens without resistance"),
      ("Aggressive", "ready to attack or confront others"),
      ("Diplomatic", "skilled at handling sensitive situations tactfully")],
     ["easily influenced by the opinions of others"]),
    ([("Itinerary", "a planned route or schedule for a journey"),
      ("Layover", "a stop between two parts of a journey"),
      ("Excursion", "a short trip taken for pleasure"),
      ("Destination", "the place to which someone is traveling")],
     ["a document required to enter a foreign country"]),
    ([("Malnutrition", "a lack of proper nutrients in the diet"),
      ("Obesity", "a condition of having excess body fat"),
      ("Metabolism", "the chemical processes that maintain life"),
      ("Immunity", "the body's ability to resist infection")],
     ["a temporary loss of consciousness due to low blood pressure"]),
    ([("Deforestation", "the clearing of forests for other land uses"),
      ("Reforestation", "the planting of trees in a cleared area"),
      ("Desertification", "the process by which fertile land becomes desert"),
      ("Afforestation", "the establishment of forest where none existed before")],
     ["the gradual rise in average sea levels worldwide"]),
    ([("Autonomy", "the freedom to govern or act independently"),
      ("Sovereignty", "supreme authority over a territory"),
      ("Allegiance", "loyalty to a country, cause, or leader"),
      ("Diplomacy", "the management of relations between nations")],
     ["a formal declaration of war between two nations"]),
    ([("Illiterate", "unable to read or write"),
      ("Numerate", "having a good understanding of basic mathematics"),
      ("Multilingual", "able to speak several languages"),
      ("Autodidact", "a person who has taught themselves a subject")],
     ["a person who studies ancient historical documents"]),
    ([("Compulsory", "required by law or a rule"),
      ("Voluntary", "done willingly without being forced"),
      ("Mandatory", "required or commanded by authority"),
      ("Optional", "available as a choice but not required")],
     ["strictly forbidden under any circumstances"]),
    ([("Insomnia", "a persistent inability to fall asleep"),
      ("Fatigue", "extreme tiredness from mental or physical effort"),
      ("Stamina", "the ability to sustain prolonged physical effort"),
      ("Vitality", "the state of being strong, active, and full of energy")],
     ["a sudden, involuntary muscle contraction"]),
    ([("Bilateral", "involving two parties or sides"),
      ("Unilateral", "done by one party without agreement from others"),
      ("Multilateral", "involving more than two parties"),
      ("Neutral", "not supporting or helping either side in a conflict")],
     ["conducted secretly without the knowledge of other parties"]),
    ([("Fragmented", "broken into small, disconnected parts"),
      ("Unified", "brought together into a single whole"),
      ("Isolated", "separated from others; not connected"),
      ("Integrated", "combined so as to form a coordinated whole")],
     ["divided equally among a fixed number of groups"]),
    ([("Culinary", "relating to cooking or the kitchen"),
      ("Nutritious", "providing the nutrients needed for good health"),
      ("Palatable", "having a pleasant or acceptable taste"),
      ("Perishing", "suffering severely, often from cold or hunger")],
     ["prepared using methods passed down through generations"]),
    ([('Fastidious', 'showing great attention to detail; very careful and precise'), ('Rash', 'acting suddenly without thinking about the consequences'), ('Gregarious', 'fond of company; sociable'), ('Reticent', "not revealing one's thoughts or feelings readily")],
     ['feeling or showing deep and bitter anger']),
    ([('Bankruptcy', "the state of being unable to pay one's debts"), ('Monopoly', 'complete control of a market by a single company'), ('Revenue', 'income generated from business activities'), ('Overhead', 'the ongoing operating costs of running a business')],
     ['a sudden and temporary rise in prices']),
    ([('Photosynthesis', 'the process by which plants convert light into energy'), ('Symbiosis', 'a close relationship between two different organisms'), ('Mutation', 'a change in the genetic structure of an organism'), ('Dormant', 'temporarily inactive but capable of becoming active again')],
     ['the study of the physical structure of organisms']),
    ([('Subpoena', 'an official order requiring someone to attend court'), ('Perjury', 'the offense of lying under oath'), ('Indictment', 'a formal charge or accusation of a serious crime'), ('Injunction', 'a court order requiring a party to do or stop doing something')],
     ['the formal cancellation of a law or agreement']),
    ([('Allegory', 'a story with a hidden moral or political meaning'), ('Satire', "the use of humor to criticize people's mistakes or vices"), ('Protagonist', 'the main character in a story'), ('Narrative', 'a spoken or written account of events')],
     ['a brief pause in the middle of a performance']),
    ([('Biodiversity', 'the variety of plant and animal life in an area'), ('Pollutant', 'a substance that causes harm to the environment'), ('Renewable', 'able to be replenished naturally over time'), ('Emission', 'the release of a substance, especially a gas, into the air')],
     ['the process of turning waste into reusable material']),
    ([('Encrypt', 'to convert information into a code to prevent unauthorized access'), ('Bandwidth', 'the amount of data that can be transmitted in a fixed time'), ('Firmware', 'software programmed into a hardware device'), ('Algorithm', 'a set of rules followed to solve a problem or perform a task')],
     ['a device that converts one form of energy into another']),
    ([('Chronic', 'persisting for a long time or constantly recurring'), ('Sedative', 'a drug that calms or induces sleep'), ('Contagious', 'spread through direct or indirect contact'), ('Rehabilitate', 'to restore someone to health through treatment')],
     ['the surgical removal of an organ or tissue']),
    ([('Terrain', 'a stretch of land, especially with regard to its physical features'), ('Peninsula', 'a piece of land almost surrounded by water'), ('Archipelago', 'a group of many islands'), ('Elevation', 'the height of a place above sea level')],
     ['a narrow passage of water connecting two seas']),
    ([('Anxiety', 'a feeling of worry or unease about an uncertain outcome'), ('Nostalgia', 'a sentimental longing for the past'), ('Euphoria', 'a feeling of intense happiness or excitement'), ('Melancholy', 'a deep, persistent feeling of sadness')],
     ['a sudden and overwhelming feeling of fear']),
    ([('Aptitude', 'a natural ability to do something'), ('Plagiarism', "using someone else's work without giving them credit"), ('Tutorial', 'a period of individual instruction given by a tutor'), ('Accreditation', 'official recognition that a school meets certain standards')],
     ['a formal written test of knowledge']),
    ([('Humidity', 'the amount of moisture in the air'), ('Drought', 'a prolonged period of abnormally low rainfall'), ('Precipitation', 'water falling from clouds as rain, snow, or hail'), ('Turbulent', 'characterized by violent disturbance or disorder')],
     ['a sudden and violent gust of wind']),
    ([('Onboarding', 'the process of integrating a new employee into a company'), ('Appraisal', "a formal assessment of an employee's performance"), ('Probation', 'a trial period for a new employee'), ('Deadline', 'the latest time by which something must be completed')],
     ['a formal complaint made by an employee']),
    ([('Portfolio', 'a collection of financial investments'), ('Dividend', 'a sum of money paid regularly by a company to its shareholders'), ('Liability', 'a debt or financial obligation'), ('Collateral', 'property offered as security for a loan')],
     ["the total value of a company's shares on the stock market"]),
    ([('Obstinate', "stubbornly refusing to change one's opinion"), ('Astute', 'having sharp judgment; shrewd'), ('Naive', 'showing a lack of experience or judgment'), ('Prudent', 'acting with care and thought for the future')],
     ['showing great enthusiasm and eagerness']),
    ([('Frivolous', 'not having any serious purpose or value'), ('Punctilious', 'very careful and precise about details'), ('Nonchalant', 'appearing calm and unconcerned'), ('Vindictive', 'having a strong desire for revenge')],
     ['easily influenced or manipulated by others']),
    ([('Turnover', 'the rate at which employees leave and are replaced'), ('Outsourcing', 'hiring an outside company to perform a business function'), ('Leverage', 'the use of borrowed money to increase potential returns'), ('Equity', 'the value of ownership interest in a company')],
     ['the process of combining two companies into one']),
    ([('Osmosis', 'the movement of water through a membrane from low to high concentration'), ('Catalyst', 'a substance that speeds up a chemical reaction without being consumed'), ('Silt', 'fine solid material that settles at the bottom of a liquid'), ('Viscosity', 'the thickness or resistance to flow of a liquid')],
     ['the study of the origin and development of the universe']),
    ([('Arraignment', 'a hearing where a defendant is formally charged'), ('Bail', "money paid to secure a defendant's release before trial"), ('Precedent', 'a legal decision used as a guide for future cases'), ('Litigant', 'a person involved in a lawsuit')],
     ['a formal written agreement between two nations']),
    ([('Foreshadowing', 'a hint of events that will happen later in a story'), ('Irony', 'a contrast between expectation and reality'), ('Motif', 'a recurring idea or image in a work of art'), ('Climax', 'the most intense or important point in a story')],
     ['a short humorous story told to make a point']),
    ([('Runoff', 'rainwater that flows over land into rivers instead of soaking in'), ('Sequestration', 'the process of storing carbon dioxide to reduce its release'), ('Overgrazing', 'allowing livestock to eat vegetation faster than it can regrow'), ('Reclamation', 'the process of restoring land to a usable condition')],
     ['the practice of hunting endangered animals illegally']),
    ([('Interface', 'a point where two systems meet and interact'), ('Latency', 'the delay before a transfer of data begins'), ('Redundancy', 'the duplication of components to increase system reliability'), ('Throughput', 'the amount of data processed in a given time')],
     ['a program designed to damage or disable a computer']),
    ([('Prognosis', 'a forecast of the likely outcome of a disease'), ('Palliative', 'treatment intended to relieve pain rather than cure'), ('Epidemic', 'a widespread occurrence of a disease in a community'), ('Pathogen', 'an organism that causes disease')],
     ['a substance used to numb a specific area of the body']),
    ([('Isthmus', 'a narrow strip of land connecting two larger land areas'), ('Plateau', 'an area of flat land raised above the surrounding land'), ('Estuary', 'the wide part of a river where it meets the sea'), ('Tributary', 'a stream that flows into a larger river')],
     ['a deep and narrow valley with steep sides']),
    ([('Apprehension', 'a feeling of anxiety about something that might happen'), ('Serenity', 'the state of being calm and peaceful'), ('Indignation', 'anger caused by something unfair or unjust'), ('Bewilderment', 'a feeling of being confused or puzzled')],
     ["a strong feeling of pride in one's achievements"]),
    ([('Syllabus', 'an outline of the topics covered in a course'), ('Rubric', 'a set of criteria used to evaluate student work'), ('Cohort', 'a group of students who progress through a program together'), ('Remediation', 'additional instruction given to help a struggling student')],
     ['a formal ceremony marking the end of a course of study']),
    ([('Overcast', 'covered with clouds'), ('Squall', 'a sudden, violent gust of wind, often with rain or snow'), ('Barometric', 'relating to atmospheric pressure'), ('Sultry', 'hot and humid')],
     ['a period of unusually cold weather in a normally warm season']),
    ([('Amiable', 'friendly and pleasant in nature'), ('Belligerent', 'hostile and aggressive'), ('Cordial', 'warm and sincerely friendly'), ('Aloof', 'distant and not friendly or forthcoming')],
     ['having a strong desire to help others without expecting reward']),
    ([('Insolvency', 'the state of being unable to pay debts owed'), ('Arbitration', 'a method of resolving a dispute outside of court'), ('Antitrust', 'relating to laws that promote fair business competition'), ('Conglomerate', 'a large corporation formed from several smaller companies')],
     ['a formal agreement to delay repayment of a debt']),
    ([('Osmoregulation', 'the process by which an organism controls water balance'), ('Photoperiod', 'the length of time an organism is exposed to daylight'), ('Chlorophyll', 'the green pigment in plants that absorbs sunlight'), ('Transpiration', 'the release of water vapor from plant leaves')],
     ['the process by which cells divide to form new cells']),
    ([('Affidavit', 'a written statement made under oath'), ('Statute', 'a written law passed by a legislative body'), ('Bailiff', 'a court officer who keeps order during proceedings'), ('Tort', 'a wrongful act leading to legal liability')],
     ['a formal request submitted to a government official']),
    ([('Verisimilitude', 'the appearance of being true or real'), ('Denouement', "the final resolution of a story's plot"), ('Foil', 'a character who contrasts with another to highlight traits'), ('Anecdote', 'a short, entertaining account of a real event')],
     ['a long speech given by one character alone on stage']),
    ([('Aquifer', 'an underground layer of rock that holds groundwater'), ('Watershed', 'an area of land that drains into a particular body of water'), ('Permafrost', 'soil that remains frozen throughout the year'), ('Salinity', 'the concentration of salt in water or soil')],
     ['the gradual buildup of harmful chemicals in an ecosystem']),
    ([('Middleware', 'software that connects different applications or systems'), ('Scalability', 'the capacity of a system to handle increased demand'), ('Obsolescence', 'the state of becoming outdated and no longer used'), ('Interoperability', 'the ability of different systems to work together')],
     ['a program that automatically repairs corrupted files']),
    ([('Homeostasis', 'the maintenance of a stable internal environment in an organism'), ('Anesthesia', 'the loss of sensation induced for medical procedures'), ('Prophylaxis', 'treatment given to prevent disease before it occurs'), ('Convalescence', 'the gradual recovery of health after illness')],
     ['the sudden worsening of a chronic medical condition']),
    ([('Escarpment', 'a steep slope separating two relatively level areas of land'), ('Floodplain', 'flat land near a river that is subject to flooding'), ('Delta', 'a landform created where a river deposits sediment into a larger body of water'), ('Watershed divide', 'a ridge separating two adjacent drainage basins')],
     ['a deep underwater trench formed by tectonic activity']),
    ([('Complacency', 'a feeling of quiet satisfaction that prevents further effort'), ('Trepidation', 'a feeling of fear or anxiety about something that may happen'), ('Exuberance', 'a feeling of energetic enthusiasm and high spirits'), ('Wistfulness', 'a feeling of vague or regretful longing')],
     ['a sudden feeling of intense embarrassment']),
    ([('Formative assessment', 'an evaluation used during learning to guide instruction'), ('Summative assessment', 'an evaluation given at the end of a unit of study'), ('Differentiation', 'adjusting instruction to meet varied student needs'), ('Scaffolding', 'temporary support given to help a student master a skill')],
     ['a formal ceremony recognizing academic achievement']),
    ([('Squall line', 'a band of severe thunderstorms along or ahead of a cold front'), ('Dew point', 'the temperature at which air becomes saturated with moisture'), ('Isobar', 'a line on a weather map connecting points of equal pressure'), ('Front', 'the boundary between two air masses of different temperatures')],
     ['a sudden, brief period of extremely cold temperatures']),
    ([('Ambivalent', 'having mixed or contradictory feelings about something'), ('Detached', 'having no particular interest or concern'), ('Zealous', 'showing great energy or enthusiasm for a cause'), ('Dubious', 'having doubts about the truth of a claim')],
     ['feeling extremely tired after a long period of effort']),
    ([('Amortization', 'the gradual repayment of a debt through scheduled payments'), ('Depreciation', 'a reduction in the value of an asset over time'), ('Solvency', 'the ability of a company to meet its long-term debts'), ('Liquidity', 'the ease with which an asset can be converted to cash')],
     ['the total profit a company earns after all expenses are paid']),
    ([('Cryosphere', "the parts of Earth's surface where water is frozen"), ('Troposphere', "the lowest layer of Earth's atmosphere"), ('Stratosphere', 'the atmospheric layer above the troposphere'), ('Biosphere', 'the parts of Earth where living organisms exist')],
     ['the layer of Earth directly beneath the crust']),
    ([('Gerrymandering', 'redrawing electoral boundaries to favor one political group'), ('Filibuster', 'a tactic used to delay legislative action through prolonged debate'), ('Bicameral', 'a legislature consisting of two separate chambers'), ('Constituency', 'a group of voters represented by an elected official')],
     ['a formal agreement between two or more nations']),
    ([('Empirical', 'based on observation or experiment rather than theory'), ('Qualitative', 'relating to descriptive rather than numerical data'), ('Quantitative', 'relating to data that can be measured numerically'), ('Hypothesis', 'a proposed explanation that can be tested through investigation')],
     ['a conclusion drawn without any supporting evidence']),
    ([('Gentrification', 'the process by which a poor urban area becomes wealthier'), ('Zoning', 'government regulation of how land in an area may be used'), ('Infrastructure', 'the basic physical systems a community depends on'), ('Sprawl', 'the uncontrolled expansion of urban areas into the countryside')],
     ['a tax collected specifically to fund public schools']),
    ([('Dexterous', 'skillful in using the hands or body'), ('Cumbersome', 'difficult to carry or handle because of size or weight'), ('Ornate', 'elaborately decorated'), ('Rudimentary', 'basic or undeveloped')],
     ['capable of being folded into a very small space']),
    ([('Recidivism', 'the tendency of a convicted criminal to reoffend'), ('Deterrent', 'something that discourages a particular action'), ('Rehabilitation', 'the process of restoring someone to a useful role in society'), ('Incarceration', 'the state of being confined in prison')],
     ['a formal pardon granted by a head of state']),
    ([('Nomenclature', 'a system of names used in a particular field'), ('Taxonomy', 'the science of classifying living things into categories'), ('Morphology', 'the study of the form and structure of organisms'), ('Phylogeny', 'the evolutionary history and relationships of a species')],
     ['the study of how organisms interact with their environment']),
    ([('Underwriting', 'the process of assessing risk before issuing insurance'), ('Premium', 'the amount paid regularly for an insurance policy'), ('Actuary', 'a professional who calculates risk and insurance rates'), ('Indemnity', 'compensation for loss or damage')],
     ['a fixed payment made regardless of actual costs incurred']),
    ([('Colloquial', 'used in ordinary or familiar conversation rather than formal speech'), ('Pejorative', 'expressing contempt or disapproval'), ('Euphemism', 'a mild word substituted for a harsher or blunter one'), ('Idiom', 'an expression whose meaning cannot be understood from the individual words')],
     ['a word borrowed directly from another language']),
    ([('Sediment core', 'a cylindrical sample of layered material taken from the ground'), ('Stratum', 'a distinct layer of rock or soil'), ('Fossilization', 'the process by which organic remains become preserved as fossils'), ('Radiometric dating', 'a method of determining age using radioactive decay')],
     ['a tool used to measure the depth of a body of water']),
    ([('Bandwidth throttling', 'the deliberate slowing of internet speed by a provider'), ('Firewall', 'a system designed to block unauthorized network access'), ('Phishing', 'a fraudulent attempt to obtain sensitive information online'), ('Malware', 'software designed to damage or gain unauthorized access to a system')],
     ['a program that automatically translates text between languages']),
    ([('Vertigo', 'a sensation of spinning or dizziness'), ('Tinnitus', 'a ringing or buzzing sound heard in the ears'), ('Migraine', 'a severe headache often accompanied by nausea and light sensitivity'), ('Nausea', 'a feeling of sickness with an urge to vomit')],
     ['a temporary loss of consciousness caused by reduced blood flow']),
    ([('Meander', "a bend or curve in a river's course"), ('Oxbow lake', 'a curved lake formed when a river bend is cut off'), ('Confluence', 'the point where two rivers meet and join'), ('Headwater', 'the source or beginning of a river')],
     ['a narrow channel dug to redirect water for irrigation']),
    ([('Attrition', 'a gradual reduction in staff through resignation or retirement'), ('Nepotism', 'favoritism shown to relatives in hiring or promotion'), ('Meritocracy', 'a system where advancement is based on ability'), ('Severance', 'payment given to an employee upon dismissal')],
     ['a formal complaint filed against an employer']),
    ([('Cadence', 'the rhythm or rise and fall of a voice or sound'), ('Timbre', 'the distinctive quality of a musical sound'), ('Dissonance', 'a combination of sounds that seem harsh or unresolved'), ('Crescendo', 'a gradual increase in loudness')],
     ['a brief pause inserted between two musical phrases']),
    ([('Circumnavigate', 'to sail or travel all the way around something'), ('Latitude', 'the distance north or south of the equator'), ('Longitude', 'the distance east or west of a reference meridian'), ('Cartography', 'the practice of drawing or making maps')],
     ['the study of tides and their effect on coastlines']),
    ([('Inoculation', 'the introduction of a substance to build immunity'), ('Pathology', 'the study of the causes and effects of disease'), ('Antigen', 'a substance that triggers an immune response'), ('Antibody', 'a protein produced to fight a specific antigen')],
     ['a device used to measure blood pressure']),
    ([('Deforestation rate', 'the speed at which forested land is cleared'), ('Carbon sink', 'a natural system that absorbs more carbon than it releases'), ('Greenhouse effect', 'the trapping of heat in the atmosphere by certain gases'), ('Biomagnification', 'the increasing concentration of a substance up a food chain')],
     ['a chemical process used to purify drinking water']),
    ([('Provenance', "the origin or history of an object's ownership"), ('Authentication', 'the process of confirming something is genuine'), ('Forgery', 'an illegal copy or imitation of a genuine item'), ('Appraisal value', 'the estimated worth of an item determined by an expert')],
     ['a formal document transferring ownership of property']),
    ([('Ambient', 'relating to the immediate surroundings of something'), ('Acoustic', 'relating to sound or the sense of hearing'), ('Resonance', 'the reinforcement of sound by vibration'), ('Reverberation', 'the persistence of sound after its source has stopped')],
     ['a device used to measure the intensity of light']),
    ([('Tectonic plate', "a large section of Earth's crust that moves slowly over time"), ('Subduction', 'the process of one tectonic plate sliding beneath another'), ('Fault line', 'a fracture in rock where movement has occurred'), ('Magnitude', 'a measure of the energy released by an earthquake')],
     ['a device used to predict weather patterns several days in advance']),
    ([('Vernacular', 'the everyday language spoken by ordinary people in a region'), ('Dialect', 'a form of a language specific to a region or social group'), ('Lexicon', 'the vocabulary of a particular language or subject'), ('Syntax', 'the arrangement of words to form grammatical sentences')],
     ['a system of symbols used to represent sounds in writing']),
    ([('Overdraft', 'a withdrawal that exceeds the available balance in an account'), ('Collateralize', 'to secure a loan using an asset as a guarantee'), ('Escrow', 'money held by a third party until conditions are met'), ('Remittance', 'money sent, typically to another country')],
     ['a fee charged for late payment of a bill']),
    ([('Ossification', 'the process by which cartilage turns into bone'), ('Ligament', 'tough tissue connecting bones to other bones'), ('Tendon', 'tissue connecting muscle to bone'), ('Cartilage', 'flexible tissue found in joints and other body parts')],
     ['a fluid that lubricates and cushions the joints']),
    ([('Escarole', 'a leafy green vegetable related to chicory'), ('Fermentation', 'the chemical breakdown of a substance by microorganisms'), ('Marinate', 'to soak food in a seasoned liquid before cooking'), ('Render', 'to melt fat slowly out of meat')],
     ['a technique for preserving food using extreme cold']),
    ([('Bilateral treaty', 'a formal agreement between exactly two nations'), ('Ratification', 'the formal approval of an agreement by a governing body'), ('Sanctions', 'penalties imposed by one country against another'), ('Embassy', 'the official residence of a diplomatic mission')],
     ['a temporary suspension of hostilities between opposing forces']),
    ([('Permaculture', 'an approach to agriculture that mimics natural ecosystems'), ('Monoculture', 'the cultivation of a single crop over a wide area'), ('Crop rotation', 'the practice of growing different crops in sequence on the same land'), ('Fallow', 'left unplanted to allow soil to recover')],
     ['the practice of removing weeds by hand rather than chemically']),
    ([('Malleable', 'capable of being shaped or bent without breaking'), ('Brittle', 'hard but liable to break easily'), ('Ductile', 'capable of being drawn into a thin wire'), ('Corrosive', 'capable of gradually destroying a material through chemical action')],
     ['capable of conducting electricity efficiently']),
    ([('Choreography', 'the sequence of steps and movements in dance'), ('Ensemble cast', 'a group of actors given roughly equal importance'), ('Understudy', 'a performer who learns a role to replace the lead if needed'), ('Blocking', "the precise staging of actors' movements in a scene")],
     ['a written record of every line spoken during a rehearsal']),
    ([('Cognitive bias', 'a systematic pattern of deviation from rational judgment'), ('Confirmation bias', 'the tendency to favor information that confirms existing beliefs'), ('Placebo effect', 'an improvement in condition caused by belief rather than treatment'), ('Groupthink', 'the tendency for a group to make poor decisions to avoid conflict')],
     ['the ability to recall information after a long period of time']),
    ([('Aquaculture', 'the farming of fish and other aquatic organisms'), ('Hatchery', 'a facility where fish eggs are incubated and hatched'), ('Brackish', 'water that is a mixture of fresh and salt water'), ('Spawning', 'the process by which fish release eggs to reproduce')],
     ['the process of filtering impurities out of drinking water']),
    ([('Filibustering', 'using prolonged speech to delay a legislative vote'), ('Quorum', 'the minimum number of members needed to conduct business'), ('Repeal', 'the formal cancellation of a law'), ('Veto', 'the power to reject a decision made by a legislative body')],
     ['a formal request submitted by citizens to a government body']),
    ([('Vestibule', 'a small entrance hall leading to a larger interior space'), ('Cornice', 'a decorative molding along the top of a wall or building'), ('Facade', 'the front exterior face of a building'), ('Buttress', 'a structure built to support a wall from the outside')],
     ['a small tower typically rising from the roof of a building']),
]

SENTMATCH_SETS = [
    ([("The invention of the printing press allowed", "books to be produced faster and more cheaply than by hand."),
      ("Even though early explorers lacked modern instruments,", "they mapped vast stretches of unfamiliar coastline."),
      ("The Rosetta Stone is significant because", "it allowed scholars to finally decode Egyptian hieroglyphs."),
      ("Many ancient trade routes that crossed deserts", "connected distant civilizations long before modern transport.")],
     ["that required years of specialized training to master.",
      "which few historians have been able to verify."]),
    ([("Solar panels convert sunlight into electricity by", "exciting electrons within layers of semiconductor material."),
      ("Installing a home battery system allows homeowners to", "store surplus energy generated during the day."),
      ("Several governments now offer tax incentives", "that encourage households to switch to renewable energy."),
      ("Despite falling prices for solar equipment,", "installation costs remain high in some rural areas.")],
     ["which most manufacturers no longer produce.",
      "though the technology was invented over a century ago."]),
    ([("Each year, wildlife researchers track", "the migration patterns of thousands of tagged animals."),
      ("Because coral reefs are extremely sensitive to temperature,", "even small increases in sea heat can cause bleaching."),
      ("One reason bats are difficult to study", "is that many species are active only at night."),
      ("I was genuinely astonished to discover in the study", "that some insects can recognize individual human faces.")],
     ["because they hope to attract more tourists.",
      "it is widely debated among conservationists."]),
    ([("Modern hospitals are adopting robotic surgery to", "improve precision during delicate operations."),
      ("The main limitation of early X-ray machines was", "that they exposed both patients and doctors to unsafe radiation."),
      ("Researchers have developed synthetic skin", "capable of detecting pressure and temperature changes."),
      ("Provided that clinical trials continue to succeed,", "the treatment could be widely available within a decade.")],
     ["unless funding for the project is withdrawn.",
      "will increase the cost of hospital equipment."]),
    ([("The Great Barrier Reef stretches", "over two thousand kilometers along Australia's coastline."),
      ("Although Antarctica has no permanent residents,", "thousands of scientists work there during the summer months."),
      ("The Amazon rainforest is often called", "the lungs of the planet because of the oxygen it produces."),
      ("Many glaciers that once covered mountain valleys", "have retreated significantly over the past century.")],
     ["who specialize in the study of ancient languages.",
      "based on surveys conducted by international agencies."]),
    ([("Archaeologists uncovered the tomb after", "years of painstaking excavation beneath the desert sands."),
      ("Because the manuscript was written in a lost dialect,", "translators needed nearly a decade to decipher it fully."),
      ("The museum's newest exhibit focuses on", "everyday objects used by ordinary citizens of the ancient city."),
      ("Despite being badly damaged by fire,", "the ancient library's foundations still stand today.")],
     ["because they wanted to preserve the site for tourism.",
      "it is considered one of the greatest discoveries of the century."]),
    ([("Urban planners are redesigning city centers to", "prioritize pedestrians over private vehicles."),
      ("One drawback of rapid urbanization is", "that green spaces are often sacrificed for new housing."),
      ("Public transport systems have been expanded", "to reduce traffic congestion during peak hours."),
      ("Provided that residents support the new zoning laws,", "the city plans to build several affordable housing complexes.")],
     ["unless the budget is approved by the council.",
      "will require significant investment from private companies."]),
    ([("Astronomers recently discovered a planet", "orbiting a star nearly a thousand light-years away."),
      ("Because space telescopes avoid atmospheric distortion,", "they capture far sharper images than ground-based ones."),
      ("One challenge of long-duration space missions is", "that astronauts must cope with extended isolation."),
      ("I was amazed to learn from the broadcast", "that the spacecraft had traveled beyond our solar system.")],
     ["because they hope to inspire future scientists.",
      "it is monitored continuously by mission control."]),
    ([("Materials scientists are developing plastics that", "break down naturally within a few years."),
      ("Because traditional plastics take centuries to decompose,", "researchers are racing to find viable alternatives."),
      ("One promising material is made from", "compressed agricultural waste such as husks and stalks."),
      ("Provided that production costs continue to fall,", "biodegradable packaging could replace plastic within a decade.")],
     ["unless manufacturers resist adopting new supply chains.",
      "will require new recycling infrastructure nationwide."]),
    ([("Coastal engineers are building barriers to", "protect low-lying cities from rising sea levels."),
      ("The main obstacle to large-scale flood defenses is", "that construction costs often exceed available public funds."),
      ("Some cities have chosen to relocate entire neighborhoods", "rather than continue investing in seawalls."),
      ("I was struck by a detail in the report", "that one barrier alone protects nearly two million residents.")],
     ["because residents refused to leave ancestral homes.",
      "it was completed years ahead of schedule."]),
    ([("Astronomers use radio telescopes to", "detect signals far too faint for optical instruments."),
      ("Because light from distant galaxies takes millions of years to arrive,", "astronomers are effectively observing the ancient past."),
      ("One reason dark matter remains mysterious is", "that it does not emit or reflect any detectable light."),
      ("I was fascinated to discover in the lecture", "that most of the universe's mass is still unaccounted for.")],
     ["because they hope to contact distant civilizations.",
      "it is funded jointly by several national agencies."]),
    ([("Forensic scientists analyze evidence to", "reconstruct the sequence of events at a crime scene."),
      ("Because DNA degrades under certain conditions,", "investigators must collect samples quickly and carefully."),
      ("One advancement that transformed the field was", "the ability to match fingerprints using digital databases."),
      ("I was surprised to read in the article", "that early forensic labs relied entirely on handwritten records.")],
     ["because they wanted to avoid public scrutiny.",
      "it is admissible in most modern courtrooms."]),
    ([("Orchestras rehearse extensively to", "ensure every section performs in precise coordination."),
      ("Because early symphony halls had poor acoustics,", "architects began designing spaces specifically for sound."),
      ("One reason conductors matter so much is", "that they shape tempo and dynamics in real time."),
      ("I was moved to learn from the program notes", "that the composer wrote the piece while nearly deaf.")],
     ["because audiences demanded shorter performances.",
      "it was rediscovered decades after being lost."]),
    ([("Culinary scientists study food to", "understand how heat and chemistry transform raw ingredients."),
      ("Because fermentation relies on living microorganisms,", "temperature control is essential throughout the process."),
      ("One reason bread rises is", "that yeast produces carbon dioxide as it consumes sugars."),
      ("I was intrigued to learn from the documentary", "that some flavors only develop after weeks of aging.")],
     ["because chefs hope to reduce food waste entirely.",
      "it is studied extensively in food science programs."]),
    ([("Urban wildlife researchers track animals to", "understand how species adapt to city environments."),
      ("Because many predators have vanished from cities,", "certain animal populations have grown rapidly unchecked."),
      ("One challenge of studying urban foxes is", "that they are most active during the night."),
      ("I was surprised to read in the study", "that several species now thrive better in cities than in the wild.")],
     ["because they hope to eliminate urban wildlife entirely.",
      "it is funded primarily through public donations."]),
    ([("Linguists study dying languages to", "preserve knowledge before the last fluent speakers pass away."),
      ("Because a language encodes a unique worldview,", "its disappearance represents an irreplaceable cultural loss."),
      ("One reason revival programs succeed is", "that younger community members actively choose to participate."),
      ("I was moved to learn from the elder", "that she was the only remaining fluent speaker of her language.")],
     ["because governments fund every revival program equally.",
      "it was translated into dozens of other languages."]),
    ([("Volcanologists monitor active volcanoes to", "predict eruptions before they threaten nearby communities."),
      ("Because magma chambers behave unpredictably,", "even advanced sensors cannot guarantee accurate warnings."),
      ("One sign that an eruption may be near is", "a sudden increase in ground deformation and gas emissions."),
      ("I was startled to discover in the report", "that the volcano had been dormant for over four centuries.")],
     ["because residents refused to evacuate the area.",
      "it was rebuilt entirely after the last eruption."]),
    ([("Restoration architects work to", "preserve historic buildings while meeting modern safety codes."),
      ("Because original materials are often no longer available,", "restorers must source close matches from specialist suppliers."),
      ("One challenge of restoring old frescoes is", "that cleaning methods can accidentally damage fragile pigments."),
      ("I was fascinated to learn from the curator", "that the building had survived three separate fires.")],
     ["because the architects wanted to modernize the facade completely.",
      "it is visited by thousands of tourists every summer."]),
    ([("Meteorologists use satellite data to", "track storm systems as they form over open ocean."),
      ("Because hurricanes draw energy from warm water,", "rising sea temperatures may make future storms more intense."),
      ("One reason forecasts sometimes fail is", "that small changes in atmospheric pressure are hard to predict precisely."),
      ("I was alarmed to read in the bulletin", "that the storm had strengthened far faster than models expected.")],
     ["because forecasters hoped to reassure coastal residents.",
      "it was downgraded within a few hours of landfall."]),
    ([("Conservationists breed endangered species in captivity to", "rebuild populations before releasing them into protected habitats."),
      ("Because genetic diversity is essential for a species' survival,", "breeding programs carefully track the ancestry of every animal."),
      ("One obstacle to successful reintroduction is", "that captive-born animals often lack essential survival instincts."),
      ("I was encouraged to learn from the report", "that the population had tripled within a single decade.")],
     ["because zoos wanted to increase visitor numbers.",
      "it was documented in a widely watched nature series."]),
    ([("Epidemiologists trace outbreaks to", "identify the original source of an infection quickly."),
      ("Because pathogens can spread silently for weeks,", "early detection often depends on careful pattern analysis."),
      ("One reason contact tracing is difficult is", "that people frequently forget details of recent encounters."),
      ("I was relieved to learn from the briefing", "that the outbreak had been contained within a single district.")],
     ["because officials wanted to avoid public alarm entirely.",
      "it was later studied as a model response worldwide."]),
    ([("Glaciologists drill ice cores to", "reconstruct thousands of years of past climate conditions."),
      ("Because ancient air bubbles remain trapped in the ice,", "researchers can measure historical greenhouse gas levels directly."),
      ("One difficulty of ice-core research is", "that transporting samples without melting them requires constant refrigeration."),
      ("I was astonished to learn from the lecture", "that a single core can reveal climate patterns from 800,000 years ago.")],
     ["because scientists hoped to locate buried treasure.",
      "it was funded entirely by private donors."]),
    ([("Urban planners install permeable pavement to", "reduce flooding by letting rainwater soak into the ground."),
      ("Because traditional pavement blocks natural drainage,", "many cities now face worsening flash floods during storms."),
      ("One advantage of green infrastructure is", "that it can filter pollutants before water reaches rivers and streams."),
      ("I was impressed to learn from the city report", "that flooding incidents dropped sharply after the redesign.")],
     ["because residents demanded wider roads for traffic.",
      "it was inspired by a project completed decades earlier."]),
    ([("Paleontologists excavate fossil beds to", "reconstruct how prehistoric creatures once lived."),
      ("Because soft tissue rarely survives fossilization,", "most reconstructions rely heavily on bone structure alone."),
      ("One reason feathered dinosaurs surprised scientists is", "that feathers were long assumed to belong only to birds."),
      ("I was astonished to learn from the museum guide", "that some fossils took over a decade to fully excavate.")],
     ["because visitors wanted to touch the actual bones.",
      "it was discovered by amateur collectors in a riverbed."]),
    ([("Acoustic engineers design concert halls to", "distribute sound evenly to every seat in the venue."),
      ("Because sound reflects differently off every surface,", "architects test scale models before construction begins."),
      ("One challenge of open-air venues is", "that wind and humidity constantly alter how sound travels."),
      ("I was surprised to learn from the engineer", "that a single wrong angle can ruin a hall's acoustics.")],
     ["because musicians preferred smaller, quieter rooms.",
      "it was rebuilt twice due to funding shortfalls."]),
    ([("Cryptographers design encryption systems to", "protect sensitive information from unauthorized access."),
      ("Because computing power keeps increasing,", "older encryption methods eventually become easier to break."),
      ("One reason quantum computing worries security experts is", "that it could someday break widely used encryption standards."),
      ("I was unsettled to learn from the seminar", "that some encrypted data could be decoded decades from now.")],
     ["because hackers rarely target ordinary users.",
      "it was declassified after several decades of secrecy."]),
    ([("Beekeepers monitor hives closely to", "detect early signs of disease before it spreads."),
      ("Because bee populations have declined sharply in recent years,", "many farmers now rely on managed pollination services."),
      ("One reason pesticide exposure concerns researchers is", "that it can disorient bees and prevent them from finding their hives."),
      ("I was relieved to learn from the report", "that the local bee population had begun recovering steadily.")],
     ["because beekeepers wanted to increase honey prices.",
      "it was studied by agricultural researchers for a decade."]),
    ([("Structural engineers test bridges to", "ensure they can withstand extreme weather and heavy loads."),
      ("Because materials fatigue gradually under repeated stress,", "aging bridges require regular inspection and reinforcement."),
      ("One reason suspension bridges sway is", "that flexibility helps them absorb wind and seismic forces safely."),
      ("I was fascinated to learn from the documentary", "that the bridge was designed to bend slightly during storms.")],
     ["because engineers wanted to shorten the commute.",
      "it was completed years behind the original schedule."]),
    ([("Anthropologists study ancient burial sites to", "learn how past societies viewed death and the afterlife."),
      ("Because burial customs vary widely between cultures,", "researchers avoid drawing conclusions from a single site."),
      ("One reason grave goods matter to archaeologists is", "that they reveal details about a person's status and beliefs."),
      ("I was moved to learn from the exhibit", "that the tomb had remained undisturbed for over three thousand years.")],
     ["because looters had already emptied the site.",
      "it was reconstructed entirely from written records."]),
    ([("Climatologists analyze tree rings to", "estimate past rainfall and temperature patterns."),
      ("Because trees respond predictably to seasonal conditions,", "their growth rings serve as a natural historical record."),
      ("One advantage of tree-ring analysis is", "that it can extend climate records back thousands of years."),
      ("I was surprised to learn from the workshop", "that a single ancient tree could reveal centuries of drought cycles.")],
     ["because loggers wanted to identify the oldest trees.",
      "it was funded through a private research grant."]),
    ([("Robotics engineers design prosthetic limbs to", "restore natural movement for people who have lost a limb."),
      ("Because every patient's body differs slightly,", "modern prosthetics are increasingly custom-fitted using 3D scanning."),
      ("One recent breakthrough allows users to", "control prosthetic fingers using signals from their own nerves."),
      ("I was inspired to learn from the interview", "that the device allowed her to play the piano again.")],
     ["because doctors wanted to reduce hospital visits.",
      "it was tested exclusively on volunteers under eighteen."]),
    ([("Oceanographers deploy underwater drones to", "map seafloor terrain that ships cannot safely survey."),
      ("Because sunlight cannot penetrate the deepest ocean trenches,", "researchers rely entirely on artificial lighting and sonar."),
      ("One reason deep-sea creatures fascinate scientists is", "that many species have never been observed alive before."),
      ("I was amazed to learn from the expedition log", "that the drone descended nearly eleven kilometers below the surface.")],
     ["because sailors feared disturbing marine life.",
      "it was funded entirely by a private space agency."]),
    ([("Entomologists study insect behavior to", "understand how ecosystems depend on pollinators."),
      ("Because insect populations respond quickly to environmental change,", "scientists use them as early indicators of ecosystem health."),
      ("One reason ants organize so efficiently is", "that they communicate through chemical signals called pheromones."),
      ("I was fascinated to learn from the lecture", "that a single colony can contain millions of individual ants.")],
     ["because farmers wanted to eliminate all insects.",
      "it was discovered accidentally during a routine survey."]),
    ([("Textile historians examine old garments to", "understand the daily lives of people from earlier centuries."),
      ("Because natural dyes fade unpredictably over time,", "researchers must use chemical analysis to identify original colors."),
      ("One reason hand-woven fabric is prized today is", "that the technique requires skills few artisans still practice."),
      ("I was delighted to learn from the exhibit", "that the dress had been carefully preserved for over two hundred years.")],
     ["because collectors wanted to increase resale value.",
      "it was donated by a descendant of the original owner."]),
    ([("Urban beekeepers install hives on rooftops to", "support pollinator populations in areas with little green space."),
      ("Because city temperatures tend to be warmer than rural areas,", "urban bees sometimes produce honey earlier in the season."),
      ("One challenge of rooftop beekeeping is", "that hives must be carefully secured against strong winds."),
      ("I was surprised to learn from the beekeeper", "that city honey often contains a wider variety of floral flavors.")],
     ["because officials wanted to reduce rooftop maintenance costs.",
      "it was inspired by a similar program abroad."]),
    ([("Astrophysicists study distant supernovae to", "measure how quickly the universe is expanding."),
      ("Because supernovae release enormous amounts of light,", "they remain visible even from billions of light-years away."),
      ("One reason type Ia supernovae are useful is", "that they always reach a predictable maximum brightness."),
      ("I was astonished to learn from the seminar", "that the light from the explosion had traveled for ten billion years.")],
     ["because astronomers hoped to detect alien signals.",
      "it was named after the scientist who first observed it."]),
    ([("Speech therapists work with patients to", "restore clear communication after an illness or injury."),
      ("Because every patient's condition differs,", "therapists design individualized exercise plans for each case."),
      ("One reason early intervention matters is", "that young children's brains adapt more readily to new patterns."),
      ("I was encouraged to learn from the clinic report", "that most patients showed noticeable improvement within months.")],
     ["because therapists wanted to reduce appointment costs.",
      "it was featured in a documentary about medical breakthroughs."]),
    ([("Perfumers blend natural extracts to", "create scents that evoke a specific mood or memory."),
      ("Because scent molecules evaporate at different rates,", "a fragrance changes noticeably over the hours after application."),
      ("One reason vintage perfumes are valued is", "that some ingredients they used are no longer legally available."),
      ("I was intrigued to learn from the workshop", "that a single fragrance can contain over fifty distinct ingredients.")],
     ["because chemists wanted to eliminate natural ingredients.",
      "it was banned in several countries during the past decade."]),
    ([("Wildlife photographers wait for hours to", "capture a single authentic moment of animal behavior."),
      ("Because sudden movement can startle wild animals,", "photographers often build hidden shelters called blinds."),
      ("One reason patience matters in this field is", "that rare behaviors may only occur once in many weeks of observation."),
      ("I was moved to learn from the photographer", "that she had waited three years for a single photograph.")],
     ["because photographers wanted to sell prints quickly.",
      "it was later used in a national conservation campaign."]),
    ([("Mycologists study fungal networks to", "understand how trees share nutrients underground."),
      ("Because fungal threads connect to multiple tree roots at once,", "a single network can span an entire forest."),
      ("One reason mushrooms appear suddenly is", "that the fungus below ground may have grown for years unseen."),
      ("I was amazed to learn from the field guide", "that some fungal networks are among the oldest living organisms on Earth.")],
     ["because foragers wanted to map mushroom locations.",
      "it was later classified as a separate species entirely."]),
    ([("Horologists repair antique clocks to", "preserve mechanisms that modern factories no longer produce."),
      ("Because tiny gears wear down after centuries of use,", "restorers often craft replacement parts by hand."),
      ("One reason grandfather clocks fascinate collectors is", "that each one was built individually rather than mass-produced."),
      ("I was impressed to learn from the workshop", "that a single repair could take several months to complete.")],
     ["because owners wanted to modernize the mechanism entirely.",
      "it was donated to a museum shortly afterward."]),
    ([("Seismologists install sensors near fault lines to", "detect early tremors before a major earthquake strikes."),
      ("Because tectonic plates move unpredictably,", "precise earthquake prediction remains extremely difficult."),
      ("One reason aftershocks concern engineers is", "that weakened structures can collapse even during smaller tremors."),
      ("I was unsettled to learn from the briefing", "that the fault had been building pressure for over a century.")],
     ["because residents wanted to relocate the sensors.",
      "it was upgraded following a previous disaster."]),
    ([("Vintners monitor grape ripeness to", "determine the ideal moment to begin the harvest."),
      ("Because weather conditions affect sugar levels in grapes,", "vintners adjust harvest timing every single year."),
      ("One reason certain vineyards command higher prices is", "that their soil composition produces a distinctive flavor."),
      ("I was surprised to learn from the tour guide", "that the vines were originally planted over a hundred years ago.")],
     ["because vintners wanted to reduce production costs.",
      "it was exported exclusively to overseas markets."]),
    ([("Cartoonists sketch rough drafts to", "plan the pacing and composition of a comic before finishing it."),
      ("Because visual storytelling relies on timing,", "artists often redraw a single panel many times."),
      ("One reason graphic novels appeal to readers is", "that images can convey emotion words alone cannot capture."),
      ("I was delighted to learn from the interview", "that the artist had reworked the ending three separate times.")],
     ["because publishers demanded shorter chapters.",
      "it was adapted into an animated series soon after."]),
    ([("Hydrologists track river flow to", "predict flooding before it threatens nearby communities."),
      ("Because upstream rainfall takes time to reach downstream areas,", "early warning systems can give residents crucial notice."),
      ("One reason dams complicate flood prediction is", "that released water changes flow patterns downstream unpredictably."),
      ("I was relieved to learn from the report", "that the warning system gave residents nearly six hours to evacuate.")],
     ["because engineers wanted to reduce dam maintenance costs.",
      "it was tested successfully during a previous flood season."]),
    ([("Ethnobotanists document traditional plant knowledge to", "preserve remedies before elder knowledge-holders pass away."),
      ("Because many medicinal plants grow only in specific regions,", "losing local habitats can erase irreplaceable knowledge."),
      ("One reason researchers work closely with local communities is", "that many plant uses are passed down only through oral tradition."),
      ("I was moved to learn from the researcher", "that one remedy had been used by the same family for six generations.")],
     ["because companies wanted to patent every plant discovered.",
      "it was later synthesized in a laboratory setting."]),
    ([("Choreographers design movement sequences to", "express emotion and narrative without spoken words."),
      ("Because dancers' bodies respond differently to training,", "choreographers often adapt movements for individual performers."),
      ("One reason rehearsal footage matters is", "that dancers can review and refine subtle timing errors."),
      ("I was captivated to learn from the program notes", "that the piece took over a year to fully choreograph.")],
     ["because critics demanded shorter performances.",
      "it was performed only once before being retired."]),
    ([('Cryptographers study ancient ciphers to', 'understand how past civilizations protected sensitive information.'), ('Because early codebreakers lacked computers,', 'they relied on patient manual analysis to crack enemy messages.'), ('One reason the Enigma machine mattered is', 'that breaking it shortened the course of a major war.'), ('I was astonished to learn from the archive', 'that some wartime codes remained unsolved for decades afterward.')],
     ['because governments wanted to declassify old documents.', 'it was later replaced by a simpler mechanical device.']),
    ([('Glaciologists drill into ice sheets to', 'extract samples that record thousands of years of climate history.'), ('Because trapped air bubbles preserve ancient atmospheres,', 'ice cores reveal past carbon dioxide levels precisely.'), ('One reason melting glaciers concern scientists is', 'that the meltwater raises sea levels worldwide.'), ('I was struck to learn from the report', 'that a single ice core can span over a hundred thousand years.')],
     ['because explorers wanted to reach the pole faster.', 'it was later exhibited in a traveling museum show.']),
    ([('Archivists digitize fragile manuscripts to', 'preserve their content before the physical pages deteriorate further.'), ('Because old parchment reacts poorly to humidity,', 'storage rooms must maintain strict temperature control.'), ('One reason illuminated manuscripts fascinate scholars is', 'that each page was painstakingly decorated by hand.'), ('I was surprised to hear from the archivist', 'that a single manuscript could take a monk several years to complete.')],
     ['because collectors wanted to increase their market value.', 'it was eventually rebound using modern materials.']),
    ([('Volcanologists monitor seismic activity to', 'predict eruptions before they threaten nearby towns.'), ('Because magma movement changes ground pressure,', 'sensors can detect an eruption days in advance.'), ('One reason ancient eruptions puzzle researchers is', 'that ash layers reveal the exact date of the event.'), ('I was alarmed to learn from the briefing', 'that the volcano had shown no activity for over a century before erupting.')],
     ['because residents wanted to relocate the observatory.', 'it was later declared a protected geological site.']),
    ([('Sociolinguists document endangered languages to', 'preserve vocabulary and grammar before the last speakers pass away.'), ('Because a language can vanish within a single generation,', 'researchers race to record native speakers whenever possible.'), ('One reason endangered languages matter is', 'that each one encodes a unique way of understanding the world.'), ('I was moved to learn from the fieldwork', 'that one recording preserved words no dictionary had ever listed.')],
     ['because governments wanted to promote a single national language.', 'it was translated into several major world languages.']),
    ([('Numismatists examine ancient coins to', 'trace how trade networks connected distant ancient economies.'), ('Because coin designs changed with each ruler,', 'a single hoard can reveal a precise historical timeline.'), ('One reason counterfeit coins interest historians is', 'that they reveal how ordinary people tried to outsmart the treasury.'), ('I was intrigued to learn from the exhibit', 'that one hoard contained coins from several different empires.')],
     ['because merchants wanted to standardize weights and measures.', 'it was melted down and reused within a few decades.']),
    ([('Paleobotanists study fossilized plants to', 'reconstruct what ancient landscapes looked like millions of years ago.'), ('Because plant fossils rarely survive intact,', 'researchers must piece together evidence from fragments.'), ('One reason amber fossils excite scientists is', 'that they can preserve insects and pollen in remarkable detail.'), ('I was amazed to learn from the exhibit', 'that a single piece of amber had trapped a spider mid-web.')],
     ['because collectors wanted to sell the specimens privately.', 'it was later proven to be an elaborate forgery.']),
    ([('Restoration architects study old blueprints to', 'rebuild historic structures using their original methods and materials.'), ('Because building codes have changed since the structures were built,', 'restorers must balance authenticity with modern safety standards.'), ('One reason timber-frame buildings survive centuries is', 'that their joints allow the structure to flex rather than crack.'), ('I was impressed to learn from the tour', 'that not a single nail had been used in the original construction.')],
     ['because city officials wanted to demolish the building entirely.', 'it was relocated brick by brick to a new site.']),
    ([('Horticulturists graft fruit tree branches to', 'combine the hardiness of one variety with the flavor of another.'), ('Because grafted trees share a single root system,', 'orchardists can grow several fruit varieties on one trunk.'), ('One reason heirloom apple varieties are disappearing is', 'that few nurseries still propagate them commercially.'), ('I was delighted to learn from the orchard tour', 'that a single old tree could carry over a dozen grafted varieties.')],
     ['because farmers wanted to reduce the size of their orchards.', 'it was later classified as an invasive species.']),
    ([('Metallurgists study ancient alloys to', 'determine how early civilizations achieved such durable tools.'), ('Because bronze requires precise proportions of copper and tin,', 'early smiths guarded their exact recipes carefully.'), ('One reason Damascus steel fascinates researchers is', 'that its production method remains only partially understood today.'), ('I was stunned to discover from the exhibit', 'that some ancient blades still hold a sharper edge than modern steel.')],
     ['because traders wanted to standardize coin weights.', 'it was eventually replaced by iron tools entirely.']),
    ([('Speleologists map cave systems to', 'document passages that have never been surveyed before.'), ('Because underground rivers can flood without warning,', 'cave explorers must track weather conditions closely.'), ('One reason cave formations take so long to form is', 'that mineral deposits build up only a few millimeters per century.'), ('I was awestruck to learn from the guide', 'that a single formation had been growing since before recorded history.')],
     ['because miners wanted to extract the mineral deposits.', "it was sealed off to protect a nearby town's water supply."]),
    ([('Apiarists track hive health to', 'catch signs of disease before an entire colony collapses.'), ('Because a queen bee can lay over a thousand eggs a day,', 'a healthy hive can recover quickly from a population drop.'), ('One reason commercial beekeepers move hives seasonally is', 'that different regions bloom at different times of year.'), ('I was startled to hear from the beekeeper', 'that a single hive could produce far more honey than one family needs.')],
     ['because regulators wanted to limit the number of hives per farm.', 'it was later sold at a significant loss.']),
    ([('Restoration divers document shipwrecks to', 'preserve a record before the site deteriorates further underwater.'), ('Because saltwater corrodes metal quickly,', 'many artifacts must be recovered before they dissolve entirely.'), ('One reason shipwreck sites attract researchers is', 'that cargo often reveals details no written record preserved.'), ('I was fascinated to learn from the dive log', 'that one wreck had remained undiscovered for nearly two centuries.')],
     ['because salvage crews wanted to auction the artifacts privately.', 'it was later rebuilt as a full-scale replica.']),
    ([('Foresters count tree rings to', "estimate a forest's age and reconstruct past climate patterns."), ('Because narrow rings often indicate a drought year,', 'researchers can date historical dry spells precisely.'), ('One reason old-growth forests matter to scientists is', 'that their rings preserve a continuous climate record.'), ('I was intrigued to learn from the forestry report', "that one tree's rings recorded a wildfire from centuries earlier.")],
     ['because loggers wanted to identify the most valuable trees.', 'it was declared a protected national monument soon after.']),
    ([('Perfumers blend rare essential oils to', 'create scents that evoke a specific memory or mood.'), ('Because natural fragrances fade at different rates,', 'perfumers layer notes that unfold gradually over hours.'), ('One reason vintage perfumes are hard to replicate is', 'that certain ingredients are no longer legally available.'), ('I was captivated to learn from the workshop', 'that a single fragrance could contain over fifty distinct ingredients.')],
     ['because regulators wanted to standardize bottle sizes.', 'it was later discontinued due to manufacturing costs.']),
    ([('Restoration carpenters study joinery techniques to', 'repair historic furniture without modern adhesives or nails.'), ('Because antique wood shrinks and swells with humidity,', 'restorers must match materials carefully to avoid warping.'), ('One reason hand-cut dovetail joints last centuries is', 'that they tighten under pressure rather than loosening.'), ('I was struck to hear from the instructor', 'that a single joint could take a skilled carpenter a full day to cut.')],
     ['because collectors wanted to replace the original hardware.', 'it was later donated to a woodworking school.']),
    ([('Oceanographers deploy drifting buoys to', 'track how currents move heat around the globe.'), ('Because deep ocean currents circulate very slowly,', 'a single water mass may take centuries to complete one loop.'), ('One reason coral bleaching alarms scientists is', 'that warmer water stresses the algae corals depend on for food.'), ('I was troubled to learn from the survey', 'that some reef sections had lost most of their color within a single season.')],
     ['because fishermen wanted to track migrating schools of fish.', 'it was later towed to a research facility for repairs.']),
    ([('Epidemiologists trace outbreak clusters to', 'identify the original source before a disease spreads further.'), ('Because symptoms can take days to appear,', "investigators must work backward through a patient's recent contacts."), ('One reason contact tracing proves so labor-intensive is', 'that people often forget where they traveled during a given week.'), ('I was reassured to hear from the briefing', 'that the outbreak had been contained before it reached a nearby city.')],
     ['because hospitals wanted to reduce staffing costs.', 'it was later renamed after the researcher who discovered it.']),
    ([('Papermakers pulp old rags and fibers to', 'produce sheets strong enough to survive centuries of handling.'), ('Because handmade paper dries unevenly,', 'artisans must press each sheet carefully to avoid warping.'), ('One reason medieval manuscripts have survived so long is', 'that early paper contained fewer acidic chemicals than modern paper.'), ('I was surprised to discover from the workshop', 'that a single sheet could take an entire day to produce by hand.')],
     ['because merchants wanted to standardize paper sizes for trade.', 'it was later replaced entirely by machine-made paper.']),
    ([('Cartographers triangulate landmarks to', 'calculate precise distances before satellite positioning existed.'), ('Because early surveys relied on line-of-sight measurements,', 'mapping a single mountain range could take several years.'), ('One reason old maps sometimes show incorrect coastlines is', 'that surveyors could not always reach the exact shoreline.'), ('I was fascinated to discover from the archive', 'that one map had been corrected and redrawn more than a dozen times.')],
     ['because governments wanted to redraw political borders.', 'it was later used as evidence in a territorial dispute.']),
    ([('Coopers shape wooden staves to', 'build barrels that hold liquid without leaking for decades.'), ('Because the wood must bend without cracking,', 'coopers soak and heat each stave before assembling it.'), ('One reason oak barrels are prized for aging wine is', 'that the wood slowly releases flavor compounds over time.'), ('I was impressed to discover from the tour', 'that one barrel could be reused for several decades before replacement.')],
     ['because vineyards wanted to reduce production costs.', 'it was later donated to a regional history museum.']),
    ([('Ethologists observe animal behavior in the wild to', 'understand how species communicate without human interference.'), ('Because many animals change behavior when watched closely,', 'researchers often observe from hidden blinds for weeks.'), ('One reason primate research matters to scientists is', 'that certain behaviors closely resemble early human social patterns.'), ('I was astonished to discover from the field notes', 'that one troop had developed a tool-use technique never recorded before.')],
     ['because zoos wanted to improve enclosure designs.', 'it was later filmed for a nature documentary series.']),
    ([('Geneticists sequence ancient DNA to', 'trace how populations migrated thousands of years ago.'), ('Because DNA degrades over time,', 'researchers can only extract usable samples from certain conditions.'), ('One reason ancient DNA studies surprised historians is', 'that some migration patterns did not match written records at all.'), ('I was startled to discover from the study', 'that one sample revealed ancestry from a population thought to be unrelated.')],
     ['because museums wanted to authenticate historical artifacts.', 'it was later used to settle a long-running paternity dispute.']),
    ([('Watchmakers assemble tiny gears to', 'keep mechanical timepieces accurate to within seconds per day.'), ('Because each component must fit with extreme precision,', 'a single watch can contain hundreds of individually finished parts.'), ('One reason vintage watches remain valuable is', 'that few craftsmen still know how to repair certain older mechanisms.'), ('I was delighted to discover from the workshop', 'that one movement had been kept running continuously for over a century.')],
     ['because collectors wanted to replace the original casing.', 'it was later redesigned to run on batteries instead.']),
    ([('Restoration ecologists reintroduce native plants to', 'help degraded land recover its original biodiversity.'), ('Because invasive species often outcompete native ones,', 'restoration teams must remove them before replanting can succeed.'), ('One reason wetland restoration matters is', 'that wetlands filter pollutants before they reach nearby rivers.'), ('I was encouraged to discover from the report', 'that one restored site had attracted species not seen there for decades.')],
     ['because developers wanted to build on the reclaimed land.', 'it was later converted into a paid tourist attraction.']),
    ([('Tanners treat animal hides to', 'transform them into durable, flexible leather for various uses.'), ('Because traditional tanning uses strong-smelling chemicals,', 'tanneries were historically located outside city walls.'), ('One reason vegetable-tanned leather is prized is', 'that it ages and develops character over years of use.'), ('I was surprised to discover from the tour', 'that the tanning process could take several weeks to complete fully.')],
     ['because merchants wanted to reduce the cost of imported leather.', 'it was later replaced by synthetic materials in most products.']),
    ([('Vexillologists study flag designs to', 'trace how national symbols reflect political history.'), ('Because flag colors often carry specific meanings,', 'a small design change can signal a major political shift.'), ('One reason flag redesigns spark controversy is', 'that citizens attach strong emotional significance to familiar symbols.'), ('The historian noted with interest that', 'one flag had been redesigned five times within a single century.')],
     ['because printers wanted to reduce manufacturing costs.', 'it was later adopted by a neighboring country entirely.']),
    ([('Pomologists graft and test new fruit varieties to', 'develop crops that resist disease without losing flavor.'), ('Because breeding a new apple variety takes many years,', 'commercial orchards rarely release more than a few new types per decade.'), ('One reason heirloom fruit varieties matter is', 'that they preserve genetic diversity modern breeding has narrowed.'), ('The researcher explained during the interview that', 'one variety had taken over two decades to stabilize.')],
     ['because grocers wanted fruit that ripened more slowly.', 'it was later withdrawn due to low consumer demand.']),
    ([('Conservators clean and stabilize old paintings to', "prevent further deterioration without erasing the artist's original work."), ('Because aggressive cleaning can damage delicate pigments,', 'conservators test each solvent on a tiny hidden area first.'), ('One reason restoring old varnish is risky is', 'that removing too much can strip away original paint underneath.'), ('The museum director mentioned during the tour that', 'one painting had taken nearly three years to fully restore.')],
     ["because insurers wanted to reduce the painting's appraised value.", 'it was later loaned to a gallery overseas.']),
    ([('Limnologists sample freshwater lakes to', 'monitor how pollution and temperature affect aquatic ecosystems.'), ('Because lake temperatures vary by depth,', 'researchers collect samples from several layers during a single visit.'), ('One reason invasive species spread quickly in lakes is', 'that boats can carry organisms between separate bodies of water.'), ('The report noted with concern that', 'one lake had lost most of its native fish within a single decade.')],
     ['because anglers wanted to introduce new fish species.', 'it was later drained to make way for new construction.']),
    ([('Philatelists study old postage stamps to', "trace how printing errors reveal details about a stamp's production history."), ("Because a single misprint can dramatically raise a stamp's value,", 'collectors examine each specimen under magnification.'), ('One reason certain stamps become famous is', 'that only a handful of misprinted copies were ever released.'), ('The auction catalog explained that', 'one stamp had sold for far more than the value of the letter it was attached to.')],
     ['because postal services wanted to discourage stamp collecting.', 'it was later reprinted using corrected plates.']),
    ([('Podiatric researchers study gait patterns to', 'design footwear that reduces long-term joint strain.'), ("Because everyone's foot shape differs slightly,", 'custom orthotics often outperform standard shoe inserts.'), ('One reason running injuries are so common is', 'that many runners never adjust their form despite years of practice.'), ('The specialist explained during the consultation that', "one patient's gait had changed noticeably after just a few weeks of therapy.")],
     ['because manufacturers wanted to reduce production costs.', 'it was later adapted for use in professional sports training.']),
    ([('Bryologists study moss and lichen to', 'monitor air quality using species sensitive to pollution.'), ('Because lichen grows extremely slowly,', 'a single colony can take decades to reach a noticeable size.'), ('One reason lichen makes a reliable pollution indicator is', 'that it absorbs airborne chemicals directly through its surface.'), ('The field guide noted that', 'one lichen colony had likely been growing for several centuries.')],
     ['because loggers wanted to identify old-growth forest boundaries.', 'it was later classified as a separate, previously unknown species.']),
    ([('Enologists monitor fermentation to', 'determine the precise moment a wine reaches its ideal balance.'), ('Because yeast activity changes with temperature,', 'cellar workers must adjust conditions carefully throughout fermentation.'), ('One reason vintage quality varies by year is', 'that weather conditions during the growing season affect grape sugar levels.'), ('The winemaker explained during the tasting that', 'one batch had required nearly twice the usual fermentation time.')],
     ['because distributors wanted to shorten the aging process.', 'it was later blended with grapes from a different vineyard.']),
    ([('Campanologists study historic bells to', 'determine when and where a bell foundry originally cast each piece.'), ('Because bronze bells crack under repeated stress,', 'some centuries-old bells have been recast several times.'), ("One reason a bell's tone matters to historians is", 'that the exact pitch can help identify its original foundry.'), ('The curator explained during the exhibit that', 'one bell had rung continuously for over four hundred years before cracking.')],
     ['because collectors wanted to melt the bells down for scrap metal.', 'it was later moved to a quieter part of the building.']),
    ([('Dendrochronologists cross-reference tree rings to', 'date wooden artifacts with remarkable year-by-year precision.'), ('Because trees in the same region share similar ring patterns,', 'researchers can match a sample to a known reference timeline.'), ('One reason this dating method matters to archaeologists is', 'that it can date construction timber more precisely than other methods.'), ('The report noted with surprise that', 'one beam had been dated to a specific year over a thousand years ago.')],
     ['because builders wanted to identify structurally weak timber.', 'it was later donated to a dendrochronology research lab.']),
    ([('Malacologists study mollusk shells to', 'track how ocean acidification affects shell formation over time.'), ('Because shell growth follows a predictable seasonal pattern,', "researchers can estimate an organism's exact age from its shell."), ('One reason declining shell thickness worries scientists is', 'that thinner shells offer less protection from predators.'), ('The marine biologist explained during the briefing that', 'one shell sample had revealed changes spanning several decades.')],
     ['because collectors wanted to identify rare shell patterns.', 'it was later displayed in a traveling ocean exhibit.']),
    ([('Ampelographers identify grape varieties to', 'trace which vines were used in historic wine regions.'), ('Because many grape varieties look nearly identical to the untrained eye,', 'identification often requires genetic testing to confirm.'), ('One reason lost grape varieties matter to winemakers is', 'that some produce flavors no modern variety can replicate.'), ('The vineyard manager explained during the harvest that', 'one rediscovered variety had not been grown commercially in over a century.')],
     ['because regulators wanted to standardize vineyard labeling.', 'it was later planted experimentally in a research vineyard.']),
    ([('Silversmiths hammer sheet metal to', 'shape vessels and jewelry without any seams or joins.'), ('Because silver tarnishes when exposed to air,', 'finished pieces require regular polishing to keep their shine.'), ('One reason hand-hammered silverware costs more than machine-made pieces is', 'that each hammer mark is placed individually by the craftsperson.'), ('According to the guild records, a single ornate tray', 'could take a master silversmith several weeks to complete.')],
     ['because collectors wanted to melt the silver down for coins.', 'it was later donated to a decorative arts museum.']),
    ([('Luthiers carve and assemble wood by hand to', 'build stringed instruments with a distinctive, resonant tone.'), ('Because wood density affects how sound travels through an instrument,', 'luthiers select each piece of wood individually.'), ('One reason antique violins remain highly prized is', 'that their aged wood produces a tone modern wood cannot fully replicate.'), ('The apprentice explained during the workshop tour that', 'one violin had taken over a year to complete from start to finish.')],
     ['because orchestras wanted lighter instruments for touring.', 'it was later sold at auction for a record price.']),
    ([('Apothecaries once blended herbs and minerals to', 'prepare remedies long before modern pharmaceuticals existed.'), ("Because dosages varied depending on a patient's size and condition,", 'apothecaries had to calculate each remedy individually.'), ('One reason old apothecary records interest historians is', 'that they reveal which ailments were most common in a given era.'), ('The museum placard explained that', 'one recipe book had remained in continuous use for nearly two centuries.')],
     ['because physicians wanted to standardize every prescription nationally.', 'it was later translated into several modern languages.']),
    ([('Shipwrights steam-bend timber to', "shape a vessel's hull without cutting across the wood's natural grain."), ('Because bent timber is stronger than timber cut to a curve,', 'traditional hulls could withstand rougher seas than expected.'), ('One reason wooden shipbuilding declined is', 'that steel construction eventually proved faster and more durable.'), ('The shipyard guide mentioned that', 'one hull had required timber from over two hundred individual trees.')],
     ['because navies wanted ships that could be built in a single day.', 'it was later preserved as a floating museum exhibit.']),
    ([('Clockmakers hand-file tiny components to', 'ensure a mechanical movement keeps time within seconds per week.'), ('Because temperature changes can expand or contract metal parts,', 'precision clocks are often built with temperature-compensating materials.'), ('One reason antique clocks remain collectible is', 'that many were signed individually by the craftsman who built them.'), ('The restorer noted during the appraisal that', 'one movement had been running with only minor repairs for over a century.')],
     ['because collectors wanted to replace the mechanism with a battery.', 'it was later converted to run on electricity instead.']),
    ([('Gemologists examine mineral inclusions to', 'distinguish natural stones from laboratory-grown imitations.'), ("Because heat treatment can permanently alter a gemstone's color,", 'gemologists must disclose any treatment before a sale.'), ('One reason certain gemstones command extraordinary prices is', 'that flawless natural specimens of that size are exceptionally rare.'), ('The appraiser explained during the evaluation that', 'one stone had taken several days of careful analysis to authenticate.')],
     ['because jewelers wanted to standardize gemstone pricing worldwide.', 'it was later recut to remove a small internal flaw.']),
    ([('Dendrologists catalog tree species to', 'track how forest composition shifts in response to a changing climate.'), ('Because some tree species can live for thousands of years,', 'a single specimen can serve as a living historical record.'), ('One reason old-growth forests are difficult to replace is', 'that the ecological relationships within them take centuries to develop.'), ('The field researcher noted in the report that', 'one tree had outlived every recorded human settlement nearby.')],
     ['because loggers wanted to identify the fastest-growing species.', 'it was later fitted with sensors to monitor its health remotely.']),
    ([('Viticulturists monitor vineyard soil to', 'determine exactly when grapes have reached their ideal ripeness.'), ("Because soil minerals shape a wine's final flavor profile,", 'neighboring vineyards can produce noticeably different wines.'), ('One reason a single vineyard can vary from year to year is', "that rainfall and temperature shift the grapes' sugar content annually."), ('The vineyard owner explained during the tasting that', "one particular row consistently produced the estate's finest grapes.")],
     ['because regulators wanted to cap the size of individual vineyards.', 'it was later replanted with a hardier grape variety.']),
    ([('Riggers inspect ship cables and pulleys to', 'confirm that heavy loads can be raised and lowered safely.'), ('Because worn cable strands can fail without warning,', 'riggers replace rope well before it shows visible damage.'), ('One reason rigging inspections happen so frequently is', 'that a single failure can endanger the entire crew.'), ('The harbor supervisor mentioned during the safety briefing that', 'one cable had been replaced despite showing no visible wear at all.')],
     ['because shipowners wanted to reduce maintenance costs entirely.', 'it was later donated to a maritime training academy.']),
    ([('Herbalists dry and store plants to', 'preserve their medicinal properties for use throughout the year.'), ('Because some compounds break down quickly once a plant is picked,', "timing the harvest correctly affects a remedy's overall potency."), ('One reason traditional plant knowledge is at risk of being lost is', 'that fewer young practitioners are learning directly from experienced elders.'), ('The herbalist noted during the demonstration that', 'one remedy had been passed down within a single family for six generations.')],
     ['because pharmaceutical companies wanted to patent every wild plant species.', 'it was later reproduced synthetically in a laboratory setting.']),
    ([('Sailmakers cut and stitch heavy canvas to', 'shape sails that hold wind efficiently without tearing under strain.'), ('Because uneven stitching can cause a sail to fail under pressure,', 'sailmakers reinforce every seam that bears significant load.'), ('One reason traditional sailmaking remains a valued skill is', 'that hand-finished sails often outlast mass-produced alternatives.'), ('The boatyard owner noted during the tour that', 'one sail had survived several decades of regular ocean use.')],
     ['because racing teams wanted lighter sails regardless of durability.', 'it was later displayed in a maritime history exhibit.']),
    ([('Gunsmiths hand-fit internal mechanisms to', 'ensure a firearm functions reliably under repeated use.'), ('Because tolerances between moving parts must be extremely precise,', 'gunsmiths often file and test components dozens of times.'), ('One reason antique firearms remain collectible is', 'that engraving and finishing were once done entirely by hand.'), ('The museum curator explained that', 'one mechanism had required months of careful hand-fitting to complete.')],
     ['because manufacturers wanted to mass-produce identical parts instantly.', 'it was later donated to a historical firearms collection.']),
    ([('Cheesemakers monitor curd temperature to', "control exactly how a cheese's texture develops during production."), ('Because different bacterial cultures produce different flavors,', 'cheesemakers guard their specific culture blends carefully.'), ('One reason aged cheeses vary so much between producers is', 'that cave humidity and temperature affect the aging process significantly.'), ('The dairy owner mentioned during the tour that', 'one wheel had aged in the same cave for over three years.')],
     ['because regulators wanted to standardize cheese recipes nationally.', 'it was later entered into an international cheese competition.']),
    ([('Coppersmiths hammer and anneal metal to', 'shape vessels that conduct heat evenly across a cooking surface.'), ('Because repeated hammering hardens copper until it becomes brittle,', 'coppersmiths must periodically reheat the metal to keep it workable.'), ('One reason hand-hammered copper cookware remains popular is', 'that the uneven surface improves heat distribution during cooking.'), ('The craftsman explained during the demonstration that', 'one large pot had required several days of continuous hammering.')],
     ['because manufacturers wanted to replace copper with cheaper aluminum entirely.', 'it was later retired from active kitchen use and displayed instead.']),
    ([('Wheelwrights shape wooden spokes to', 'build wheels strong enough to carry heavy loads over rough roads.'), ('Because green wood shrinks as it dries,', 'wheelwrights assemble certain joints slightly looser than the final fit.'), ('One reason traditional wheelwrighting nearly disappeared is', 'that steel and rubber wheels eventually proved cheaper to mass-produce.'), ('The museum guide explained that', 'one wagon wheel had survived over a century of continuous use.')],
     ['because factories wanted to eliminate wooden wheels within a single year.', 'it was later restored using techniques from historical records.']),
    ([('Taxidermists preserve animal specimens to', 'create lifelike displays used for education and research.'), ('Because skin and tissue decay quickly after death,', 'taxidermists must begin preservation work almost immediately.'), ('One reason museum specimens remain valuable to scientists is', 'that they preserve physical details modern photographs cannot fully capture.'), ('The curator noted during the exhibit opening that', 'one specimen had been on continuous display for nearly a century.')],
     ['because collectors wanted to display only living animals instead.', 'it was later re-mounted using updated preservation techniques.']),
    ([('Falconers train birds of prey to', 'hunt cooperatively with a human handler rather than independently.'), ('Because young birds bond closely with their first handler,', 'falconers spend months building trust before any formal training begins.'), ('One reason falconry techniques have changed little over centuries is', 'that the fundamental relationship between bird and handler remains unchanged.'), ('The falconer explained during the demonstration that', 'one bird had remained with the same handler for over fifteen years.')],
     ['because farmers wanted to replace falconry with automated pest control.', 'it was later released back into the wild successfully.']),
    ([('Milliners block and steam felt to', 'shape hats that hold their form for years without losing shape.'), ('Because felt shrinks unevenly if steamed incorrectly,', 'milliners test small sections before shaping an entire piece.'), ('One reason custom-made hats cost more than mass-produced ones is', 'that each block must be shaped individually to fit a specific head.'), ('The designer mentioned during the fitting that', 'one hat had required several rounds of reshaping to achieve the right fit.')],
     ['because factories wanted to eliminate custom millinery entirely.', 'it was later featured in a fashion history exhibit.']),
    ([('Cordwainers cut and stitch leather to', 'construct shoes built to be resoled rather than discarded.'), ('Because leather stretches slightly with wear,', 'cordwainers build new shoes with a deliberately snug initial fit.'), ('One reason handmade shoes often outlast mass-produced pairs is', 'that reinforced stitching allows the sole to be replaced repeatedly.'), ('The shoemaker explained during the fitting that', 'one pair had been resoled multiple times over several decades.')],
     ['because manufacturers wanted shoes that could never be repaired.', 'it was later displayed as an example of traditional craftsmanship.']),
    ([('Goldsmiths alloy precious metal to', 'balance durability against the softness of pure gold.'), ('Because pure gold is too soft for everyday jewelry,', 'goldsmiths blend in small amounts of other metals for strength.'), ('One reason antique gold jewelry varies in color is', 'that different regions traditionally used different alloy combinations.'), ('The appraiser noted during the evaluation that', 'one piece had been reworked and reset at least three separate times.')],
     ['because regulators wanted every goldsmith to use an identical alloy.', 'it was later melted down and recast into a modern setting.']),
    ([('Ethnomusicologists record folk songs to', 'preserve musical traditions before the last performers pass away.'), ('Because oral traditions change slightly with each performance,', 'no two recordings of the same folk song are ever identical.'), ('One reason field recordings matter to researchers is', 'that many melodies were never written down in any form.'), ('The archive notes explain that', 'one recording captured a song no living performer could still remember.')],
     ['because record labels wanted to standardize folk music nationally.', 'it was later rearranged for a full orchestra.']),
    ([('Sommeliers evaluate wine by aroma to', "identify a vintage's grape variety and region before tasting it."), ('Because a trained palate can detect subtle chemical differences,', "sommeliers can often name a wine's approximate age within seconds."), ('One reason blind tastings challenge even experts is', "that packaging and reputation normally influence a taster's expectations."), ('The instructor explained during the class that', "one student correctly identified a wine's exact vineyard from smell alone.")],
     ['because distributors wanted to simplify wine labeling entirely.', 'it was later served at a diplomatic state dinner.']),
    ([('Restoration masons repoint old brickwork to', 'replace crumbling mortar without damaging the surrounding original brick.'), ('Because modern cement is harder than historic lime mortar,', 'using the wrong mix can trap moisture and damage old walls.'), ('One reason historic buildings require specialized masons is', 'that period-accurate techniques differ significantly from modern construction methods.'), ('The preservation society noted in its report that', 'one wall had required matching mortar mixed to a nineteenth-century recipe.')],
     ['because contractors wanted to replace the brick entirely with concrete.', 'it was later listed as a protected historic structure.']),
    ([('Beekeeping inspectors examine hives to', 'detect early signs of disease before it spreads to nearby colonies.'), ("Because a single infected hive can threaten an entire region's bee population,", 'inspectors are legally required to report certain diseases immediately.'), ('One reason colony collapse concerns researchers is', 'that the exact combination of causes remains only partly understood.'), ('The extension officer explained during the visit that', 'one region had lost nearly half its managed hives within a single winter.')],
     ['because honey producers wanted to reduce inspection frequency.', 'it was later linked to a specific agricultural pesticide.']),
    ([('Ice core researchers extract cylindrical samples to', 'study atmospheric conditions preserved in ancient trapped air.'), ('Because deeper ice layers formed further in the past,', 'a single core can reveal a continuous climate record spanning millennia.'), ('One reason polar drilling projects take years to complete is', 'that equipment must operate reliably in extreme, remote conditions.'), ('The research summary noted that', 'one core preserved a volcanic eruption recorded nowhere else on Earth.')],
     ['because mining companies wanted to survey the region for minerals.', 'it was later transported to a climate laboratory for further study.']),
    ([('Antique clock restorers disassemble old movements to', 'clean decades of dust and old lubricant from tiny internal gears.'), ("Because each clock's parts are typically hand-fitted,", 'restorers rarely interchange components between different clocks.'), ('One reason certain clockmakers remain famous is', 'that their movements have continued running accurately for centuries.'), ('The horologist explained during the workshop that', 'one clock had not been disassembled or serviced in over eighty years.')],
     ['because collectors wanted to convert every clock to electronic quartz.', 'it was later featured in a museum exhibit on precision engineering.']),
    ([('Wildlife veterinarians tranquilize animals to', 'perform necessary medical checks without causing unnecessary stress.'), ("Because dosage depends heavily on an animal's exact weight,", 'veterinarians estimate carefully before administering any sedative.'), ('One reason field veterinary work is unpredictable is', 'that wild animals rarely cooperate with a planned examination schedule.'), ('The wildlife report noted that', 'one animal required immediate release once its examination was complete.')],
     ['because hunters wanted to track the animals more easily.', 'it was later fitted with a satellite tracking collar.']),
    ([('Textile conservators stabilize antique fabric to', 'prevent further deterioration of fibers weakened by age and light exposure.'), ('Because old dyes can fade permanently under bright light,', 'conservators display textiles under carefully controlled lighting.'), ('One reason embroidered textiles are difficult to preserve is', 'that thread and backing fabric often age at different rates.'), ('The museum conservator explained during the tour that', 'one tapestry had required months of careful stabilization work.')],
     ['because collectors wanted to wash the fabric using modern detergent.', 'it was later reproduced as a printed replica for sale.']),
    ([('Soil scientists analyze mineral content to', 'determine which crops will grow best in a particular field.'), ('Because soil composition can vary significantly across a single farm,', 'modern testing often maps nutrient levels field by field.'), ('One reason soil depletion concerns farmers is', 'that restoring lost nutrients can take years of careful management.'), ('The agricultural report noted that', 'one field had required a complete rotation change to recover its fertility.')],
     ['because developers wanted to build housing on the tested land.', 'it was later used as a model site for regional soil research.']),
    ([('Marine archaeologists survey shipwreck sites to', 'document artifacts before looting or natural decay destroys them.'), ('Because saltwater accelerates the decay of most materials,', 'researchers prioritize the most fragile artifacts first.'), ('One reason shipwrecks fascinate historians is', 'that cargo manifests rarely survive, so the wreck itself becomes the only record.'), ('The expedition log noted that', 'one wreck had remained completely undisturbed for several centuries.')],
     ['because salvage companies wanted exclusive rights to sell the artifacts.', 'it was later declared a protected underwater heritage site.']),
    ([('Beekeepers extract honey by centrifuge to', 'separate honey from the wax comb without destroying the comb structure.'), ('Because comb can be reused once emptied,', 'careful extraction reduces how much new comb bees must build each season.'), ('One reason honey flavor varies by region is', 'that bees gather nectar from whichever flowers bloom nearby.'), ('The apiary manager explained during the harvest that', 'one hive had produced enough honey to fill dozens of jars.')],
     ['because processors wanted to blend honey from many different regions.', 'it was later entered into a regional honey tasting competition.']),
    ([('Restoration ironworkers reforge damaged railings to', 'match the original pattern using traditional blacksmithing techniques.'), ('Because cast iron and wrought iron behave differently under heat,', 'restorers must identify the original material before attempting repairs.'), ('One reason ornate ironwork is expensive to restore is', 'that few blacksmiths still practice traditional forging techniques.'), ('The restoration report noted that', 'one gate had required matching over two hundred individually forged elements.')],
     ['because the city wanted to replace all ironwork with modern steel.', 'it was later repainted using a historically accurate color.']),
    ([('Seed bank curators freeze-dry samples to', 'preserve genetic diversity for crops that may otherwise disappear.'), ('Because stored seeds slowly lose viability over time,', 'curators periodically regrow and re-collect fresh samples.'), ('One reason seed banks matter to agriculture is', 'that a single disease could otherwise wipe out an entire crop variety.'), ('The facility director explained during the tour that', 'one vault held samples collected from nearly every country in the world.')],
     ['because farmers wanted to patent every stored seed variety.', 'it was later duplicated at a second facility for safekeeping.']),
    ([('Restoration violinists play antique instruments to', 'test tonal quality after each stage of careful repair work.'), ("Because old varnish affects an instrument's sound as much as its appearance,", 'restorers avoid removing original varnish whenever possible.'), ('One reason certain violins remain extraordinarily valuable is', 'that their exact construction methods have never been fully replicated.'), ('The luthier noted during the restoration that', 'one instrument had changed ownership many times over three centuries.')],
     ['because orchestras wanted only newly manufactured instruments.', 'it was later insured for an extraordinary sum before a world tour.']),
    ([('Restoration bookbinders resew damaged pages to', 'repair centuries-old volumes without replacing the original paper.'), ('Because old paper becomes brittle with age,', 'bookbinders often work under magnification to avoid tearing fragile pages.'), ('One reason rare book restoration takes so long is', 'that each page must be handled and repaired individually.'), ('The librarian explained during the exhibit that', 'one volume had taken over a year to fully restore.')],
     ['because collectors wanted to digitize every page and discard the original.', 'it was later placed in a climate-controlled display case.']),
    ([('Restoration glaziers releaded stained glass windows to', 'replace corroded metal strips without disturbing the original colored glass.'), ('Because old glass was hand-blown and slightly uneven,', 'replacement pieces must be custom-matched rather than mass-produced.'), ('One reason cathedral windows require periodic restoration is', 'that centuries of weather exposure gradually weaken the supporting frame.'), ('The conservator explained during the project that', 'one window had required removing and repairing several thousand individual glass pieces.')],
     ['because the parish wanted to replace the windows with plain glass.', 'it was later rededicated in a special ceremony.']),
    ([('Restoration upholsterers strip old furniture frames to', 'expose original wood joinery before rebuilding damaged padding and fabric.'), ('Because horsehair stuffing was common in older furniture,', 'upholsterers sometimes discover unexpected materials during restoration.'), ('One reason antique furniture restoration commands high prices is', 'that reproducing period-accurate techniques requires specialized training.'), ('The furniture restorer explained during the consultation that', 'one chair had revealed a hidden repair from over a century earlier.')],
     ['because auction houses wanted every piece reupholstered identically.', 'it was later featured in a decorative arts exhibition.']),
    ([('Restoration locksmiths repair antique mechanisms to', 'keep historic locks functional without replacing their original parts.'), ('Because old locks were often handmade,', 'no replacement key can be cut without access to the original mechanism.'), ('One reason antique lock restoration is a rare specialty is', 'that few modern locksmiths train extensively in historical mechanisms.'), ('The curator mentioned during the tour that', 'one lock had continued functioning perfectly after more than two centuries.')],
     ['because building owners wanted every lock replaced with electronic keypads.', 'it was later documented as part of a historical hardware survey.']),
    ([('Restoration weavers repair antique tapestries to', 'reinforce weak threads without altering the original woven pattern.'), ('Because tapestry threads deteriorate at different rates depending on their dye,', 'some colors fade or weaken faster than others in the same piece.'), ('One reason tapestry restoration takes years is', 'that weavers must match centuries-old thread thickness and dye color precisely.'), ('The textile curator explained during the exhibit that', 'one tapestry had required thousands of individual thread repairs.')],
     ['because collectors wanted brighter, more vivid replacement colors.', 'it was later insured for display during an international tour.']),
    ([('Restoration stonemasons carve replacement blocks to', 'match weathered original stonework on historic building facades.'), ('Because quarries supplying the original stone often closed long ago,', 'masons must sometimes travel far to find a matching material.'), ('One reason cathedral stonework requires ongoing maintenance is', 'that pollution and weathering gradually erode exposed carved surfaces.'), ('The site supervisor explained during the tour that', 'one facade had required replacing dozens of individually carved stone blocks.')],
     ['because the city wanted to replace the stone facade with modern panels.', 'it was later documented in an architectural preservation journal.']),
]

WORDBANK_FRAMES = [
    (
        "{topic} has become a subject that draws attention from experts across many fields. Researchers "
        "make it a priority to (Ա) __________ accurate data before publishing their conclusions. Interest "
        "in the subject is fairly (Բ) __________ among younger audiences in particular. Universities are "
        "generally (Գ) __________ to fund studies that explore new angles on the topic.\n\n"
        "Before drawing final conclusions, it is wise to (Դ) __________ existing research carefully, since "
        "contradictory findings are not uncommon. Results are typically shared well in (Ե) __________ of "
        "any public announcement.",
        ["gather", "widespread", "willing", "review", "advance", "dismiss", "reluctant"],
    ),
    (
        "{topic} continues to shape how communities plan for the future. Officials try to (Ա) __________ "
        "reliable feedback from residents before approving major changes. Support for new proposals is "
        "often fairly (Բ) __________ once benefits become clear. Local leaders are usually (Գ) __________ "
        "to explain decisions publicly when asked.\n\n"
        "Before finalizing a proposal, planners (Դ) __________ every available report on potential impact. "
        "Budgets are typically prepared well in (Ե) __________ of the fiscal year.",
        ["collect", "strong", "prepared", "examine", "advance", "postpone", "hesitant"],
    ),
]


def _norm_local(s):
    import re
    return re.sub(r"\s+", " ", s.strip().lower())


def _pick_unused_sets(b, sets_pool, n_needed):
    """Walk sets_pool and return the first n_needed entries whose left-items are
    ALL unused in the registry or this exam's own picks so far — avoids relying
    on precomputed indices that break once history diverges."""
    chosen = []
    for entry in sets_pool:
        pairs = entry[0]
        keys = [_norm_local(p[0]) for p in pairs]
        if any(k in b.registry["matching_left"] or k in b.new_topics["matching_left"] for k in keys):
            continue
        chosen.append(entry)
        if len(chosen) == n_needed:
            return chosen
    return chosen  # fewer than needed left — caller's build() will surface this as a dup


def gen_section_xii(b, rng, exam_idx, start_num=73):
    """4 vocab-matching items (73-76), 4 fresh sets per exam, skipping already-used sets."""
    for i, (word_defs, extra) in enumerate(_pick_unused_sets(b, VOCAB_SETS, 4)):
        lefts, rights = _shuffle_options(rng, word_defs, extra)
        b.match_q(start_num + i, VOCAB_TOPIC, "հեշտ" if i == 0 else "միջին",
                   "Match the words and their definitions.", lefts, rights,
                   "Ամեն բառի համար գտնել ճշգրիտ սահմանումը:",
                   ["Համեմատել յուրաքանչյուր բառի իմաստը տրված սահմանումների հետ. մեկ սահմանում ավելորդ է:"])


def gen_section_xiii(b, rng, exam_idx, start_num=77):
    """4 sentence-matching items (77-80), skipping already-used sets."""
    for i, (pairs, extra) in enumerate(_pick_unused_sets(b, SENTMATCH_SETS, 4)):
        lefts, rights = _shuffle_options(rng, pairs, extra)
        diff = "բարձր" if i >= 2 else "միջին"
        b.match_q(start_num + i, SENTMATCH_TOPIC, diff, "Match the beginning and the end of the sentences.",
                   lefts, rights,
                   "Ուշադրություն դարձնել քերականական և իմաստային համապատասխանությանը:",
                   ["Յուրաքանչյուր սկիզբ ունի ուղիղ մեկ քերականորեն ու իմաստով համապատասխան ավարտ. 2 ավարտ ավելորդ են:"])


def gen_wordbank(b, rng, number, topic_name, exam_idx, frame_idx):
    frame, words = WORDBANK_FRAMES[frame_idx % len(WORDBANK_FRAMES)]
    text = frame.format(topic=topic_name) + f"\n\nWord bank (two are odd): " + "  ".join(
        f"{i+1}. {w}" for i, w in enumerate(words))
    lefts = [("blank (Ա)", 1), ("blank (Բ)", 2), ("blank (Գ)", 3), ("blank (Դ)", 4), ("blank (Ե)", 5)]
    b.match_q(number, WORDBANK_TOPIC, "միջին", text, lefts, words,
              "Ամեն բացվածքի համար ստուգել բառի իմաստն ու քերականական դերը:",
              ["Յուրաքանչյուր բացվածք համապատասխանում է ուղիղ մեկ բառի իմաստով և ձևով. 2 բառ ավելորդ են:"])


# ============================================================ VI/VIII/X/XI BANKS
# Each box: (statements[5], true_idx set, hint, steps)

REPORTED_BOXES = [
    (['"Why did you cancel the order at the last minute?" the manager asked the supplier.\n'
      "The manager asked the supplier why he had cancelled the order at the last minute.",
      '"Don\'t assume that the client will renew the contract," Sara said to me.\n'
      "Sara warned me not to assume that the client would renew the contract.",
      "Ben asked me to outline the budget proposal.\n"
      'Ben says to me: "Could you possibly outline the budget proposal?"',
      '"I regret that I didn\'t back up the files sooner," Amir said to me.\n'
      "Amir told me that he regretted not backing up the files sooner.",
      '"It\'s quite late. Maybe we should reschedule the call," Nadia said.\n'
      "Nadia suggested to reschedule the call as it was quite late."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you called, we had already shipped the order," Owen said.\n'
      "Owen told that by the time I had called, they had already shipped the order.",
      '"Can you explain why the totals don\'t match?" Farah asked the accountant.\n'
      "Farah asked the accountant if he could explain why the totals didn't match.",
      'Leo said to Ana: "I\'m sure the client will approve the design."\n'
      "Leo assured Ana that the client would approve the design.",
      'The chef said to the trainees, "Butter melts at a low temperature."\n'
      "The chef told the trainees that butter melts at a low temperature.",
      "The junior clerk begged the manager to explain everything about the new policy.\n"
      '"I beg you to explain everything about the new policy," said the junior clerk.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just submitted the report. Everything checks out," Grace said.\n'
      "Grace told James that she had just submitted the report and added that everything checked out.",
      '"What time will the workshop start next Monday?" the trainees asked the coordinator.\n'
      "The trainees asked the coordinator what time the workshop would start the following Monday.",
      '"Once the merger is finalized, staff won\'t be relocated," the director said.\n'
      "The director stated that once the merger was finalized, staff wouldn't be relocated.",
      "Victor apologized to Elena for interrupting her the day before.\n"
      '"I\'m sorry for interrupting you yesterday," Victor said to Elena.',
      '"If you plan to visit the plant, ask Sam to escort you," the foreman said to Nora.\n'
      "Nora's foreman asked Sam to escort her if she planned to visit the plant."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում վարպետն ասում է Նորային, ուստի ճիշտ է «Nora's foreman told Nora to ask Sam...»։"]),
    (['"I will launch the product at the fair the day after tomorrow," Dr. Reyes said.\n'
      "Dr. Reyes said that he would launch the product at the fair in two days' time.",
      '"If you don\'t confirm the booking today, the rate will change," Priya said to Tom.\n'
      "Priya told Tom that the rate would change if he hadn't confirmed the booking today.",
      "My colleague warned me not to share the password as it would compromise the account.\n"
      '"Don\'t share the password; it will compromise the account," my colleague said to me.',
      'Farid said, "I will accept the offer which is presented to me."\n'
      "Farid said that he would accept the offer which was presented to him.",
      '"Will either Nadia or Omar present the findings tomorrow?" Rosa asked.\n'
      "Rosa asked Nadia whether she or Omar would present the findings the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (["The supervisor didn't allow Priya to leave the site early.\n"
      'The supervisor says to Priya, "Would you mind staying at the site until the end of the shift?"',
      '"I have been drafting the proposal for two weeks. I need to finish it today," Diego said.\n'
      "Diego said he had been drafting the proposal for two weeks to finish it that day.",
      "Hana told me that she would like to join the mentoring program.\n"
      'Hana said to me, "I would like to join the mentoring program."',
      'Tariq asked his manager, "Must I submit the timesheet tonight?"\n'
      "Tariq asked his manager to submit the timesheet that night.",
      'The client said to Lena, "When does the offer expire?"\n'
      "The client asked Lena when the offer expired."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։"]),
    (['"Why did you delay the diagnosis until Thursday?" the patient asked the doctor.\n'
      "The patient asked the doctor why he had delayed the diagnosis until Thursday.",
      '"Don\'t assume that the treatment will work immediately," the nurse said to me.\n'
      "The nurse warned me not to assume that the treatment would work immediately.",
      "Maya asked me to explain the test results.\n"
      'Maya says to me: "Could you possibly explain the test results?"',
      '"I regret that I didn\'t schedule the surgery sooner," Aram said to me.\n'
      "Aram told me that he regretted not scheduling the surgery sooner.",
      '"It\'s quite crowded. Maybe we should book an earlier appointment," Lucy said.\n'
      "Lucy suggested to book an earlier appointment as it was quite crowded."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you submitted, we had already graded the essays," Professor Lane said.\n'
      "Professor Lane told that by the time I had submitted, they had already graded the essays.",
      '"Can you tell me why the results don\'t match the hypothesis?" the student asked the supervisor.\n'
      "The student asked the supervisor if he could tell her why the results didn't match the hypothesis.",
      'Nora said to Ken: "I\'m sure the committee will accept your thesis."\n'
      "Nora assured Ken that the committee would accept his thesis.",
      'The lecturer said to the class, "Light travels faster than sound."\n'
      "The lecturer told the class that light travels faster than sound.",
      "The assistant begged the dean to explain everything about the new policy.\n"
      '"I beg you to explain everything about the new policy," said the assistant.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just finished the inventory. Everything\'s accounted for," Marco said.\n'
      "Marco told the owner that he had just finished the inventory and added that everything was accounted for.",
      '"What time will the delivery arrive next Tuesday?" the chef asked the supplier.\n'
      "The chef asked the supplier what time the delivery would arrive the following Tuesday.",
      '"Once the new menu launches, prices won\'t be negotiable," the manager said.\n'
      "The manager stated that once the new menu launched, prices wouldn't be negotiable.",
      "Sofia apologized to the guest for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Sofia said to the guest.',
      '"If you plan to host the event, ask Leo to confirm the guest count," the organizer said to Mira.\n'
      "Mira's organizer asked Leo to confirm the guest count if she planned to host the event."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում կազմակերպիչն ասում է Միրային, ուստի ճիշտ է «Mira's organizer told Mira to ask Leo...»։"]),
    (['"I will demo the app at the conference the day after tomorrow," Priya said.\n'
      "Priya said that she would demo the app at the conference in two days' time.",
      '"If you don\'t back up the server today, data will be lost," Karim said to Ana.\n'
      "Karim told Ana that data would be lost if she hadn't backed up the server today.",
      "My teammate warned me not to push the update untested as it would break the app.\n"
      '"Don\'t push the update untested; it will break the app," my teammate said to me.',
      'Diego said, "I will use the framework which is recommended to me."\n'
      "Diego said that he would use the framework which was recommended to him.",
      '"Will either Sam or Alex present the demo tomorrow?" the founder asked.\n'
      "The founder asked Sam whether he or Alex would present the demo the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't back up», ոչ «hadn't backed up»։"]),
    (["The guide didn't allow tourists to leave the group early.\n"
      'The guide says to the tourists, "Would you mind staying with the group until the end of the tour?"',
      '"I have been planning the itinerary for two weeks. I need to finalize it today," Elena said.\n'
      "Elena said she had been planning the itinerary for two weeks to finalize it that day.",
      "Noah told me that he would like to join the excursion.\n"
      'Noah said to me, "I would like to join the excursion."',
      'Yuki asked her guide, "Must I carry my passport tonight?"\n'
      "Yuki asked her guide to carry her passport that night.",
      'The traveler said to the agent, "When does the tour begin?"\n'
      "The traveler asked the agent when the tour began."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether she had to carry»։"]),
    (['"Why did you return the item without a receipt?" the clerk asked the customer.\n'
      "The clerk asked the customer why she had returned the item without a receipt.",
      '"Don\'t assume that the refund will be automatic," the manager said to me.\n'
      "The manager warned me not to assume that the refund would be automatic.",
      "Liam asked me to check the inventory count.\n"
      'Liam says to me: "Could you possibly check the inventory count?"',
      '"I regret that I didn\'t compare prices sooner," Dana said to me.\n'
      "Dana told me that she regretted not comparing prices sooner.",
      '"It\'s quite busy. Maybe we should open another register," Femi said.\n'
      "Femi suggested to open another register as it was quite busy."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already restocked the shelves," Tom said.\n'
      "Tom told that by the time I had arrived, they had already restocked the shelves.",
      '"Can you tell me why the prices don\'t match the tags?" the customer asked the cashier.\n'
      "The customer asked the cashier if he could tell her why the prices didn't match the tags.",
      'Ivy said to Ben: "I\'m sure the supplier will honor the discount."\n'
      "Ivy assured Ben that the supplier would honor the discount.",
      'The trainer said to the new hires, "Customers appreciate quick service."\n'
      "The trainer told the new hires that customers appreciate quick service.",
      "The stock clerk begged the supervisor to explain everything about the new pricing system.\n"
      '"I beg you to explain everything about the new pricing system," said the stock clerk.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just counted the till. Everything balances," Rosa said.\n'
      "Rosa told her manager that she had just counted the till and added that everything balanced.",
      '"What time will the shipment arrive next Wednesday?" the buyer asked the supplier.\n'
      "The buyer asked the supplier what time the shipment would arrive the following Wednesday.",
      '"Once the sale ends, discounts won\'t apply," the manager said.\n'
      "The manager stated that once the sale ended, discounts wouldn't apply.",
      "Kofi apologized to the customer for the mix-up the day before.\n"
      '"I\'m sorry for the mix-up yesterday," Kofi said to the customer.',
      '"If you plan to return the item, ask Nia to process it," the supervisor said to Omar.\n'
      "Omar's supervisor asked Nia to process it if he planned to return the item."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում ղեկավարն ասում է Օմարին, ուստի ճիշտ է «Omar's supervisor told Omar to ask Nia...»։"]),
    (['"I will restock the shelves the day after tomorrow," Sara said.\n'
      "Sara said that she would restock the shelves in two days' time.",
      '"If you don\'t scan the barcode correctly, the price will be wrong," Leo said to Amy.\n'
      "Leo told Amy that the price would be wrong if she hadn't scanned the barcode correctly.",
      "My colleague warned me not to leave the register unattended as it would violate policy.\n"
      '"Don\'t leave the register unattended; it will violate policy," my colleague said to me.',
      'Grace said, "I will use the discount which is offered to me."\n'
      "Grace said that she would use the discount which was offered to her.",
      '"Will either Zara or Leo handle returns tomorrow?" Priya asked.\n'
      "Priya asked Zara whether she or Leo would handle returns the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't scan», ոչ «hadn't scanned»։"]),
    (["The supervisor didn't allow Mia to leave the counter early.\n"
      'The supervisor says to Mia, "Would you mind staying at the counter until closing?"',
      '"I have been organizing the stockroom for two weeks. I need to finish it today," Ken said.\n'
      "Ken said he had been organizing the stockroom for two weeks to finish it that day.",
      "Nadia told me that she would like to join the sales team.\n"
      'Nadia said to me, "I would like to join the sales team."',
      'Theo asked his manager, "Must I count the drawer tonight?"\n'
      "Theo asked his manager to count the drawer that night.",
      'The shopper said to the assistant, "When does the store close?"\n'
      "The shopper asked the assistant when the store closed."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to count»։"]),
    (['"Why did you delay the boarding until 6pm?" the passenger asked the agent.\n'
      "The passenger asked the agent why he had delayed the boarding until 6pm.",
      '"Don\'t assume that the flight will depart on time," the pilot said to me.\n'
      "The pilot warned me not to assume that the flight would depart on time.",
      "Nia asked me to check the weather report.\n"
      'Nia says to me: "Could you possibly check the weather report?"',
      '"I regret that I didn\'t confirm the gate sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not confirming the gate sooner.",
      '"It\'s quite windy. Maybe we should delay takeoff," Petra said.\n'
      "Petra suggested to delay takeoff as it was quite windy."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you landed, we had already refueled the aircraft," the crew chief said.\n'
      "The crew chief told that by the time I had landed, they had already refueled the aircraft.",
      '"Can you tell me why the engines don\'t respond?" the co-pilot asked the mechanic.\n'
      "The co-pilot asked the mechanic if he could tell her why the engines didn't respond.",
      'Dara said to Milo: "I\'m sure the tower will approve the flight plan."\n'
      "Dara assured Milo that the tower would approve the flight plan.",
      'The instructor said to the cadets, "Air pressure decreases with altitude."\n'
      "The instructor told the cadets that air pressure decreases with altitude.",
      "The trainee begged the captain to explain everything about the emergency procedure.\n"
      '"I beg you to explain everything about the emergency procedure," said the trainee.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just completed the checklist. Everything\'s ready," Wren said.\n'
      "Wren told the captain that she had just completed the checklist and added that everything was ready.",
      '"What time will the connecting flight depart next Sunday?" the traveler asked the agent.\n'
      "The traveler asked the agent what time the connecting flight would depart the following Sunday.",
      '"Once the runway reopens, flights won\'t be delayed further," the controller said.\n'
      "The controller stated that once the runway reopened, flights wouldn't be delayed further.",
      "Iris apologized to the passenger for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Iris said to the passenger.',
      '"If you plan to board early, ask Finn to confirm your seat," the agent said to Lola.\n'
      "Lola's agent asked Finn to confirm her seat if she planned to board early."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում գործակալն ասում է Լոլային, ուստի ճիշտ է «Lola's agent told Lola to ask Finn...»։"]),
    (['"I will inspect the aircraft the day after tomorrow," the engineer said.\n'
      "The engineer said that she would inspect the aircraft in two days' time.",
      '"If you don\'t secure the cargo properly, the flight will be delayed," Karim said to Ana.\n'
      "Karim told Ana that the flight would be delayed if she hadn't secured the cargo properly.",
      "My colleague warned me not to skip the pre-flight check as it would risk safety.\n"
      '"Don\'t skip the pre-flight check; it will risk safety," my colleague said to me.',
      'Owen said, "I will fly the route which is assigned to me."\n'
      "Owen said that he would fly the route which was assigned to him.",
      '"Will either Nash or Ravi pilot the flight tomorrow?" Priya asked.\n'
      "Priya asked Nash whether he or Ravi would pilot the flight the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't secure», ոչ «hadn't secured»։"]),
    (["The supervisor didn't allow Kira to leave the cockpit early.\n"
      'The supervisor says to Kira, "Would you mind staying in the cockpit until landing?"',
      '"I have been reviewing the manual for two weeks. I need to finish it today," Dax said.\n'
      "Dax said he had been reviewing the manual for two weeks to finish it that day.",
      "Yara told me that she would like to join the flight crew.\n"
      'Yara said to me, "I would like to join the flight crew."',
      'Reo asked his instructor, "Must I log the hours tonight?"\n'
      "Reo asked his instructor to log the hours that night.",
      'The passenger said to the attendant, "When does boarding begin?"\n'
      "The passenger asked the attendant when boarding began."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to log»։"]),
    (['"Why did you postpone the inspection until Friday?" the inspector asked the foreman.\n'
      "The inspector asked the foreman why he had postponed the inspection until Friday.",
      '"Don\'t assume that the permit will be approved," the architect said to me.\n'
      "The architect warned me not to assume that the permit would be approved.",
      "Zane asked me to review the blueprints.\n"
      'Zane says to me: "Could you possibly review the blueprints?"',
      '"I regret that I didn\'t order the materials sooner," Priya said to me.\n'
      "Priya told me that she regretted not ordering the materials sooner.",
      '"It\'s quite unstable. Maybe we should reinforce the foundation," Marco said.\n'
      "Marco suggested to reinforce the foundation as it was quite unstable."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already poured the concrete," the site manager said.\n'
      "The site manager told that by the time I had arrived, they had already poured the concrete.",
      '"Can you tell me why the beams don\'t align?" the engineer asked the contractor.\n'
      "The engineer asked the contractor if he could tell her why the beams didn't align.",
      'Lena said to Theo: "I\'m sure the council will approve the design."\n'
      "Lena assured Theo that the council would approve the design.",
      'The supervisor said to the crew, "Concrete cures faster in warm weather."\n'
      "The supervisor told the crew that concrete cures faster in warm weather.",
      "The apprentice begged the foreman to explain everything about the safety protocol.\n"
      '"I beg you to explain everything about the safety protocol," said the apprentice.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just finished the survey. Everything\'s accurate," Nadir said.\n'
      "Nadir told the engineer that he had just finished the survey and added that everything was accurate.",
      '"What time will the delivery arrive next Thursday?" the foreman asked the supplier.\n'
      "The foreman asked the supplier what time the delivery would arrive the following Thursday.",
      '"Once the permit is granted, work won\'t be delayed further," the architect said.\n'
      "The architect stated that once the permit was granted, work wouldn't be delayed further.",
      "Sami apologized to the client for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Sami said to the client.',
      '"If you plan to visit the site, ask Tara to guide you," the manager said to Kobe.\n'
      "Kobe's manager asked Tara to guide him if he planned to visit the site."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում ղեկավարն ասում է Կոբեին, ուստի ճիշտ է «Kobe's manager told Kobe to ask Tara...»։"]),
    (['"I will submit the report at the meeting the day after tomorrow," the engineer said.\n'
      "The engineer said that she would submit the report at the meeting in two days' time.",
      '"If you don\'t reinforce the structure properly, the inspection will fail," Nia said to Tom.\n'
      "Nia told Tom that the inspection would fail if he hadn't reinforced the structure properly.",
      "My colleague warned me not to remove the scaffolding early as it would be unsafe.\n"
      '"Don\'t remove the scaffolding early; it will be unsafe," my colleague said to me.',
      'Deja said, "I will use the design which is approved for me."\n'
      "Deja said that she would use the design which was approved for her.",
      '"Will either Cole or Ana inspect the site tomorrow?" Rosa asked.\n'
      "Rosa asked Cole whether he or Ana would inspect the site the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't reinforce», ոչ «hadn't reinforced»։"]),
    (["The supervisor didn't allow Femi to leave the site early.\n"
      'The supervisor says to Femi, "Would you mind staying at the site until the shift ends?"',
      '"I have been reviewing the plans for two weeks. I need to finish it today," Kade said.\n'
      "Kade said he had been reviewing the plans for two weeks to finish it that day.",
      "Priya told me that she would like to join the design team.\n"
      'Priya said to me, "I would like to join the design team."',
      'Omar asked his supervisor, "Must I submit the report tonight?"\n'
      "Omar asked his supervisor to submit the report that night.",
      'The client said to the architect, "When does construction begin?"\n'
      "The client asked the architect when construction began."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։"]),
    (['"Why did you delay the listing until Friday?" the agent asked the seller.\n'
      "The agent asked the seller why he had delayed the listing until Friday.",
      '"Don\'t assume that the buyer will accept the offer," the broker said to me.\n'
      "The broker warned me not to assume that the buyer would accept the offer.",
      "Nadia asked me to check the property records.\n"
      'Nadia says to me: "Could you possibly check the property records?"',
      '"I regret that I didn\'t inspect the roof sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not inspecting the roof sooner.",
      '"It\'s quite risky. Maybe we should lower the asking price," Petra said.\n'
      "Petra suggested to lower the asking price as it was quite risky."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already signed the lease," the landlord said.\n'
      "The landlord told that by the time I had arrived, they had already signed the lease.",
      '"Can you tell me why the appraisal doesn\'t match the price?" the buyer asked the agent.\n'
      "The buyer asked the agent if he could tell her why the appraisal didn't match the price.",
      'Dara said to Milo: "I\'m sure the bank will approve the mortgage."\n'
      "Dara assured Milo that the bank would approve the mortgage.",
      'The instructor said to the trainees, "Property values rise near good schools."\n'
      "The instructor told the trainees that property values rise near good schools.",
      "The intern begged the broker to explain everything about the closing process.\n"
      '"I beg you to explain everything about the closing process," said the intern.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just reviewed the contract. Everything\'s in order," Rosa said.\n'
      "Rosa told her client that she had just reviewed the contract and added that everything was in order.",
      '"What time will the inspector arrive next Wednesday?" the seller asked the agent.\n'
      "The seller asked the agent what time the inspector would arrive the following Wednesday.",
      '"Once the deal closes, the keys won\'t be released early," the agent said.\n'
      "The agent stated that once the deal closed, the keys wouldn't be released early.",
      "Kofi apologized to the client for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Kofi said to the client.',
      '"If you plan to view the property, ask Nia to unlock it," the agent said to Omar.\n'
      "Omar's agent asked Nia to unlock it if he planned to view the property."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում գործակալն ասում է Օմարին, ուստի ճիշտ է «Omar's agent told Omar to ask Nia...»։"]),
    (['"I will list the property the day after tomorrow," Sara said.\n'
      "Sara said that she would list the property in two days' time.",
      '"If you don\'t submit the paperwork correctly, the sale will be delayed," Leo said to Amy.\n'
      "Leo told Amy that the sale would be delayed if she hadn't submitted the paperwork correctly.",
      "My colleague warned me not to sign the contract early as it would violate policy.\n"
      '"Don\'t sign the contract early; it will violate policy," my colleague said to me.',
      'Grace said, "I will use the agent which is recommended to me."\n'
      "Grace said that she would use the agent which was recommended to her.",
      '"Will either Zara or Leo handle the closing tomorrow?" Priya asked.\n'
      "Priya asked Zara whether she or Leo would handle the closing the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't submit», ոչ «hadn't submitted»։"]),
    (["The broker didn't allow Mia to leave the office early.\n"
      'The broker says to Mia, "Would you mind staying at the office until closing?"',
      '"I have been organizing the listings for two weeks. I need to finish it today," Ken said.\n'
      "Ken said he had been organizing the listings for two weeks to finish it that day.",
      "Nadia told me that she would like to join the sales team.\n"
      'Nadia said to me, "I would like to join the sales team."',
      'Theo asked his manager, "Must I file the paperwork tonight?"\n'
      "Theo asked his manager to file the paperwork that night.",
      'The buyer said to the agent, "When does the office open?"\n'
      "The buyer asked the agent when the office opened."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to file»։"]),
    (['"Why did you delay the update until Friday?" the manager asked the developer.\n'
      "The manager asked the developer why he had delayed the update until Friday.",
      '"Don\'t assume that the patch will fix everything," the lead said to me.\n'
      "The lead warned me not to assume that the patch would fix everything.",
      "Zane asked me to check the server logs.\n"
      'Zane says to me: "Could you possibly check the server logs?"',
      '"I regret that I didn\'t test the feature sooner," Priya said to me.\n'
      "Priya told me that she regretted not testing the feature sooner.",
      '"It\'s quite unstable. Maybe we should roll back the release," Marco said.\n'
      "Marco suggested to roll back the release as it was quite unstable."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already deployed the fix," the lead engineer said.\n'
      "The lead engineer told that by the time I had arrived, they had already deployed the fix.",
      '"Can you tell me why the tests don\'t pass?" the developer asked the reviewer.\n'
      "The developer asked the reviewer if he could tell her why the tests didn't pass.",
      'Lena said to Theo: "I\'m sure the client will approve the release."\n'
      "Lena assured Theo that the client would approve the release.",
      'The trainer said to the interns, "Servers require regular maintenance."\n'
      "The trainer told the interns that servers require regular maintenance.",
      "The junior developer begged the lead to explain everything about the deployment process.\n"
      '"I beg you to explain everything about the deployment process," said the junior developer.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just merged the branch. Everything\'s stable," Nadir said.\n'
      "Nadir told the lead that he had just merged the branch and added that everything was stable.",
      '"What time will the release deploy next Thursday?" the client asked the developer.\n'
      "The client asked the developer what time the release would deploy the following Thursday.",
      '"Once the sprint ends, tickets won\'t be reassigned," the manager said.\n'
      "The manager stated that once the sprint ended, tickets wouldn't be reassigned.",
      "Sami apologized to the client for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Sami said to the client.',
      '"If you plan to review the code, ask Tara to explain it," the lead said to Kobe.\n'
      "Kobe's lead asked Tara to explain it if he planned to review the code."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում ղեկավարն ասում է Կոբեին, ուստի ճիշտ է «Kobe's lead told Kobe to ask Tara...»։"]),
    (['"I will deploy the feature the day after tomorrow," the engineer said.\n'
      "The engineer said that she would deploy the feature in two days' time.",
      '"If you don\'t document the changes properly, the release will be delayed," Nia said to Tom.\n'
      "Nia told Tom that the release would be delayed if he hadn't documented the changes properly.",
      "My colleague warned me not to skip the code review as it would be risky.\n"
      '"Don\'t skip the code review; it will be risky," my colleague said to me.',
      'Deja said, "I will use the framework which is approved for me."\n'
      "Deja said that she would use the framework which was approved for her.",
      '"Will either Cole or Ana review the pull request tomorrow?" Rosa asked.\n'
      "Rosa asked Cole whether he or Ana would review the pull request the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't document», ոչ «hadn't documented»։"]),
    (["The lead didn't allow Femi to leave the sprint review early.\n"
      'The lead says to Femi, "Would you mind staying until the review ends?"',
      '"I have been reviewing the codebase for two weeks. I need to finish it today," Kade said.\n'
      "Kade said he had been reviewing the codebase for two weeks to finish it that day.",
      "Priya told me that she would like to join the platform team.\n"
      'Priya said to me, "I would like to join the platform team."',
      'Omar asked his lead, "Must I submit the report tonight?"\n'
      "Omar asked his lead to submit the report that night.",
      'The client said to the developer, "When does the update launch?"\n'
      "The client asked the developer when the update launched."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։"]),
    (['"Why did you cancel the lesson until Friday?" the parent asked the tutor.\n'
      "The parent asked the tutor why he had cancelled the lesson until Friday.",
      '"Don\'t assume that the exam will be easy," the teacher said to me.\n'
      "The teacher warned me not to assume that the exam would be easy.",
      "Nadia asked me to check the attendance sheet.\n"
      'Nadia says to me: "Could you possibly check the attendance sheet?"',
      '"I regret that I didn\'t review the syllabus sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not reviewing the syllabus sooner.",
      '"It\'s quite noisy. Maybe we should move to another classroom," Petra said.\n'
      "Petra suggested to move to another classroom as it was quite noisy."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already graded the exams," the teacher said.\n'
      "The teacher told that by the time I had arrived, they had already graded the exams.",
      '"Can you tell me why the scores don\'t match?" the parent asked the teacher.\n'
      "The parent asked the teacher if he could tell her why the scores didn't match.",
      'Dara said to Milo: "I\'m sure the board will approve the field trip."\n'
      "Dara assured Milo that the board would approve the field trip.",
      'The professor said to the students, "Practice improves memory retention."\n'
      "The professor told the students that practice improves memory retention.",
      "The intern begged the tutor to explain everything about the grading rubric.\n"
      '"I beg you to explain everything about the grading rubric," said the intern.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just graded the essays. Everything checks out," Rosa said.\n'
      "Rosa told her colleague that she had just graded the essays and added that everything checked out.",
      '"What time will the workshop start next Monday?" the student asked the tutor.\n'
      "The student asked the tutor what time the workshop would start the following Monday.",
      '"Once the semester ends, grades won\'t be changed," the professor said.\n'
      "The professor stated that once the semester ended, grades wouldn't be changed.",
      "Kofi apologized to the student for the mix-up the day before.\n"
      '"I\'m sorry for the mix-up yesterday," Kofi said to the student.',
      '"If you plan to visit the library, ask Nia to guide you," the tutor said to Omar.\n'
      "Omar's tutor asked Nia to guide him if he planned to visit the library."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում դասատուն ասում է Օմարին, ուստի ճիշտ է «Omar's tutor told Omar to ask Nia...»։"]),
    (['"I will grade the exams the day after tomorrow," Sara said.\n'
      "Sara said that she would grade the exams in two days' time.",
      '"If you don\'t submit the assignment correctly, the grade will be lowered," Leo said to Amy.\n'
      "Leo told Amy that the grade would be lowered if she hadn't submitted the assignment correctly.",
      "My colleague warned me not to skip the meeting early as it would violate policy.\n"
      '"Don\'t skip the meeting early; it will violate policy," my colleague said to me.',
      'Grace said, "I will use the textbook which is recommended to me."\n'
      "Grace said that she would use the textbook which was recommended to her.",
      '"Will either Zara or Leo teach the class tomorrow?" Priya asked.\n'
      "Priya asked Zara whether she or Leo would teach the class the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't submit», ոչ «hadn't submitted»։"]),
    (["The tutor didn't allow Mia to leave the session early.\n"
      'The tutor says to Mia, "Would you mind staying until the session ends?"',
      '"I have been preparing the curriculum for two weeks. I need to finish it today," Ken said.\n'
      "Ken said he had been preparing the curriculum for two weeks to finish it that day.",
      "Nadia told me that she would like to join the tutoring program.\n"
      'Nadia said to me, "I would like to join the tutoring program."',
      'Theo asked his professor, "Must I submit the essay tonight?"\n'
      "Theo asked his professor to submit the essay that night.",
      'The student said to the tutor, "When does the session begin?"\n'
      "The student asked the tutor when the session began."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։"]),
    (['"Why did you delay the shipment until Friday?" the client asked the driver.\n'
      "The client asked the driver why he had delayed the shipment until Friday.",
      '"Don\'t assume that the package will arrive early," the dispatcher said to me.\n'
      "The dispatcher warned me not to assume that the package would arrive early.",
      "Nia asked me to check the tracking number.\n"
      'Nia says to me: "Could you possibly check the tracking number?"',
      '"I regret that I didn\'t confirm the address sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not confirming the address sooner.",
      '"It\'s quite delayed. Maybe we should notify the customer," Petra said.\n'
      "Petra suggested to notify the customer as it was quite delayed."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you called, we had already dispatched the truck," the manager said.\n'
      "The manager told that by the time I had called, they had already dispatched the truck.",
      '"Can you tell me why the shipment doesn\'t match the order?" the client asked the clerk.\n'
      "The client asked the clerk if he could tell her why the shipment didn't match the order.",
      'Dara said to Milo: "I\'m sure the carrier will approve the refund."\n'
      "Dara assured Milo that the carrier would approve the refund.",
      'The trainer said to the drivers, "Fuel costs rise during peak season."\n'
      "The trainer told the drivers that fuel costs rise during peak season.",
      "The intern begged the supervisor to explain everything about the tracking system.\n"
      '"I beg you to explain everything about the tracking system," said the intern.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just confirmed the delivery. Everything\'s on schedule," Rosa said.\n'
      "Rosa told her manager that she had just confirmed the delivery and added that everything was on schedule.",
      '"What time will the truck depart next Wednesday?" the client asked the dispatcher.\n'
      "The client asked the dispatcher what time the truck would depart the following Wednesday.",
      '"Once the route changes, deliveries won\'t be rescheduled," the manager said.\n'
      "The manager stated that once the route changed, deliveries wouldn't be rescheduled.",
      "Kofi apologized to the client for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Kofi said to the client.',
      '"If you plan to track the shipment, ask Nia to check the system," the manager said to Omar.\n'
      "Omar's manager asked Nia to check the system if he planned to track the shipment."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում ղեկավարն ասում է Օմարին, ուստի ճիշտ է «Omar's manager told Omar to ask Nia...»։"]),
    (['"I will confirm the delivery the day after tomorrow," Sara said.\n'
      "Sara said that she would confirm the delivery in two days' time.",
      '"If you don\'t label the boxes correctly, the shipment will be delayed," Leo said to Amy.\n'
      "Leo told Amy that the shipment would be delayed if she hadn't labeled the boxes correctly.",
      "My colleague warned me not to leave the warehouse unlocked as it would violate policy.\n"
      '"Don\'t leave the warehouse unlocked; it will violate policy," my colleague said to me.',
      'Grace said, "I will use the route which is recommended to me."\n'
      "Grace said that she would use the route which was recommended to her.",
      '"Will either Zara or Leo handle dispatch tomorrow?" Priya asked.\n'
      "Priya asked Zara whether she or Leo would handle dispatch the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't label», ոչ «hadn't labeled»։"]),
    (["The dispatcher didn't allow Mia to leave the depot early.\n"
      'The dispatcher says to Mia, "Would you mind staying at the depot until the shift ends?"',
      '"I have been organizing the routes for two weeks. I need to finish it today," Ken said.\n'
      "Ken said he had been organizing the routes for two weeks to finish it that day.",
      "Nadia told me that she would like to join the logistics team.\n"
      'Nadia said to me, "I would like to join the logistics team."',
      'Theo asked his manager, "Must I log the delivery tonight?"\n'
      "Theo asked his manager to log the delivery that night.",
      'The client said to the dispatcher, "When does the depot open?"\n'
      "The client asked the dispatcher when the depot opened."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to log»։"]),
    (['"Why did you delay the harvest until Friday?" the buyer asked the farmer.\n'
      "The buyer asked the farmer why he had delayed the harvest until Friday.",
      '"Don\'t assume that the crop will sell at a good price," the trader said to me.\n'
      "The trader warned me not to assume that the crop would sell at a good price.",
      "Nia asked me to check the soil samples.\n"
      'Nia says to me: "Could you possibly check the soil samples?"',
      '"I regret that I didn\'t irrigate the field sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not irrigating the field sooner.",
      '"It\'s quite dry. Maybe we should delay planting," Petra said.\n'
      "Petra suggested to delay planting as it was quite dry."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already harvested the field," the farmer said.\n'
      "The farmer told that by the time I had arrived, they had already harvested the field.",
      '"Can you tell me why the yields don\'t match?" the buyer asked the inspector.\n'
      "The buyer asked the inspector if he could tell her why the yields didn't match.",
      'Dara said to Milo: "I\'m sure the cooperative will approve the loan."\n'
      "Dara assured Milo that the cooperative would approve the loan.",
      'The instructor said to the trainees, "Crops need consistent watering."\n'
      "The instructor told the trainees that crops need consistent watering.",
      "The intern begged the farmer to explain everything about the irrigation system.\n"
      '"I beg you to explain everything about the irrigation system," said the intern.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just checked the soil. Everything\'s ready," Rosa said.\n'
      "Rosa told her supervisor that she had just checked the soil and added that everything was ready.",
      '"What time will the harvester arrive next Tuesday?" the farmer asked the contractor.\n'
      "The farmer asked the contractor what time the harvester would arrive the following Tuesday.",
      '"Once the season ends, prices won\'t be negotiable," the trader said.\n'
      "The trader stated that once the season ended, prices wouldn't be negotiable.",
      "Kofi apologized to the buyer for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Kofi said to the buyer.',
      '"If you plan to visit the farm, ask Nia to guide you," the manager said to Omar.\n'
      "Omar's manager asked Nia to guide him if he planned to visit the farm."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում ղեկավարն ասում է Օմարին, ուստի ճիշտ է «Omar's manager told Omar to ask Nia...»։"]),
    (['"I will harvest the field the day after tomorrow," Sara said.\n'
      "Sara said that she would harvest the field in two days' time.",
      '"If you don\'t irrigate the crop properly, the yield will drop," Leo said to Amy.\n'
      "Leo told Amy that the yield would drop if she hadn't irrigated the crop properly.",
      "My colleague warned me not to leave the gate open as it would let livestock escape.\n"
      '"Don\'t leave the gate open; it will let livestock escape," my colleague said to me.',
      'Grace said, "I will use the seed which is recommended to me."\n'
      "Grace said that she would use the seed which was recommended to her.",
      '"Will either Zara or Leo manage the harvest tomorrow?" Priya asked.\n'
      "Priya asked Zara whether she or Leo would manage the harvest the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't irrigate», ոչ «hadn't irrigated»։"]),
    (["The farmer didn't allow Mia to leave the field early.\n"
      'The farmer says to Mia, "Would you mind staying in the field until sunset?"',
      '"I have been preparing the soil for two weeks. I need to finish it today," Ken said.\n'
      "Ken said he had been preparing the soil for two weeks to finish it that day.",
      "Nadia told me that she would like to join the cooperative.\n"
      'Nadia said to me, "I would like to join the cooperative."',
      'Theo asked his manager, "Must I water the crops tonight?"\n'
      "Theo asked his manager to water the crops that night.",
      'The buyer said to the farmer, "When does the market open?"\n'
      "The buyer asked the farmer when the market opened."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to water»։"]),
    (['"Why did you cancel the rehearsal until Friday?" the director asked the actor.\n'
      "The director asked the actor why he had cancelled the rehearsal until Friday.",
      '"Don\'t assume that the reviews will be positive," the producer said to me.\n'
      "The producer warned me not to assume that the reviews would be positive.",
      "Nadia asked me to check the ticket sales.\n"
      'Nadia says to me: "Could you possibly check the ticket sales?"',
      '"I regret that I didn\'t rehearse the scene sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not rehearsing the scene sooner.",
      '"It\'s quite short-staffed. Maybe we should postpone opening night," Petra said.\n'
      "Petra suggested to postpone opening night as it was quite short-staffed."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already rehearsed the scene," the director said.\n'
      "The director told that by the time I had arrived, they had already rehearsed the scene.",
      '"Can you tell me why the reviews don\'t match the ratings?" the producer asked the critic.\n'
      "The producer asked the critic if he could tell her why the reviews didn't match the ratings.",
      'Dara said to Milo: "I\'m sure the theater will approve the schedule."\n'
      "Dara assured Milo that the theater would approve the schedule.",
      'The instructor said to the cast, "Rehearsal builds confidence over time."\n'
      "The instructor told the cast that rehearsal builds confidence over time.",
      "The intern begged the director to explain everything about the lighting design.\n"
      '"I beg you to explain everything about the lighting design," said the intern.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"I\'ve just checked the sales. Everything\'s on track," Rosa said.\n'
      "Rosa told her manager that she had just checked the sales and added that everything was on track.",
      '"What time will the rehearsal start next Monday?" the actor asked the director.\n'
      "The actor asked the director what time the rehearsal would start the following Monday.",
      '"Once the run ends, tickets won\'t be refunded," the manager said.\n'
      "The manager stated that once the run ended, tickets wouldn't be refunded.",
      "Kofi apologized to the cast for the delay the day before.\n"
      '"I\'m sorry for the delay yesterday," Kofi said to the cast.',
      '"If you plan to watch rehearsal, ask Nia to save you a seat," the director said to Omar.\n'
      "Omar's director asked Nia to save him a seat if he planned to watch rehearsal."],
     {0, 1, 2, 3},
     "Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:",
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում ռեժիսորն ասում է Օմարին, ուստի ճիշտ է «Omar's director told Omar to ask Nia...»։"]),
    (['"I will finalize the schedule the day after tomorrow," Sara said.\n'
      "Sara said that she would finalize the schedule in two days' time.",
      '"If you don\'t rehearse the lines properly, opening night will be delayed," Leo said to Amy.\n'
      "Leo told Amy that opening night would be delayed if she hadn't rehearsed the lines properly.",
      "My colleague warned me not to skip the tech rehearsal as it would be risky.\n"
      '"Don\'t skip the tech rehearsal; it will be risky," my colleague said to me.',
      'Grace said, "I will use the costume which is recommended to me."\n'
      "Grace said that she would use the costume which was recommended to her.",
      '"Will either Zara or Leo direct the show tomorrow?" Priya asked.\n'
      "Priya asked Zara whether she or Leo would direct the show the following day."],
     {0, 2, 3, 4},
     "Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:",
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if she didn't rehearse», ոչ «hadn't rehearsed»։"]),
    (["The director didn't allow Mia to leave rehearsal early.\n"
      'The director says to Mia, "Would you mind staying until rehearsal ends?"',
      '"I have been rehearsing the scene for two weeks. I need to finish it today," Ken said.\n'
      "Ken said he had been rehearsing the scene for two weeks to finish it that day.",
      "Nadia told me that she would like to join the theater company.\n"
      'Nadia said to me, "I would like to join the theater company."',
      'Theo asked his director, "Must I memorize the lines tonight?"\n'
      "Theo asked his director to memorize the lines that night.",
      'The actor said to the director, "When does rehearsal begin?"\n'
      "The actor asked the director when rehearsal began."],
     {1, 2, 4},
     "Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to memorize»։"]),
    (['"Why did you delay the launch until Friday?" the client asked the founder.\n'
      "The client asked the founder why she had delayed the launch until Friday.",
      '"Don\'t assume that the funding will come through," the investor said to me.\n'
      "The investor warned me not to assume that the funding would come through.",
      "Nia asked me to check the pitch deck.\n"
      'Nia says to me: "Could you possibly check the pitch deck?"',
      '"I regret that I didn\'t validate the idea sooner," Marcus said to me.\n'
      "Marcus told me that he regretted not validating the idea sooner.",
      '"It\'s quite risky. Maybe we should pivot the strategy," Petra said.\n'
      "Petra suggested to pivot the strategy as it was quite risky."],
     {0, 1, 3},
     "Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։"]),
    (['"By the time you arrived, we had already pitched the idea," the founder said.\n'
      "The founder told that by the time I had arrived, they had already pitched the idea.",
      '"Can you tell me why the numbers don\'t match the forecast?" the investor asked the founder.\n'
      "The investor asked the founder if he could tell her why the numbers didn't match the forecast.",
      'Dara said to Milo: "I\'m sure the board will approve the funding."\n'
      "Dara assured Milo that the board would approve the funding.",
      'The mentor said to the founders, "Cash flow determines a startup\'s survival."\n'
      "The mentor told the founders that cash flow determines a startup's survival.",
      "The intern begged the founder to explain everything about the business model.\n"
      '"I beg you to explain everything about the business model," said the intern.'],
     {1, 2, 3, 4},
     "«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:",
     ["Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։"]),
    (['"Why did you cancel the shift at the last minute?" the head nurse asked the intern.\nThe head nurse asked the intern why they had cancelled the shift at the last minute.', '"Don\'t assume that the specialist will review the chart," Sara said to me.\nSara warned me not to assume that the specialist would review the chart.', 'Ben asked me to order the scan.\nBen says to me: "Could you possibly order the scan?"', '"I regret that I didn\'t check the test results sooner," Amir said to me.\nAmir told me that they regretted not checking the test results sooner.', '"It\'s quite busy. Maybe we should postpone the morning briefing," Nadia said.\nNadia suggested to postpone the morning briefing as it was quite busy.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already ordered the scan," Owen said.\nOwen told that by the time I had arrived, they had already ordered the scan.', '"Can you explain why the readings don\'t match?" Farah asked the specialist.\nFarah asked the specialist if they could explain why the readings didn\'t match.', 'Leo said to Ana: "I\'m sure the head nurse will approve the chart."\nLeo assured Ana that the head nurse would approve the chart.', 'The head nurse said to the nurses, "Fever indicates an immune response."\nThe head nurse told the nurses that fever indicates an immune response.', 'The junior intern begged the head nurse to explain everything about the new protocol.\n"I beg you to explain everything about the new protocol," said the junior intern.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the chart. Everything\'s stable," Grace said.\nGrace told James that she had just reviewed the chart and added that everything was stable.', '"What time will the morning briefing start next Monday?" the nurses asked the specialist.\nThe nurses asked the specialist what time the morning briefing would start the following Monday.', '"Once the renovation is finalized, nurses won\'t be reassigned," the head nurse said.\nThe head nurse stated that once the renovation was finalized, nurses wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her morning briefing the day before.\n"I\'m sorry for interrupting your morning briefing yesterday," Victor said to Elena.', '"If you plan to visit the ward, ask Priya to escort you," the head nurse said to Noor.\nNoor\'s head nurse asked Priya to escort her if she planned to visit the ward.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում head nurseն ասում է Նուրին, ուստի ճիշտ է «Noor's head nurse told Noor to ask Priya...»։"]),
    (['"I will review the chart at the ward the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the chart at the ward in two days\' time.', '"If you don\'t confirm the appointment today, the time slot will change," Priya said to Tom.\nPriya told Tom that the time slot would change if he hadn\'t confirmed the appointment today.', 'My colleague warned me not to skip the dosage as it would compromise the treatment.\n"Don\'t skip the dosage; it will compromise the treatment," my colleague said to me.', 'Farid said, "I will accept the position which is offered to me."\nFarid said that he would accept the position which was offered to him.', '"Will either Nadia or Omar review the chart tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the chart the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The head nurse didn\'t allow Priya to leave the ward early.\nThe head nurse says to Priya, "Would you mind staying at the ward until the end of the shift?"', '"I have been monitoring the patient for two weeks. I need to finish it today," Diego said.\nDiego said he had been monitoring the patient for two weeks to finish it that day.', 'Hana told me that she would like to join the residency program.\nHana said to me, "I would like to join the residency program."', 'Tariq asked his head nurse, "Must I submit the chart tonight?"\nTariq asked his head nurse to submit the chart that night.', 'The intern said to Lena, "When does the medication expire?"\nThe intern asked Lena when the medication expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the reservation at the last minute?" the duty manager asked the agent.\nThe duty manager asked the agent why they had cancelled the reservation at the last minute.', '"Don\'t assume that the technician will check the manifest," Sara said to me.\nSara warned me not to assume that the technician would check the manifest.', 'Ben asked me to stamp the boarding pass.\nBen says to me: "Could you possibly stamp the boarding pass?"', '"I regret that I didn\'t print the baggage tags sooner," Amir said to me.\nAmir told me that they regretted not printing the baggage tags sooner.', '"It\'s quite crowded. Maybe we should delay the boarding call," Nadia said.\nNadia suggested to delay the boarding call as it was quite crowded.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already stamped the boarding pass," Owen said.\nOwen told that by the time I had arrived, they had already stamped the boarding pass.', '"Can you explain why the passenger counts don\'t match?" Farah asked the technician.\nFarah asked the technician if they could explain why the passenger counts didn\'t match.', 'Leo said to Ana: "I\'m sure the duty manager will approve the manifest."\nLeo assured Ana that the duty manager would approve the manifest.', 'The duty manager said to the staff, "Turbulence occurs at high altitude."\nThe duty manager told the staff that turbulence occurs at high altitude.', 'The junior agent begged the duty manager to explain everything about the new boarding policy.\n"I beg you to explain everything about the new boarding policy," said the junior agent.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just checked the manifest. Everything\'s on schedule," Grace said.\nGrace told James that she had just checked the manifest and added that everything was on schedule.', '"What time will the boarding call start next Monday?" the staff asked the technician.\nThe staff asked the technician what time the boarding call would start the following Monday.', '"Once the schedule is finalized, staff won\'t be reassigned," the duty manager said.\nThe duty manager stated that once the schedule was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her boarding call the day before.\n"I\'m sorry for interrupting your boarding call yesterday," Victor said to Elena.', '"If you plan to visit the gate, ask Priya to escort you," the duty manager said to Noor.\nNoor\'s duty manager asked Priya to escort her if she planned to visit the gate.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում duty managerն ասում է Նուրին, ուստի ճիշտ է «Noor's duty manager told Noor to ask Priya...»։"]),
    (['"I will check the manifest at the gate the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would check the manifest at the gate in two days\' time.', '"If you don\'t confirm the seat today, the fare will change," Priya said to Tom.\nPriya told Tom that the fare would change if he hadn\'t confirmed the seat today.', 'My colleague warned me not to share the boarding pass as it would compromise the reservation.\n"Don\'t share the boarding pass; it will compromise the reservation," my colleague said to me.', 'Farid said, "I will accept the upgrade which is offered to me."\nFarid said that he would accept the upgrade which was offered to him.', '"Will either Nadia or Omar check the manifest tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would check the manifest the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The duty manager didn\'t allow Priya to leave the gate early.\nThe duty manager says to Priya, "Would you mind staying at the gate until the end of the shift?"', '"I have been processing the manifest for two weeks. I need to finish it today," Diego said.\nDiego said he had been processing the manifest for two weeks to finish it that day.', 'Hana told me that she would like to join the flight crew.\nHana said to me, "I would like to join the flight crew."', 'Tariq asked his duty manager, "Must I submit the manifest tonight?"\nTariq asked his duty manager to submit the manifest that night.', 'The agent said to Lena, "When does the ticket expire?"\nThe agent asked Lena when the ticket expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the hearing at the last minute?" the senior partner asked the paralegal.\nThe senior partner asked the paralegal why they had cancelled the hearing at the last minute.', '"Don\'t assume that the associate will review the brief," Sara said to me.\nSara warned me not to assume that the associate would review the brief.', 'Ben asked me to schedule the deposition.\nBen says to me: "Could you possibly schedule the deposition?"', '"I regret that I didn\'t finalize the exhibit list sooner," Amir said to me.\nAmir told me that they regretted not finalizing the exhibit list sooner.', '"It\'s quite urgent. Maybe we should postpone the closing argument," Nadia said.\nNadia suggested to postpone the closing argument as it was quite urgent.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already scheduled the deposition," Owen said.\nOwen told that by the time I had arrived, they had already scheduled the deposition.', '"Can you explain why the figures don\'t match?" Farah asked the associate.\nFarah asked the associate if they could explain why the figures didn\'t match.', 'Leo said to Ana: "I\'m sure the senior partner will approve the brief."\nLeo assured Ana that the senior partner would approve the brief.', 'The senior partner said to the staff, "Evidence must be disclosed before trial."\nThe senior partner told the staff that evidence must be disclosed before trial.', 'The junior paralegal begged the senior partner to explain everything about the new filing policy.\n"I beg you to explain everything about the new filing policy," said the junior paralegal.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the brief. Everything\'s in order," Grace said.\nGrace told James that she had just reviewed the brief and added that everything was in order.', '"What time will the closing argument start next Monday?" the staff asked the associate.\nThe staff asked the associate what time the closing argument would start the following Monday.', '"Once the verdict is finalized, staff won\'t be reassigned," the senior partner said.\nThe senior partner stated that once the verdict was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her closing argument the day before.\n"I\'m sorry for interrupting your closing argument yesterday," Victor said to Elena.', '"If you plan to visit the courthouse, ask Priya to escort you," the senior partner said to Noor.\nNoor\'s senior partner asked Priya to escort her if she planned to visit the courthouse.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում senior partnerն ասում է Նուրին, ուստի ճիշտ է «Noor's senior partner told Noor to ask Priya...»։"]),
    (['"I will review the brief at the courthouse the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the brief at the courthouse in two days\' time.', '"If you don\'t confirm the deposition slot today, the filing deadline will change," Priya said to Tom.\nPriya told Tom that the filing deadline would change if he hadn\'t confirmed the deposition slot today.', 'My colleague warned me not to share the case file as it would compromise the client\'s case.\n"Don\'t share the case file; it will compromise the client\'s case," my colleague said to me.', 'Farid said, "I will accept the settlement which is offered to me."\nFarid said that he would accept the settlement which was offered to him.', '"Will either Nadia or Omar review the brief tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the brief the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The senior partner didn\'t allow Priya to leave the courthouse early.\nThe senior partner says to Priya, "Would you mind staying at the courthouse until the end of the shift?"', '"I have been drafting the brief for two weeks. I need to finish it today," Diego said.\nDiego said he had been drafting the brief for two weeks to finish it that day.', 'Hana told me that she would like to join the clerkship program.\nHana said to me, "I would like to join the clerkship program."', 'Tariq asked his senior partner, "Must I submit the brief tonight?"\nTariq asked his senior partner to submit the brief that night.', 'The paralegal said to Lena, "When does the settlement offer expire?"\nThe paralegal asked Lena when the settlement offer expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the reservation at the last minute?" the head chef asked the line cook.\nThe head chef asked the line cook why they had cancelled the reservation at the last minute.', '"Don\'t assume that the sous chef will update the menu," Sara said to me.\nSara warned me not to assume that the sous chef would update the menu.', 'Ben asked me to print the recipe card.\nBen says to me: "Could you possibly print the recipe card?"', '"I regret that I didn\'t finish the prep list sooner," Amir said to me.\nAmir told me that they regretted not finishing the prep list sooner.', '"It\'s quite hectic. Maybe we should postpone the tasting session," Nadia said.\nNadia suggested to postpone the tasting session as it was quite hectic.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already printed the recipe card," Owen said.\nOwen told that by the time I had arrived, they had already printed the recipe card.', '"Can you explain why the orders don\'t match?" Farah asked the sous chef.\nFarah asked the sous chef if they could explain why the orders didn\'t match.', 'Leo said to Ana: "I\'m sure the head chef will approve the menu."\nLeo assured Ana that the head chef would approve the menu.', 'The head chef said to the staff, "Yeast makes bread rise."\nThe head chef told the staff that yeast makes bread rise.', 'The junior line cook begged the head chef to explain everything about the new hygiene policy.\n"I beg you to explain everything about the new hygiene policy," said the junior line cook.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just updated the menu. Everything\'s ready," Grace said.\nGrace told James that she had just updated the menu and added that everything was ready.', '"What time will the tasting session start next Monday?" the staff asked the sous chef.\nThe staff asked the sous chef what time the tasting session would start the following Monday.', '"Once the menu redesign is finalized, staff won\'t be reassigned," the head chef said.\nThe head chef stated that once the menu redesign was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her tasting session the day before.\n"I\'m sorry for interrupting your tasting session yesterday," Victor said to Elena.', '"If you plan to visit the kitchen, ask Priya to escort you," the head chef said to Noor.\nNoor\'s head chef asked Priya to escort her if she planned to visit the kitchen.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում head chefն ասում է Նուրին, ուստի ճիշտ է «Noor's head chef told Noor to ask Priya...»։"]),
    (['"I will update the menu in the kitchen the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would update the menu in the kitchen in two days\' time.', '"If you don\'t confirm the table booking today, the seating time will change," Priya said to Tom.\nPriya told Tom that the seating time would change if he hadn\'t confirmed the table booking today.', 'My colleague warned me not to skip the allergy check as it would compromise the order.\n"Don\'t skip the allergy check; it will compromise the order," my colleague said to me.', 'Farid said, "I will accept the promotion which is offered to me."\nFarid said that he would accept the promotion which was offered to him.', '"Will either Nadia or Omar update the menu tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would update the menu the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The head chef didn\'t allow Priya to leave the kitchen early.\nThe head chef says to Priya, "Would you mind staying at the kitchen until the end of the shift?"', '"I have been testing the recipe for two weeks. I need to finish it today," Diego said.\nDiego said he had been testing the recipe for two weeks to finish it that day.', 'Hana told me that she would like to join the apprenticeship program.\nHana said to me, "I would like to join the apprenticeship program."', 'Tariq asked his head chef, "Must I submit the menu tonight?"\nTariq asked his head chef to submit the menu that night.', 'The line cook said to Lena, "When does the reservation voucher expire?"\nThe line cook asked Lena when the reservation voucher expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the inspection at the last minute?" the site engineer asked the apprentice.\nThe site engineer asked the apprentice why they had cancelled the inspection at the last minute.', '"Don\'t assume that the contractor will review the blueprint," Sara said to me.\nSara warned me not to assume that the contractor would review the blueprint.', 'Ben asked me to file the permit.\nBen says to me: "Could you possibly file the permit?"', '"I regret that I didn\'t complete the safety checklist sooner," Amir said to me.\nAmir told me that they regretted not completing the safety checklist sooner.', '"It\'s quite hazardous. Maybe we should postpone the safety briefing," Nadia said.\nNadia suggested to postpone the safety briefing as it was quite hazardous.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already filed the permit," Owen said.\nOwen told that by the time I had arrived, they had already filed the permit.', '"Can you explain why the measurements don\'t match?" Farah asked the contractor.\nFarah asked the contractor if they could explain why the measurements didn\'t match.', 'Leo said to Ana: "I\'m sure the site engineer will approve the blueprint."\nLeo assured Ana that the site engineer would approve the blueprint.', 'The site engineer said to the crew, "Concrete strengthens as it cures."\nThe site engineer told the crew that concrete strengthens as it cures.', 'The junior apprentice begged the site engineer to explain everything about the new safety policy.\n"I beg you to explain everything about the new safety policy," said the junior apprentice.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the blueprint. Everything\'s secure," Grace said.\nGrace told James that she had just reviewed the blueprint and added that everything was secure.', '"What time will the safety briefing start next Monday?" the crew asked the contractor.\nThe crew asked the contractor what time the safety briefing would start the following Monday.', '"Once the design change is finalized, crew won\'t be reassigned," the site engineer said.\nThe site engineer stated that once the design change was finalized, crew wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her safety briefing the day before.\n"I\'m sorry for interrupting your safety briefing yesterday," Victor said to Elena.', '"If you plan to visit the site, ask Priya to escort you," the site engineer said to Noor.\nNoor\'s site engineer asked Priya to escort her if she planned to visit the site.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում site engineerն ասում է Նուրին, ուստի ճիշտ է «Noor's site engineer told Noor to ask Priya...»։"]),
    (['"I will review the blueprint at the site the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the blueprint at the site in two days\' time.', '"If you don\'t confirm the inspection slot today, the completion date will change," Priya said to Tom.\nPriya told Tom that the completion date would change if he hadn\'t confirmed the inspection slot today.', 'My colleague warned me not to ignore the safety checklist as it would compromise the site.\n"Don\'t ignore the safety checklist; it will compromise the site," my colleague said to me.', 'Farid said, "I will accept the contract which is offered to me."\nFarid said that he would accept the contract which was offered to him.', '"Will either Nadia or Omar review the blueprint tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the blueprint the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The site engineer didn\'t allow Priya to leave the site early.\nThe site engineer says to Priya, "Would you mind staying at the site until the end of the shift?"', '"I have been inspecting the scaffolding for two weeks. I need to finish it today," Diego said.\nDiego said he had been inspecting the scaffolding for two weeks to finish it that day.', 'Hana told me that she would like to join the training program.\nHana said to me, "I would like to join the training program."', 'Tariq asked his site engineer, "Must I submit the blueprint tonight?"\nTariq asked his site engineer to submit the blueprint that night.', 'The apprentice said to Lena, "When does the permit expire?"\nThe apprentice asked Lena when the permit expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the experiment at the last minute?" the professor asked the research assistant.\nThe professor asked the research assistant why they had cancelled the experiment at the last minute.', '"Don\'t assume that the postdoc will analyze the dataset," Sara said to me.\nSara warned me not to assume that the postdoc would analyze the dataset.', 'Ben asked me to label the sample.\nBen says to me: "Could you possibly label the sample?"', '"I regret that I didn\'t update the calibration log sooner," Amir said to me.\nAmir told me that they regretted not updating the calibration log sooner.', '"It\'s quite delicate. Maybe we should postpone the lab meeting," Nadia said.\nNadia suggested to postpone the lab meeting as it was quite delicate.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already labeled the sample," Owen said.\nOwen told that by the time I had arrived, they had already labeled the sample.', '"Can you explain why the measurements don\'t match?" Farah asked the postdoc.\nFarah asked the postdoc if they could explain why the measurements didn\'t match.', 'Leo said to Ana: "I\'m sure the professor will approve the dataset."\nLeo assured Ana that the professor would approve the dataset.', 'The professor said to the students, "Enzymes speed up chemical reactions."\nThe professor told the students that enzymes speed up chemical reactions.', 'The junior research assistant begged the professor to explain everything about the new lab safety policy.\n"I beg you to explain everything about the new lab safety policy," said the junior research assistant.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just analyzed the dataset. Everything\'s valid," Grace said.\nGrace told James that she had just analyzed the dataset and added that everything was valid.', '"What time will the lab meeting start next Monday?" the students asked the postdoc.\nThe students asked the postdoc what time the lab meeting would start the following Monday.', '"Once the funding review is finalized, students won\'t be reassigned," the professor said.\nThe professor stated that once the funding review was finalized, students wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her lab meeting the day before.\n"I\'m sorry for interrupting your lab meeting yesterday," Victor said to Elena.', '"If you plan to visit the laboratory, ask Priya to escort you," the professor said to Noor.\nNoor\'s professor asked Priya to escort her if she planned to visit the laboratory.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում professorն ասում է Նուրին, ուստի ճիշտ է «Noor's professor told Noor to ask Priya...»։"]),
    (['"I will analyze the dataset in the laboratory the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would analyze the dataset in the laboratory in two days\' time.', '"If you don\'t confirm the lab slot today, the funding deadline will change," Priya said to Tom.\nPriya told Tom that the funding deadline would change if he hadn\'t confirmed the lab slot today.', 'My colleague warned me not to skip the calibration step as it would compromise the results.\n"Don\'t skip the calibration step; it will compromise the results," my colleague said to me.', 'Farid said, "I will accept the grant which is offered to me."\nFarid said that he would accept the grant which was offered to him.', '"Will either Nadia or Omar analyze the dataset tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would analyze the dataset the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The professor didn\'t allow Priya to leave the laboratory early.\nThe professor says to Priya, "Would you mind staying at the laboratory until the end of the shift?"', '"I have been analyzing the dataset for two weeks. I need to finish it today," Diego said.\nDiego said he had been analyzing the dataset for two weeks to finish it that day.', 'Hana told me that she would like to join the fellowship program.\nHana said to me, "I would like to join the fellowship program."', 'Tariq asked his professor, "Must I submit the dataset tonight?"\nTariq asked his professor to submit the dataset that night.', 'The research assistant said to Lena, "When does the grant expire?"\nThe research assistant asked Lena when the grant expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the release at the last minute?" the engineering lead asked the developer.\nThe engineering lead asked the developer why they had cancelled the release at the last minute.', '"Don\'t assume that the tester will review the specification," Sara said to me.\nSara warned me not to assume that the tester would review the specification.', 'Ben asked me to deploy the patch.\nBen says to me: "Could you possibly deploy the patch?"', '"I regret that I didn\'t execute the test suite sooner," Amir said to me.\nAmir told me that they regretted not executing the test suite sooner.', '"It\'s quite unstable. Maybe we should postpone the sprint review," Nadia said.\nNadia suggested to postpone the sprint review as it was quite unstable.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already deployed the patch," Owen said.\nOwen told that by the time I had arrived, they had already deployed the patch.', '"Can you explain why the metrics don\'t match?" Farah asked the tester.\nFarah asked the tester if they could explain why the metrics didn\'t match.', 'Leo said to Ana: "I\'m sure the engineering lead will approve the specification."\nLeo assured Ana that the engineering lead would approve the specification.', 'The engineering lead said to the developers, "Compiled code runs faster than interpreted code."\nThe engineering lead told the developers that compiled code runs faster than interpreted code.', 'The junior developer begged the engineering lead to explain everything about the new deployment policy.\n"I beg you to explain everything about the new deployment policy," said the junior developer.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the specification. Everything\'s stable," Grace said.\nGrace told James that she had just reviewed the specification and added that everything was stable.', '"What time will the sprint review start next Monday?" the developers asked the tester.\nThe developers asked the tester what time the sprint review would start the following Monday.', '"Once the architecture change is finalized, developers won\'t be reassigned," the engineering lead said.\nThe engineering lead stated that once the architecture change was finalized, developers wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her sprint review the day before.\n"I\'m sorry for interrupting your sprint review yesterday," Victor said to Elena.', '"If you plan to visit the office, ask Priya to escort you," the engineering lead said to Noor.\nNoor\'s engineering lead asked Priya to escort her if she planned to visit the office.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում engineering leadն ասում է Նուրին, ուստի ճիշտ է «Noor's engineering lead told Noor to ask Priya...»։"]),
    (['"I will review the specification at the office the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the specification at the office in two days\' time.', '"If you don\'t confirm the deployment slot today, the rollout date will change," Priya said to Tom.\nPriya told Tom that the rollout date would change if he hadn\'t confirmed the deployment slot today.', 'My colleague warned me not to skip the test suite as it would compromise the release.\n"Don\'t skip the test suite; it will compromise the release," my colleague said to me.', 'Farid said, "I will accept the commission which is offered to me."\nFarid said that he would accept the commission which was offered to him.', '"Will either Nadia or Omar review the specification tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the specification the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The engineering lead didn\'t allow Priya to leave the office early.\nThe engineering lead says to Priya, "Would you mind staying at the office until the end of the shift?"', '"I have been testing the patch for two weeks. I need to finish it today," Diego said.\nDiego said he had been testing the patch for two weeks to finish it that day.', 'Hana told me that she would like to join the internship program.\nHana said to me, "I would like to join the internship program."', 'Tariq asked his engineering lead, "Must I submit the specification tonight?"\nTariq asked his engineering lead to submit the specification that night.', 'The developer said to Lena, "When does the license expire?"\nThe developer asked Lena when the license expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the tour at the last minute?" the chief curator asked the museum guide.\nThe chief curator asked the museum guide why they had cancelled the tour at the last minute.', '"Don\'t assume that the conservator will update the catalog entry," Sara said to me.\nSara warned me not to assume that the conservator would update the catalog entry.', 'Ben asked me to label the artifact.\nBen says to me: "Could you possibly label the artifact?"', '"I regret that I didn\'t file the condition report sooner," Amir said to me.\nAmir told me that they regretted not filing the condition report sooner.', '"It\'s quite fragile. Maybe we should postpone the exhibit opening," Nadia said.\nNadia suggested to postpone the exhibit opening as it was quite fragile.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already labeled the artifact," Owen said.\nOwen told that by the time I had arrived, they had already labeled the artifact.', '"Can you explain why the records don\'t match?" Farah asked the conservator.\nFarah asked the conservator if they could explain why the records didn\'t match.', 'Leo said to Ana: "I\'m sure the chief curator will approve the catalog entry."\nLeo assured Ana that the chief curator would approve the catalog entry.', 'The chief curator said to the staff, "Light exposure fades old pigments."\nThe chief curator told the staff that light exposure fades old pigments.', 'The junior museum guide begged the chief curator to explain everything about the new handling policy.\n"I beg you to explain everything about the new handling policy," said the junior museum guide.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just updated the catalog entry. Everything\'s secure," Grace said.\nGrace told James that she had just updated the catalog entry and added that everything was secure.', '"What time will the exhibit opening start next Monday?" the staff asked the conservator.\nThe staff asked the conservator what time the exhibit opening would start the following Monday.', '"Once the reinstallation is finalized, staff won\'t be reassigned," the chief curator said.\nThe chief curator stated that once the reinstallation was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her exhibit opening the day before.\n"I\'m sorry for interrupting your exhibit opening yesterday," Victor said to Elena.', '"If you plan to visit the gallery, ask Priya to escort you," the chief curator said to Noor.\nNoor\'s chief curator asked Priya to escort her if she planned to visit the gallery.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում chief curatorն ասում է Նուրին, ուստի ճիշտ է «Noor's chief curator told Noor to ask Priya...»։"]),
    (['"I will update the catalog entry in the gallery the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would update the catalog entry in the gallery in two days\' time.', '"If you don\'t confirm the loan agreement today, the insurance rate will change," Priya said to Tom.\nPriya told Tom that the insurance rate would change if he hadn\'t confirmed the loan agreement today.', 'My colleague warned me not to skip the condition check as it would compromise the artifact.\n"Don\'t skip the condition check; it will compromise the artifact," my colleague said to me.', 'Farid said, "I will accept the fellowship which is offered to me."\nFarid said that he would accept the fellowship which was offered to him.', '"Will either Nadia or Omar update the catalog entry tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would update the catalog entry the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The chief curator didn\'t allow Priya to leave the gallery early.\nThe chief curator says to Priya, "Would you mind staying at the gallery until the end of the shift?"', '"I have been restoring the artifact for two weeks. I need to finish it today," Diego said.\nDiego said he had been restoring the artifact for two weeks to finish it that day.', 'Hana told me that she would like to join the curatorial program.\nHana said to me, "I would like to join the curatorial program."', 'Tariq asked his chief curator, "Must I submit the catalog entry tonight?"\nTariq asked his chief curator to submit the catalog entry that night.', 'The museum guide said to Lena, "When does the loan agreement expire?"\nThe museum guide asked Lena when the loan agreement expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the appointment at the last minute?" the branch manager asked the teller.\nThe branch manager asked the teller why they had cancelled the appointment at the last minute.', '"Don\'t assume that the auditor will review the statement," Sara said to me.\nSara warned me not to assume that the auditor would review the statement.', 'Ben asked me to process the loan application.\nBen says to me: "Could you possibly process the loan application?"', '"I regret that I didn\'t file the compliance form sooner," Amir said to me.\nAmir told me that they regretted not filing the compliance form sooner.', '"It\'s quite strict. Maybe we should postpone the quarterly review," Nadia said.\nNadia suggested to postpone the quarterly review as it was quite strict.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already processed the loan application," Owen said.\nOwen told that by the time I had arrived, they had already processed the loan application.', '"Can you explain why the balances don\'t match?" Farah asked the auditor.\nFarah asked the auditor if they could explain why the balances didn\'t match.', 'Leo said to Ana: "I\'m sure the branch manager will approve the statement."\nLeo assured Ana that the branch manager would approve the statement.', 'The branch manager said to the staff, "Interest compounds over time."\nThe branch manager told the staff that interest compounds over time.', 'The junior teller begged the branch manager to explain everything about the new compliance policy.\n"I beg you to explain everything about the new compliance policy," said the junior teller.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the statement. Everything\'s balanced," Grace said.\nGrace told James that she had just reviewed the statement and added that everything was balanced.', '"What time will the quarterly review start next Monday?" the staff asked the auditor.\nThe staff asked the auditor what time the quarterly review would start the following Monday.', '"Once the policy change is finalized, staff won\'t be reassigned," the branch manager said.\nThe branch manager stated that once the policy change was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her quarterly review the day before.\n"I\'m sorry for interrupting your quarterly review yesterday," Victor said to Elena.', '"If you plan to visit the branch, ask Priya to escort you," the branch manager said to Noor.\nNoor\'s branch manager asked Priya to escort her if she planned to visit the branch.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում branch managerն ասում է Նուրին, ուստի ճիշտ է «Noor's branch manager told Noor to ask Priya...»։"]),
    (['"I will review the statement at the branch the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the statement at the branch in two days\' time.', '"If you don\'t confirm the loan appointment today, the interest rate will change," Priya said to Tom.\nPriya told Tom that the interest rate would change if he hadn\'t confirmed the loan appointment today.', 'My colleague warned me not to share the account number as it would compromise the account.\n"Don\'t share the account number; it will compromise the account," my colleague said to me.', 'Farid said, "I will accept the loan which is offered to me."\nFarid said that he would accept the loan which was offered to him.', '"Will either Nadia or Omar review the statement tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the statement the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The branch manager didn\'t allow Priya to leave the branch early.\nThe branch manager says to Priya, "Would you mind staying at the branch until the end of the shift?"', '"I have been auditing the accounts for two weeks. I need to finish it today," Diego said.\nDiego said he had been auditing the accounts for two weeks to finish it that day.', 'Hana told me that she would like to join the leadership program.\nHana said to me, "I would like to join the leadership program."', 'Tariq asked his branch manager, "Must I submit the statement tonight?"\nTariq asked his branch manager to submit the statement that night.', 'The teller said to Lena, "When does the loan offer expire?"\nThe teller asked Lena when the loan offer expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the print run at the last minute?" the editor-in-chief asked the editorial assistant.\nThe editor-in-chief asked the editorial assistant why they had cancelled the print run at the last minute.', '"Don\'t assume that the copy editor will edit the manuscript," Sara said to me.\nSara warned me not to assume that the copy editor would edit the manuscript.', 'Ben asked me to annotate the proof.\nBen says to me: "Could you possibly annotate the proof?"', '"I regret that I didn\'t file the permissions form sooner," Amir said to me.\nAmir told me that they regretted not filing the permissions form sooner.', '"It\'s quite tight. Maybe we should postpone the editorial meeting," Nadia said.\nNadia suggested to postpone the editorial meeting as it was quite tight.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already annotated the proof," Owen said.\nOwen told that by the time I had arrived, they had already annotated the proof.', '"Can you explain why the word counts don\'t match?" Farah asked the copy editor.\nFarah asked the copy editor if they could explain why the word counts didn\'t match.', 'Leo said to Ana: "I\'m sure the editor-in-chief will approve the manuscript."\nLeo assured Ana that the editor-in-chief would approve the manuscript.', 'The editor-in-chief said to the editors, "Serif fonts improve readability in print."\nThe editor-in-chief told the editors that serif fonts improve readability in print.', 'The junior editorial assistant begged the editor-in-chief to explain everything about the new style policy.\n"I beg you to explain everything about the new style policy," said the junior editorial assistant.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just edited the manuscript. Everything\'s final," Grace said.\nGrace told James that she had just edited the manuscript and added that everything was final.', '"What time will the editorial meeting start next Monday?" the editors asked the copy editor.\nThe editors asked the copy editor what time the editorial meeting would start the following Monday.', '"Once the rebranding is finalized, editors won\'t be reassigned," the editor-in-chief said.\nThe editor-in-chief stated that once the rebranding was finalized, editors wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her editorial meeting the day before.\n"I\'m sorry for interrupting your editorial meeting yesterday," Victor said to Elena.', '"If you plan to visit the print shop, ask Priya to escort you," the editor-in-chief said to Noor.\nNoor\'s editor-in-chief asked Priya to escort her if she planned to visit the print shop.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում editor-in-chiefն ասում է Նուրին, ուստի ճիշտ է «Noor's editor-in-chief told Noor to ask Priya...»։"]),
    (['"I will edit the manuscript at the print shop the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would edit the manuscript at the print shop in two days\' time.', '"If you don\'t confirm the print slot today, the release date will change," Priya said to Tom.\nPriya told Tom that the release date would change if he hadn\'t confirmed the print slot today.', 'My colleague warned me not to skip the fact-check as it would compromise the manuscript.\n"Don\'t skip the fact-check; it will compromise the manuscript," my colleague said to me.', 'Farid said, "I will accept the book deal which is offered to me."\nFarid said that he would accept the book deal which was offered to him.', '"Will either Nadia or Omar edit the manuscript tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would edit the manuscript the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The editor-in-chief didn\'t allow Priya to leave the print shop early.\nThe editor-in-chief says to Priya, "Would you mind staying at the print shop until the end of the shift?"', '"I have been editing the manuscript for two weeks. I need to finish it today," Diego said.\nDiego said he had been editing the manuscript for two weeks to finish it that day.', 'Hana told me that she would like to join the mentorship program.\nHana said to me, "I would like to join the mentorship program."', 'Tariq asked his editor-in-chief, "Must I submit the manuscript tonight?"\nTariq asked his editor-in-chief to submit the manuscript that night.', 'The editorial assistant said to Lena, "When does the contract expire?"\nThe editorial assistant asked Lena when the contract expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the shoot at the last minute?" the director asked the production assistant.\nThe director asked the production assistant why they had cancelled the shoot at the last minute.', '"Don\'t assume that the cinematographer will revise the script," Sara said to me.\nSara warned me not to assume that the cinematographer would revise the script.', 'Ben asked me to storyboard the scene.\nBen says to me: "Could you possibly storyboard the scene?"', '"I regret that I didn\'t finalize the call sheet sooner," Amir said to me.\nAmir told me that they regretted not finalizing the call sheet sooner.', '"It\'s quite tight. Maybe we should postpone the table read," Nadia said.\nNadia suggested to postpone the table read as it was quite tight.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already storyboarded the scene," Owen said.\nOwen told that by the time I had arrived, they had already storyboarded the scene.', '"Can you explain why the takes don\'t match?" Farah asked the cinematographer.\nFarah asked the cinematographer if they could explain why the takes didn\'t match.', 'Leo said to Ana: "I\'m sure the director will approve the script."\nLeo assured Ana that the director would approve the script.', 'The director said to the crew, "Frame rate affects how motion appears on screen."\nThe director told the crew that frame rate affects how motion appears on screen.', 'The junior production assistant begged the director to explain everything about the new set safety policy.\n"I beg you to explain everything about the new set safety policy," said the junior production assistant.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just revised the script. Everything\'s final," Grace said.\nGrace told James that she had just revised the script and added that everything was final.', '"What time will the table read start next Monday?" the crew asked the cinematographer.\nThe crew asked the cinematographer what time the table read would start the following Monday.', '"Once the rewrite is finalized, crew won\'t be reassigned," the director said.\nThe director stated that once the rewrite was finalized, crew wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her table read the day before.\n"I\'m sorry for interrupting your table read yesterday," Victor said to Elena.', '"If you plan to visit the set, ask Priya to escort you," the director said to Noor.\nNoor\'s director asked Priya to escort her if she planned to visit the set.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում directorն ասում է Նուրին, ուստի ճիշտ է «Noor's director told Noor to ask Priya...»։"]),
    (['"I will revise the script on the set the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would revise the script on the set in two days\' time.', '"If you don\'t confirm the studio slot today, the shooting schedule will change," Priya said to Tom.\nPriya told Tom that the shooting schedule would change if he hadn\'t confirmed the studio slot today.', 'My colleague warned me not to leak the script as it would compromise the production.\n"Don\'t leak the script; it will compromise the production," my colleague said to me.', 'Farid said, "I will accept the role which is offered to me."\nFarid said that he would accept the role which was offered to him.', '"Will either Nadia or Omar revise the script tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would revise the script the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The director didn\'t allow Priya to leave the set early.\nThe director says to Priya, "Would you mind staying at the set until the end of the shift?"', '"I have been editing the footage for two weeks. I need to finish it today," Diego said.\nDiego said he had been editing the footage for two weeks to finish it that day.', 'Hana told me that she would like to join the directing program.\nHana said to me, "I would like to join the directing program."', 'Tariq asked his director, "Must I submit the script tonight?"\nTariq asked his director to submit the script that night.', 'The production assistant said to Lena, "When does the permit expire?"\nThe production assistant asked Lena when the permit expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the appointment at the last minute?" the senior vet asked the vet technician.\nThe senior vet asked the vet technician why they had cancelled the appointment at the last minute.', '"Don\'t assume that the specialist will update the record," Sara said to me.\nSara warned me not to assume that the specialist would update the record.', 'Ben asked me to review the x-ray.\nBen says to me: "Could you possibly review the x-ray?"', '"I regret that I didn\'t file the vaccination record sooner," Amir said to me.\nAmir told me that they regretted not filing the vaccination record sooner.', '"It\'s quite busy. Maybe we should postpone the daily check-in," Nadia said.\nNadia suggested to postpone the daily check-in as it was quite busy.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already reviewed the x-ray," Owen said.\nOwen told that by the time I had arrived, they had already reviewed the x-ray.', '"Can you explain why the vitals don\'t match?" Farah asked the specialist.\nFarah asked the specialist if they could explain why the vitals didn\'t match.', 'Leo said to Ana: "I\'m sure the senior vet will approve the record."\nLeo assured Ana that the senior vet would approve the record.', 'The senior vet said to the staff, "Vaccines train the immune system to fight disease."\nThe senior vet told the staff that vaccines train the immune system to fight disease.', 'The junior vet technician begged the senior vet to explain everything about the new intake policy.\n"I beg you to explain everything about the new intake policy," said the junior vet technician.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just updated the record. Everything\'s stable," Grace said.\nGrace told James that she had just updated the record and added that everything was stable.', '"What time will the daily check-in start next Monday?" the staff asked the specialist.\nThe staff asked the specialist what time the daily check-in would start the following Monday.', '"Once the clinic upgrade is finalized, staff won\'t be reassigned," the senior vet said.\nThe senior vet stated that once the clinic upgrade was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her daily check-in the day before.\n"I\'m sorry for interrupting your daily check-in yesterday," Victor said to Elena.', '"If you plan to visit the clinic, ask Priya to escort you," the senior vet said to Noor.\nNoor\'s senior vet asked Priya to escort her if she planned to visit the clinic.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում senior vetն ասում է Նուրին, ուստի ճիշտ է «Noor's senior vet told Noor to ask Priya...»։"]),
    (['"I will update the record at the clinic the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would update the record at the clinic in two days\' time.', '"If you don\'t confirm the appointment slot today, the follow-up date will change," Priya said to Tom.\nPriya told Tom that the follow-up date would change if he hadn\'t confirmed the appointment slot today.', 'My colleague warned me not to skip the vaccination as it would compromise the treatment.\n"Don\'t skip the vaccination; it will compromise the treatment," my colleague said to me.', 'Farid said, "I will accept the internship which is offered to me."\nFarid said that he would accept the internship which was offered to him.', '"Will either Nadia or Omar update the record tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would update the record the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The senior vet didn\'t allow Priya to leave the clinic early.\nThe senior vet says to Priya, "Would you mind staying at the clinic until the end of the shift?"', '"I have been examining the patient for two weeks. I need to finish it today," Diego said.\nDiego said he had been examining the patient for two weeks to finish it that day.', 'Hana told me that she would like to join the clinical training program.\nHana said to me, "I would like to join the clinical training program."', 'Tariq asked his senior vet, "Must I submit the record tonight?"\nTariq asked his senior vet to submit the record that night.', 'The vet technician said to Lena, "When does the medication expire?"\nThe vet technician asked Lena when the medication expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the inspection at the last minute?" the chief mechanic asked the apprentice mechanic.\nThe chief mechanic asked the apprentice mechanic why they had cancelled the inspection at the last minute.', '"Don\'t assume that the inspector will review the maintenance log," Sara said to me.\nSara warned me not to assume that the inspector would review the maintenance log.', 'Ben asked me to replace the component.\nBen says to me: "Could you possibly replace the component?"', '"I regret that I didn\'t complete the checklist sooner," Amir said to me.\nAmir told me that they regretted not completing the checklist sooner.', '"It\'s quite hectic. Maybe we should postpone the pre-flight check," Nadia said.\nNadia suggested to postpone the pre-flight check as it was quite hectic.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already replaced the component," Owen said.\nOwen told that by the time I had arrived, they had already replaced the component.', '"Can you explain why the readings don\'t match?" Farah asked the inspector.\nFarah asked the inspector if they could explain why the readings didn\'t match.', 'Leo said to Ana: "I\'m sure the chief mechanic will approve the maintenance log."\nLeo assured Ana that the chief mechanic would approve the maintenance log.', 'The chief mechanic said to the mechanics, "Regular inspections prevent most mechanical failures."\nThe chief mechanic told the mechanics that regular inspections prevent most mechanical failures.', 'The junior apprentice mechanic begged the chief mechanic to explain everything about the new maintenance policy.\n"I beg you to explain everything about the new maintenance policy," said the junior apprentice mechanic.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the maintenance log. Everything\'s airworthy," Grace said.\nGrace told James that she had just reviewed the maintenance log and added that everything was airworthy.', '"What time will the pre-flight check start next Monday?" the mechanics asked the inspector.\nThe mechanics asked the inspector what time the pre-flight check would start the following Monday.', '"Once the fleet upgrade is finalized, mechanics won\'t be reassigned," the chief mechanic said.\nThe chief mechanic stated that once the fleet upgrade was finalized, mechanics wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her pre-flight check the day before.\n"I\'m sorry for interrupting your pre-flight check yesterday," Victor said to Elena.', '"If you plan to visit the hangar, ask Priya to escort you," the chief mechanic said to Noor.\nNoor\'s chief mechanic asked Priya to escort her if she planned to visit the hangar.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում chief mechanicն ասում է Նուրին, ուստի ճիշտ է «Noor's chief mechanic told Noor to ask Priya...»։"]),
    (['"I will review the maintenance log at the hangar the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the maintenance log at the hangar in two days\' time.', '"If you don\'t confirm the hangar slot today, the departure time will change," Priya said to Tom.\nPriya told Tom that the departure time would change if he hadn\'t confirmed the hangar slot today.', 'My colleague warned me not to skip the safety check as it would compromise the aircraft.\n"Don\'t skip the safety check; it will compromise the aircraft," my colleague said to me.', 'Farid said, "I will accept the transfer which is offered to me."\nFarid said that he would accept the transfer which was offered to him.', '"Will either Nadia or Omar review the maintenance log tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the maintenance log the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The chief mechanic didn\'t allow Priya to leave the hangar early.\nThe chief mechanic says to Priya, "Would you mind staying at the hangar until the end of the shift?"', '"I have been inspecting the engine for two weeks. I need to finish it today," Diego said.\nDiego said he had been inspecting the engine for two weeks to finish it that day.', 'Hana told me that she would like to join the apprenticeship program for mechanics.\nHana said to me, "I would like to join the apprenticeship program for mechanics."', 'Tariq asked his chief mechanic, "Must I submit the maintenance log tonight?"\nTariq asked his chief mechanic to submit the maintenance log that night.', 'The apprentice mechanic said to Lena, "When does the certification expire?"\nThe apprentice mechanic asked Lena when the certification expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the tour at the last minute?" the head horticulturist asked the garden intern.\nThe head horticulturist asked the garden intern why they had cancelled the tour at the last minute.', '"Don\'t assume that the botanist will update the planting record," Sara said to me.\nSara warned me not to assume that the botanist would update the planting record.', 'Ben asked me to label the specimen.\nBen says to me: "Could you possibly label the specimen?"', '"I regret that I didn\'t check the watering log sooner," Amir said to me.\nAmir told me that they regretted not checking the watering log sooner.', '"It\'s quite humid. Maybe we should postpone the plant sale," Nadia said.\nNadia suggested to postpone the plant sale as it was quite humid.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already labeled the specimen," Owen said.\nOwen told that by the time I had arrived, they had already labeled the specimen.', '"Can you explain why the readings don\'t match?" Farah asked the botanist.\nFarah asked the botanist if they could explain why the readings didn\'t match.', 'Leo said to Ana: "I\'m sure the head horticulturist will approve the planting record."\nLeo assured Ana that the head horticulturist would approve the planting record.', 'The head horticulturist said to the staff, "Pollinators are essential to seed production."\nThe head horticulturist told the staff that pollinators are essential to seed production.', 'The junior garden intern begged the head horticulturist to explain everything about the new pesticide policy.\n"I beg you to explain everything about the new pesticide policy," said the junior garden intern.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just updated the planting record. Everything\'s thriving," Grace said.\nGrace told James that she had just updated the planting record and added that everything was thriving.', '"What time will the plant sale start next Monday?" the staff asked the botanist.\nThe staff asked the botanist what time the plant sale would start the following Monday.', '"Once the greenhouse expansion is finalized, staff won\'t be reassigned," the head horticulturist said.\nThe head horticulturist stated that once the greenhouse expansion was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her plant sale the day before.\n"I\'m sorry for interrupting your plant sale yesterday," Victor said to Elena.', '"If you plan to visit the greenhouse, ask Priya to escort you," the head horticulturist said to Noor.\nNoor\'s head horticulturist asked Priya to escort her if she planned to visit the greenhouse.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում head horticulturistն ասում է Նուրին, ուստի ճիշտ է «Noor's head horticulturist told Noor to ask Priya...»։"]),
    (['"I will update the planting record in the greenhouse the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would update the planting record in the greenhouse in two days\' time.', '"If you don\'t confirm the greenhouse slot today, the delivery date will change," Priya said to Tom.\nPriya told Tom that the delivery date would change if he hadn\'t confirmed the greenhouse slot today.', 'My colleague warned me not to skip the pest inspection as it would compromise the collection.\n"Don\'t skip the pest inspection; it will compromise the collection," my colleague said to me.', 'Farid said, "I will accept the fellowship at the garden which is offered to me."\nFarid said that he would accept the fellowship at the garden which was offered to him.', '"Will either Nadia or Omar update the planting record tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would update the planting record the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The head horticulturist didn\'t allow Priya to leave the greenhouse early.\nThe head horticulturist says to Priya, "Would you mind staying at the greenhouse until the end of the shift?"', '"I have been cataloging the specimens for two weeks. I need to finish it today," Diego said.\nDiego said he had been cataloging the specimens for two weeks to finish it that day.', 'Hana told me that she would like to join the horticulture training program.\nHana said to me, "I would like to join the horticulture training program."', 'Tariq asked his head horticulturist, "Must I submit the planting record tonight?"\nTariq asked his head horticulturist to submit the planting record that night.', 'The garden intern said to Lena, "When does the permit expire?"\nThe garden intern asked Lena when the permit expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the broadcast at the last minute?" the station manager asked the broadcast assistant.\nThe station manager asked the broadcast assistant why they had cancelled the broadcast at the last minute.', '"Don\'t assume that the sound engineer will review the rundown," Sara said to me.\nSara warned me not to assume that the sound engineer would review the rundown.', 'Ben asked me to record the segment.\nBen says to me: "Could you possibly record the segment?"', '"I regret that I didn\'t finalize the playlist sooner," Amir said to me.\nAmir told me that they regretted not finalizing the playlist sooner.', '"It\'s quite chaotic. Maybe we should postpone the live broadcast," Nadia said.\nNadia suggested to postpone the live broadcast as it was quite chaotic.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already recorded the segment," Owen said.\nOwen told that by the time I had arrived, they had already recorded the segment.', '"Can you explain why the ratings don\'t match?" Farah asked the sound engineer.\nFarah asked the sound engineer if they could explain why the ratings didn\'t match.', 'Leo said to Ana: "I\'m sure the station manager will approve the rundown."\nLeo assured Ana that the station manager would approve the rundown.', 'The station manager said to the staff, "Listener numbers peak during the morning commute."\nThe station manager told the staff that listener numbers peak during the morning commute.', 'The junior broadcast assistant begged the station manager to explain everything about the new broadcast policy.\n"I beg you to explain everything about the new broadcast policy," said the junior broadcast assistant.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the rundown. Everything\'s finalized," Grace said.\nGrace told James that she had just reviewed the rundown and added that everything was finalized.', '"What time will the live broadcast start next Monday?" the staff asked the sound engineer.\nThe staff asked the sound engineer what time the live broadcast would start the following Monday.', '"Once the format change is finalized, staff won\'t be reassigned," the station manager said.\nThe station manager stated that once the format change was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her live broadcast the day before.\n"I\'m sorry for interrupting your live broadcast yesterday," Victor said to Elena.', '"If you plan to visit the studio, ask Priya to escort you," the station manager said to Noor.\nNoor\'s station manager asked Priya to escort her if she planned to visit the studio.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում station managerն ասում է Նուրին, ուստի ճիշտ է «Noor's station manager told Noor to ask Priya...»։"]),
    (['"I will review the rundown in the studio the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the rundown in the studio in two days\' time.', '"If you don\'t confirm the studio slot today, the air time will change," Priya said to Tom.\nPriya told Tom that the air time would change if he hadn\'t confirmed the studio slot today.', 'My colleague warned me not to skip the sound check as it would compromise the broadcast.\n"Don\'t skip the sound check; it will compromise the broadcast," my colleague said to me.', 'Farid said, "I will accept the on-air slot which is offered to me."\nFarid said that he would accept the on-air slot which was offered to him.', '"Will either Nadia or Omar review the rundown tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the rundown the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The station manager didn\'t allow Priya to leave the studio early.\nThe station manager says to Priya, "Would you mind staying at the studio until the end of the shift?"', '"I have been editing the segment for two weeks. I need to finish it today," Diego said.\nDiego said he had been editing the segment for two weeks to finish it that day.', 'Hana told me that she would like to join the broadcasting internship.\nHana said to me, "I would like to join the broadcasting internship."', 'Tariq asked his station manager, "Must I submit the rundown tonight?"\nTariq asked his station manager to submit the rundown that night.', 'The broadcast assistant said to Lena, "When does the broadcast license expire?"\nThe broadcast assistant asked Lena when the broadcast license expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the observation session at the last minute?" the lead astronomer asked the graduate assistant.\nThe lead astronomer asked the graduate assistant why they had cancelled the observation session at the last minute.', '"Don\'t assume that the technician will review the observation log," Sara said to me.\nSara warned me not to assume that the technician would review the observation log.', 'Ben asked me to calibrate the telescope.\nBen says to me: "Could you possibly calibrate the telescope?"', '"I regret that I didn\'t update the star chart sooner," Amir said to me.\nAmir told me that they regretted not updating the star chart sooner.', '"It\'s quite clear. Maybe we should postpone the stargazing night," Nadia said.\nNadia suggested to postpone the stargazing night as it was quite clear.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already calibrated the telescope," Owen said.\nOwen told that by the time I had arrived, they had already calibrated the telescope.', '"Can you explain why the readings don\'t match?" Farah asked the technician.\nFarah asked the technician if they could explain why the readings didn\'t match.', 'Leo said to Ana: "I\'m sure the lead astronomer will approve the observation log."\nLeo assured Ana that the lead astronomer would approve the observation log.', 'The lead astronomer said to the staff, "Light pollution significantly limits visible star counts."\nThe lead astronomer told the staff that light pollution significantly limits visible star counts.', 'The junior graduate assistant begged the lead astronomer to explain everything about the new dome safety policy.\n"I beg you to explain everything about the new dome safety policy," said the junior graduate assistant.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the observation log. Everything\'s calibrated," Grace said.\nGrace told James that she had just reviewed the observation log and added that everything was calibrated.', '"What time will the stargazing night start next Monday?" the staff asked the technician.\nThe staff asked the technician what time the stargazing night would start the following Monday.', '"Once the dome renovation is finalized, staff won\'t be reassigned," the lead astronomer said.\nThe lead astronomer stated that once the dome renovation was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her stargazing night the day before.\n"I\'m sorry for interrupting your stargazing night yesterday," Victor said to Elena.', '"If you plan to visit the observatory dome, ask Priya to escort you," the lead astronomer said to Noor.\nNoor\'s lead astronomer asked Priya to escort her if she planned to visit the observatory dome.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում lead astronomerն ասում է Նուրին, ուստի ճիշտ է «Noor's lead astronomer told Noor to ask Priya...»։"]),
    (['"I will review the observation log in the observatory dome the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the observation log in the observatory dome in two days\' time.', '"If you don\'t confirm the telescope slot today, the observation window will change," Priya said to Tom.\nPriya told Tom that the observation window would change if he hadn\'t confirmed the telescope slot today.', 'My colleague warned me not to skip the calibration check as it would compromise the data.\n"Don\'t skip the calibration check; it will compromise the data," my colleague said to me.', 'Farid said, "I will accept the research position which is offered to me."\nFarid said that he would accept the research position which was offered to him.', '"Will either Nadia or Omar review the observation log tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the observation log the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The lead astronomer didn\'t allow Priya to leave the observatory dome early.\nThe lead astronomer says to Priya, "Would you mind staying at the observatory dome until the end of the shift?"', '"I have been calibrating the telescope for two weeks. I need to finish it today," Diego said.\nDiego said he had been calibrating the telescope for two weeks to finish it that day.', 'Hana told me that she would like to join the astronomy fellowship.\nHana said to me, "I would like to join the astronomy fellowship."', 'Tariq asked his lead astronomer, "Must I submit the observation log tonight?"\nTariq asked his lead astronomer to submit the observation log that night.', 'The graduate assistant said to Lena, "When does the research grant expire?"\nThe graduate assistant asked Lena when the research grant expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the production run at the last minute?" the mill supervisor asked the loom operator.\nThe mill supervisor asked the loom operator why they had cancelled the production run at the last minute.', '"Don\'t assume that the quality inspector will review the order sheet," Sara said to me.\nSara warned me not to assume that the quality inspector would review the order sheet.', 'Ben asked me to inspect the bolt of fabric.\nBen says to me: "Could you possibly inspect the bolt of fabric?"', '"I regret that I didn\'t calibrate the loom settings sooner," Amir said to me.\nAmir told me that they regretted not calibrating the loom settings sooner.', '"It\'s quite noisy. Maybe we should postpone the quality audit," Nadia said.\nNadia suggested to postpone the quality audit as it was quite noisy.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already inspected the bolt of fabric," Owen said.\nOwen told that by the time I had arrived, they had already inspected the bolt of fabric.', '"Can you explain why the counts don\'t match?" Farah asked the quality inspector.\nFarah asked the quality inspector if they could explain why the counts didn\'t match.', 'Leo said to Ana: "I\'m sure the mill supervisor will approve the order sheet."\nLeo assured Ana that the mill supervisor would approve the order sheet.', 'The mill supervisor said to the workers, "Humidity control reduces thread breakage significantly."\nThe mill supervisor told the workers that humidity control reduces thread breakage significantly.', 'The junior loom operator begged the mill supervisor to explain everything about the new textile quality policy.\n"I beg you to explain everything about the new textile quality policy," said the junior loom operator.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the order sheet. Everything\'s on schedule," Grace said.\nGrace told James that she had just reviewed the order sheet and added that everything was on schedule.', '"What time will the quality audit start next Monday?" the workers asked the quality inspector.\nThe workers asked the quality inspector what time the quality audit would start the following Monday.', '"Once the equipment upgrade is finalized, workers won\'t be reassigned," the mill supervisor said.\nThe mill supervisor stated that once the equipment upgrade was finalized, workers wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her quality audit the day before.\n"I\'m sorry for interrupting your quality audit yesterday," Victor said to Elena.', '"If you plan to visit the mill floor, ask Priya to escort you," the mill supervisor said to Noor.\nNoor\'s mill supervisor asked Priya to escort her if she planned to visit the mill floor.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում mill supervisorն ասում է Նուրին, ուստի ճիշտ է «Noor's mill supervisor told Noor to ask Priya...»։"]),
    (['"I will review the order sheet on the mill floor the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the order sheet on the mill floor in two days\' time.', '"If you don\'t confirm the production slot today, the shipping date will change," Priya said to Tom.\nPriya told Tom that the shipping date would change if he hadn\'t confirmed the production slot today.', 'My colleague warned me not to skip the quality check as it would compromise the shipment.\n"Don\'t skip the quality check; it will compromise the shipment," my colleague said to me.', 'Farid said, "I will accept the supervisor role which is offered to me."\nFarid said that he would accept the supervisor role which was offered to him.', '"Will either Nadia or Omar review the order sheet tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the order sheet the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The mill supervisor didn\'t allow Priya to leave the mill floor early.\nThe mill supervisor says to Priya, "Would you mind staying at the mill floor until the end of the shift?"', '"I have been inspecting the fabric for two weeks. I need to finish it today," Diego said.\nDiego said he had been inspecting the fabric for two weeks to finish it that day.', 'Hana told me that she would like to join the textile apprenticeship.\nHana said to me, "I would like to join the textile apprenticeship."', 'Tariq asked his mill supervisor, "Must I submit the order sheet tonight?"\nTariq asked his mill supervisor to submit the order sheet that night.', 'The loom operator said to Lena, "When does the supplier contract expire?"\nThe loom operator asked Lena when the supplier contract expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the appointment at the last minute?" the garage owner asked the apprentice mechanic.\nThe garage owner asked the apprentice mechanic why they had cancelled the appointment at the last minute.', '"Don\'t assume that the technician will review the repair order," Sara said to me.\nSara warned me not to assume that the technician would review the repair order.', 'Ben asked me to order the part.\nBen says to me: "Could you possibly order the part?"', '"I regret that I didn\'t finish the diagnostic report sooner," Amir said to me.\nAmir told me that they regretted not finishing the diagnostic report sooner.', '"It\'s quite busy. Maybe we should postpone the safety inspection," Nadia said.\nNadia suggested to postpone the safety inspection as it was quite busy.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already ordered the part," Owen said.\nOwen told that by the time I had arrived, they had already ordered the part.', '"Can you explain why the codes don\'t match?" Farah asked the technician.\nFarah asked the technician if they could explain why the codes didn\'t match.', 'Leo said to Ana: "I\'m sure the garage owner will approve the repair order."\nLeo assured Ana that the garage owner would approve the repair order.', 'The garage owner said to the mechanics, "Regular oil changes extend engine lifespan significantly."\nThe garage owner told the mechanics that regular oil changes extend engine lifespan significantly.', 'The junior apprentice mechanic begged the garage owner to explain everything about the new inspection policy.\n"I beg you to explain everything about the new inspection policy," said the junior apprentice mechanic.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just reviewed the repair order. Everything\'s road-ready," Grace said.\nGrace told James that she had just reviewed the repair order and added that everything was road-ready.', '"What time will the safety inspection start next Monday?" the mechanics asked the technician.\nThe mechanics asked the technician what time the safety inspection would start the following Monday.', '"Once the shop renovation is finalized, mechanics won\'t be reassigned," the garage owner said.\nThe garage owner stated that once the shop renovation was finalized, mechanics wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her safety inspection the day before.\n"I\'m sorry for interrupting your safety inspection yesterday," Victor said to Elena.', '"If you plan to visit the garage, ask Priya to escort you," the garage owner said to Noor.\nNoor\'s garage owner asked Priya to escort her if she planned to visit the garage.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում garage ownerն ասում է Նուրին, ուստի ճիշտ է «Noor's garage owner told Noor to ask Priya...»։"]),
    (['"I will review the repair order at the garage the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would review the repair order at the garage in two days\' time.', '"If you don\'t confirm the repair slot today, the pickup time will change," Priya said to Tom.\nPriya told Tom that the pickup time would change if he hadn\'t confirmed the repair slot today.', 'My colleague warned me not to skip the brake check as it would compromise the vehicle.\n"Don\'t skip the brake check; it will compromise the vehicle," my colleague said to me.', 'Farid said, "I will accept the promotion to lead mechanic which is offered to me."\nFarid said that he would accept the promotion to lead mechanic which was offered to him.', '"Will either Nadia or Omar review the repair order tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would review the repair order the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The garage owner didn\'t allow Priya to leave the garage early.\nThe garage owner says to Priya, "Would you mind staying at the garage until the end of the shift?"', '"I have been diagnosing the engine for two weeks. I need to finish it today," Diego said.\nDiego said he had been diagnosing the engine for two weeks to finish it that day.', 'Hana told me that she would like to join the mechanic apprenticeship.\nHana said to me, "I would like to join the mechanic apprenticeship."', 'Tariq asked his garage owner, "Must I submit the repair order tonight?"\nTariq asked his garage owner to submit the repair order that night.', 'The apprentice mechanic said to Lena, "When does the warranty expire?"\nThe apprentice mechanic asked Lena when the warranty expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the lift opening at the last minute?" the resort operations manager asked the lift operator.\nThe resort operations manager asked the lift operator why they had cancelled the lift opening at the last minute.', '"Don\'t assume that the ski patroller will update the conditions report," Sara said to me.\nSara warned me not to assume that the ski patroller would update the conditions report.', 'Ben asked me to inspect the lift chair.\nBen says to me: "Could you possibly inspect the lift chair?"', '"I regret that I didn\'t finalize the grooming schedule sooner," Amir said to me.\nAmir told me that they regretted not finalizing the grooming schedule sooner.', '"It\'s quite frigid. Maybe we should postpone the avalanche briefing," Nadia said.\nNadia suggested to postpone the avalanche briefing as it was quite frigid.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already inspected the lift chair," Owen said.\nOwen told that by the time I had arrived, they had already inspected the lift chair.', '"Can you explain why the counts don\'t match?" Farah asked the ski patroller.\nFarah asked the ski patroller if they could explain why the counts didn\'t match.', 'Leo said to Ana: "I\'m sure the resort operations manager will approve the conditions report."\nLeo assured Ana that the resort operations manager would approve the conditions report.', 'The resort operations manager said to the staff, "Fresh powder significantly increases avalanche risk."\nThe resort operations manager told the staff that fresh powder significantly increases avalanche risk.', 'The junior lift operator begged the resort operations manager to explain everything about the new avalanche safety policy.\n"I beg you to explain everything about the new avalanche safety policy," said the junior lift operator.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just updated the conditions report. Everything\'s groomed," Grace said.\nGrace told James that she had just updated the conditions report and added that everything was groomed.', '"What time will the avalanche briefing start next Monday?" the staff asked the ski patroller.\nThe staff asked the ski patroller what time the avalanche briefing would start the following Monday.', '"Once the trail expansion is finalized, staff won\'t be reassigned," the resort operations manager said.\nThe resort operations manager stated that once the trail expansion was finalized, staff wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her avalanche briefing the day before.\n"I\'m sorry for interrupting your avalanche briefing yesterday," Victor said to Elena.', '"If you plan to visit the lodge, ask Priya to escort you," the resort operations manager said to Noor.\nNoor\'s resort operations manager asked Priya to escort her if she planned to visit the lodge.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում resort operations managerն ասում է Նուրին, ուստի ճիշտ է «Noor's resort operations manager told Noor to ask Priya...»։"]),
    (['"I will update the conditions report at the lodge the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would update the conditions report at the lodge in two days\' time.', '"If you don\'t confirm the lesson slot today, the lift ticket price will change," Priya said to Tom.\nPriya told Tom that the lift ticket price would change if he hadn\'t confirmed the lesson slot today.', 'My colleague warned me not to skip the avalanche check as it would compromise the trail.\n"Don\'t skip the avalanche check; it will compromise the trail," my colleague said to me.', 'Farid said, "I will accept the season position which is offered to me."\nFarid said that he would accept the season position which was offered to him.', '"Will either Nadia or Omar update the conditions report tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would update the conditions report the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The resort operations manager didn\'t allow Priya to leave the lodge early.\nThe resort operations manager says to Priya, "Would you mind staying at the lodge until the end of the shift?"', '"I have been grooming the trails for two weeks. I need to finish it today," Diego said.\nDiego said he had been grooming the trails for two weeks to finish it that day.', 'Hana told me that she would like to join the ski patrol training program.\nHana said to me, "I would like to join the ski patrol training program."', 'Tariq asked his resort operations manager, "Must I submit the conditions report tonight?"\nTariq asked his resort operations manager to submit the conditions report that night.', 'The lift operator said to Lena, "When does the season pass expire?"\nThe lift operator asked Lena when the season pass expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
    (['"Why did you cancel the rehearsal at the last minute?" the artistic director asked the junior instructor.\nThe artistic director asked the junior instructor why they had cancelled the rehearsal at the last minute.', '"Don\'t assume that the choreographer will update the rehearsal schedule," Sara said to me.\nSara warned me not to assume that the choreographer would update the rehearsal schedule.', 'Ben asked me to fit the costume.\nBen says to me: "Could you possibly fit the costume?"', '"I regret that I didn\'t finalize the choreography notes sooner," Amir said to me.\nAmir told me that they regretted not finalizing the choreography notes sooner.', '"It\'s quite tense. Maybe we should postpone the recital," Nadia said.\nNadia suggested to postpone the recital as it was quite tense.'],
     {0, 1, 3},
     'Ստուգել ժամանակաձևի հետշարժը և բային հաջորդող կառուցվածքը (գերունդ/infinitive):',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ «says» ներկա է, մինչդեռ շրջանակն արդեն անցյալում է («asked»)։ Ե սխալ է՝ «suggest» պահանջում է գերունդ, ոչ infinitive։']),
    (['"By the time you arrived, we had already fited the costume," Owen said.\nOwen told that by the time I had arrived, they had already fited the costume.', '"Can you explain why the counts don\'t match?" Farah asked the choreographer.\nFarah asked the choreographer if they could explain why the counts didn\'t match.', 'Leo said to Ana: "I\'m sure the artistic director will approve the rehearsal schedule."\nLeo assured Ana that the artistic director would approve the rehearsal schedule.', 'The artistic director said to the dancers, "Proper warm-ups significantly reduce injury rates."\nThe artistic director told the dancers that proper warm-ups significantly reduce injury rates.', 'The junior junior instructor begged the artistic director to explain everything about the new studio safety policy.\n"I beg you to explain everything about the new studio safety policy," said the junior junior instructor.'],
     {1, 2, 3, 4},
     '«Tell» պահանջում է ուղղակի խնդիր, գիտական/ընդհանուր փաստերը մնում են ներկա ժամանակով:',
     ['Ա սխալ է՝ «told» պահանջում է «told me»։ Բ, Գ, Դ, Ե ճիշտ են։']),
    (['"I\'ve just updated the rehearsal schedule. Everything\'s polished," Grace said.\nGrace told James that she had just updated the rehearsal schedule and added that everything was polished.', '"What time will the recital start next Monday?" the dancers asked the choreographer.\nThe dancers asked the choreographer what time the recital would start the following Monday.', '"Once the repertoire change is finalized, dancers won\'t be reassigned," the artistic director said.\nThe artistic director stated that once the repertoire change was finalized, dancers wouldn\'t be reassigned.', 'Victor apologized to Elena for interrupting her recital the day before.\n"I\'m sorry for interrupting your recital yesterday," Victor said to Elena.', '"If you plan to visit the studio, ask Priya to escort you," the artistic director said to Noor.\nNoor\'s artistic director asked Priya to escort her if she planned to visit the studio.'],
     {0, 1, 2, 3},
     'Ստուգել, թե ով է իրականում կատարում խնդրանքի գործողությունը բնօրինակում:',
     ["Ա, Բ, Գ, Դ ճիշտ են։ Ե սխալ է՝ բնօրինակում artistic directorն ասում է Նուրին, ուստի ճիշտ է «Noor's artistic director told Noor to ask Priya...»։"]),
    (['"I will update the rehearsal schedule at the studio the day after tomorrow," Dr. Reyes said.\nDr. Reyes said that they would update the rehearsal schedule at the studio in two days\' time.', '"If you don\'t confirm the studio slot today, the performance date will change," Priya said to Tom.\nPriya told Tom that the performance date would change if he hadn\'t confirmed the studio slot today.', 'My colleague warned me not to skip the warm-up as it would compromise the performance.\n"Don\'t skip the warm-up; it will compromise the performance," my colleague said to me.', 'Farid said, "I will accept the lead role which is offered to me."\nFarid said that he would accept the lead role which was offered to him.', '"Will either Nadia or Omar update the rehearsal schedule tomorrow?" Rosa asked.\nRosa asked Nadia whether she or Omar would update the rehearsal schedule the following day.'],
     {0, 2, 3, 4},
     'Առաջին տիպի պայմանական նախադասությունների անուղղակի ձևում «if»-ը հետշարժվում է պարզ անցյալով:',
     ["Ա, Գ, Դ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «if he didn't confirm», ոչ «hadn't confirmed»։"]),
    (['The artistic director didn\'t allow Priya to leave the studio early.\nThe artistic director says to Priya, "Would you mind staying at the studio until the end of the shift?"', '"I have been rehearsing the routine for two weeks. I need to finish it today," Diego said.\nDiego said he had been rehearsing the routine for two weeks to finish it that day.', 'Hana told me that she would like to join the dance mentorship program.\nHana said to me, "I would like to join the dance mentorship program."', 'Tariq asked his artistic director, "Must I submit the rehearsal schedule tonight?"\nTariq asked his artistic director to submit the rehearsal schedule that night.', 'The junior instructor said to Lena, "When does the studio membership expire?"\nThe junior instructor asked Lena when the studio membership expired.'],
     {1, 2, 4},
     'Համեմատել բնօրինակի իմաստը («must I» = պարտադրանքի մասին հարց) վերակառուցված ձևի հետ:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ «says» ներկա է, մինչդեռ շրջանակը անցյալում է։ Դ սխալ է՝ ճիշտ է «whether he had to submit»։']),
]

QFORM_BOXES = [
    (["There's no reason to doubt the report's accuracy, was there?",
      "I am confident that the estimate is correct, aren't I?",
      "Which supplier do you deal with most often?",
      "Did you used to work weekends when you started?",
      "Was it you or the assistant who filed the complaint?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to notify the client immediately, isn't it?",
      "Do you know how much the new license costs?",
      "Had you a word with the vendor about the delay?",
      "The quarterly report will be reviewed tomorrow, won't it?",
      "Were you and Dara at the meeting yesterday afternoon?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the vendor...?»։"]),
    (["We seldom witness such a smooth negotiation, do we?",
      "This is the first time I have led this project, isn't this?",
      "How many branches does this company operate?",
      "Who did report the discrepancy first?",
      "Can you finally tell me what caused the confusion?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to update the inventory?",
      "Please, don't mention the error to the client, will you?",
      "Will they the invoice or the receipt send first?",
      "Do you regret skipping the orientation session?",
      "Why the assistant questioned the figures yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they send the invoice or the receipt first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was concerned about the timeline?",
      "Did Marco log fewer errors than Elena this month?",
      "Do you think should we postpone the launch?",
      "He will surely appreciate the gesture, won't it?",
      "Has the team finalized the presentation?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the launch?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to postpone the surgery, was there?",
      "I am confident that the diagnosis is correct, aren't I?",
      "Which specialist do you consult most often?",
      "Did you used to work in the ER when you started?",
      "Was it you or the nurse who updated the chart?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to inform the patient immediately, isn't it?",
      "Do you know how much the new scanner costs?",
      "Had you a word with the specialist about the results?",
      "The lab results will be reviewed tomorrow, won't they?",
      "Were you and Dara on call at midnight yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the specialist...?»։"]),
    (["We seldom witness such a rapid recovery, do we?",
      "This is the first time I have led a seminar, isn't this?",
      "How many credits does this course require?",
      "Who did submit the proposal first?",
      "Can you finally explain what triggered the outage?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who submitted...?»։"]),
    (["How often do we need to update the software?",
      "Please, don't mention the bug to the client, will you?",
      "Will they the manifest or the certificate submit first?",
      "Do you regret skipping the orientation?",
      "Why the intern questioned the results yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they submit the manifest or the certificate first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about the itinerary?",
      "Did Marco book fewer excursions than Elena this month?",
      "Do you think should we extend the trip?",
      "He will surely enjoy the tour, won't it?",
      "Has the guide finalized the schedule?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should extend the trip?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),

    (["There's no reason to doubt the total, was there?",
      "I am confident that the discount applies, aren't I?",
      "Which supplier do you order from most often?",
      "Did you used to work weekends when you started?",
      "Was it you or the cashier who voided the sale?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to restock immediately, isn't it?",
      "Do you know how much the new register costs?",
      "Had you a word with the supplier about the delay?",
      "The inventory count will be reviewed tomorrow, won't it?",
      "Were you and Mia on shift at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the supplier...?»։"]),
    (["We seldom witness such a busy sale, do we?",
      "This is the first time I have managed a shift, isn't this?",
      "How many branches does this store chain operate?",
      "Who did report the missing stock first?",
      "Can you finally tell me what caused the shortage?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to reorder supplies?",
      "Please, don't mention the error to the customer, will you?",
      "Will they the discount or the coupon apply first?",
      "Do you regret missing the training session?",
      "Why the clerk questioned the price yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they apply the discount or the coupon first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about the stock levels?",
      "Did Marco process fewer returns than Elena this month?",
      "Do you think should we extend the sale?",
      "He will surely appreciate the bonus, won't it?",
      "Has the manager finalized the schedule?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should extend the sale?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the forecast, was there?",
      "I am confident that the runway is clear, aren't I?",
      "Which route do you fly most often?",
      "Did you used to work night shifts when you started?",
      "Was it you or the co-pilot who logged the fuel?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to inspect the wings immediately, isn't it?",
      "Do you know how much the new radar costs?",
      "Had you a word with the mechanic about the noise?",
      "The flight plan will be reviewed tomorrow, won't it?",
      "Were you and Dara on duty at midnight yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the mechanic...?»։"]),
    (["We seldom witness such a smooth landing, do we?",
      "This is the first time I have flown this route, isn't this?",
      "How many crew members does this aircraft require?",
      "Who did report the turbulence first?",
      "Can you finally explain what caused the diversion?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to service the engines?",
      "Please, don't mention the incident to the passengers, will you?",
      "Will they the manifest or the log check first?",
      "Do you regret skipping the briefing?",
      "Why the officer questioned the readings yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they check the manifest or the log first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did he say he was worried about the weather?",
      "Did Sara log fewer hours than Jeff this month?",
      "Do you think should we delay the departure?",
      "He will surely enjoy the flight, won't it?",
      "Has Lucy finalized the manifest?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should delay the departure?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the survey, was there?",
      "I am confident that the foundation is solid, aren't I?",
      "Which contractor do you work with most often?",
      "Did you used to work on-site when you started?",
      "Was it you or the foreman who signed the permit?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to reinforce the beams immediately, isn't it?",
      "Do you know how much the new crane costs?",
      "Had you a word with the architect about the design?",
      "The safety report will be reviewed tomorrow, won't it?",
      "Were you and Kobe on site at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the architect...?»։"]),
    (["We seldom witness such a fast build, do we?",
      "This is the first time I have managed a site, isn't this?",
      "How many workers does this project require?",
      "Who did report the structural issue first?",
      "Can you finally explain what caused the crack?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to inspect the scaffolding?",
      "Please, don't mention the crack to the client, will you?",
      "Will they the blueprint or the permit review first?",
      "Do you regret missing the safety briefing?",
      "Why the inspector questioned the materials yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they review the blueprint or the permit first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about the timeline?",
      "Did Marco log fewer delays than Elena this month?",
      "Do you think should we extend the deadline?",
      "He will surely appreciate the raise, won't it?",
      "Has the crew finalized the schedule?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should extend the deadline?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the prescription, was there?",
      "I am confident that the dosage is correct, aren't I?",
      "Which pharmacist do you consult most often?",
      "Did you used to work the night pharmacy when you started?",
      "Was it you or the technician who filled the order?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to label the medication immediately, isn't it?",
      "Do you know how much the new equipment costs?",
      "Had you a word with the doctor about the side effects?",
      "The prescription will be reviewed tomorrow, won't it?",
      "Were you and Mia on call at midnight yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the doctor...?»։"]),
    (["We seldom witness such a rapid recovery, do we?",
      "This is the first time I have managed the pharmacy, isn't this?",
      "How many prescriptions does this pharmacy fill daily?",
      "Who did report the shortage first?",
      "Can you finally explain what caused the mix-up?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to restock the pharmacy?",
      "Please, don't mention the error to the patient, will you?",
      "Will they the prescription or the receipt process first?",
      "Do you regret skipping the training session?",
      "Why the technician questioned the dosage yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they process the prescription or the receipt first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did he say he was worried about the supply?",
      "Did Sara fill fewer prescriptions than Jeff this month?",
      "Do you think should we contact the supplier?",
      "He will surely appreciate the update, won't it?",
      "Has Lucy finalized the order?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should contact the supplier?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the lesson plan, was there?",
      "I am confident that the grading is fair, aren't I?",
      "Which subject do you tutor most often?",
      "Did you used to work as a substitute when you started?",
      "Was it you or the assistant who graded the essays?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to submit the grades immediately, isn't it?",
      "Do you know how much the new textbooks cost?",
      "Had you a word with the principal about the schedule?",
      "The lesson plan will be reviewed tomorrow, won't it?",
      "Were you and Dara tutoring at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the principal...?»։"]),
    (["We seldom witness such rapid progress, do we?",
      "This is the first time I have tutored online, isn't this?",
      "How many students does this program accept?",
      "Who did report the technical issue first?",
      "Can you finally explain what caused the confusion?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to update the curriculum?",
      "Please, don't mention the mistake to the parents, will you?",
      "Will they the quiz or the assignment grade first?",
      "Do you regret missing the workshop?",
      "Why the tutor questioned the answer yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they grade the quiz or the assignment first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about the results?",
      "Did Marco assign fewer tasks than Elena this month?",
      "Do you think should we reschedule the exam?",
      "He will surely appreciate the feedback, won't it?",
      "Has the teacher finalized the syllabus?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should reschedule the exam?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the itinerary, was there?",
      "I am confident that the reservation is confirmed, aren't I?",
      "Which airline do you fly most often?",
      "Did you used to work as a travel agent when you started?",
      "Was it you or the agent who booked the hotel?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to confirm the visa immediately, isn't it?",
      "Do you know how much the new luggage costs?",
      "Had you a word with the agent about the itinerary?",
      "The booking will be reviewed tomorrow, won't it?",
      "Were you and Mia at the airport at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the agent...?»։"]),
    (["We seldom witness such a smooth check-in, do we?",
      "This is the first time I have booked this route, isn't this?",
      "How many stopovers does this flight include?",
      "Who did report the delay first?",
      "Can you finally explain what caused the cancellation?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to renew the passport?",
      "Please, don't mention the delay to the passengers, will you?",
      "Will they the boarding pass or the visa check first?",
      "Do you regret missing the connecting flight?",
      "Why the officer questioned the documents yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they check the boarding pass or the visa first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did he say he was worried about the connection?",
      "Did Sara book fewer trips than Jeff this month?",
      "Do you think should we change the itinerary?",
      "He will surely enjoy the trip, won't it?",
      "Has Lucy finalized the reservation?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should change the itinerary?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the diagnosis, was there?",
      "I am confident that the treatment is effective, aren't I?",
      "Which clinic do you visit most often?",
      "Did you used to work in radiology when you started?",
      "Was it you or the nurse who updated the chart?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to update the chart immediately, isn't it?",
      "Do you know how much the new scanner costs?",
      "Had you a word with the specialist about the results?",
      "The referral will be reviewed tomorrow, won't it?",
      "Were you and Dara on call at midnight yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the specialist...?»։"]),
    (["We seldom witness such a fast recovery, do we?",
      "This is the first time I have assisted this surgeon, isn't this?",
      "How many patients does this clinic see daily?",
      "Who did report the symptoms first?",
      "Can you finally explain what caused the reaction?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to sterilize the equipment?",
      "Please, don't mention the result to the family, will you?",
      "Will they the chart or the scan review first?",
      "Do you regret missing the seminar?",
      "Why the nurse questioned the dosage yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they review the chart or the scan first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about the results?",
      "Did Marco see fewer patients than Elena this month?",
      "Do you think should we reschedule the surgery?",
      "He will surely appreciate the update, won't it?",
      "Has the surgeon finalized the plan?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should reschedule the surgery?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the census data, was there?",
      "I am confident that the sample is representative, aren't I?",
      "Which district do you survey most often?",
      "Did you used to work in statistics when you started?",
      "Was it you or the analyst who compiled the figures?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to publish the findings immediately, isn't it?",
      "Do you know how much the new survey costs?",
      "Had you a word with the analyst about the sample?",
      "The report will be reviewed tomorrow, won't it?",
      "Were you and Kobe collecting data at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the analyst...?»։"]),
    (["We seldom witness such a clear trend, do we?",
      "This is the first time I have led this survey, isn't this?",
      "How many households does this survey cover?",
      "Who did report the anomaly first?",
      "Can you finally explain what caused the spike?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to update the dataset?",
      "Please, don't mention the error to the committee, will you?",
      "Will they the survey or the census release first?",
      "Do you regret skipping the workshop?",
      "Why the analyst questioned the figures yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they release the survey or the census first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about the sample size?",
      "Did Marco collect fewer responses than Elena this month?",
      "Do you think should we expand the survey?",
      "He will surely appreciate the analysis, won't it?",
      "Has the team finalized the questionnaire?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should expand the survey?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the harvest estimate, was there?",
      "I am confident that the soil test is accurate, aren't I?",
      "Which crop do you grow most often?",
      "Did you used to work the fields when you started?",
      "Was it you or the contractor who signed the lease?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to irrigate the field immediately, isn't it?",
      "Do you know how much the new tractor costs?",
      "Had you a word with the contractor about the lease?",
      "The harvest report will be reviewed tomorrow, won't it?",
      "Were you and Mia in the field at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the contractor...?»։"]),
    (["We seldom witness such a strong harvest, do we?",
      "This is the first time I have managed the farm, isn't this?",
      "How many acres does this farm cover?",
      "Who did report the pest infestation first?",
      "Can you finally explain what caused the crop damage?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to rotate the crops?",
      "Please, don't mention the pest to the buyer, will you?",
      "Will they the seed or the fertilizer order first?",
      "Do you regret missing the workshop?",
      "Why the contractor questioned the lease yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they order the seed or the fertilizer first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did he say he was worried about the drought?",
      "Did Sara plant fewer acres than Jeff this month?",
      "Do you think should we delay the planting?",
      "He will surely appreciate the rain, won't it?",
      "Has Lucy finalized the crop rotation?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should delay the planting?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the pitch deck, was there?",
      "I am confident that the valuation is fair, aren't I?",
      "Which investor do you meet most often?",
      "Did you used to work in venture capital when you started?",
      "Was it you or the analyst who prepared the forecast?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to update the forecast immediately, isn't it?",
      "Do you know how much the new equipment costs?",
      "Had you a word with the investor about the terms?",
      "The valuation will be reviewed tomorrow, won't it?",
      "Were you and Mia pitching at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the investor...?»։"]),
    (["We seldom witness such a strong pitch, do we?",
      "This is the first time I have led a fundraising round, isn't this?",
      "How many investors does this round include?",
      "Who did report the delay first?",
      "Can you finally explain what caused the setback?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to update the forecast?",
      "Please, don't mention the setback to the board, will you?",
      "Will they the term sheet or the contract sign first?",
      "Do you regret missing the pitch competition?",
      "Why the investor questioned the numbers yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they sign the term sheet or the contract first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did he say he was worried about the runway?",
      "Did Sara close fewer deals than Jeff this month?",
      "Do you think should we raise another round?",
      "He will surely appreciate the support, won't it?",
      "Has Lucy finalized the term sheet?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should raise another round?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the casting choice, was there?",
      "I am confident that the script is finished, aren't I?",
      "Which theater do you perform at most often?",
      "Did you used to work backstage when you started?",
      "Was it you or the stagehand who moved the set?"],
     {1, 2, 4},
     "Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:",
     ["Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։"]),
    (["It is essential to finalize the script immediately, isn't it?",
      "Do you know how much the new costumes cost?",
      "Had you a word with the director about the casting?",
      "The rehearsal schedule will be reviewed tomorrow, won't it?",
      "Were you and Dara backstage at noon yesterday?"],
     {0, 1, 3, 4},
     "Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:",
     ["Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the director...?»։"]),
    (["We seldom witness such a strong opening night, do we?",
      "This is the first time I have directed a musical, isn't this?",
      "How many actors does this production include?",
      "Who did report the costume malfunction first?",
      "Can you finally explain what caused the delay?"],
     {0, 2, 4},
     "«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:",
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported...?»։"]),
    (["How often do we need to update the set design?",
      "Please, don't mention the mistake to the critics, will you?",
      "Will they the props or the costumes prepare first?",
      "Do you regret missing the audition?",
      "Why the actor questioned the script yesterday?"],
     {0, 1, 3},
     "Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:",
     ["Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they prepare the props or the costumes first?»։ Ե սխալ է՝ բացակայում է «did»։"]),
    (["Why did she say she was worried about ticket sales?",
      "Did Marco rehearse fewer scenes than Elena this month?",
      "Do you think should we extend the run?",
      "He will surely appreciate the applause, won't it?",
      "Has the director finalized the cast?"],
     {0, 1, 4},
     "Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:",
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should extend the run?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the chart, was there?", "I am confident that the chart is stable, aren't I?", 'Which patient do you treat most often?', 'Did you used to work the night shift when you started?', 'Was it you or the intern who ordered the scan?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the chart immediately, isn't it?", 'Do you know how much the new scan costs?', 'Had you a word with the specialist about the chart?', "The morning briefing will be reviewed tomorrow, won't it?", 'Were you and Mia at the ward at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the specialist...?»։']),
    (['We seldom witness such a strong morning briefing, do we?', "This is the first time I have reviewed the chart, isn't this?", 'How many cases does this morning briefing cover?', 'Who did report the staff shortage first?', 'Can you finally explain what caused the production delay?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the staff shortage first?»։"]),
    (['How often do we need to review the chart?', "Please, don't mention the staff shortage to the specialist, will you?", 'Will they the scan or the chart order first?', 'Do you regret missing the residency program?', 'Why the specialist questioned the renovation yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they order the scan or the chart first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the staff shortage?', 'Did Sara treat fewer cases than Jeff this month?', 'Do you think should we postpone the morning briefing?', "He will surely appreciate the position, won't it?", 'Has Lucy finalized the renovation?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the morning briefing?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the manifest, was there?", "I am confident that the manifest is on schedule, aren't I?", 'Which passenger do you assist most often?', 'Did you used to work at the check-in desk when you started?', 'Was it you or the agent who stamped the boarding pass?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to check the manifest immediately, isn't it?", 'Do you know how much the new boarding pass costs?', 'Had you a word with the technician about the manifest?', "The boarding call will be reviewed tomorrow, won't it?", 'Were you and Mia at the gate at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the technician...?»։']),
    (['We seldom witness such a strong boarding call, do we?', "This is the first time I have checked the manifest, isn't this?", 'How many passengers does this boarding call board?', 'Who did report the overbooking first?', 'Can you finally explain what caused the gate change?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the overbooking first?»։"]),
    (['How often do we need to check the manifest?', "Please, don't mention the overbooking to the technician, will you?", 'Will they the boarding pass or the manifest stamp first?', 'Do you regret missing the flight crew?', 'Why the technician questioned the schedule yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they stamp the boarding pass or the manifest first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the overbooking?', 'Did Sara assist fewer passengers than Jeff this month?', 'Do you think should we delay the boarding call?', "He will surely appreciate the upgrade, won't it?", 'Has Lucy finalized the schedule?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should delay the boarding call?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the brief, was there?", "I am confident that the brief is in order, aren't I?", 'Which client do you represent most often?', 'Did you used to work as a paralegal when you started?', 'Was it you or the paralegal who scheduled the deposition?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the brief immediately, isn't it?", 'Do you know how much the new deposition costs?', 'Had you a word with the associate about the brief?', "The closing argument will be reviewed tomorrow, won't it?", 'Were you and Mia at the courthouse at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the associate...?»։']),
    (['We seldom witness such a strong closing argument, do we?', "This is the first time I have reviewed the brief, isn't this?", 'How many clients does this closing argument involve?', 'Who did report the mistrial first?', 'Can you finally explain what caused the appeal?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the mistrial first?»։"]),
    (['How often do we need to review the brief?', "Please, don't mention the mistrial to the associate, will you?", 'Will they the deposition or the brief schedule first?', 'Do you regret missing the clerkship program?', 'Why the associate questioned the verdict yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they schedule the deposition or the brief first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the mistrial?', 'Did Sara represent fewer clients than Jeff this month?', 'Do you think should we postpone the closing argument?', "He will surely appreciate the settlement, won't it?", 'Has Lucy finalized the verdict?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the closing argument?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the menu, was there?", "I am confident that the menu is ready, aren't I?", 'Which dish do you prepare most often?', 'Did you used to work the grill when you started?', 'Was it you or the line cook who printed the recipe card?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to update the menu immediately, isn't it?", 'Do you know how much the new recipe card costs?', 'Had you a word with the sous chef about the menu?', "The tasting session will be reviewed tomorrow, won't it?", 'Were you and Mia in the kitchen at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the sous chef...?»։']),
    (['We seldom witness such a strong tasting session, do we?', "This is the first time I have updated the menu, isn't this?", 'How many dishes does this tasting session feature?', 'Who did report the ingredient shortage first?', 'Can you finally explain what caused the menu mix-up?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the ingredient shortage first?»։"]),
    (['How often do we need to update the menu?', "Please, don't mention the ingredient shortage to the sous chef, will you?", 'Will they the recipe card or the menu print first?', 'Do you regret missing the apprenticeship program?', 'Why the sous chef questioned the menu redesign yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they print the recipe card or the menu first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the ingredient shortage?', 'Did Sara prepare fewer dishes than Jeff this month?', 'Do you think should we postpone the tasting session?', "He will surely appreciate the promotion, won't it?", 'Has Lucy finalized the menu redesign?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the tasting session?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the blueprint, was there?", "I am confident that the blueprint is secure, aren't I?", 'Which project do you oversee most often?', 'Did you used to work as a laborer when you started?', 'Was it you or the apprentice who filed the permit?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the blueprint immediately, isn't it?", 'Do you know how much the new permit costs?', 'Had you a word with the contractor about the blueprint?', "The safety briefing will be reviewed tomorrow, won't it?", 'Were you and Mia at the site at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the contractor...?»։']),
    (['We seldom witness such a strong safety briefing, do we?', "This is the first time I have reviewed the blueprint, isn't this?", 'How many sites does this safety briefing cover?', 'Who did report the material shortage first?', 'Can you finally explain what caused the dispute?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the material shortage first?»։"]),
    (['How often do we need to review the blueprint?', "Please, don't mention the material shortage to the contractor, will you?", 'Will they the permit or the blueprint file first?', 'Do you regret missing the training program?', 'Why the contractor questioned the design change yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they file the permit or the blueprint first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the material shortage?', 'Did Sara oversee fewer sites than Jeff this month?', 'Do you think should we postpone the safety briefing?', "He will surely appreciate the contract, won't it?", 'Has Lucy finalized the design change?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the safety briefing?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the dataset, was there?", "I am confident that the dataset is valid, aren't I?", 'Which hypothesis do you test most often?', 'Did you used to work in the lab when you started?', 'Was it you or the research assistant who labeled the sample?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to analyze the dataset immediately, isn't it?", 'Do you know how much the new sample costs?', 'Had you a word with the postdoc about the dataset?', "The lab meeting will be reviewed tomorrow, won't it?", 'Were you and Mia in the laboratory at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the postdoc...?»։']),
    (['We seldom witness such a strong lab meeting, do we?', "This is the first time I have analyzed the dataset, isn't this?", 'How many samples does this lab meeting require?', 'Who did report the contamination first?', 'Can you finally explain what caused the setback?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the contamination first?»։"]),
    (['How often do we need to analyze the dataset?', "Please, don't mention the contamination to the postdoc, will you?", 'Will they the sample or the dataset label first?', 'Do you regret missing the fellowship program?', 'Why the postdoc questioned the funding review yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they label the sample or the dataset first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the contamination?', 'Did Sara test fewer samples than Jeff this month?', 'Do you think should we postpone the lab meeting?', "He will surely appreciate the grant, won't it?", 'Has Lucy finalized the funding review?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the lab meeting?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the specification, was there?", "I am confident that the specification is stable, aren't I?", 'Which feature do you ship most often?', 'Did you used to work as a tester when you started?', 'Was it you or the developer who deployed the patch?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the specification immediately, isn't it?", 'Do you know how much the new patch costs?', 'Had you a word with the tester about the specification?', "The sprint review will be reviewed tomorrow, won't it?", 'Were you and Mia at the office at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the tester...?»։']),
    (['We seldom witness such a strong sprint review, do we?', "This is the first time I have reviewed the specification, isn't this?", 'How many features does this sprint review cover?', 'Who did report the server outage first?', 'Can you finally explain what caused the rollback?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the server outage first?»։"]),
    (['How often do we need to review the specification?', "Please, don't mention the server outage to the tester, will you?", 'Will they the patch or the specification deploy first?', 'Do you regret missing the internship program?', 'Why the tester questioned the architecture change yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they deploy the patch or the specification first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the server outage?', 'Did Sara ship fewer features than Jeff this month?', 'Do you think should we postpone the sprint review?', "He will surely appreciate the commission, won't it?", 'Has Lucy finalized the architecture change?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the sprint review?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the catalog entry, was there?", "I am confident that the catalog entry is secure, aren't I?", 'Which exhibit do you curate most often?', 'Did you used to work as a guide when you started?', 'Was it you or the museum guide who labeled the artifact?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to update the catalog entry immediately, isn't it?", 'Do you know how much the new artifact costs?', 'Had you a word with the conservator about the catalog entry?', "The exhibit opening will be reviewed tomorrow, won't it?", 'Were you and Mia in the gallery at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the conservator...?»։']),
    (['We seldom witness such a strong exhibit opening, do we?', "This is the first time I have updated the catalog entry, isn't this?", 'How many artifacts does this exhibit opening feature?', 'Who did report the water damage first?', 'Can you finally explain what caused the postponement?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the water damage first?»։"]),
    (['How often do we need to update the catalog entry?', "Please, don't mention the water damage to the conservator, will you?", 'Will they the artifact or the catalog entry label first?', 'Do you regret missing the curatorial program?', 'Why the conservator questioned the reinstallation yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they label the artifact or the catalog entry first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the water damage?', 'Did Sara curate fewer artifacts than Jeff this month?', 'Do you think should we postpone the exhibit opening?', "He will surely appreciate the fellowship, won't it?", 'Has Lucy finalized the reinstallation?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the exhibit opening?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the statement, was there?", "I am confident that the statement is balanced, aren't I?", 'Which account do you manage most often?', 'Did you used to work as a teller when you started?', 'Was it you or the teller who processed the loan application?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the statement immediately, isn't it?", 'Do you know how much the new loan application costs?', 'Had you a word with the auditor about the statement?', "The quarterly review will be reviewed tomorrow, won't it?", 'Were you and Mia at the branch at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the auditor...?»։']),
    (['We seldom witness such a strong quarterly review, do we?', "This is the first time I have reviewed the statement, isn't this?", 'How many accounts does this quarterly review cover?', 'Who did report the audit flag first?', 'Can you finally explain what caused the audit delay?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the audit flag first?»։"]),
    (['How often do we need to review the statement?', "Please, don't mention the audit flag to the auditor, will you?", 'Will they the loan application or the statement process first?', 'Do you regret missing the leadership program?', 'Why the auditor questioned the policy change yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they process the loan application or the statement first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the audit flag?', 'Did Sara manage fewer accounts than Jeff this month?', 'Do you think should we postpone the quarterly review?', "He will surely appreciate the loan, won't it?", 'Has Lucy finalized the policy change?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the quarterly review?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the manuscript, was there?", "I am confident that the manuscript is final, aren't I?", 'Which manuscript do you edit most often?', 'Did you used to work as a copy editor when you started?', 'Was it you or the editorial assistant who annotated the proof?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to edit the manuscript immediately, isn't it?", 'Do you know how much the new proof costs?', 'Had you a word with the copy editor about the manuscript?', "The editorial meeting will be reviewed tomorrow, won't it?", 'Were you and Mia at the print shop at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the copy editor...?»։']),
    (['We seldom witness such a strong editorial meeting, do we?', "This is the first time I have edited the manuscript, isn't this?", 'How many chapters does this editorial meeting cover?', 'Who did report the printing delay first?', 'Can you finally explain what caused the printing setback?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the printing delay first?»։"]),
    (['How often do we need to edit the manuscript?', "Please, don't mention the printing delay to the copy editor, will you?", 'Will they the proof or the manuscript annotate first?', 'Do you regret missing the mentorship program?', 'Why the copy editor questioned the rebranding yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they annotate the proof or the manuscript first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the printing delay?', 'Did Sara edit fewer chapters than Jeff this month?', 'Do you think should we postpone the editorial meeting?', "He will surely appreciate the book deal, won't it?", 'Has Lucy finalized the rebranding?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the editorial meeting?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the script, was there?", "I am confident that the script is final, aren't I?", 'Which scene do you direct most often?', 'Did you used to work as a production assistant when you started?', 'Was it you or the production assistant who storyboarded the scene?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to revise the script immediately, isn't it?", 'Do you know how much the new scene costs?', 'Had you a word with the cinematographer about the script?', "The table read will be reviewed tomorrow, won't it?", 'Were you and Mia on the set at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the cinematographer...?»։']),
    (['We seldom witness such a strong table read, do we?', "This is the first time I have revised the script, isn't this?", 'How many scenes does this table read cover?', 'Who did report the continuity error first?', 'Can you finally explain what caused the reshoot delay?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the continuity error first?»։"]),
    (['How often do we need to revise the script?', "Please, don't mention the continuity error to the cinematographer, will you?", 'Will they the scene or the script storyboard first?', 'Do you regret missing the directing program?', 'Why the cinematographer questioned the rewrite yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they storyboard the scene or the script first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the continuity error?', 'Did Sara direct fewer scenes than Jeff this month?', 'Do you think should we postpone the table read?', "He will surely appreciate the role, won't it?", 'Has Lucy finalized the rewrite?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the table read?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the record, was there?", "I am confident that the record is stable, aren't I?", 'Which patient do you examine most often?', 'Did you used to work as a technician when you started?', 'Was it you or the vet technician who reviewed the x-ray?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to update the record immediately, isn't it?", 'Do you know how much the new x-ray costs?', 'Had you a word with the specialist about the record?', "The daily check-in will be reviewed tomorrow, won't it?", 'Were you and Mia at the clinic at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the specialist...?»։']),
    (['We seldom witness such a strong daily check-in, do we?', "This is the first time I have updated the record, isn't this?", 'How many patients does this daily check-in cover?', 'Who did report the medicine shortage first?', 'Can you finally explain what caused the scheduling mix-up?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the medicine shortage first?»։"]),
    (['How often do we need to update the record?', "Please, don't mention the medicine shortage to the specialist, will you?", 'Will they the x-ray or the record review first?', 'Do you regret missing the clinical training program?', 'Why the specialist questioned the clinic upgrade yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they review the x-ray or the record first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the medicine shortage?', 'Did Sara examine fewer patients than Jeff this month?', 'Do you think should we postpone the daily check-in?', "He will surely appreciate the internship, won't it?", 'Has Lucy finalized the clinic upgrade?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the daily check-in?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the maintenance log, was there?", "I am confident that the maintenance log is airworthy, aren't I?", 'Which aircraft do you inspect most often?', 'Did you used to work as an apprentice mechanic when you started?', 'Was it you or the apprentice mechanic who replaced the component?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the maintenance log immediately, isn't it?", 'Do you know how much the new component costs?', 'Had you a word with the inspector about the maintenance log?', "The pre-flight check will be reviewed tomorrow, won't it?", 'Were you and Mia at the hangar at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the inspector...?»։']),
    (['We seldom witness such a strong pre-flight check, do we?', "This is the first time I have reviewed the maintenance log, isn't this?", 'How many aircraft does this pre-flight check cover?', 'Who did report the engine fault first?', 'Can you finally explain what caused the grounding?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the engine fault first?»։"]),
    (['How often do we need to review the maintenance log?', "Please, don't mention the engine fault to the inspector, will you?", 'Will they the component or the maintenance log replace first?', 'Do you regret missing the apprenticeship program for mechanics?', 'Why the inspector questioned the fleet upgrade yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they replace the component or the maintenance log first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the engine fault?', 'Did Sara inspect fewer aircraft than Jeff this month?', 'Do you think should we postpone the pre-flight check?', "He will surely appreciate the transfer, won't it?", 'Has Lucy finalized the fleet upgrade?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the pre-flight check?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the planting record, was there?", "I am confident that the planting record is thriving, aren't I?", 'Which specimen do you catalog most often?', 'Did you used to work as a garden intern when you started?', 'Was it you or the garden intern who labeled the specimen?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to update the planting record immediately, isn't it?", 'Do you know how much the new specimen costs?', 'Had you a word with the botanist about the planting record?', "The plant sale will be reviewed tomorrow, won't it?", 'Were you and Mia in the greenhouse at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the botanist...?»։']),
    (['We seldom witness such a strong plant sale, do we?', "This is the first time I have updated the planting record, isn't this?", 'How many specimens does this plant sale feature?', 'Who did report the infestation first?', 'Can you finally explain what caused the frost damage?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the infestation first?»։"]),
    (['How often do we need to update the planting record?', "Please, don't mention the infestation to the botanist, will you?", 'Will they the specimen or the planting record label first?', 'Do you regret missing the horticulture training program?', 'Why the botanist questioned the greenhouse expansion yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they label the specimen or the planting record first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the infestation?', 'Did Sara catalog fewer specimens than Jeff this month?', 'Do you think should we postpone the plant sale?', "He will surely appreciate the fellowship at the garden, won't it?", 'Has Lucy finalized the greenhouse expansion?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the plant sale?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the rundown, was there?", "I am confident that the rundown is finalized, aren't I?", 'Which segment do you produce most often?', 'Did you used to work as a broadcast assistant when you started?', 'Was it you or the broadcast assistant who recorded the segment?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the rundown immediately, isn't it?", 'Do you know how much the new segment costs?', 'Had you a word with the sound engineer about the rundown?', "The live broadcast will be reviewed tomorrow, won't it?", 'Were you and Mia in the studio at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the sound engineer...?»։']),
    (['We seldom witness such a strong live broadcast, do we?', "This is the first time I have reviewed the rundown, isn't this?", 'How many segments does this live broadcast feature?', 'Who did report the signal outage first?', 'Can you finally explain what caused the dead air?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the signal outage first?»։"]),
    (['How often do we need to review the rundown?', "Please, don't mention the signal outage to the sound engineer, will you?", 'Will they the segment or the rundown record first?', 'Do you regret missing the broadcasting internship?', 'Why the sound engineer questioned the format change yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they record the segment or the rundown first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the signal outage?', 'Did Sara produce fewer segments than Jeff this month?', 'Do you think should we postpone the live broadcast?', "He will surely appreciate the on-air slot, won't it?", 'Has Lucy finalized the format change?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the live broadcast?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the observation log, was there?", "I am confident that the observation log is calibrated, aren't I?", 'Which galaxy do you observe most often?', 'Did you used to work as a graduate assistant when you started?', 'Was it you or the graduate assistant who calibrated the telescope?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the observation log immediately, isn't it?", 'Do you know how much the new telescope costs?', 'Had you a word with the technician about the observation log?', "The stargazing night will be reviewed tomorrow, won't it?", 'Were you and Mia in the observatory dome at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the technician...?»։']),
    (['We seldom witness such a strong stargazing night, do we?', "This is the first time I have reviewed the observation log, isn't this?", 'How many galaxies does this stargazing night cover?', 'Who did report the cloud cover first?', 'Can you finally explain what caused the equipment failure?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the cloud cover first?»։"]),
    (['How often do we need to review the observation log?', "Please, don't mention the cloud cover to the technician, will you?", 'Will they the telescope or the observation log calibrate first?', 'Do you regret missing the astronomy fellowship?', 'Why the technician questioned the dome renovation yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they calibrate the telescope or the observation log first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the cloud cover?', 'Did Sara observe fewer galaxies than Jeff this month?', 'Do you think should we postpone the stargazing night?', "He will surely appreciate the research position, won't it?", 'Has Lucy finalized the dome renovation?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the stargazing night?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the order sheet, was there?", "I am confident that the order sheet is on schedule, aren't I?", 'Which bolt do you inspect most often?', 'Did you used to work as a loom operator when you started?', 'Was it you or the loom operator who inspected the bolt of fabric?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the order sheet immediately, isn't it?", 'Do you know how much the new bolt of fabric costs?', 'Had you a word with the quality inspector about the order sheet?', "The quality audit will be reviewed tomorrow, won't it?", 'Were you and Mia on the mill floor at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the quality inspector...?»։']),
    (['We seldom witness such a strong quality audit, do we?', "This is the first time I have reviewed the order sheet, isn't this?", 'How many bolts does this quality audit cover?', 'Who did report the thread shortage first?', 'Can you finally explain what caused the loom breakdown?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the thread shortage first?»։"]),
    (['How often do we need to review the order sheet?', "Please, don't mention the thread shortage to the quality inspector, will you?", 'Will they the bolt of fabric or the order sheet inspect first?', 'Do you regret missing the textile apprenticeship?', 'Why the quality inspector questioned the equipment upgrade yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they inspect the bolt of fabric or the order sheet first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the thread shortage?', 'Did Sara inspect fewer bolts than Jeff this month?', 'Do you think should we postpone the quality audit?', "He will surely appreciate the supervisor role, won't it?", 'Has Lucy finalized the equipment upgrade?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the quality audit?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the repair order, was there?", "I am confident that the repair order is road-ready, aren't I?", 'Which vehicle do you repair most often?', 'Did you used to work as a shop apprentice when you started?', 'Was it you or the apprentice mechanic who ordered the part?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to review the repair order immediately, isn't it?", 'Do you know how much the new part costs?', 'Had you a word with the technician about the repair order?', "The safety inspection will be reviewed tomorrow, won't it?", 'Were you and Mia at the garage at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the technician...?»։']),
    (['We seldom witness such a strong safety inspection, do we?', "This is the first time I have reviewed the repair order, isn't this?", 'How many vehicles does this safety inspection cover?', 'Who did report the parts shortage first?', 'Can you finally explain what caused the diagnostic delay?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the parts shortage first?»։"]),
    (['How often do we need to review the repair order?', "Please, don't mention the parts shortage to the technician, will you?", 'Will they the part or the repair order order first?', 'Do you regret missing the mechanic apprenticeship?', 'Why the technician questioned the shop renovation yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they order the part or the repair order first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the parts shortage?', 'Did Sara repair fewer vehicles than Jeff this month?', 'Do you think should we postpone the safety inspection?', "He will surely appreciate the promotion to lead mechanic, won't it?", 'Has Lucy finalized the shop renovation?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the safety inspection?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the conditions report, was there?", "I am confident that the conditions report is groomed, aren't I?", 'Which trail do you groom most often?', 'Did you used to work as a lift operator when you started?', 'Was it you or the lift operator who inspected the lift chair?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to update the conditions report immediately, isn't it?", 'Do you know how much the new lift chair costs?', 'Had you a word with the ski patroller about the conditions report?', "The avalanche briefing will be reviewed tomorrow, won't it?", 'Were you and Mia at the lodge at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the ski patroller...?»։']),
    (['We seldom witness such a strong avalanche briefing, do we?', "This is the first time I have updated the conditions report, isn't this?", 'How many trails does this avalanche briefing cover?', 'Who did report the equipment freeze-up first?', 'Can you finally explain what caused the storm closure?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the equipment freeze-up first?»։"]),
    (['How often do we need to update the conditions report?', "Please, don't mention the equipment freeze-up to the ski patroller, will you?", 'Will they the lift chair or the conditions report inspect first?', 'Do you regret missing the ski patrol training program?', 'Why the ski patroller questioned the trail expansion yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they inspect the lift chair or the conditions report first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did he say he was worried about the equipment freeze-up?', 'Did Sara groom fewer trails than Jeff this month?', 'Do you think should we postpone the avalanche briefing?', "He will surely appreciate the season position, won't it?", 'Has Lucy finalized the trail expansion?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the avalanche briefing?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
    (["There's no reason to doubt the rehearsal schedule, was there?", "I am confident that the rehearsal schedule is polished, aren't I?", 'Which routine do you choreograph most often?', 'Did you used to work as a junior instructor when you started?', 'Was it you or the junior instructor who fited the costume?'],
     {1, 2, 4},
     'Ստուգել tag-հարցերի ձևը և «used to»-ի հետ «did»-ի գործածությունը:',
     ['Բ, Գ, Ե ճիշտ են։ Ա սխալ է՝ tag-ը պետք է լինի «is there?»։ Դ սխալ է՝ «did»-ից հետո՝ «use to»։']),
    (["It is essential to update the rehearsal schedule immediately, isn't it?", 'Do you know how much the new costume costs?', 'Had you a word with the choreographer about the rehearsal schedule?', "The recital will be reviewed tomorrow, won't it?", 'Were you and Mia at the studio at noon yesterday?'],
     {0, 1, 3, 4},
     'Ստուգել հնացած կառուցվածքների բացակայությունը և tag-ի ենթակայի համապատասխանությունը:',
     ['Ա, Բ, Դ, Ե ճիշտ են։ Գ սխալ է (հնացած ձև)՝ ճիշտ է «Did you have a word with the choreographer...?»։']),
    (['We seldom witness such a strong recital, do we?', "This is the first time I have updated the rehearsal schedule, isn't this?", 'How many routines does this recital feature?', 'Who did report the costume shortage first?', 'Can you finally explain what caused the injury setback?'],
     {0, 2, 4},
     '«Seldom»-ը բացասական մակբայ է, tag-ը դրական։ Ենթակայի հարցերում «did» չի գործածվում:',
     ["Ա, Գ, Ե ճիշտ են։ Բ սխալ է՝ ճիշտ է «isn't it?»։ Դ սխալ է՝ ճիշտ է «Who reported the costume shortage first?»։"]),
    (['How often do we need to update the rehearsal schedule?', "Please, don't mention the costume shortage to the choreographer, will you?", 'Will they the costume or the rehearsal schedule fit first?', 'Do you regret missing the dance mentorship program?', 'Why the choreographer questioned the repertoire change yesterday?'],
     {0, 1, 3},
     'Ստուգել բառակարգը և հարցական նախադասություններում օժանդակ բայի առկայությունը:',
     ['Ա, Բ, Դ ճիշտ են։ Գ սխալ է՝ ճիշտ է «Will they fit the costume or the rehearsal schedule first?»։ Ե սխալ է՝ բացակայում է «did»։']),
    (['Why did she say she was worried about the costume shortage?', 'Did Sara choreograph fewer routines than Jeff this month?', 'Do you think should we postpone the recital?', "He will surely appreciate the lead role, won't it?", 'Has Lucy finalized the repertoire change?'],
     {0, 1, 4},
     'Ներդրված հարցերում բառակարգը մնում է հաստատական, tag-ի դերանունը պետք է համապատասխանի ենթակային:',
     ["Ա, Բ, Ե ճիշտ են։ Գ սխալ է՝ ճիշտ է «Do you think we should postpone the recital?»։ Դ սխալ է՝ tag-ը՝ «won't he?»։"]),
]

ROLES = ["manager", "analyst", "investor", "engineer", "advisor", "coordinator", "technician",
         "strategist", "planner", "supervisor", "auditor", "consultant", "researcher", "director",
         "specialist", "administrator", "negotiator", "inspector", "broker", "developer",
         "instructor", "surveyor", "recruiter", "operator", "archivist", "curator", "appraiser", "arborist", "ecologist", "seismologist", "cryptographer", "entomologist", "ornithologist", "meteorologist", "archaeologist", "paleontologist", "numismatist", "botanist", "sommelier", "calligrapher", "blacksmith", "potter", "astronomer", "vintner"]

# Each ODDWORD frame: make(rng, flawed) -> (sentence, note-if-flawed). Parameterized by a
# role/subject pick so the SAME frame renders different text every call (no static duplicates).
def _of_rely(rng, flawed):
    s = pick(rng, PEOPLE).capitalize()
    return (f"{s} rely {'by ' if flawed else ''}on preparation as well as instinct.",
            "«rely by on» — ավելորդ է «by»")

def _of_offers(rng, flawed):
    r = pick(rng, ROLES)
    return (f"A good {r} offers {'of ' if flawed else ''}constructive feedback regularly.",
            "«offers of» — ավելորդ է «of»")

def _of_deserves(rng, flawed):
    r = pick(rng, ROLES)
    return (f"Every {r} on the team deserves {'that ' if flawed else ''}recognition for their effort.",
            "«deserves that recognition» — ավելորդ է «that»")

def _of_that_although(rng, flawed):
    r = pick(rng, ROLES)
    return (f"Many {r}s believe that {'although ' if flawed else ''}conditions can shift without warning.",
            "«that although» — երկու շաղկապ, ավելորդ է «although»")

def _of_an_quite(rng, flawed):
    r = pick(rng, ROLES)
    return (f"Reading reports does not automatically make you a{'n quite' if flawed else ''} skilled {r}.",
            "«an quite skilled» — ավելորդ է «quite»")

def _of_does_matter(rng, flawed):
    r = pick(rng, ROLES)
    return (f"A good {r} knows which facts {'does ' if flawed else ''}matter and which do not.",
            "«facts does matter» — ավելորդ է «does»")

def _of_dont_never(rng, flawed):
    thing = pick(rng, THINGS)
    return (f"Teams that don't {'never ' if flawed else ''}review the {thing} risk costly mistakes.",
            "«don't never» — կրկնակի ժխտում, ավելորդ է «never»")

def _of_which_interfering(rng, flawed):
    ev = pick(rng, EVENTS)
    verb = "interfering" if flawed else "interferes"
    return (f"Delays disrupt {ev}, which {verb} with the overall schedule.",
            "«which interfering» — ճիշտ բայաձևն է «interferes»")

def _of_more_rapid(rng, flawed):
    r = pick(rng, ROLES)
    adj = "rapid" if flawed else "rapidly"
    return (f"Many {r}s believe changes are happening more {adj} than planned.",
            "«more rapid» — ածական է մակբայի փոխարեն, ճիշտ է «more rapidly»")

def _of_too_redundant(rng, flawed):
    thing = pick(rng, THINGS)
    pl = pick(rng, PLACES)
    return (f"Reviewing the {thing} at {pl} not only catches errors early but also saves money{' too' if flawed else ''}.",
            "«but also...too» — «too»-ն ավելորդ է")

def _of_every_of_second(rng, flawed):
    thing = pick(rng, ["records", "transactions", "signals", "requests", "measurements", "readings",
                        "orders", "packets", "queries", "entries", "shipments", "reports",
                        "samples", "frames", "alerts", "batches", "updates", "logs",
                        "invoices", "tickets", "scans", "payments", "notifications", "messages",
                        "responses", "commands", "checks", "events", "snapshots", "backups",
                        "uploads", "downloads", "connections", "sessions", "queries per node",
                        "packets per link", "authentications", "lookups", "writes", "reads"])
    return (f"If a system can process {thing} every {'of ' if flawed else ''}second, why do errors still happen?",
            "«every of second» — ավելորդ է «of»")

def _of_make_to(rng, flawed):
    thing = pick(rng, THINGS)
    return (f"Policies are like the {thing}: read them, but don't make me {'to ' if flawed else ''}sign yours.",
            "«make me to sign» — ավելորդ է «to» պատճառական բային հետո")

def _of_ignore_about(rng, flawed):
    thing = pick(rng, ["a risk", "a warning sign", "an obvious flaw", "a red flag", "a clear problem",
                        "a delay", "a shortfall", "an inconsistency", "a loophole", "a gap in coverage"])
    r = pick(rng, ROLES)
    return (f"Tell a {r} {thing} exists, and most will ignore {'about ' if flawed else ''}it.",
            "«ignore about it» — ավելորդ է «about»")

def _of_clean_teamwork(rng, flawed):
    ev = pick(rng, EVENTS)
    return (f"Cooperation often prevents mistakes during {ev}.", None)

def _of_clean_leaders(rng, flawed):
    p = pick(rng, PEOPLE)
    return (f"{p.capitalize()}s thrive when expectations are communicated clearly.", None)

ODDWORD_FRAMES = [_of_rely, _of_offers, _of_deserves, _of_that_although, _of_an_quite,
                  _of_does_matter, _of_dont_never, _of_which_interfering, _of_more_rapid,
                  _of_too_redundant, _of_every_of_second, _of_make_to, _of_ignore_about]
ODDWORD_CLEAN_ONLY = [_of_clean_teamwork, _of_clean_leaders]


def gen_section_x(b, rng, exam_idx, start_num=63):
    seen_this_exam = set()
    for box_i in range(5):
        n_flawed = rng.choice([2, 2, 3, 3])
        flawed_frames = rng.sample(ODDWORD_FRAMES, n_flawed)
        clean_pool = [f for f in ODDWORD_FRAMES if f not in flawed_frames] + ODDWORD_CLEAN_ONLY
        clean_frames = rng.sample(clean_pool, 5 - n_flawed)
        items = [(fn, True) for fn in flawed_frames] + [(fn, False) for fn in clean_frames]
        rng.shuffle(items)
        stmts, notes, true_idx = [], [], set()
        for i, (fn, is_flawed) in enumerate(items):
            text, note = fn(rng, is_flawed)
            for _retry in range(25):
                key = text.lower()
                if key not in seen_this_exam and key not in b.registry["multi_statement"]:
                    break
                text, note = fn(rng, is_flawed)
            seen_this_exam.add(text.lower())
            stmts.append(text)
            if is_flawed:
                true_idx.add(i)
                notes.append(f"{ARM_LOCAL[i]}. {note}։")
        steps = notes + [f"{ARM_LOCAL[i]} — առանց սխալի։" for i in range(5) if i not in true_idx]
        b.ms(start_num + box_i, ODDWORD_TOPIC, "միջին", "Choose the sentences with an odd word.",
             stmts, true_idx,
             "Փնտրել ավելորդ նախդիր, կրկնվող շաղկապ, կրկնակի ժխտում կամ սխալ բայաձև:",
             [" ".join(steps)])


# ---- XI passive voice: same parameterized-frame approach ----
def _pv_true_simple(rng, is_true):
    thing = pick(rng, THINGS)
    p = pick(rng, PEOPLE)
    if is_true:
        return (f"The {thing} was reviewed by {p} this morning.", True)
    return (f"The {thing} reviewed by {p} this morning.", False)  # missing "was"

def _pv_true_modal(rng, is_true):
    thing = pick(rng, THINGS)
    if is_true:
        return (f"The {thing} could have been damaged before the delivery arrived.", True)
    return (f"The {thing} could have damaged before the delivery arrived.", False)  # missing "been"

def _pv_true_question(rng, is_true):
    p = pick(rng, PEOPLE)
    if is_true:
        return (f"Does the equipment have to be certified by {p}?", True)
    return (f"Does the equipment have to certified by {p}?", False)  # missing "be"

def _pv_true_future(rng, is_true):
    ev = pick(rng, EVENTS)
    pl = pick(rng, PLACES)
    if is_true:
        return (f"{ev.capitalize()} will be held at {pl}.", True)
    return (f"{ev.capitalize()} will held at {pl}.", False)  # missing "be"

def _pv_notpassive_causative(rng, is_true):
    p = pick(rng, PEOPLE)
    thing = pick(rng, THINGS)
    return (f"{p.capitalize()} had the staff double-check the {thing}.", False)  # active causative, not passive at all

def _pv_notpassive_fragment(rng, is_true):
    thing = pick(rng, THINGS)
    pl = pick(rng, PLACES)
    return (f"{thing.capitalize()} tested at {pl} every month.", False)  # missing "is/are", fragment

def _pv_notpassive_description(rng, is_true):
    p = pick(rng, PEOPLE)
    return (f"{p.capitalize()} was the most determined specialist of the year.", False)  # be+noun, not passive

def _pv_true_continuous(rng, is_true):
    thing = pick(rng, THINGS)
    p = pick(rng, PEOPLE)
    if is_true:
        return (f"The {thing} is currently being reviewed by {p}.", True)
    return (f"The {thing} is currently reviewing by {p}.", False)  # wrong form

def _pv_true_whyquestion(rng, is_true):
    thing = pick(rng, THINGS)
    p = pick(rng, PEOPLE)
    if is_true:
        return (f"Why has the {thing} been revised by {p}?", True)
    return (f"Why has the {thing} revised by {p}?", False)  # missing "been"

def _pv_true_hadto(rng, is_true):
    thing = pick(rng, THINGS)
    p = pick(rng, PEOPLE)
    if is_true:
        return (f"All the {thing}s had to be checked by {p}.", True)
    return (f"All the {thing}s had to checked by {p}.", False)  # missing "be"

def _pv_notpassive_active_perfect(rng, is_true):
    thing = pick(rng, THINGS)
    return (f"Had you double-checked all the figures in the {thing}?", False)  # active, not passive

def _pv_notpassive_location(rng, is_true):
    pl = pick(rng, PLACES)
    return (f"{pl.capitalize()} is a popular destination for specialists.", False)  # be+noun, not passive

PASSIVE_TRUE_FRAMES = [_pv_true_simple, _pv_true_modal, _pv_true_question, _pv_true_future,
                       _pv_true_continuous, _pv_true_whyquestion, _pv_true_hadto]
PASSIVE_FALSE_FRAMES = [_pv_notpassive_causative, _pv_notpassive_fragment, _pv_notpassive_description,
                        _pv_notpassive_active_perfect, _pv_notpassive_location]


def gen_section_xi(b, rng, exam_idx, start_num=68):
    seen_this_exam = set()
    for box_i in range(5):
        n_true = rng.choice([2, 3, 3])
        true_fns = rng.sample(PASSIVE_TRUE_FRAMES, n_true)
        remaining_true = [f for f in PASSIVE_TRUE_FRAMES if f not in true_fns]
        false_candidates = PASSIVE_FALSE_FRAMES + remaining_true
        false_fns = rng.sample(false_candidates, 5 - n_true)

        items = [(fn, True) for fn in true_fns] + [(fn, False) for fn in false_fns]
        rng.shuffle(items)
        stmts, true_idx = [], set()
        for i, (fn, is_true) in enumerate(items):
            text, is_valid = fn(rng, is_true)
            for _retry in range(25):
                key = text.lower()
                if key not in seen_this_exam and key not in b.registry["multi_statement"]:
                    break
                text, is_valid = fn(rng, is_true)
            seen_this_exam.add(text.lower())
            stmts.append(text)
            if is_valid:
                true_idx.add(i)
        letters = ", ".join(ARM_LOCAL[i] for i in sorted(true_idx))
        b.ms(start_num + box_i, PASSIVE_TOPIC, "միջին", "Choose the correctly formulated Passive constructions.",
             stmts, true_idx,
             "Ստուգել՝ առկա է «be» օժանդակ բայը ճիշտ ձևով, և արդյոք նախադասությունն ընդհանրապես կրավորական սեռով է:",
             [f"Ճիշտ կրավորական կառույցներ են՝ {letters}. մյուսները կամ ակտիվ սեռով են, կամ բացակայում/կրկնվում է «be»-ն։"])


def _pick_unused_boxes(b, bank, n_needed):
    """Same idea as _pick_unused_sets: check ALL of the box's statements against
    the registry instead of trusting a precomputed index — robust even when
    earlier exams consumed blocks out of the "expected" order."""
    chosen = []
    for box in bank:
        stmts = box[0]
        keys = [_norm_local(s) for s in stmts]
        if any(k in b.registry["multi_statement"] or k in b.new_topics["multi_statement"] for k in keys):
            continue
        chosen.append(box)
        if len(chosen) == n_needed:
            return chosen
    return chosen


def gen_section_vi(b, exam_idx, start_num=51):
    for i, (stmts, true_idx, hint, steps) in enumerate(_pick_unused_boxes(b, REPORTED_BOXES, 5)):
        b.ms(start_num + i, REPORTED_TOPIC, "բարձր", "Choose the correctly transformed sentence(s).",
             stmts, true_idx, hint, steps)


def gen_section_viii(b, exam_idx, start_num=57):
    for i, (stmts, true_idx, hint, steps) in enumerate(_pick_unused_boxes(b, QFORM_BOXES, 5)):
        b.ms(start_num + i, QFORM_TOPIC, "բարձր", "Choose the correctly formulated questions.",
             stmts, true_idx, hint, steps)
