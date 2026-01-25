/**
 * DOMPurify Integration Test Example
 * 
 * This demonstrates how DOMPurify sanitizes HTML in ResumeBuilder.tsx
 * Run this in browser console on the Resume Builder page to test.
 */

// Example 1: Normal resume HTML (should work perfectly)
const normalResume = `
  <h1 class="name">John Doe</h1>
  <div class="contact">john@example.com • (555) 123-4567 • New York, NY</div>
  <hr class="section-divider">
  <h2>SUMMARY</h2>
  <p>Experienced software engineer with 5+ years in web development.</p>
`;

console.log('Normal HTML:', DOMPurify.sanitize(normalResume));
// ✅ Output: Same as input, all formatting preserved

// Example 2: XSS attempt with script tag (should be blocked)
const xssScript = `
  <h1 class="name">John Doe</h1>
  <script>alert('XSS Attack!');</script>
  <p>Legitimate content</p>
`;

console.log('XSS Script:', DOMPurify.sanitize(xssScript));
// ✅ Output: <h1 class="name">John Doe</h1><p>Legitimate content</p>
// Script tag is completely removed

// Example 3: XSS attempt with event handler (should be blocked)
const xssEvent = `
  <h1 onclick="alert('XSS')" onmouseover="stealData()">Click me</h1>
  <img src="x" onerror="alert('XSS')">
`;

console.log('XSS Event:', DOMPurify.sanitize(xssEvent));
// ✅ Output: <h1>Click me</h1><img src="x">
// All event handlers are removed

// Example 4: XSS with JavaScript URL (should be blocked)
const xssUrl = `
  <a href="javascript:alert('XSS')">Click here</a>
  <iframe src="javascript:alert('XSS')"></iframe>
`;

console.log('XSS URL:', DOMPurify.sanitize(xssUrl));
// ✅ Output: <a>Click here</a>
// JavaScript URLs and dangerous iframes are removed

// Example 5: Resume with safe inline styles (should work)
const styledResume = `
  <h1 style="color: #333; font-size: 24px;">John Doe</h1>
  <p style="margin-bottom: 10px;">Software Engineer</p>
`;

console.log('Styled HTML:', DOMPurify.sanitize(styledResume));
// ✅ Output: Same as input, safe CSS preserved

// Example 6: Complex XSS attempt (should be blocked)
const complexXss = `
  <div>
    <h1>John Doe</h1>
    <style>body { background: url('javascript:alert(1)'); }</style>
    <link rel="stylesheet" href="javascript:alert(1)">
    <object data="javascript:alert(1)"></object>
    <embed src="javascript:alert(1)">
    <form action="https://evil.com/steal">
      <input name="data" value="sensitive">
    </form>
  </div>
`;

console.log('Complex XSS:', DOMPurify.sanitize(complexXss));
// ✅ Output: Only safe content remains, all dangerous elements removed

/**
 * DOMPurify Configuration (Optional)
 * 
 * The default configuration is secure for most cases, but you can customize:
 */

// Allow only specific tags and attributes
const customConfig = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'div', 'span', 'ul', 'li', 'strong', 'em'],
  ALLOWED_ATTR: ['class', 'id', 'style'],
  ALLOWED_STYLES: {
    '*': {
      'color': [/^#[0-9a-f]{3,6}$/i],
      'font-size': [/^\d+px$/],
      'margin': [/^\d+px$/],
      'padding': [/^\d+px$/]
    }
  }
};

const restrictedHTML = '<h1 class="name">John</h1><script>alert(1)</script>';
console.log('Restricted:', DOMPurify.sanitize(restrictedHTML, customConfig));

/**
 * Testing in ResumeBuilder.tsx
 * 
 * To test the actual implementation:
 * 1. Open ResumeBuilder page
 * 2. Open browser DevTools console
 * 3. Run: console.log(DOMPurify) to verify it's loaded
 * 4. Try creating a resume and check the preview
 * 5. Inspect the HTML to verify sanitization
 */

// Performance note: DOMPurify is fast (microseconds for typical resume HTML)
// It won't impact the user experience negatively.
