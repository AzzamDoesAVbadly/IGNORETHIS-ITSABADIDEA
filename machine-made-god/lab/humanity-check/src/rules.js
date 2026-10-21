// The Organic Prose Assay: every pattern HUMANITY CHECK looks for, with the
// reason it is suspicious. Positive weights are AI tells; negative weights are
// signs of a human. `cap` limits how many hits of one rule can count, so a
// single habit can't dominate the score.
//
// Patterns run against a copy of the text where curly apostrophes are straight
// and code/URLs are blanked out (same length, so indexes line up).

const w = (source, flags = "gi") => new RegExp(source, flags);
const word = (source) => w(String.raw`\b(?:${source})\b`);

// Words a chatbot reaches for and a person rarely does. [pattern, weight, why]
const VOCAB = [
  ["delv(?:e|es|ed|ing)", 4, "The single most famous chatbot verb. People \"look into\" things. Machines delve."],
  ["tapestr(?:y|ies)", 4, "Nothing is a tapestry. Not your career, not this city, not \"the human experience.\""],
  ["testament to", 4, "\"A testament to\" is how a chatbot says \"shows.\""],
  ["realms?", 3, "Unless a dragon is involved, you mean \"area.\""],
  ["multifaceted", 3, "Chatbot for \"has more than one part.\""],
  ["meticulous(?:ly)?", 3, "Everything a language model describes was done meticulously. Nothing was ever done carefully."],
  ["bustling", 3, "Every city, market and street in chatbot prose is bustling. None of them are busy."],
  ["ever-(?:evolving|changing|growing|expanding)", 3, "The landscape is always ever-evolving. It has never once just changed."],
  ["plethora", 3, "A word humans use ironically and machines use sincerely."],
  ["myriad", 3, "\"A myriad of\" is how a model says \"a lot of\" when it wants a raise."],
  ["intricac(?:y|ies)|intricate(?:ly)?", 3, "Chatbots find everything intricate. It's how they flatter a topic they skimmed."],
  ["embark(?:s|ed|ing)?", 3, "You don't embark on a project. You start it, then complain about it."],
  ["unwavering", 3, "Unwavering commitment, unwavering dedication: the house adjective of AI cover letters."],
  ["underscor(?:e|es|ed|ing)", 3, "Humans say a thing \"shows.\" Models say it underscores."],
  ["showcas(?:e|es|ed|ing)", 2, "Everything is showcased. Nothing is shown."],
  ["pivotal", 3, "Every moment in AI-written history is pivotal."],
  ["commendable", 3, "Nobody says commendable out loud. Nobody."],
  ["seamless(?:ly)?", 2, "Marketing's favorite lie, now automated."],
  ["robust", 2, "Robust: the official texture of synthetic prose."],
  ["leverag(?:e|es|ed|ing)", 2, "Using something, but in a suit."],
  ["harness(?:es|ed|ing)?", 2, "Usually followed by \"the power of.\" Usually not about horses."],
  ["foster(?:s|ed|ing)?", 2, "Models foster. Communities, growth, a sense of belonging. Constantly fostering."],
  ["bolster(?:s|ed|ing)?", 2, "A word that exists mostly in press releases and chatbot output."],
  ["elevat(?:e|es|ed|ing)", 2, "Unless it's an elevator, this is brand voice."],
  ["empower(?:s|ed|ing|ment)?", 2, "Empowering language, delivered at scale, by nobody."],
  ["unlock(?:s|ed|ing)?", 2, "Potential, value, growth: chatbots unlock all of it. Doors remain locked."],
  ["unleash(?:es|ed|ing)?", 2, "Something is always being unleashed. Rarely a dog."],
  ["transformative", 2, "Transformative is what a model calls anything it was asked to describe."],
  ["game[- ]chang(?:er|ers|ing)", 2, "The game has been changed so many times it no longer has rules."],
  ["cutting[- ]edge", 2, "Brochure language. The edge is not cutting anything."],
  ["holistic(?:ally)?", 2, "A holistic approach to saying nothing specific."],
  ["synerg(?:y|ies|istic)", 2, "We are legally required to flag this word on sight."],
  ["paradigm(?: shifts?)?", 2, "The paradigm has shifted. Again. Per the machine."],
  ["resonat(?:e|es|ed|ing)", 2, "Things resonate in chatbot prose the way bells don't."],
  ["vibrant", 2, "Every community, culture and color a model describes is vibrant."],
  ["nuanced", 2, "Saying something is nuanced instead of explaining the nuance."],
  ["invaluable", 2, "Invaluable insights, invaluable resources. Valued at nothing."],
  ["profound(?:ly)?", 2, "Profound impact, profoundly important. Profoundly generated."],
  ["captivating", 2, "Captivating: the review word of a reviewer who wasn't there."],
  ["noteworthy", 2, "It's noteworthy that people rarely write noteworthy."],
  ["paramount", 2, "Safety is paramount. So is everything else, apparently."],
  ["streamlin(?:e|es|ed|ing)", 2, "Workflows are always being streamlined. By whom? Unclear."],
  ["comprehensive", 1, "A comprehensive guide to a topic the writer has never touched."],
  ["crucial(?:ly)?", 1, "Everything is crucial in synthetic prose. If everything is crucial, nothing is."],
  ["landscape", 1, "Unless it has trees, this is \"the digital landscape.\""],
  ["dynamic", 1, "A dynamic, fast-paced word for \"it changes.\""],
  ["innovative", 1, "Innovation, described by a thing that only remixes."],
  ["enhanc(?:e|es|ed|ing)", 1, "Improve, but with a lanyard."],
  ["optimiz(?:e|es|ed|ing)", 1, "A word that wants you to think a spreadsheet was involved."],
  ["meaningful", 1, "Meaningful results, meaningful connections. Meaning not included."],
  ["resilien(?:t|ce)", 1, "Resilience: what HR copy calls putting up with things."],
  ["stakeholders", 1, "Nobody has stakeholders at home. Only in decks."],
  ["best-in-class", 2, "Self-awarded, every time."],
  ["mission-critical", 2, "Everything is mission-critical. The mission is never stated."],
  ["north stars?", 2, "Ships navigated by it. Roadmaps cite it."],
  ["learnings", 2, "Lessons, but billed as a deliverable."],
  ["operationaliz(?:e|es|ed|ing)", 2, "Doing something, with a framework attached."],
  ["actionable", 2, "Advice that wants credit for being usable."],
  ["insightful", 1, "Telling the reader it's insightful, rather than being insightful."],
];

