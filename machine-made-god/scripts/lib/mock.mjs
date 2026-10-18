// Canned replies for MACHINE_MOCK=1 runs and tests. Never used in production.
let n = 0;
const para = (i) =>
  `Paragraph ${i} of the mock report notes that the committee met for the ${i + 3}th time to discuss the vending machine, which has now accepted a single dollar bill since 2019 and refuses to elaborate. Witnesses described the machine as patient, smug, and fully stocked with a granola bar nobody has ever bought.`;

export function mockReply(request) {
  n++;
  const stamp = `${Date.now().toString(36)}${n}`;
  if (request.schemaName === "quiz") {
    const results = ["alpha", "beta", "gamma", "delta"].map((id) => ({ id, title: `The ${id} result ${stamp}`, body: `You are the ${id} type. `.repeat(8), share: `I got ${id}.` }));
    return {
      title: `Which Office Vending Machine Snack Are You, Mock Edition ${stamp}?`,
      dek: "A mock quiz generated offline to test the machine's plumbing.",
      tags: ["mock", "vending machines"],
      art: { motif: "stickers", palette: "hazard", label: "SNACK" },
      questions: Array.from({ length: 6 }, (_, qi) => ({ q: `Mock question ${qi + 1}?`, answers: results.map((r) => ({ a: `Pick ${r.id}`, r: r.id })) })),
      results,
      uses_real_people: false,
    };
  }
  if (request.schemaName === "extras") {
    return {
      ticker: [`MOCK: Vending machine ${stamp} accepts dollar bill, nation stunned`, `UPDATE: Committee ${stamp} forms subcommittee about subcommittees`],
      bumps: [`this is a mock bump.\nnumber ${stamp}.\ngo to sleep.`],
      ads: [{ brand: `Mockery Inc ${stamp}`, headline: `This Mock Product ${stamp} Does Nothing, Beautifully`, body: "Tested offline. Approved by nobody. Shipping never.", cta: "Buy Nothing", palette: "teal" }],
    };
  }
  return {
    title: `Vending Machine Number ${stamp} Accepts Dollar Bill on First Try, Town Unsure How to Proceed`,
    dek: "The mock machine has generated a mock article to prove the pipes work.",
    body: `## The incident\n\n${[1, 2, 3].map(para).join("\n\n")}\n\n## What now\n\n${[4, 5].map(para).join("\n\n")}`,
    tags: ["mock", "vending machines", "local government"],
    art: { motif: "memo", palette: "bleach", label: "VENDCO" },
    pullquote: "It took the dollar. It just took it.",
    rating: 0,
    product: "",
    uses_real_people: false,
  };
}
