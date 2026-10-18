// Content rules shared by the site build and the AI generator.
// If a file breaks these rules the build fails, so bad content never deploys.

export const FORMATS = ["news", "listicle", "review", "announcement", "essay"];
export const MOTIFS = ["logo", "memo", "billboard", "chart", "badge", "crt", "stickers", "phone"];
export const PALETTES = ["sodium", "sick", "teal", "bleach", "hazard", "crt"];

// Phrases that mean the model broke character or wrote filler.
export const BANNED_PHRASES = [
  "as an ai",
  "language model",
  "i cannot",
  "i can't help",
  "lorem ipsum",
  "in conclusion",
  "delve",
  "tapestry",
  "it's important to note",
];

const STOPWORDS = new Set(
  "a an the of to in on for and or but is are was were be been it its this that with as at by from his her their they he she you your we our i my me after before into over about up out just new local area man woman says say".split(
    " "
  )
);

export function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= 70) return slug;
  const cut = slug.slice(0, 70);
  return cut.slice(0, cut.lastIndexOf("-") > 30 ? cut.lastIndexOf("-") : 70);
}

export function tokens(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/['’]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

// Jaccard similarity of meaningful words, 0..1.
export function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / (A.size + B.size - shared);
}

export function findNearDuplicate(title, existingTitles, threshold = 0.45) {
  let best = null;
  for (const other of existingTitles) {
    const score = similarity(title, other);
    if (score >= threshold && (!best || score > best.score)) best = { title: other, score };
  }
  return best;
}

export function wordCount(markdown) {
  return String(markdown)
    .replace(/[#>*_`\-\[\]()!]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function checkArt(art, errors, where) {
  if (!art || typeof art !== "object") return errors.push(`${where}: art is required`);
  if (!MOTIFS.includes(art.motif)) errors.push(`${where}: art.motif must be one of ${MOTIFS.join(", ")}`);
  if (!PALETTES.includes(art.palette)) errors.push(`${where}: art.palette must be one of ${PALETTES.join(", ")}`);
  if (typeof art.label !== "string" || art.label.length < 2 || art.label.length > 32)
    errors.push(`${where}: art.label must be 2-32 characters`);
}

function checkBanned(text, errors, where) {
  const lower = String(text).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) errors.push(`${where}: contains banned phrase "${phrase}"`);
  }
}

function isValidDate(value) {
  return !Number.isNaN(new Date(value).getTime());
}

export function validateArticle(fm, body, { categories, authors }, where = "article") {
  const errors = [];
  const catSlugs = categories.map((c) => c.slug);
  const authorIds = authors.map((a) => a.id);

  if (typeof fm.title !== "string" || fm.title.length < 10 || fm.title.length > 140)
    errors.push(`${where}: title must be 10-140 characters`);
  if (typeof fm.dek !== "string" || fm.dek.length < 10 || fm.dek.length > 220)
    errors.push(`${where}: dek must be 10-220 characters`);
  if (!catSlugs.includes(fm.category)) errors.push(`${where}: unknown category "${fm.category}"`);
  if (!authorIds.includes(fm.author)) errors.push(`${where}: unknown author "${fm.author}"`);
  if (!FORMATS.includes(fm.format)) errors.push(`${where}: format must be one of ${FORMATS.join(", ")}`);
  if (!isValidDate(fm.date)) errors.push(`${where}: invalid date "${fm.date}"`);
  if (!Array.isArray(fm.tags) || fm.tags.length < 1 || fm.tags.length > 8)
    errors.push(`${where}: tags must be a list of 1-8 items`);
  if (fm.format === "review" && (typeof fm.rating !== "number" || fm.rating < 0 || fm.rating > 5))
    errors.push(`${where}: reviews need a rating from 0 to 5`);
  checkArt(fm.art, errors, where);

  const words = wordCount(body);
  if (words < 180) errors.push(`${where}: body too short (${words} words)`);
  if (words > 1600) errors.push(`${where}: body too long (${words} words)`);
  if (fm.format === "listicle" && !/^##\s/m.test(body)) errors.push(`${where}: listicles need ## headings`);
  checkBanned(`${fm.title}\n${fm.dek}\n${body}`, errors, where);
  return errors;
}

export function validateQuiz(quiz, { authors }, where = "quiz") {
  const errors = [];
  const authorIds = authors.map((a) => a.id);
  if (typeof quiz.title !== "string" || quiz.title.length < 10) errors.push(`${where}: title too short`);
  if (typeof quiz.dek !== "string" || quiz.dek.length < 10) errors.push(`${where}: dek too short`);
  if (!authorIds.includes(quiz.author)) errors.push(`${where}: unknown author "${quiz.author}"`);
  if (!isValidDate(quiz.date)) errors.push(`${where}: invalid date`);
  checkArt(quiz.art, errors, where);

  const results = quiz.results && typeof quiz.results === "object" ? quiz.results : {};
  const resultIds = Object.keys(results);
  if (resultIds.length < 3) errors.push(`${where}: needs at least 3 results`);
  for (const id of resultIds) {
    const r = results[id];
    if (!r.title || !r.body || !r.share) errors.push(`${where}: result "${id}" needs title, body and share`);
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length < 4)
    errors.push(`${where}: needs at least 4 questions`);
  const used = new Set();
  (quiz.questions || []).forEach((q, i) => {
    if (!q.q) errors.push(`${where}: question ${i + 1} has no text`);
    if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 6)
      errors.push(`${where}: question ${i + 1} needs 2-6 answers`);
    for (const a of q.answers || []) {
      if (!a.a) errors.push(`${where}: question ${i + 1} has an empty answer`);
      if (!resultIds.includes(a.r)) errors.push(`${where}: question ${i + 1} points to unknown result "${a.r}"`);
      used.add(a.r);
    }
  });
  for (const id of resultIds) if (!used.has(id)) errors.push(`${where}: result "${id}" is unreachable`);
  checkBanned(JSON.stringify(quiz), errors, where);
  return errors;
}

// Tally answers into a result id. Ties go to the most recent answer's result.
export function scoreQuiz(quiz, answerIndexes) {
  const counts = {};
  let last = null;
  answerIndexes.forEach((answerIndex, qi) => {
    const answer = quiz.questions[qi]?.answers[answerIndex];
    if (!answer) return;
    counts[answer.r] = (counts[answer.r] || 0) + 1;
    last = answer.r;
  });
  let best = null;
  for (const [id, n] of Object.entries(counts)) {
    if (!best || n > counts[best] || (n === counts[best] && id === last)) best = id;
  }
  return best;
}