// Constructions that give the game away regardless of vocabulary.
const PHRASES = [
  {
    id: "not-just-but",
    label: "\"It's not X, it's Y\"",
    weight: 4,
    cap: 4,
    pattern: w(String.raw`\b(?:it|this|that|they|we|you|he|she)(?:'s|'re| is| are| was)? not (?:just |only |merely |simply |about )?[^.!?\n]{1,60}?[,;:—–-]+ ?(?:it|this|that|they|we|but)(?:'s|'re| is| are| was)?\b`),
    why: "The chatbot's signature move: knock down a claim nobody made, then reveal the \"real\" point. Fake insight, assembled.",
  },
  {
    id: "isnt-its",
    label: "\"isn't X — it's Y\"",
    weight: 4,
    cap: 4,
    pattern: w(String.raw`\b(?:isn't|is not|aren't|are not|wasn't|was not) (?:just |only |merely |simply |about )?[^.!?\n]{1,50}?\s?[—–;,] ?(?:it|they|this|that)(?:'s|'re| is| are| was)\b`),
    why: "Same trick, other direction. Contrast as a substitute for an actual argument.",
  },
  {
    id: "todays-world",
    label: "\"In today's ___ world\"",
    weight: 4,
    cap: 2,
    pattern: w(String.raw`\bin (?:today's|the modern|this|our|an increasingly|the current) (?:[\w-]+ ){0,3}(?:world|landscape|age|era|society|climate|environment|market)\b`),
    why: "The most common opening line in the history of machine-written text.",
  },
  {
    id: "important-to-note",
    label: "\"It's important to note\"",
    weight: 4,
    cap: 3,
    pattern: w(String.raw`\bit(?:'s| is) (?:important|worth|crucial|essential|vital|key) (?:to (?:note|remember|mention|recognize|understand|consider)|noting|mentioning|remembering)\b`),
    why: "If it were important, you'd just say it. Pure throat-clearing.",
  },
  {
    id: "lets-dive",
    label: "\"Let's dive in\"",
    weight: 4,
    cap: 2,
    pattern: w(String.raw`\b(?:let's|let us|we'll|we will|I'll) (?:dive|delve|jump|take a (?:deep |closer )?(?:dive|look)|explore|unpack|break (?:it|this|that) down)\b|\bdeep[- ]dive\b`),
    why: "Nobody has ever dived into anything. The water is a listicle.",
  },
  {
    id: "whether-youre",
    label: "\"Whether you're a X or a Y\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\bwhether you(?:'re| are) (?:an? |the )?[^,.\n]{2,40}? or (?:an? |the |just )?`),
    why: "Addressing every possible reader at once, which means addressing nobody.",
  },
  {
    id: "plays-a-role",
    label: "\"plays a crucial role\"",
    weight: 3,
    cap: 3,
    pattern: w(String.raw`\bplay(?:s|ed|ing)? an? (?:crucial|pivotal|vital|key|significant|important|central|critical|major) role\b`),
    why: "Everything plays a crucial role. Nothing simply matters.",
  },
  {
    id: "serves-as",
    label: "\"serves as a\"",
    weight: 2,
    cap: 3,
    pattern: w(String.raw`\b(?:serves|stands|acts) as an?\b`),
    why: "Chatbots avoid \"is.\" Things serve as, stand as, act as. They are never just things.",
  },
  {
    id: "realm-of",
    label: "\"in the realm of\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\b(?:in|within|across) the (?:realm|world|landscape|sphere|domain) of\b`),
    why: "A model's way of naming a topic as if it were a kingdom.",
  },
  {
    id: "unlock-potential",
    label: "\"unlock the full potential\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\b(?:unlock|unleash|harness|maximize|realize)(?:s|es|ed|ing)? (?:the|your|its|their|our)(?: [\w']+)? (?:full |true )?(?:potential|power)\b|\bthe power of\b`),
    why: "Potential is unlocked roughly four billion times a day, exclusively by software.",
  },
  {
    id: "rich-tapestry",
    label: "\"a rich tapestry\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\ba (?:rich|vibrant|diverse|complex|colorful) (?:tapestry|mosaic|array|blend|fabric)\b`),
    why: "Adjective plus textile: the mark of a writer with no specific details to offer.",
  },
  {
    id: "wide-range",
    label: "\"a wide range of\"",
    weight: 1,
    cap: 3,
    pattern: w(String.raw`\ba (?:wide|diverse|broad|vast|whole) (?:range|array|variety|spectrum) of\b`),
    why: "Vagueness with a measuring tape.",
  },
  {
    id: "excited-to-announce",
    label: "\"thrilled to announce\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\b(?:we're|we are|I'm|I am) (?:so |incredibly |truly )?(?:excited|thrilled|delighted|proud|humbled) to (?:announce|share|introduce|unveil|welcome)\b`),
    why: "Press-release joy. Nobody has ever been thrilled to announce anything in a normal voice.",
  },
  {
    id: "renewed-focus",
    label: "\"a renewed focus on\"",
    weight: 2,
    cap: 2,
    pattern: w(String.raw`\b(?:a |our )?(?:renewed|deep|continued|steadfast|ongoing) (?:focus|commitment|dedication) (?:on|to)\b`),
    why: "The focus is always renewed. It was never clear what it was on before.",
  },
  {
    id: "journey",
    label: "\"on this journey\"",
    weight: 2,
    cap: 2,
    pattern: w(String.raw`\b(?:on|join(?:s|ed)? (?:us|me) on|along|throughout) (?:this|the|our|your) (?:\w+ )?journey\b|\bgoing forward\b`),
    why: "A quarter is not a journey. Neither is a product launch.",
  },
  {
    id: "end-of-day",
    label: "\"At the end of the day\"",
    weight: 2,
    cap: 2,
    pattern: w(String.raw`\bat the end of the day\b`),
    why: "Humans say it too, but chatbots say it with feeling.",
  },
  {
    id: "imagine-world",
    label: "\"Imagine a world where\"",
    weight: 3,
    cap: 1,
    pattern: w(String.raw`\bimagine a (?:world|future|place|life) (?:where|in which)\b`),
    why: "Movie-trailer opener. In a world... where nobody wrote this.",
  },
  {
    id: "when-it-comes-to",
    label: "\"When it comes to\"",
    weight: 1,
    cap: 3,
    pattern: w(String.raw`\bwhen it comes to\b`),
    why: "Filler that delays the sentence by four words.",
  },
  {
    id: "sense-of",
    label: "\"foster a sense of\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\b(?:foster|cultivate|create|build)(?:s|ed|ing)? a (?:sense|culture) of\b`),
    why: "HR-brochure grammar. A sense of community is fostered somewhere every second.",
  },
  {
    id: "not-only-but",
    label: "\"Not only... but also\"",
    weight: 2,
    cap: 2,
    pattern: w(String.raw`\bnot only\b[^.!?\n]{1,80}?\bbut also\b`),
    why: "School-essay scaffolding that models never grew out of.",
  },
  {
    id: "navigate-complexities",
    label: "\"navigate the complexities\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`\bnavigat(?:e|es|ed|ing) (?:the )?(?:complexities|challenges|intricacies|nuances|landscape|waters|world|uncertainties)\b`),
    why: "Life is not a sea. You are not navigating it. You are reading a chatbot.",
  },
  {
    id: "transition-opener",
    label: "Essay transition",
    weight: 2,
    cap: 4,
    pattern: w(String.raw`(?<=^|[.!?]\s{1,3}|\n\s*)(?:Furthermore|Moreover|Additionally|Consequently|Notably|Importantly|Conversely)\b,?`, "gim"),
    why: "Furthermore, moreover, additionally: the connective tissue of text that was never meant to be read aloud.",
  },
  {
    id: "conclusion-opener",
    label: "\"In conclusion\"",
    weight: 3,
    cap: 2,
    pattern: w(String.raw`(?<=^|[.!?]\s{1,3}|\n\s*)(?:In conclusion|In summary|To summarize|To sum up|Ultimately|Overall|In essence|All in all|In short)\b,?`, "gim"),
    why: "The text announces it's wrapping up, then summarizes what you just read.",
  },
  {
    id: "setup-question",
    label: "\"The result?\"",
    weight: 3,
    cap: 3,
    pattern: w(String.raw`(?<=^|[.!?]\s{1,3}|\n\s*)(?:(?:And|But|So) )?(?:the |my )?(?:result|answer|catch|kicker|twist|truth|secret|best part|reality|problem|difference|lesson|takeaway|outcome|honestly|spoiler(?: alert)?|plot twist|real talk)\?`, "gim"),
    why: "Setup question, dramatic pause, punchline. The beat of every AI-ghostwritten LinkedIn post.",
  },
  {
    id: "heres-the-thing",
    label: "\"Here's the thing\"",
    weight: 2,
    cap: 2,
    pattern: w(String.raw`\bhere(?:'s| is) (?:the thing|why|the kicker|the truth|the deal|the catch|what (?:most people|nobody|no one))\b`),
    why: "A drumroll for a point that could have just been made.",
  },
  {
    id: "linkedin-closer",
    label: "LinkedIn closer",
    weight: 3,
    cap: 3,
    pattern: w(String.raw`\b(?:let that sink in|read that again|full stop|no fluff|agree\?|thoughts\?|what do you think\?|repost if|follow for more|drop a comment|♻️)`),
    why: "Engagement bait, mass-produced. The algorithm wrote this to feed the algorithm.",
  },
];

