import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cachedInvoke, invalidateCacheByCommand } from "./commandClient";
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("Tauri command client", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("cachedInvoke", () => {
    it("caches response for subsequent calls", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "cached" });

      const result1 = await cachedInvoke("cached_command", { id: 1 });
      const result2 = await cachedInvoke("cached_command", { id: 1 });

      // Should only call invoke once
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ data: "cached" });
      expect(result2).toEqual({ data: "cached" });
    });

    it("deduplicates concurrent calls with the same arguments", async () => {
      let resolveRequest: (value: unknown) => void;
      const request = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      mockInvoke.mockReturnValueOnce(request as Promise<unknown>);

      const first = cachedInvoke("concurrent_command", { id: 1 });
      const second = cachedInvoke("concurrent_command", { id: 1 });

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      resolveRequest!({ result: "done" });
      await expect(Promise.all([first, second])).resolves.toEqual([
        { result: "done" },
        { result: "done" },
      ]);
    });

    it("respects TTL and refetches after expiry", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValueOnce({ version: 1 });
      mockInvoke.mockResolvedValueOnce({ version: 2 });

      const result1 = await cachedInvoke("ttl_command", { id: 1 }, 1000);

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      const result2 = await cachedInvoke("ttl_command", { id: 1 }, 1000);

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ version: 1 });
      expect(result2).toEqual({ version: 2 });

    });

    it("uses different cache entries for different args", async () => {
      mockInvoke.mockResolvedValueOnce({ id: 1 });
      mockInvoke.mockResolvedValueOnce({ id: 2 });

      const result1 = await cachedInvoke("different_args_command", { id: 1 });
      const result2 = await cachedInvoke("different_args_command", { id: 2 });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ id: 1 });
      expect(result2).toEqual({ id: 2 });
    });

    it("returns cached value within TTL", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValueOnce({ data: "original" });

      await cachedInvoke("within_ttl_command", undefined, 5000);

      // Advance time but stay within TTL
      vi.advanceTimersByTime(3000);

      const result = await cachedInvoke("within_ttl_command", undefined, 5000);

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: "original" });

    });
  });

  describe("invalidateCacheByCommand", () => {
    it("invalidates every cached argument set for a command", async () => {
      mockInvoke
        .mockResolvedValueOnce({ version: 1 })
        .mockResolvedValueOnce({ version: 2 });

      await cachedInvoke("invalidate_command", { id: 1 });
      invalidateCacheByCommand("invalidate_command");
      const result = await cachedInvoke("invalidate_command", { id: 1 });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ version: 2 });
    });
  });

  describe("safeInvoke", () => {
    beforeEach(async () => {
      // Reset modules to clear any cached imports
      vi.resetModules();
    });

    it("successfully returns data from invoke", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "success" });

      const result = await import("./commandClient").then((m) =>
        m.safeInvoke<{ data: string }>("test_command", { id: 1 })
      );

      expect(result).toEqual({ data: "success" });
      expect(mockInvoke).toHaveBeenCalledWith("test_command", { id: 1 });
    });

    it("throws enhanced error with user-friendly message", async () => {
      const error = new Error("Network error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./commandClient");

      await expect(
        safeInvoke("failing_command", { id: 1 })
      ).rejects.toHaveProperty("userFriendly");
    });

    it("includes invoke context without raw argument values", async () => {
      const error = new Error("Test error token=raw-secret private@example.test");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./commandClient");

      try {
        await safeInvoke("test_cmd", {
          filePath: "resume=private-file",
          token: "raw-secret",
          salaryFloor: 90000,
        });
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        const enhancedError = e as {
          invokeCommand?: string;
          invokeArgs?: unknown;
          invokeArgSummary?: { count: number; valueTypes: string[] };
          message?: string;
        };
        expect(enhancedError.invokeCommand).toBe("test_cmd");
        expect(enhancedError.invokeArgs).toBeUndefined();
        expect(enhancedError.invokeArgSummary).toEqual({
          count: 3,
          valueTypes: ["string", "string", "number"],
        });
        const serialized = JSON.stringify(enhancedError);
        expect(serialized).not.toContain("resume=private-file");
        expect(serialized).not.toContain("raw-secret");
        expect(serialized).not.toContain("90000");
        expect(enhancedError.message).not.toContain("raw-secret");
        expect(enhancedError.message).not.toContain("private@example.test");
      }
    });

    it("accepts custom log context", async () => {
      const error = new Error("Context error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./commandClient");

      try {
        await safeInvoke("cmd", undefined, { logContext: "Custom Context" });
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        // Error should be logged with custom context (verify it was enhanced)
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("supports silent mode without logging", async () => {
      const error = new Error("Silent error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./commandClient");

      try {
        await safeInvoke("cmd", undefined, { silent: true });
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        // Should still throw but not log
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("handles string errors", async () => {
      mockInvoke.mockRejectedValueOnce("String error message");

      const { safeInvoke } = await import("./commandClient");

      try {
        await safeInvoke("cmd");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("handles unknown error types", async () => {
      mockInvoke.mockRejectedValueOnce({ code: 500, status: "error" });

      const { safeInvoke } = await import("./commandClient");

      try {
        await safeInvoke("cmd");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("works without arguments", async () => {
      mockInvoke.mockResolvedValueOnce({ status: "ok" });

      const { safeInvoke } = await import("./commandClient");
      const result = await safeInvoke("no_args_cmd");

      expect(result).toEqual({ status: "ok" });
      expect(mockInvoke).toHaveBeenCalledWith("no_args_cmd", undefined);
    });
  });

  describe("safeInvokeWithToast", () => {
    const mockToast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    beforeEach(async () => {
      mockToast.error.mockClear();
      mockToast.success.mockClear();
      vi.resetModules();
    });

    it("returns data on success", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "success" });

      const { safeInvokeWithToast } = await import("./commandClient");
      const result = await safeInvokeWithToast<{ data: string }>(
        "cmd",
        { id: 1 },
        mockToast
      );

      expect(result).toEqual({ data: "success" });
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it("shows error toast on failure", async () => {
      const error = new Error("Operation failed");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", { id: 1 }, mockToast);
        expect.fail("Should have thrown");
      } catch {
        expect(mockToast.error).toHaveBeenCalled();
      }
    });

    it("uses custom error title", async () => {
      const error = new Error("Failed");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast, {
          errorTitle: "Custom Error Title",
        });
        expect.fail("Should have thrown");
      } catch {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Custom Error Title",
          expect.any(String)
        );
      }
    });

    it("shows user-friendly error message", async () => {
      const error = new Error("Network timeout");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast);
        expect.fail("Should have thrown");
      } catch {
        const [[title, message]] = mockToast.error.mock.calls;
        expect(title).toBeTruthy();
        expect(message).toBeTruthy();
      }
    });

    it("respects silent mode", async () => {
      const error = new Error("Silent error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast, {
          silent: true,
        });
        expect.fail("Should have thrown");
      } catch {
        // Toast should still be shown even in silent mode
        // (silent only affects logging, not toast)
        expect(mockToast.error).toHaveBeenCalled();
      }
    });

    it("includes action in toast message if available", async () => {
      const error = new Error("Network error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast);
        expect.fail("Should have thrown");
      } catch {
        expect(mockToast.error).toHaveBeenCalled();
        const [[, message]] = mockToast.error.mock.calls;
        expect(typeof message).toBe("string");
      }
    });

    it("sanitizes optional app problem details before showing them in dev toast", async () => {
      const error = new Error(
        [
          "Upload failed",
          "token=raw-secret",
          "private@example.test",
          "https://hooks.slack.com/services/T000/B000/secret",
          "resume=private-file",
        ].join(" ")
      );
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast, {
          showTechnical: true,
        });
        expect.fail("Should have thrown");
      } catch {
        const [[, message]] = mockToast.error.mock.calls;
        expect(message).toContain("App problem details:");
        expect(message).not.toContain("Support details:");
        expect(message).not.toContain("Technical:");
        expect(message).not.toContain("resume=private-file");
        expect(message).not.toContain("raw-secret");
        expect(message).not.toContain("private@example.test");
        expect(message).not.toContain("hooks.slack.com/services/T000/B000/secret");
        expect(message).toContain("resume=[REDACTED]");
        expect(message).toContain("[TOKEN]");
        expect(message).toContain("[EMAIL]");
        expect(message).toContain("[WEBHOOK_CONFIGURED]");
      }
    });

    it("works with undefined args", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: true });

      const { safeInvokeWithToast } = await import("./commandClient");
      const result = await safeInvokeWithToast("cmd", undefined, mockToast);

      expect(result).toEqual({ ok: true });
    });

    it("falls back to generic error title when none provided", async () => {
      const error = new Error("Generic error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./commandClient");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast);
        expect.fail("Should have thrown");
      } catch {
        const [[title]] = mockToast.error.mock.calls;
        expect(title).toBeTruthy();
        expect(typeof title).toBe("string");
      }
    });
  });
});
