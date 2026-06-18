import DOMPurify, { type Config } from "dompurify";

const cssResourceLoadPatterns = [
  /@import\b[^;]*(?:;|$)/gi,
  /@font-face\s*\{[^}]*\}/gi,
  /\b(?:url|image-set)\s*\([^)]*\)/gi,
];

function sanitizeResumeStyleSheet(css: string): string {
  return cssResourceLoadPatterns.reduce(
    (sanitized, pattern) => sanitized.replace(pattern, "none"),
    css,
  );
}

DOMPurify.addHook("uponSanitizeElement", (node) => {
  if (node.nodeName.toLowerCase() === "style") {
    node.textContent = sanitizeResumeStyleSheet(node.textContent ?? "");
  }
});

const resumeHtmlSanitizeOptions: Config = {
  ALLOWED_TAGS: [
    "html",
    "head",
    "meta",
    "title",
    "style",
    "body",
    "div",
    "span",
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "a",
  ],
  ADD_ATTR: (attributeName, tagName) =>
    attributeName === "name" && tagName === "meta",
  ALLOWED_ATTR: ["charset", "class", "content", "href", "lang"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/])/i,
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  CUSTOM_ELEMENT_HANDLING: {
    tagNameCheck: null,
    attributeNameCheck: null,
    allowCustomizedBuiltInElements: false,
  },
  FORBID_ATTR: ["id", "src", "srcset", "style", "target"],
  FORBID_TAGS: [
    "base",
    "button",
    "canvas",
    "embed",
    "form",
    "iframe",
    "input",
    "link",
    "math",
    "object",
    "script",
    "select",
    "svg",
    "textarea",
  ],
  KEEP_CONTENT: true,
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
  WHOLE_DOCUMENT: true,
};

export function sanitizeResumeHtmlDocument(html: string): string {
  return DOMPurify.sanitize(html, resumeHtmlSanitizeOptions);
}