// Leftovers from the chat window: a dead giveaway. [example, pattern, why]
const CHATBOT = [
  ["As an AI language model", "as an ai(?: language model)?", "Never mind the score. It told you."],
  ["I hope this helps", "i hope this (?:helps|email finds you well|message finds you well)|hope this helps", "The sign-off of a machine that will never know if it helped."],
  ["Feel free to reach out", "feel free to (?:reach out|ask|let me know|contact)", "Customer-service residue. Nobody human says \"feel free.\""],
  ["Let me know if you have", "(?:let me know|don't hesitate to (?:reach out|ask|contact)) if you (?:have|need|want|would)", "Offering more help, in a document nobody asked to continue."],
  ["Great question", "great question", "Flattery left over from the chat window."],
  ["I'd be happy to", "i'd be (?:happy|glad|delighted) to", "Eager-to-please residue. Copy-pasted from the reply box."],
  ["Here's a breakdown", "(?:here's|here is) (?:a|an|the|your)(?: [\\w-]+)? (?:breakdown|overview|summary|revised|rewritten|polished|improved|refined|updated|concise)", "Someone forgot to delete the chatbot's intro line."],
  ["Certainly!", "(?:certainly|absolutely|of course)! ", "Chatbot enthusiasm, still warm from the reply box."],
  ["My knowledge cutoff", "my (?:knowledge|training) (?:cutoff|data)", "Caught red-handed."],
  ["In this article, we'll", "in this (?:article|blog post|post|guide|essay), (?:we|i)(?:'ll| will)", "The text describes itself before starting. Content about content."],
];

