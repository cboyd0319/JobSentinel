import { afterEach, describe, expect, it, vi } from "vitest";
import { openResumePrintDialog } from "./resumeBuilderExportDom";

describe("openResumePrintDialog", () => {
  afterEach(() => {
    document.querySelectorAll("iframe").forEach((iframe) => iframe.remove());
    vi.useRealTimers();
  });

  it("sanitizes scriptable HTML before writing the print iframe", () => {
    vi.useFakeTimers();

    openResumePrintDialog(
      '<style>.name{color:#111}</style><h1 class="name">Portfolio</h1><a id="document" name="location" href="javascript:alert(1)" target="_blank" onclick="alert(2)">Link</a><form id="constructor"></form><script>alert(3)</script>',
    );

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    const html = iframe?.contentDocument?.body.innerHTML ?? "";

    expect(iframe?.contentDocument?.querySelector("style")).not.toBeNull();
    expect(iframe?.contentDocument?.querySelector("script")).toBeNull();
    expect(iframe?.contentDocument?.querySelector("form")).toBeNull();
    expect(html).toContain('class="name"');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("target=");
    expect(html).not.toContain('id="document"');
    expect(html).not.toContain('name="location"');
    expect(html).not.toContain('id="constructor"');
    expect(html).toContain("Portfolio");
  });
});
