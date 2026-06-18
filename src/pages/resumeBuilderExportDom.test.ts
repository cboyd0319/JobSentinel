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
      '<a id="document" name="location" href="javascript:alert(1)" onclick="alert(2)">Portfolio</a><form id="constructor"></form><script>alert(3)</script>',
    );

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    const html = iframe?.contentDocument?.body.innerHTML ?? "";

    expect(iframe?.contentDocument?.querySelector("script")).toBeNull();
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain('id="document"');
    expect(html).not.toContain('name="location"');
    expect(html).not.toContain('id="constructor"');
    expect(html).toContain("Portfolio");
  });
});
