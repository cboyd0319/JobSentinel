# Cross-Site Scripting (XSS) Prevention

> JobSentinel Security Documentation

---

## Overview

JobSentinel prevents Cross-Site Scripting (XSS) attacks through **DOMPurify sanitization** of user-generated
HTML content. This is critical for features like the Resume Builder where users can create and preview HTML
resumes.

## What is XSS?

Cross-Site Scripting (XSS) is a security vulnerability where attackers inject malicious JavaScript code into
web pages. When other users view the page, the malicious script executes in their browser, potentially:

- Stealing session cookies and credentials
- Performing actions on behalf of the user
- Redirecting to malicious sites
- Modifying page content
- Keylogging user input

## DOMPurify Integration

### What is DOMPurify?

[DOMPurify](https://github.com/cure53/DOMPurify) is a fast, tolerant XSS sanitizer for HTML, MathML, and SVG.
It removes dangerous content while preserving safe formatting.

### Why DOMPurify?

- **Battle-tested**: Used by major companies (Google, Microsoft, Mozilla)
- **Fast**: Microseconds for typical content
- **Comprehensive**: Blocks all known XSS vectors
- **Configurable**: Customizable allow/deny lists
- **Maintained**: Active development and security updates

### Installation

```bash
npm install dompurify
```

Or via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
```

## Implementation in JobSentinel

### Resume Builder (ResumeBuilder.tsx)

The Resume Builder allows users to create HTML resumes. All HTML preview content is sanitized before rendering:

```typescript
import DOMPurify from "dompurify";

// Sanitize HTML before rendering
const sanitizedHtml = DOMPurify.sanitize(userGeneratedHtml);

// Render safely
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

### What Gets Blocked

DOMPurify removes all potentially dangerous content:

#### 1. Script tags

```html
<!-- Input -->
<h1>Resume</h1>
<script>alert('XSS')</script>

<!-- Output -->
<h1>Resume</h1>
<!-- Script tag completely removed -->
```

#### 2. Event handlers

```html
<!-- Input -->
<h1 onclick="alert('XSS')">Click me</h1>
<img src="x" onerror="stealData()">

<!-- Output -->
<h1>Click me</h1>
<img src="x">
<!-- All event handlers stripped -->
```

#### 3. JavaScript URLs

```html
<!-- Input -->
<a href="javascript:alert('XSS')">Click</a>

<!-- Output -->
<a>Click</a>
<!-- JavaScript URL removed -->
```

#### 4. Dangerous tags

```html
<!-- Input -->
<iframe src="evil.com"></iframe>
<object data="malicious.swf"></object>
<embed src="payload.js"></embed>

<!-- Output -->
<!-- All dangerous tags removed -->
```

#### 5. CSS injection

```html
<!-- Input -->
<style>
  body { background: url('javascript:alert(1)'); }
</style>

<!-- Output -->
<!-- Dangerous CSS removed -->
```

### What Gets Preserved

Safe HTML and CSS remain intact:

```html
<!-- All of this is safe and preserved -->
<h1 class="name" style="color: #333;">John Doe</h1>
<div class="contact">
  <a href="mailto:john@example.com">john@example.com</a>
</div>
<p style="margin-bottom: 10px;">Software Engineer</p>
<ul>
  <li><strong>Skill:</strong> Rust</li>
  <li><em>Experience:</em> 5 years</li>
</ul>
```

## Configuration Options

### Default Configuration

The default DOMPurify configuration is secure for most use cases:

```typescript
const clean = DOMPurify.sanitize(dirty);
```

### Custom Configuration

For stricter control, you can configure allowed elements:

```typescript
const customConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'p', 'div', 'span', 
    'ul', 'li', 'strong', 'em', 'a', 'br'
  ],
  ALLOWED_ATTR: ['class', 'id', 'style', 'href'],
  ALLOWED_STYLES: {
    '*': {
      'color': [/^#[0-9a-f]{3,6}$/i],
      'font-size': [/^\d+px$/],
      'margin': [/^\d+px$/],
      'padding': [/^\d+px$/],
      'text-align': [/^(left|center|right)$/]
    }
  }
};

const clean = DOMPurify.sanitize(dirty, customConfig);
```

### Resume Builder Configuration

For resume HTML, we use a permissive configuration that allows formatting while blocking scripts:

```typescript
const resumeConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'div', 'span', 'section', 'article',
    'ul', 'ol', 'li',
    'strong', 'em', 'u', 'b', 'i',
    'a', 'br', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'href', 'target',
    'colspan', 'rowspan'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover']
};
```

## Testing XSS Protection

### Manual Testing

Test DOMPurify in the browser console:

```javascript
// Load DOMPurify (if not already loaded)
// import DOMPurify from 'dompurify';

// Test 1: Script injection
console.log(DOMPurify.sanitize('<h1>Safe</h1><script>alert("XSS")</script>'));
// Expected: <h1>Safe</h1>

// Test 2: Event handlers
console.log(DOMPurify.sanitize('<img src="x" onerror="alert(1)">'));
// Expected: <img src="x">

// Test 3: JavaScript URL
console.log(DOMPurify.sanitize('<a href="javascript:alert(1)">Click</a>'));
// Expected: <a>Click</a>
```

### Automated Testing

See `docs/security/dompurify-test-examples.js` for comprehensive test cases.

Run tests in the Resume Builder page:

1. Open Resume Builder
2. Open browser DevTools console
3. Copy test cases from `dompurify-test-examples.js`
4. Run in console
5. Verify all dangerous content is removed

## Performance Considerations

### Speed

DOMPurify is extremely fast:

- **Typical resume HTML** (5-10KB): < 1ms
- **Large HTML** (50KB): ~5ms
- **Negligible impact** on user experience

### Memory

DOMPurify is lightweight:

- **Bundle size**: ~19KB minified
- **Memory overhead**: Minimal
- **No DOM pollution**: Clean up after sanitization

## Best Practices

### 1. Always sanitize user content

```typescript
// ❌ UNSAFE - Never do this
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE - Always sanitize first
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

### 2. Sanitize at render time

```typescript
// Sanitize when displaying content
const PreviewComponent = ({ html }: { html: string }) => {
  const cleanHtml = DOMPurify.sanitize(html);
  
  return (
    <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
  );
};
```

### 3. Use strict configurations for sensitive areas

```typescript
// For user profiles, comments, etc.
const strictConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: []
};

