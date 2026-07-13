import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadBlob,
  downloadTextFile,
  sanitizeDownloadFilename,
} from "./browserDownload";

describe("browser downloads", () => {
  let anchor: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
  };
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;
  let appendChild: ReturnType<typeof vi.fn>;
  let removeChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    anchor = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(
      anchor as unknown as HTMLAnchorElement,
    );
    appendChild = vi
      .spyOn(document.body, "appendChild")
      .mockReturnValue(anchor as unknown as HTMLAnchorElement);
    removeChild = vi
      .spyOn(document.body, "removeChild")
      .mockReturnValue(anchor as unknown as HTMLAnchorElement);
    createObjectUrl = vi.fn().mockReturnValue("blob:test-url");
    revokeObjectUrl = vi.fn();
    globalThis.URL.createObjectURL = createObjectUrl;
    globalThis.URL.revokeObjectURL = revokeObjectUrl;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reduces filenames to a safe basename", () => {
    expect(sanitizeDownloadFilename("../bad:name?.csv")).toBe("bad-name-.csv");
    expect(sanitizeDownloadFilename("C:\\Users\\person\\report.json")).toBe(
      "report.json",
    );
    expect(sanitizeDownloadFilename("...")).toBe("jobsentinel-download");
    expect(sanitizeDownloadFilename(" ", "fallback.txt")).toBe("fallback.txt");
  });

  it("downloads a blob with a sanitized filename and releases the URL", () => {
    const blob = new Blob(["content"], { type: "text/plain" });

    downloadBlob(blob, "../report?.txt");

    expect(createObjectUrl).toHaveBeenCalledWith(blob);
    expect(anchor.href).toBe("blob:test-url");
    expect(anchor.download).toBe("report-.txt");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test-url");
  });

  it("creates a text blob with the requested media type", () => {
    downloadTextFile("a,b", "jobs.csv", "text/csv");

    const blob = createObjectUrl.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv");
    expect(anchor.download).toBe("jobs.csv");
  });
});
