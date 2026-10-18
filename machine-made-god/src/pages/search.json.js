import { items, categoryOf, plainText } from "../lib/site.js";

export function GET() {
  const index = items.map((item) => {
    const cat = categoryOf(item.category);
    const body =
      item.kind === "quiz"
        ? item.questions.map((q) => q.q).join(" ") + " " + Object.values(item.results).map((r) => r.title).join(" ")
        : plainText(item.mod.rawContent(), 1500);
    return {
      t: item.title,
      d: item.dek,
      u: item.url,
      c: cat.slug,
      cn: cat.short,
      cc: cat.color,
      k: item.kind,
      ts: item.date.getTime(),
      tr: Boolean(item.trending),
      g: item.tags,
      b: body,
    };
  });
  return new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } });
}
