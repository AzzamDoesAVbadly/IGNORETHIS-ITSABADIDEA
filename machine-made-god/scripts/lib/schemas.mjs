// JSON Schemas for structured output (used directly by Claude, and as a contract for the rest).
import { MOTIFS, PALETTES } from "../../src/lib/schema.mjs";

const art = {
  type: "object",
  additionalProperties: false,
  required: ["motif", "palette", "label"],
  properties: {
    motif: { type: "string", enum: MOTIFS },
    palette: { type: "string", enum: PALETTES },
    label: { type: "string" },
  },
};

export const articleSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "dek", "body", "tags", "art", "pullquote", "rating", "product", "uses_real_people"],
  properties: {
    title: { type: "string" },
    dek: { type: "string" },
    body: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    art,
    pullquote: { type: "string" },
    rating: { type: "number" },
    product: { type: "string" },
    uses_real_people: { type: "boolean" },
  },
};

export const quizSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "dek", "tags", "art", "questions", "results", "uses_real_people"],
  properties: {
    title: { type: "string" },
    dek: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    art,
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["q", "answers"],
        properties: {
          q: { type: "string" },
          answers: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["a", "r"],
              properties: { a: { type: "string" }, r: { type: "string" } },
            },
          },
        },
      },
    },
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "body", "share"],
        properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" }, share: { type: "string" } },
      },
    },
    uses_real_people: { type: "boolean" },
  },
};

export const extrasSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticker", "bumps", "ads"],
  properties: {
    ticker: { type: "array", items: { type: "string" } },
    bumps: { type: "array", items: { type: "string" } },
    ads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["brand", "headline", "body", "cta", "palette"],
        properties: {
          brand: { type: "string" },
          headline: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
          palette: { type: "string", enum: PALETTES },
        },
      },
    },
  },
};
