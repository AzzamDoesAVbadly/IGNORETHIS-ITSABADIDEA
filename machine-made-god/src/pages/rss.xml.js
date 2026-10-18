import rss from "@astrojs/rss";
import { items, site } from "../lib/site.js";

export function GET(context) {
  return rss({
    title: "Machine Made God",
    description: site.description,
    site: context.site,
    items: items.slice(0, 40).map((item) => ({
      title: item.title,
      description: item.dek,
      link: item.url,
      pubDate: item.date,
      categories: [item.category, ...item.tags],
    })),
  });
}
