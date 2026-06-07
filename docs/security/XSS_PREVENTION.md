# Cross-Site Scripting Prevention

JobSentinel renders resume previews from user-authored resume content. Any HTML
render path must sanitize before using `dangerouslySetInnerHTML`.

## Current Implementation

The active Resume Builder preview is in
`src/pages/ResumeBuilderPreviewStep.tsx`.

```typescript
import DOMPurify from "dompurify";

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
```

`package.json` owns the DOMPurify dependency. Check the current installed
version with:

```bash
npm ls dompurify
```

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

## What Remains Allowed

Safe resume formatting remains:

```html
<h1 class="name" style="color: #333;">Jordan Lee</h1>
<div class="contact">
  <a href="mailto:jordan@example.com">jordan@example.com</a>
</div>
<p style="margin-bottom: 10px;">Program Coordinator</p>
<ul>
  <li><strong>Skill:</strong> Case documentation</li>
  <li><em>Experience:</em> 5 years</li>
</ul>
```

## Testing

Manual examples live in `docs/security/dompurify-test-examples.js`. For current
app behavior, prefer a component or unit test that imports DOMPurify and checks
sanitized output.

Focused manual checks:

```javascript
DOMPurify.sanitize('<h1>Safe</h1><script>alert("XSS")</script>');
// Expected: <h1>Safe</h1>

DOMPurify.sanitize('<img src="x" onerror="alert(1)">');
// Expected: <img src="x">

DOMPurify.sanitize('<a href="javascript:alert(1)">Click</a>');
// Expected: <a>Click</a>
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
  const cleanHtml = DOMPurify.sanitize(html);

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