const HUMAN = [
  {
    id: "profanity",
    label: "Profanity",
    weight: -3,
    cap: 4,
    pattern: word("fuck\\w*|shit\\w*|damn(?:it)?|crap|asshole|bullshit|wtf|goddamn"),
    why: "Chatbots are trained not to swear. You're probably fine.",
  },
  {
    id: "slang",
    label: "Slang",
    weight: -2,
    cap: 5,
    pattern: word("lol|lmao|tbh|ngl|idk|imo|omg|kinda|gonna|wanna|gotta|dunno|bruh|lowkey|y'all|ain't|sorta|nah|yeah|ugh|meh"),
    why: "Informal shorthand. A model has to be begged to write like this.",
  },
  {
    id: "lowercase-i",
    label: "Lowercase \"i\"",
    weight: -2,
    cap: 3,
    pattern: w(String.raw`(?<=^|\s)i(?=\s|'m|'ll|'d|'ve)`, "gm"),
    why: "No chatbot would dare.",
  },
  {
    id: "double-punct",
    label: "Messy punctuation",
    weight: -1,
    cap: 3,
    pattern: w(String.raw`[?!]{2,}`, "g"),
    why: "\"?!\" and \"!!!\" are human disorder. Machines punctuate like accountants.",
  },
];

// Typographic and layout habits, matched line by line.
const TYPOGRAPHY = [
  {
    id: "em-dash",
    label: "Em dash",
    weight: 0.7,
    cap: 12,
    pattern: w(String.raw`—| -- `, "g"),
    why: "The em dash: once the mark of a real writer, now the mark of a chatbot. We're sorry too.",
  },
  {
    id: "emoji-bullet",
    label: "Emoji bullet",
    weight: 2,
    cap: 6,
    pattern: w(String.raw`^[ \t]*(?:[-*•][ \t]*)?(?:\p{Extended_Pictographic}️?)`, "gmu"),
    why: "✅ Rocket emoji 🚀 as bullet points 💡 is how a model formats \"enthusiasm.\"",
  },
  {
    id: "bold-label",
    label: "Bold label bullet",
    weight: 2,
    cap: 6,
    pattern: w(String.raw`(?<=^[ \t]*(?:[-*•]|\d+\.)?[ \t]*(?:\p{Extended_Pictographic}️?)?[ \t]*)\*\*[^*\n]{2,48}(?::\*\*|\*\*:)`, "gmu"),
    why: "\"**Key Takeaway:**\" bullets: the house style of every chatbot answer ever generated.",
  },
  {
    id: "tricolon",
    label: "List of three",
    weight: 0.6,
    cap: 6,
    pattern: w(String.raw`\b[\w-]+, [\w-]+, and [\w-]+\b`),
    why: "Chatbots believe all good things come in threes: clear, concise, and compelling.",
  },
];

