import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadResumeDocx,
  downloadResumeJson,
  openResumePrintDialog,
} from "./resumeBuilderExportDom";

describe("openResumePrintDialog", () => {
  afterEach(() => {
    document.querySelectorAll("iframe").forEach((iframe) => iframe.remove());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sanitizes scriptable HTML before writing the print iframe", () => {
    vi.useFakeTimers();

    openResumePrintDialog(
      '<style>.name{color:#111}</style><h1 class="name">Portfolio</h1><a id="document" name="location" href="javascript:alert(1)" target="_blank" onclick="alert(2)">Link</a><form id="constructor"></form><script>alert(3)</script>',
    );

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute("sandbox", "allow-modals");
    expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
    const html = iframe?.getAttribute("srcdoc") ?? "";

    expect(html).toContain("<style>.name{color:#111}</style>");
    expect(html).toContain('class="name"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("target=");
    expect(html).not.toContain('id="document"');
    expect(html).not.toContain('name="location"');
    expect(html).not.toContain('id="constructor"');
    expect(html).toContain("Portfolio");
  });

  it("sanitizes DOCX download names from candidate names", () => {
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockReturnValue(
      mockLink as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "appendChild").mockReturnValue(
      mockLink as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "removeChild").mockReturnValue(
      mockLink as unknown as HTMLAnchorElement,
    );
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:resume");
    globalThis.URL.revokeObjectURL = vi.fn();

    downloadResumeDocx([1, 2, 3], "../Jane: Doe?");

    expect(mockLink.download).toBe("Jane-_Doe-_Resume.docx");
    expect(mockLink.click).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume");
  });

  it("downloads JSON Resume files with sanitized names", async () => {
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockReturnValue(
      mockLink as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "appendChild").mockReturnValue(
      mockLink as unknown as HTMLAnchorElement,
    );
    vi.spyOn(document.body, "removeChild").mockReturnValue(
      mockLink as unknown as HTMLAnchorElement,
    );
    const createdBlobs: Blob[] = [];
    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:resume-json";
    });
    globalThis.URL.revokeObjectURL = vi.fn();

    downloadResumeJson({ basics: { name: "Jane Doe" } }, "../Jane: Doe?");

    expect(mockLink.download).toBe("Jane-_Doe-_Resume.json");
    expect(mockLink.click).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume-json");
    expect(createdBlobs[0]?.type).toBe("application/json");
    await expect(createdBlobs[0]?.text()).resolves.toContain('"basics"');
  });
});
