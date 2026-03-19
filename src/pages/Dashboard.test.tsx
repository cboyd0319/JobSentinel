import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// safeInvoke calls invoke internally — mock at that boundary
const mockInvoke = vi.mocked(invoke);

// ---------------------------------------------------------------------------
// Pre-flight logic extracted verbatim from Dashboard.tsx (lines 260-294).
// Tested as a standalone function to avoid rendering the full Dashboard tree.
// ---------------------------------------------------------------------------

const SCRAPER_KEYS = [
  "linkedin",
  "remoteok",
  "weworkremotely",
  "builtin",
  "hn_hiring",
  "dice",
  "yc_startup",
  "usajobs",
  "simplyhired",
  "glassdoor",
  "greenhouse",
  "lever",
  "jobswithgpt",
] as const;

type ScraperConfig = Record<string, { enabled?: boolean }>;

function anyScraperEnabled(cfg: ScraperConfig | null): boolean {
  if (!cfg) return true; // null config → allow search (defensive)
  return SCRAPER_KEYS.some((k) => cfg[k] && cfg[k].enabled === true);
}

/**
 * Mirrors the Dashboard pre-flight check.
 * Returns "blocked" when no scrapers are enabled, "allowed" otherwise.
 * If the config call throws, search proceeds ("allowed").
 */
async function runPreflight(
  getConfig: () => Promise<ScraperConfig | null>,
  warn: () => void,
): Promise<"allowed" | "blocked"> {
  try {
    const cfg = await getConfig();
    if (!anyScraperEnabled(cfg)) {
      warn();
      return "blocked";
    }
  } catch {
    // Config check failed — proceed with search anyway
  }
  return "allowed";
}

// ---------------------------------------------------------------------------

describe("Dashboard handleSearchNow pre-flight check", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe("anyScraperEnabled", () => {
    it("returns false when no scrapers have enabled:true", () => {
      const cfg: ScraperConfig = {
        linkedin: { enabled: false },
        remoteok: { enabled: false },
        glassdoor: {},
      };
      expect(anyScraperEnabled(cfg)).toBe(false);
    });

    it("returns true when exactly one scraper is enabled", () => {
      const cfg: ScraperConfig = {
        linkedin: { enabled: false },
        remoteok: { enabled: true },
        glassdoor: { enabled: false },
      };
      expect(anyScraperEnabled(cfg)).toBe(true);
    });

    it("returns true when all scrapers are enabled", () => {
      const cfg: ScraperConfig = Object.fromEntries(
        SCRAPER_KEYS.map((k) => [k, { enabled: true }]),
      );
      expect(anyScraperEnabled(cfg)).toBe(true);
    });

    it("returns true when cfg is null (defensive fallback)", () => {
      expect(anyScraperEnabled(null)).toBe(true);
    });

    it("treats missing enabled field as disabled", () => {
      // Every key present but none have enabled:true
      const cfg: ScraperConfig = Object.fromEntries(
        SCRAPER_KEYS.map((k) => [k, {}]),
      );
      expect(anyScraperEnabled(cfg)).toBe(false);
    });

    it("ignores unknown config keys that don't match any scraper", () => {
      const cfg: ScraperConfig = {
        totally_unknown_board: { enabled: true },
        another_mystery: { enabled: true },
      };
      expect(anyScraperEnabled(cfg)).toBe(false);
    });

    it("returns true for the first matching enabled scraper without checking the rest", () => {
      // Only the first key in SCRAPER_KEYS is enabled
      const cfg: ScraperConfig = {
        linkedin: { enabled: true },
      };
      expect(anyScraperEnabled(cfg)).toBe(true);
    });
  });

  describe("runPreflight (integration with warning + return path)", () => {
    it("calls warn and returns 'blocked' when no scrapers are enabled", async () => {
      const cfg: ScraperConfig = Object.fromEntries(
        SCRAPER_KEYS.map((k) => [k, { enabled: false }]),
      );
      const getConfig = vi.fn().mockResolvedValue(cfg);
      const warn = vi.fn();

      const result = await runPreflight(getConfig, warn);

      expect(warn).toHaveBeenCalledOnce();
      expect(result).toBe("blocked");
    });

    it("does NOT call warn and returns 'allowed' when one scraper is enabled", async () => {
      const cfg: ScraperConfig = { linkedin: { enabled: true } };
      const getConfig = vi.fn().mockResolvedValue(cfg);
      const warn = vi.fn();

      const result = await runPreflight(getConfig, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("returns 'allowed' without warning when config is null", async () => {
      const getConfig = vi.fn().mockResolvedValue(null);
      const warn = vi.fn();

      const result = await runPreflight(getConfig, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("proceeds ('allowed') without warning when config call throws", async () => {
      const getConfig = vi.fn().mockRejectedValue(new Error("IPC failure"));
      const warn = vi.fn();

      const result = await runPreflight(getConfig, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("does NOT warn when config has all scrapers enabled", async () => {
      const cfg: ScraperConfig = Object.fromEntries(
        SCRAPER_KEYS.map((k) => [k, { enabled: true }]),
      );
      const getConfig = vi.fn().mockResolvedValue(cfg);
      const warn = vi.fn();

      const result = await runPreflight(getConfig, warn);

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });

    it("blocks when config exists but no known scraper keys are present", async () => {
      const cfg: ScraperConfig = {
        unknown_board: { enabled: true },
      };
      const getConfig = vi.fn().mockResolvedValue(cfg);
      const warn = vi.fn();

      const result = await runPreflight(getConfig, warn);

      expect(warn).toHaveBeenCalledOnce();
      expect(result).toBe("blocked");
    });

    it("warns exactly once even with many disabled scrapers", async () => {
      const cfg: ScraperConfig = Object.fromEntries(
        SCRAPER_KEYS.map((k) => [k, { enabled: false }]),
      );
      const getConfig = vi.fn().mockResolvedValue(cfg);
      const warn = vi.fn();

      await runPreflight(getConfig, warn);

      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe("safeInvoke integration (via mocked invoke)", () => {
    it("invoke is called with 'get_config' during pre-flight", async () => {
      mockInvoke.mockResolvedValueOnce({ linkedin: { enabled: true } });

      const { safeInvoke } = await import("../utils/api");
      const cfg = await safeInvoke<ScraperConfig>("get_config");

      expect(mockInvoke).toHaveBeenCalledWith("get_config", undefined);
      expect(anyScraperEnabled(cfg)).toBe(true);
    });

    it("pre-flight allows search when invoke throws (network/IPC error)", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Tauri backend unavailable"));

      const { safeInvoke } = await import("../utils/api");
      const warn = vi.fn();

      let result: "allowed" | "blocked" = "allowed";
      try {
        const cfg = await safeInvoke<ScraperConfig>("get_config");
        if (!anyScraperEnabled(cfg)) {
          warn();
          result = "blocked";
        }
      } catch {
        // mirrors Dashboard: config check failed → proceed
      }

      expect(warn).not.toHaveBeenCalled();
      expect(result).toBe("allowed");
    });
  });
});
