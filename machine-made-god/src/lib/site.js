import categories from "../data/categories.json";
import authors from "../data/authors.json";
import site from "../data/site.json";
import { validateArticle, validateQuiz } from "./schema.mjs";

export { categories, authors, site };

const articleModules = import.meta.glob("../content/articles/*.md", { eager: true });
const quizModules = import.meta.glob("../content/quizzes/*.json", { eager: true });

const fileSlug = (path) => path.split("/").pop().replace(/\.(md|json)$/, "");

const problems = [];

export const articles = Object.entries(articleModules)
  .map(([path, mod]) => {
    const slug = fileSlug(path);
    const fm = mod.frontmatter;
    problems.push(...validateArticle(fm, mod.rawContent(), { categories, authors }, `articles/${slug}.md`));
    return {
      ...fm,
      kind: "article",
      slug,
      url: `/a/${slug}/`,
      date: new Date(fm.date),
      tags: fm.tags || [],
      mod,
    };
  })
  .filter((a) => !a.draft)
  .sort((a, b) => b.date - a.date);

export const quizzes = Object.entries(quizModules)
  .map(([path, mod]) => {
    const slug = fileSlug(path);
    const quiz = mod.default;
    problems.push(...validateQuiz(quiz, { authors }, `quizzes/${slug}.json`));
    return {
      ...quiz,
      kind: "quiz",
      slug,
      url: `/quiz/${slug}/`,
      category: "quizzes",
      format: "quiz",
      date: new Date(quiz.date),
      tags: quiz.tags || [],
    };
  })
  .filter((q) => !q.draft)
  .sort((a, b) => b.date - a.date);

if (problems.length) {
  throw new Error(`Invalid content, refusing to build:\n- ${problems.join("\n- ")}`);
}

// Everything readers can click, newest first.
export const items = [...articles, ...quizzes].sort((a, b) => b.date - a.date);

export const categoryOf = (slug) => categories.find((c) => c.slug === slug) || categories[0];
export const authorOf = (id) => authors.find((a) => a.id === id) || authors[0];

export function inCategory(slug) {
  return items.filter((item) => item.category === slug);
}

export function featured() {
  return articles.find((a) => a.featured) || articles[0];
}

function fill(chosen, n, exclude = []) {
  const seen = new Set([...chosen, ...exclude].map((i) => i.url));
  const out = [...chosen];
  for (const item of items) {
    if (out.length >= n) break;
    if (!seen.has(item.url)) {
      out.push(item);
      seen.add(item.url);
    }
  }
  return out.slice(0, n);
}

export function trending(n = 6, exclude = []) {
  const ex = new Set(exclude.map((i) => i.url));
  return fill(items.filter((i) => i.trending && !ex.has(i.url)), n, exclude);
}

export function picks(n = 4, exclude = []) {
  const ex = new Set(exclude.map((i) => i.url));
  return fill(items.filter((i) => i.pick && !ex.has(i.url)), n, exclude);
}

export function related(item, n = 3) {
  const tags = new Set(item.tags);
  return items
    .filter((other) => other.url !== item.url)
    .map((other) => ({
      other,
      score: (other.category === item.category ? 3 : 0) + other.tags.filter((t) => tags.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score || b.other.date - a.other.date)
    .slice(0, n)
    .map((r) => r.other);
}

export function formatDate(date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function plainText(markdown, max = 400) {
  const text = String(markdown)
    .replace(/^---[\s\S]*?---/, "")
    .replace(/[#>*_`]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s\S*$/, "")}…` : text;
}

export const adsenseClient = import.meta.env.PUBLIC_ADSENSE_CLIENT || site.adsenseClient || "";
export const merchStoreUrl = import.meta.env.PUBLIC_MERCH_STORE_URL || site.merchStoreUrl || "";
