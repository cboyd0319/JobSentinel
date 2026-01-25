import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test the module fresh each time, so let's create a factory
const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    store,
  };
};

describe("errorReporting", () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
  let errorReporter: typeof import("./errorReporting").errorReporter;
  let withErrorCapture: typeof import("./errorReporting").withErrorCapture;

  beforeEach(async () => {
    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    // Clear module cache and re-import to get fresh instance
    vi.resetModules();
    const module = await import("./errorReporting");
    errorReporter = module.errorReporter;
    withErrorCapture = module.withErrorCapture;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("ErrorReporter", () => {
    describe("init", () => {
      it("initializes without errors", () => {
        expect(() => errorReporter.init()).not.toThrow();
      });

      it("only initializes once", () => {
        errorReporter.init();
        errorReporter.init();
        // Should not throw or cause issues
        expect(true).toBe(true);
      });

      it("loads errors from localStorage", () => {
        const storedErrors = [
          {
            id: "err_123",
            timestamp: "2024-01-01T00:00:00Z",
            message: "Test error",
            type: "custom",
            url: "http://localhost",
            userAgent: "test",
          },
        ];
        mockLocalStorage.store["jobsentinel_error_logs"] = JSON.stringify(storedErrors);

        vi.resetModules();
        import("./errorReporting").then((module) => {
          module.errorReporter.init();
          expect(module.errorReporter.getErrors()).toHaveLength(1);
        });
      });
    });

    describe("capture", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("captures an error with all fields", () => {
        const context = { userId: 123 };

        const report = errorReporter.captureCustom("Test error", context);

        expect(report.id).toMatch(/^err_/);
        expect(report.message).toBe("Test error");
        expect(report.type).toBe("custom");
        expect(report.context).toEqual(context);
        expect(report.timestamp).toBeDefined();
        expect(report.url).toBeDefined();
        expect(report.userAgent).toBeDefined();
      });

      it("adds errors to the beginning of the list", () => {
        errorReporter.captureCustom("First");
        errorReporter.captureCustom("Second");

        const errors = errorReporter.getErrors();
        expect(errors[0].message).toBe("Second");
        expect(errors[1].message).toBe("First");
      });

      it("limits stored errors to MAX_STORED_ERRORS", () => {
        // Capture more than the limit
        for (let i = 0; i < 110; i++) {
          errorReporter.captureCustom(`Error ${i}`);
        }

        expect(errorReporter.getCount()).toBeLessThanOrEqual(100);
      });

      it("saves to localStorage after capture", () => {
        errorReporter.captureCustom("Test");
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });

      it("notifies listeners after capture", () => {
        const listener = vi.fn();
        errorReporter.subscribe(listener);

        errorReporter.captureCustom("Test");

        expect(listener).toHaveBeenCalled();
      });
    });

    describe("captureReactError", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("captures with type render", () => {
        const error = new Error("React error");
        const componentStack = "at Component";

        const report = errorReporter.captureReactError(error, componentStack);

        expect(report.type).toBe("render");
        expect(report.componentStack).toBe(componentStack);
      });
    });

    describe("captureApiError", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("captures with type api", () => {
        const error = new Error("API error");
        const context = { endpoint: "/api/test" };

        const report = errorReporter.captureApiError(error, context);

        expect(report.type).toBe("api");
        expect(report.context).toEqual(context);
      });
    });

    describe("getErrors", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("returns a copy of errors array", () => {
        errorReporter.captureCustom("Test");
        const errors1 = errorReporter.getErrors();
        const errors2 = errorReporter.getErrors();

        expect(errors1).not.toBe(errors2);
        expect(errors1).toEqual(errors2);
      });
    });

    describe("getCount", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("returns correct count", () => {
        expect(errorReporter.getCount()).toBe(0);

        errorReporter.captureCustom("Test");
        expect(errorReporter.getCount()).toBe(1);

        errorReporter.captureCustom("Test 2");
        expect(errorReporter.getCount()).toBe(2);
      });
    });

    describe("getErrorsByType", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("filters errors by type", () => {
        errorReporter.captureCustom("Custom 1");
        errorReporter.captureApiError(new Error("API 1"));
        errorReporter.captureCustom("Custom 2");

        const customErrors = errorReporter.getErrorsByType("custom");
        const apiErrors = errorReporter.getErrorsByType("api");

        expect(customErrors).toHaveLength(2);
        expect(apiErrors).toHaveLength(1);
      });
    });

    describe("clear", () => {
      beforeEach(() => {
        errorReporter.init();
      });

      it("removes all errors", () => {
        errorReporter.captureCustom("Test 1");
        errorReporter.captureCustom("Test 2");
        expect(errorReporter.getCount()).toBe(2);

        errorReporter.clear();

        expect(errorReporter.getCount()).toBe(0);
      });

      it("saves empty array to localStorage", () => {
        errorReporter.captureCustom("Test");
        errorReporter.clear();

        expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(
          "jobsentinel_error_logs",
          "[]"
        );
      });

      it("notifies listeners", () => {
        const listener = vi.fn();
        errorReporter.subscribe(listener);

        errorReporter.clear();

        expect(listener).toHaveBeenCalled();
      });
    });

    describe("clearError", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("removes specific error by id", () => {
        const report1 = errorReporter.captureCustom("Test 1");
        errorReporter.captureCustom("Test 2");
        expect(errorReporter.getCount()).toBe(2);

        errorReporter.clearError(report1.id);

        expect(errorReporter.getCount()).toBe(1);
        expect(errorReporter.getErrors()[0].message).toBe("Test 2");
      });

      it("does nothing if id not found", () => {
        errorReporter.captureCustom("Test");
        expect(errorReporter.getCount()).toBe(1);

        errorReporter.clearError("nonexistent");

        expect(errorReporter.getCount()).toBe(1);
      });
    });

    describe("export", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("returns JSON string with metadata", () => {
        errorReporter.captureCustom("Test");

        const exported = errorReporter.export();
        const parsed = JSON.parse(exported);

        expect(parsed.exported_at).toBeDefined();
        expect(parsed.app_version).toBeDefined();
        expect(parsed.error_count).toBe(1);
        expect(parsed.errors).toHaveLength(1);
      });

      it("returns valid JSON for empty errors", () => {
        const exported = errorReporter.export();
        const parsed = JSON.parse(exported);

        expect(parsed.error_count).toBe(0);
        expect(parsed.errors).toHaveLength(0);
      });
    });

    describe("subscribe", () => {
      beforeEach(() => {
        errorReporter.init();
        errorReporter.clear();
      });

      it("calls listener on error capture", () => {
        const listener = vi.fn();
        errorReporter.subscribe(listener);

        errorReporter.captureCustom("Test");

        expect(listener).toHaveBeenCalledWith(expect.any(Array));
      });

      it("returns unsubscribe function", () => {
        const listener = vi.fn();
        const unsubscribe = errorReporter.subscribe(listener);

        errorReporter.captureCustom("Test 1");
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();

        errorReporter.captureCustom("Test 2");
        expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
      });

      it("supports multiple listeners", () => {
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        errorReporter.subscribe(listener1);
        errorReporter.subscribe(listener2);

        errorReporter.captureCustom("Test");

        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();
      });
    });
  });

  describe("withErrorCapture", () => {
    beforeEach(() => {
      errorReporter.init();
      errorReporter.clear();
    });

    it("returns result from successful function", async () => {
      const fn = async () => "success";
      const wrapped = withErrorCapture(fn);

      const result = await wrapped();

      expect(result).toBe("success");
    });

    it("captures and rethrows errors", async () => {
      const error = new Error("Test error");
      const fn = async () => {
        throw error;
      };
      const wrapped = withErrorCapture(fn);

      await expect(wrapped()).rejects.toThrow("Test error");
      expect(errorReporter.getCount()).toBe(1);
      expect(errorReporter.getErrors()[0].type).toBe("api");
    });

    it("includes context in captured error", async () => {
      const fn = async () => {
        throw new Error("Test");
      };
      const wrapped = withErrorCapture(fn, { operation: "test" });

      await expect(wrapped()).rejects.toThrow();
      expect(errorReporter.getErrors()[0].context).toMatchObject({
        operation: "test",
      });
    });

    it("passes arguments to wrapped function", async () => {
      const fn = vi.fn().mockResolvedValue("result");
      const wrapped = withErrorCapture(fn);

      await wrapped("arg1", "arg2");

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });
  });
});
