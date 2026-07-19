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

  it("blocks LinkedIn before reading or transporting page data", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, "createElement");
    const querySelectorAllSpy = vi.spyOn(document, "querySelectorAll");
    const fetchSpy = vi.spyOn(window, "fetch");
    const code = generatedBrowserButtonCode().replace(/^javascript:/, "");
    const run = new Function("location", code);

    for (const hostname of [
      "linkedin.com",
      "www.linkedin.com",
      "jobs.linkedin.com",
    ]) {
      run({
        hostname,
        href: `https://${hostname}/jobs/`,
        pathname: "/jobs",
      });
    }

    expect(alertSpy).toHaveBeenCalledTimes(3);
    expect(alertSpy).toHaveBeenLastCalledWith(
      "Browser Import is unavailable for this source",
    );
    expect(createElementSpy).not.toHaveBeenCalled();
    expect(querySelectorAllSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
