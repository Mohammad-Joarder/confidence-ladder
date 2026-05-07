import { sanitizeRichHtml } from "@/lib/sanitize-html";

type Props = {
  html: string;
  className?: string;
};

/** Renders sanitized HTML from stored rich text (questions, answers). */
export function RichHtml({ html, className }: Props) {
  let safe = "";
  try {
    safe = sanitizeRichHtml(html);
  } catch {
    return (
      <p className={`text-slate-500 italic ${className ?? ""}`}>
        (Could not render formatted content safely.)
      </p>
    );
  }
  if (!safe) return null;
  return (
    <div
      className={`rich-html-content ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
