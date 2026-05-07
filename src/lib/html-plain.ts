/** Strip HTML for previews, similarity search, and empty checks (no full parsing). */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!html.includes("<")) return html.trim();

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when there is no visible text and no embedded images. */
export function isRichTextEmpty(html: string): boolean {
  const plain = htmlToPlainText(html);
  const hasImg = /<img\s[^>]*>/i.test(html);
  return plain.length === 0 && !hasImg;
}