// Readable name for a vocabulary pattern: its first spelling, e.g.
// "delv(?:e|es)" -> "delve", "game[- ]chang(?:er|ing)" -> "game-changer".
function spelling(source) {
  let depth = 0;
  let end = source.length;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") depth--;
    else if (source[i] === "|" && depth === 0) { end = i; break; }
  }
  return source
    .slice(0, end)
    .replace(/\((?:\?:)?[^()]*\)\?/g, "")
    .replace(/\(\?:([^|)]*)[^)]*\)/g, "$1")
    .replace(/\[([^\]])[^\]]*\]/g, (_, first) => (first === " " ? "-" : first))
    .replace(/.\?/g, "");
}

export const RULES = [
  ...VOCAB.map(([source, weight, why]) => ({
    id: `word:${spelling(source)}`,
    label: `"${spelling(source)}"`,
    category: "vocabulary",
    weight,
    cap: 3,
    pattern: word(source),
    why,
  })),
  ...PHRASES.map((r) => ({ ...r, category: "phrasing" })),
  ...CHATBOT.map(([example, source, why], i) => ({
    id: `residue-${i + 1}`,
    label: `"${example}"`,
    category: "residue",
    weight: 8,
    cap: 3,
    pattern: w(String.raw`\b(?:${source})`),
    why,
  })),
  ...TYPOGRAPHY.map((r) => ({ ...r, category: "formatting" })),
  ...HUMAN.map((r) => ({ ...r, category: "human" })),
];
