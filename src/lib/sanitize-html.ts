import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "strong",
  "em",
  "s",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "br",
  "a",
];

/**
 * Restricts article/comment HTML (from the rich-text editor) to a small
 * known set of formatting tags before it's stored or rendered — the
 * editor only ever emits these, so anything else is either an attempt to
 * inject something or a Tiptap version drift, and either way should be
 * stripped rather than trusted.
 */
export function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
  }).trim();
}

/** Plain-text rendering of sanitized article HTML, for list excerpts and
 * the chat/notification-style contexts that can't render markup. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(p|h1|h2|h3|li|blockquote|br|hr)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
