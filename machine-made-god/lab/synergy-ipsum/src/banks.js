// Word banks for SYNERGY ENGINE. A {slot} inside an entry expands from the
// bank of that name; {^slot} capitalizes the first letter. {company} and the
// other document variables come from the generated company.

export const BANKS = {
  // ---------- companies ----------
  prefix: ["Omni", "Nex", "Veri", "Halcy", "Axi", "Lumen", "Quant", "Synth", "Aeon", "Vanta", "Crest", "Meridi", "Opti", "Strato", "Kine", "Para", "Zeni", "Helio", "Arc", "Vect", "Nov", "Cogni", "Tessa", "Prism", "Lyra", "Orbi", "Ascen", "Clar", "Evo", "Fluxi"],
  suffix: ["vex", "ora", "ium", "ex", "era", "ix", "aro", "ient", "ova", "onix", "ara", "eon", "ity", "ulon", "ent", "iq", "os", "ana"],
  entity: ["Corp", "Dynamics", "Systems", "Labs", "Holdings", "Group", "Solutions", "Collective", "Industries", "Global", "Technologies", "Partners", "Worldwide", "Inc."],
  industry: [
    "predictive hydration", "B2B mindfulness", "enterprise sleep", "ambient surveillance-as-a-service", "artisanal logistics",
    "decentralized lunch", "emotional cloud storage", "frictionless compliance", "headcount optimization", "synthetic nostalgia",
    "subscription furniture", "AI-native gratitude", "carbon-neutral meetings", "workplace vibes infrastructure", "data-driven parenting",
    "smart water", "biometric loyalty programs", "on-demand closure", "premium silence", "autonomous small talk",
  ],
  hq: ["a WeWork in Austin", "Delaware, technically", "a former Blockbuster in Phoenix", "the metaverse (suite 400)", "a houseboat off Sausalito", "an undisclosed location in Ohio", "Dublin, for tax reasons", "a garage, emotionally", "floor 31 of a building that is mostly empty", "Zug, Switzerland, on paper"],
  first: ["Brayden", "Kelsey", "Tad", "Madison", "Chad", "Linnea", "Preston", "Harper", "Bryce", "Sloane", "Grant", "Whitney", "Trent", "Paige", "Colby", "Kendall"],
  last: ["Vance", "Sterling", "Whitlock", "Ashby", "Kensington", "Hollister", "Pryce", "Langford", "Cabot", "Ellery", "Thorne", "Wexley"],
  title: ["People", "Vision", "Synergy", "Happiness", "Transformation", "Growth", "Momentum", "Vibes", "Alignment", "Belonging", "Innovation", "Narrative", "Headcount"],

  // ---------- corporate filler ----------
  verbing: ["reimagining", "disrupting", "operationalizing", "democratizing", "rightsizing", "gamifying", "monetizing", "synergizing", "de-risking", "sunsetting", "upskilling", "re-platforming", "humanizing", "tokenizing"],
  verb: ["leverage", "align", "unlock", "streamline", "operationalize", "sunset", "harmonize", "de-prioritize", "socialize", "incentivize", "monetize", "re-baseline", "right-size", "productize", "future-proof"],
  adjective: ["frictionless", "AI-native", "human-adjacent", "scalable", "mission-critical", "holistic", "blockchain-enabled", "always-on", "best-in-class", "wellness-forward", "carbon-aware", "next-generation", "lightly sentient", "enterprise-grade", "radically transparent", "cloud-first", "people-centric"],
  noun: ["synergies", "workflows", "touchpoints", "paradigms", "ecosystems", "verticals", "learnings", "deliverables", "value streams", "efficiencies", "pipelines", "flywheels", "north stars", "growth levers"],
  object: ["cross-functional synergies", "your morning", "the customer journey", "core competencies", "the human element", "legacy feelings", "key stakeholders", "the snack budget", "employee sentiment", "Q3", "the narrative", "your attention", "the org chart", "the hiring freeze", "what's left of the weekend", "the dental plan", "our learnings", "the vibe"],
  abstract: ["transparency", "accountability", "belonging", "velocity", "resilience", "alignment", "excellence", "ownership", "trust", "radical candor", "wellness", "agility", "shareholder joy", "operational empathy", "bias for action"],
  stakeholders: ["our shareholders", "a leading consultancy", "the board", "an AI we trust", "three of our largest investors", "our Chief Vibes Officer", "a focus group of one", "McKinsey, probably", "a Slack poll with four responses"],
  asset: ["asset", "resource", "line item", "cost center", "renewable resource", "competitive advantage"],
  releasing: ["transitioning", "releasing", "graduating", "sunsetting", "freeing up", "offboarding", "rightsizing", "uncoupling from"],
  count: ["112", "3,400", "a meaningful number", "most", "several hundred", "47", "an undisclosed percentage", "roughly a third"],
  howmany: ["47", "112", "several hundred", "dozens of", "three", "1,200"],
  partners: ["412", "1,900", "several hundred", "countless", "2,048"],
  feedback: ["received", "noted", "acknowledged in principle", "a learning", "out of scope", "won't fix", "a Q4 priority", "deeply valued and archived"],
  perk: ["free lunch", "the 401(k) match", "Friday afternoons", "dental", "the windows", "chairs", "the parking lot", "weekends", "the coffee machine", "remote work"],
  replacement: ["a wellness webinar", "a branded water bottle", "an exciting new mindset", "pizza, once", "exposure", "a QR code", "gratitude", "an AI companion named Kevin", "a framed photo of the old perk", "a sense of ownership"],
  unit: ["second", "minute", "quarter", "fiscal moment", "sprint", "earnings call"],
  verbs: ["processes", "monetizes", "anonymizes", "re-identifies", "optimizes", "surfaces", "curates", "harvests", "gently nudges"],
  big: ["4.2 million", "11 billion", "nearly all", "an unknowable number of", "900,000", "1.3 trillion"],
  things: ["interactions", "data points", "feelings", "micro-moments", "touchpoints", "glances", "sighs", "lunch breaks", "decisions"],
  belief: [
    "every employee deserves a seat at the table, and the table is being sold",
    "the customer is always right, eventually",
    "work is not a place. It's a feeling you can't leave",
    "data is the new oil, and you are the ground",
    "the best ideas come from everyone and belong to us",
    "failure is just success that hasn't been billed yet",
    "there is no I in team, and soon there will be no team",
    "privacy is a feature, available on the Enterprise plan",
  ],
  contact: ["noreply@{domain}", "your manager's manager", "the portal", "a chatbot named Sandra", "the suggestion box (shredder)", "the HR form that 404s", "#ask-leadership (archived)"],
  frequency: ["occasionally", "quarterly", "in spirit", "by a contractor", "never, but warmly", "by the same AI that wrote this"],
  doc: ["updated policy", "new org chart", "quarterly roadmap", "Statement of Values", "reorg", "Q3 all-hands deck", "Code of Conduct (v14)"],
  invite: ["lean in", "embrace the change", "update your LinkedIn", "join us on this journey", "stop asking about bonuses", "bring your whole self to work, but quieter", "trust the process", "see this as an opportunity"],
  initiative: ["Project Northstar", "our new AI strategy", "the reorg", "Operation Alignment", "the return-to-office mandate", "Vision 2030", "the Efficiency Sprint"],
  metric: ["engagement", "productivity", "time-in-seat", "badge swipes", "the stock price", "Slack activity", "meeting density"],
  metric2: ["morale", "headcount", "lunch", "sleep", "questions at the all-hands", "the snack budget", "eye contact"],
  outcome: ["everyone can finally stop thinking", "shareholders can rest", "nobody ever has to talk to anyone again", "the future arrives on schedule, with fees", "every human moment becomes a billable event", "your data never feels lonely", "the line keeps going up"],
  product: ["Platform", "Copilot", "Suite", "Cloud", "OS", "Hub", "Pulse", "Mesh", "One", "Pro Max"],
  money: ["40M", "112M", "1.2B", "7.5M", "300M", "18M"],
  round: ["A", "B", "C", "D", "Z", "Seed+", "Pre-IPO Vibes"],

  // ---------- slogans ----------
  slogan: [
    "{^verb} everything. Feel nothing.",
    "The future of {industry}. Today. For a fee.",
    "Because you were going to anyway.",
    "{^abstract}, at scale.",
    "Built different. Billed monthly.",
    "We're in the business of you.",
    "Your data, our journey.",
    "Disrupting {object} since last Tuesday.",
    "Always on. Always watching. Always here for you.",
    "Less friction. Less humans.",
    "It's not a product. It's a relationship you can't cancel.",
    "Making {object} {adjective} again.",
  ],

  // ---------- cookie banners ----------
  purpose: ["improve your experience", "remember your face", "sell your browsing history back to you at a premium", "train a model you will never meet", "personalize your anxieties", "measure how long you hesitate", "share your location with 412 trusted partners", "know you better than your family does"],
  consent: ["continuing to browse", "scrolling", "looking at this banner", "closing this tab", "existing", "blinking"],
  consequence: ["all of the above", "our Terms, which you did not read", "binding arbitration in a jurisdiction of our choosing", "lifelong personalization", "cookies, forever", "a relationship"],

  // ---------- terms of service updates ----------
  clause: [
    "We may now use your content to train our models, and our models' content to train you.",
    "Disputes will now be resolved by a chatbot, whose decision is final and also a little bit random.",
    "Deleting your account now takes 30 business days and a notarized letter.",
    "\"Unlimited\" now means \"up to 3.\"",
    "Your continued silence will be treated as enthusiasm.",
    "We've removed the section about not selling your data, for readability.",
    "Your subscription now renews automatically, including after death.",
    "We may change these Terms at any time, including retroactively, including emotionally.",
    "Premium members now get ads that are 15% more relevant.",
    "Your photos now belong to the community. The community is us.",
  ],
  when: ["immediately", "yesterday", "at our sole discretion", "30 days ago", "the moment you opened this email"],
};

