import { sanitizeRichHtml } from "@/lib/sanitize-html";

type Props = {
  html: string;
  className?: string;
};

/** Renders sanitized HTML from stored rich text (questions, answers). */
export function RichHtml({ html, className }: Props) {
  const safe = sanitizeRichHtml(html);
  if (!safe) return null;
  return (
    <div
      className={`rich-html-content ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