const clean = DOMPurify.sanitize(userComment, strictConfig);
```

### 4. Validate on both frontend and backend

While JobSentinel is a desktop app with no backend, web applications should:

- Sanitize on frontend (display protection)
- Validate on backend (storage protection)
- Never trust client-side validation alone

### 5. Keep DOMPurify updated

```bash
# Check for updates
npm outdated dompurify

# Update to latest
npm update dompurify
```

## Known Limitations

### What DOMPurify Does NOT Protect Against

1. **SQL Injection**: Use parameterized queries (JobSentinel uses SQLx)
2. **Command Injection**: Validate file paths and command arguments
3. **CSRF**: Use CSRF tokens (not applicable to desktop apps)
4. **Clickjacking**: Use X-Frame-Options headers
5. **Open Redirects**: Validate URLs before redirecting

### Context-Specific Issues

DOMPurify only sanitizes HTML. Other contexts require different protection:

- **JavaScript context**: Use proper escaping
- **URL context**: Use URL encoding
- **CSS context**: Validate CSS properties

## Related Security Measures

### Content Security Policy (CSP)

For web deployments, add CSP headers:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

### Subresource Integrity (SRI)

When loading DOMPurify from CDN:

```html
<script 
  src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

## Additional Resources

- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: XSS Attacks](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting)
- [Google's XSS Game](https://xss-game.appspot.com/) (practice finding XSS)

## Security Contact

If you discover an XSS vulnerability that bypasses DOMPurify protection:

1. **DO NOT** open a public GitHub issue
2. Report privately via GitHub Security Advisory
3. Or email the maintainer directly

---

**Last Updated**: 2026-01-24  
**DOMPurify Version**: 3.x  
**Security Level**: Production Ready