// Sentence shapes for corporate filler paragraphs.
export const SENTENCES = [
  "{company} is {verbing} the future of {industry} through {adjective} {noun}.",
  "Going forward, we will {verb} {object} with a renewed focus on {abstract}.",
  "This is not a layoff. It is a {adjective} transition to {noun}.",
  "Our people are our greatest {asset}, which is why we are {releasing} {count} of them.",
  "In partnership with {stakeholders}, we have identified {howmany} new ways to {verb} {object}.",
  "We hear you, and we have logged your feedback as {feedback}.",
  "Effective immediately, {perk} will be replaced by {replacement}.",
  "Every {unit}, our platform {verbs} {big} {things} so you don't have to.",
  "At {company}, we believe {belief}.",
  "Please direct any questions to {contact}, which is monitored {frequency}.",
  "Our {doc} reflects our unwavering commitment to {abstract} and {abstract}.",
  "Your privacy is important to us, and to our {partners} trusted partners.",
  "As we enter our next chapter, we invite you to {invite}.",
  "Thanks to {initiative}, {metric} is up 40% and {metric2} is down 60%, which we are choosing to celebrate.",
  "To {verb} {object}, we are moving from {noun} to {adjective} {noun}.",
  "Leadership has aligned on a {adjective} roadmap to {verb} {object} by end of quarter.",
  "None of this would be possible without {abstract}, {abstract} and a series of difficult conversations held without you.",
  "We remain {adjective}, {adjective} and, above all, {adjective}.",
  "Results may vary. {^abstract} may not.",
  "Our {adjective} {noun} help teams {verb} {object} without the friction of having opinions.",
];

export const HEADLINES = [
  "{company} Announces {adjective} {name} {product} to {^verb} {object}",
  "{company} Raises ${money} Series {round} to {^verb} {object}",
  "{company} Is {^verbing} {industry}, and You Can't Stop It",
  "{company} Unveils {name} {product}: \"{slogan}\"",
  "Report: {company} to Part Ways With {howmany} Employees in Bold Bet on {abstract}",
  "{company} Pledges to {^verb} {object} by 2030, or Earlier if Profitable",
];

export const MEMO_SUBJECTS = [
  "An Exciting Update About Our Team",
  "Some Changes (Exciting)",
  "Our Next Chapter",
  "A Note From Leadership About {abstract}",
  "Re: Re: Re: Org Update",
  "Important: Please Read (No Action Needed)",
];

export const MISSIONS = [
  "Our mission is to {verb} {object} so that {outcome}.",
  "We exist to make {industry} {adjective}, so that {outcome}.",
  "{company} is on a mission to {verb} {object}, one {unit} at a time, until {outcome}.",
];
