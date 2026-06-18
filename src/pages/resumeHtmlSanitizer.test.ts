import { describe, expect, it } from "vitest";
import { sanitizeResumeHtmlDocument } from "./resumeHtmlSanitizer";

describe("sanitizeResumeHtmlDocument", () => {
  it("keeps generated resume document structure and template styling", () => {
    const sanitized = sanitizeResumeHtmlDocument(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume</title>
<style>.name{font-weight:700}</style>
</head>
<body><h1 class="name">Jordan Lee</h1><hr><ul><li><strong>Impact</strong></li></ul></body>
</html>`);

    expect(sanitized).toContain("<html");
    expect(sanitized).toContain("<meta");
    expect(sanitized).toContain("<style>.name{font-weight:700}</style>");
    expect(sanitized).toContain('class="name"');
    expect(sanitized).toContain("<strong>Impact</strong>");
  });

  it("removes executable, embedded, form, and broad DOM-clobbering surfaces", () => {
    const sanitized = sanitizeResumeHtmlDocument(`
      <script>alert(1)</script>
      <iframe src="https://example.com"></iframe>
      <object data="https://example.com/file"></object>
      <svg><a href="javascript:alert(1)">bad</a></svg>
      <form id="constructor"><input name="location"></form>
      <h1 id="document" name="location" data-private="yes" aria-label="x">Portfolio</h1>
    `);

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("<object");
    expect(sanitized).not.toContain("<svg");
    expect(sanitized).not.toContain("<form");
    expect(sanitized).not.toContain("<input");
    expect(sanitized).not.toContain("id=");
    expect(sanitized).not.toContain("name=");
    expect(sanitized).not.toContain("data-private");
    expect(sanitized).not.toContain("aria-label");
    expect(sanitized).toContain("Portfolio");
  });

  it("allows only resume-safe link schemes and strips opener-prone targets", () => {
    const sanitized = sanitizeResumeHtmlDocument(`
      <a href="https://example.com" target="_blank">web</a>
      <a href="mailto:jordan@example.com">mail</a>
      <a href="tel:+15551234567">phone</a>
      <a href="ftp://example.com/file">ftp</a>
      <a href="javascript:alert(1)">script</a>
    `);

    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).toContain('href="mailto:jordan@example.com"');
    expect(sanitized).toContain('href="tel:+15551234567"');
    expect(sanitized).not.toContain("target=");
    expect(sanitized).not.toContain("ftp://");
    expect(sanitized).not.toContain("javascript:");
  });

  it("removes inline style attributes while preserving template style blocks", () => {
    const sanitized = sanitizeResumeHtmlDocument(`
      <style>.name{color:#111}</style>
      <h1 class="name" style="background:url(https://example.com/pixel)">Name</h1>
    `);

    expect(sanitized).toContain("<style>.name{color:#111}</style>");
    expect(sanitized).toContain('class="name"');
    expect(sanitized).not.toContain("style=");
    expect(sanitized).not.toContain("pixel");
  });

  it("sanitizes CSS inside style tags to prevent external resource loads and imports", () => {
    const sanitized = sanitizeResumeHtmlDocument(`
      <style>
        @import url("https://attacker.com/leak.css");
        @import "http://attacker.com/bad.css";
        .avatar { background-image: url('https://attacker.com/leak.png'); }
        @font-face { font-family: Leak; src: url(https://attacker.com/font.woff2); }
        .logo { background-image: image-set("https://attacker.com/1x.png" 1x); }
        .body { font-size: 14px; }
      </style>
    `);
    expect(sanitized).toContain(".body { font-size: 14px; }");
    expect(sanitized).not.toContain("attacker.com");
    expect(sanitized).not.toContain("@import");
    expect(sanitized).not.toContain("@font-face");
    expect(sanitized).not.toContain("image-set");
  });

  it("decodes CSS escapes before blocking resource-loading syntax", () => {
    const sanitized = sanitizeResumeHtmlDocument(String.raw`
      <style>
        @\000069mport "https://attacker.com/escaped.css";
        @\66 ont-face { font-family: Leak; src: \75 rl(https://attacker.com/font.woff2); }
        .avatar { background-image: \000075rl("https://attacker.com/leak.png"); }
        .logo { background-image: \69 mage-set("https://attacker.com/2x.png" 2x); }
        .body { color: #111; }
      </style>
    `);

    expect(sanitized).toContain(".body { color: #111; }");
    expect(sanitized).not.toContain("attacker.com");
    expect(sanitized).not.toContain("@import");
    expect(sanitized).not.toContain("@font-face");
    expect(sanitized).not.toContain("url(");
    expect(sanitized).not.toContain("image-set");
  });
});
