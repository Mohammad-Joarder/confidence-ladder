import sanitizeHtml from "sanitize-html";

/** Pure-Node HTML sanitization (no JSDOM) — reliable on Vercel serverless. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "del",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "h4",
    "img",
    "hr",
    "div",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class", "style"],
    img: ["src", "alt", "title", "class"],
    // TipTap / alignment
    "*": ["class", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    a: ["http", "https", "mailto"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
};

/** Server-safe HTML for stored rich text (questions, answers). */
export function sanitizeRichHtml(dirty: string): string {
  const trimmed = (dirty ?? "").trim();
  if (!trimmed) return "";
  return sanitizeHtml(trimmed, OPTIONS);
}
