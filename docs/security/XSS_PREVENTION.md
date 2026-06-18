# Cross-Site Scripting Prevention

JobSentinel renders resume previews from user-authored resume content. Any HTML
render path must sanitize before using `dangerouslySetInnerHTML`.

## Current Implementation

The active Resume Builder preview is in
`src/pages/ResumeBuilderPreviewStep.tsx`, with the shared sanitizer policy in
`src/pages/resumeHtmlSanitizer.ts`. PDF export uses the same sanitizer before
placing resume HTML into the temporary print iframe in
`src/pages/resumeBuilderExportDom.ts`.

```typescript
<iframe
  title="Resume preview"
  sandbox=""
  referrerPolicy="no-referrer"
  srcDoc={sanitizeResumeHtmlDocument(previewHtml)}
/>

// Print export uses a temporary iframe with srcdoc.
iframe.setAttribute("sandbox", "allow-modals");
iframe.setAttribute("referrerpolicy", "no-referrer");
iframe.srcdoc = sanitizeResumeHtmlDocument(html);
```

`package.json` owns the DOMPurify dependency. Check the current installed
version with:

```bash
npm ls dompurify
```

## Renderer CSP

The Tauri renderer CSP in `src-tauri/tauri.conf.json` keeps network access
local to the app:

```text
default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'
```

The only current CSP exception is `style-src 'unsafe-inline'`. React components
still use inline style attributes for dynamic widths, positions, animation
delays, and chart colors. That exception must stay limited to styles only.
Inline scripts, `unsafe-eval`, external `connect-src`, external fonts, external
style imports, object/embed content, document base changes, and form submission
remain blocked. `npm run lint:security` enforces the exact renderer CSP shape
and fails if a new directive or source is added without review.

## Threat Model

XSS can execute attacker-controlled JavaScript in the app webview. In a desktop
app, that can expose local UI state, tokens shown in the page, clipboard data,
or privileged Tauri command paths reachable from the frontend.

Treat these inputs as untrusted:

- Resume summary, experience, education, project, and skill text.
- Imported resume JSON.
- Job descriptions copied into resume tooling.
- Template text and user-authored HTML-like content.
- Scraped job titles, company names, locations, sources, URLs, and match
  reasons rendered into notification emails.

## What DOMPurify Blocks

### Script Tags

```html
<!-- Input -->
<h1>Resume</h1>
<script>alert("XSS")</script>

<!-- Sanitized output -->
<h1>Resume</h1>
```

### Event Handlers

```html
<!-- Input -->
<h1 onclick="alert('XSS')">Click me</h1>
<img src="x" onerror="stealData()" />

<!-- Sanitized output -->
<h1>Click me</h1>
<img src="x" />
```

### JavaScript URLs

```html
<!-- Input -->
<a href="javascript:alert('XSS')">Click</a>

<!-- Sanitized output -->
<a>Click</a>
```

### Dangerous Elements

```html
<!-- Input -->
<iframe src="https://example.invalid"></iframe>
<object data="malicious.swf"></object>
<embed src="payload.js"></embed>

<!-- Sanitized output -->
```

### DOM Clobbering Names

`SANITIZE_NAMED_PROPS` prevents user-authored `id` or `name` attributes from
shadowing sensitive browser or app properties.

```html
<!-- Input -->
<form id="document" name="location"></form>

<!-- Sanitized output -->
<!-- id/name are removed or safely prefixed, not preserved as submitted -->
```

## What Remains Allowed

Safe resume formatting remains:

```html
<style>
.name { color: #333; }
.contact { margin-bottom: 10px; }
</style>
<h1 class="name">Jordan Lee</h1>
<div class="contact">
  <a href="mailto:jordan@example.com">jordan@example.com</a>
</div>
<p>Program Coordinator</p>
<ul>
  <li><strong>Skill:</strong> Case documentation</li>
  <li><em>Experience:</em> 5 years</li>
</ul>
```

The allowlist intentionally keeps only resume document tags and attributes.
Inline style attributes, scripts, forms, embedded content, media, SVG, MathML,
custom elements, data attributes, ARIA attributes, `target`, and `src`/`srcset`
are removed. Generated template CSS is kept in `<style>` blocks. Preview
content is rendered in a sandboxed iframe without script, form, popup, modal,
or same-origin permissions. Print content is rendered in a temporary sandboxed
iframe without script, form, popup, or same-origin permissions; it allows modals
only so the browser print dialog can open.

Style blocks are not allowed to load network resources. The sanitizer strips
stylesheet imports, `@font-face`, `url(...)`, and `image-set(...)` so resume
preview and print HTML cannot use CSS to fetch attacker-controlled resources.
CSS escapes are decoded before this filter runs, so escaped spellings such as
`@\000069mport` and `\75 rl(...)` do not bypass the resource-load block.

## Testing

Manual examples live in `docs/security/dompurify-test-examples.js`. For current
app behavior, prefer a component or unit test that imports DOMPurify and checks
sanitized output.

Focused manual checks:

```javascript
import { sanitizeResumeHtmlDocument } from "../../src/pages/resumeHtmlSanitizer";

sanitizeResumeHtmlDocument('<h1>Safe</h1><script>alert("XSS")</script>');
// Expected: <h1>Safe</h1>

sanitizeResumeHtmlDocument('<img src="x" onerror="alert(1)">');
// Expected: image removed

sanitizeResumeHtmlDocument('<a href="javascript:alert(1)">Click</a>');
// Expected: <a>Click</a>

sanitizeResumeHtmlDocument('<style>@\\000069mport "https://example.invalid/x.css";</style>');
// Expected: no external CSS import remains
```

Repository checks:

```bash
npm run lint:security
npm run test:run
```

Use `npm run lint:security` when touching security docs or sensors. Use focused
frontend tests when a matching test file exists; otherwise use the broader
frontend test command for Resume Builder behavior changes.

## Best Practices

### Sanitize Before Rendering

```typescript
// Unsafe: renders raw user input.
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Safe: renders sanitized HTML.
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### Keep Sanitization Close To The Sink

Sanitize at render time or immediately before assigning to an HTML sink. Do not
assume upstream storage stayed safe.

```typescript
const ResumePreview = ({ html }: { html: string }) => {
  const cleanHtml = DOMPurify.sanitize(html, { SANITIZE_NAMED_PROPS: true });

  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};
```

### Validate Other Contexts Separately

DOMPurify sanitizes HTML. Other contexts need different controls:

- SQL: use SQLx parameterized queries.
- Commands: avoid shell invocation and validate arguments.
- URLs: parse with structured URL APIs and enforce allowlists.
- File paths: canonicalize and enforce allowed directories.
- Logs and feedback reports: redact sensitive values before storage.
- Email HTML: escape text and attribute values before formatting scraped job
  content, and validate links before placing them in `href` attributes.

## Known Limits

DOMPurify does not replace:

- Backend or Tauri command validation.
- URL allowlisting.
- Credential handling through JobSentinel's local secret-storage boundary.
- Feedback/debug-log redaction.
- Dependency audit and update workflow.

## Related Documentation

- [Security overview](./README.md)
- [URL validation](./URL_VALIDATION.md)
- [Command execution](./COMMAND_EXECUTION.md)
- [Local secret vault and Keychain integration](./KEYRING.md)
- [Verification matrix](../harness/verification-matrix.md)
