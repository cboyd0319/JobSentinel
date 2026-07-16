import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

function generatedBrowserButtonCode(): string {
  const source = readFileSync(
    resolve(process.cwd(), "src-tauri/src/ipc/bookmarklet.rs"),
    "utf8",
  );
  const match = source.match(
    /const TEMPLATE: &str = r#"(javascript:[\s\S]*?)"#;/,
  );

  if (!match?.[1]) {
    throw new Error("Browser button template was not found");
  }

  return match[1]
    .replaceAll("__PORT__", "4321")
    .replaceAll("__TOKEN__", JSON.stringify("test-token"));
}

describe("generated Browser Import button", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("captures visible LinkedIn job cards in one user-clicked import", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(
      window.HTMLElement.prototype,
      "getBoundingClientRect",
    ).mockReturnValue({
      bottom: 160,
      height: 80,
      left: 0,
      right: 600,
      top: 0,
      width: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName.toLowerCase() === "iframe") {
          Object.defineProperty(element, "contentWindow", {
            configurable: true,
            value: {
              fetch: fetchSpy,
              JSON,
              URL,
            },
          });
        }
        return element;
      },
    );

    document.body.innerHTML = `
      <main>
        <article>
          <a href="https://www.linkedin.com/jobs/view/100?currentJobId=100&referralSearchId=private">
            Principal Systems Security Engineer
          </a>
          <p>Sierra Nevada Corporation &middot; Centennial, CO &middot; 401(k) benefit</p>
          <p>You'd be a top applicant</p>
        </article>
        <article>
          <a href="https://www.linkedin.com/jobs/view/200?origin=private">
            Lead Platform Security Engineer
          </a>
          <p>HDR &middot; Denver, CO (On-site) &middot; 1 benefit</p>
          <p>Be an early applicant</p>
        </article>
      </main>
    `;

    const code = generatedBrowserButtonCode().replace(/^javascript:/, "");
    new Function("location", code)({
      hostname: "www.linkedin.com",
      href: "https://www.linkedin.com/jobs/",
      pathname: "/jobs",
    });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [, options] = fetchSpy.mock.calls[0] as [string, { body: string }];
    const payload = JSON.parse(options.body);

    expect(payload.token).toBe("test-token");
    expect(payload.jobs).toHaveLength(2);
    expect(payload.jobs[0]).toMatchObject({
      title: "Principal Systems Security Engineer",
      company: "Sierra Nevada Corporation",
      location: "Centennial, CO",
      url: "https://www.linkedin.com/jobs/view/100",
    });
    expect(payload.jobs[1]).toMatchObject({
      title: "Lead Platform Security Engineer",
      company: "HDR",
      location: "Denver, CO (On-site)",
      url: "https://www.linkedin.com/jobs/view/200",
    });
  });
});
