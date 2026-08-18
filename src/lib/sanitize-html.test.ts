import { describe, it, expect } from "vitest";
import { sanitizeArticleHtml, htmlToPlainText } from "./sanitize-html";

describe("sanitizeArticleHtml", () => {
  it("keeps allowed formatting tags", () => {
    const html = "<p>Hello <strong>world</strong>, this is <em>great</em>.</p>";
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it("keeps headings and lists", () => {
    const html = "<h2>Title</h2><ul><li>one</li><li>two</li></ul>";
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it("strips script tags entirely", () => {
    const html = "<p>hi</p><script>alert('xss')</script>";
    const result = sanitizeArticleHtml(html);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips inline event handler attributes", () => {
    const html = "<p onclick=\"alert('xss')\">hi</p>";
    const result = sanitizeArticleHtml(html);
    expect(result).not.toContain("onclick");
  });

  it("strips img tags (images intentionally unsupported for now)", () => {
    const html = "<p>hi</p><img src=x onerror=\"alert('xss')\">";
    const result = sanitizeArticleHtml(html);
    expect(result).not.toContain("<img");
  });

  it("strips disallowed attributes from allowed tags like style", () => {
    const html = "<p style=\"color:red\">hi</p>";
    const result = sanitizeArticleHtml(html);
    expect(result).not.toContain("style=");
  });
});

describe("htmlToPlainText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("adds separating spaces between block elements", () => {
    expect(htmlToPlainText("<h2>Title</h2><p>Body text</p>")).toBe("Title Body text");
  });

  it("handles lists", () => {
    expect(htmlToPlainText("<ul><li>one</li><li>two</li></ul>")).toBe("one two");
  });

  it("returns empty string for empty input", () => {
    expect(htmlToPlainText("")).toBe("");
  });
});
