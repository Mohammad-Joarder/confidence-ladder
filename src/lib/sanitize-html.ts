import DOMPurify from "isomorphic-dompurify";

const SANITIZE_RICH = {
  ALLOWED_TAGS: [
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
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "style"],
  ALLOW_DATA_ATTR: false,
} as const;

/** Server-safe HTML for stored rich text (questions, answers). */
export function sanitizeRichHtml(dirty: string): string {
  const trimmed = (dirty ?? "").trim();
  if (!trimmed) return "";
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...SANITIZE_RICH.ALLOWED_TAGS],
    ALLOWED_ATTR: [...SANITIZE_RICH.ALLOWED_ATTR],
    ALLOW_DATA_ATTR: SANITIZE_RICH.ALLOW_DATA_ATTR,
  });
}
