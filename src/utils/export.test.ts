import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  jobsToCSV,
  downloadFile,
  exportJobsToCSV,
  exportConfigToJSON,
  importConfigFromJSON,
} from "./export";

describe("export utilities", () => {
  describe("jobsToCSV", () => {
    it("generates CSV with headers", () => {
      const csv = jobsToCSV([]);
      expect(csv).toContain("ID,Title,Company");
      expect(csv).toContain("Location,URL,Source");
      expect(csv).toContain("Score,Remote,Salary Min,Salary Max,Created At");
    });

    it("exports single job correctly", () => {
      const jobs = [
        {
          id: 1,
          title: "Customer Support Coordinator",
          company: "Acme Corp",
          location: "Chicago, IL",
          url: "https://example.com/job/1",
          source: "linkedin",
          score: 0.85,
          created_at: "2024-01-15T10:00:00Z",
          remote: true,
          salary_min: 55000,
          salary_max: 72000,
        },
      ];

      const csv = jobsToCSV(jobs);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(2); // header + 1 row
      expect(lines[1]).toContain("1");
      expect(lines[1]).toContain("Customer Support Coordinator");
      expect(lines[1]).toContain("Acme Corp");
      expect(lines[1]).toContain("85%");
      expect(lines[1]).toContain("Yes");
      expect(lines[1]).toContain("55000");
      expect(lines[1]).toContain("72000");
    });

    it("exports multiple jobs", () => {
      const jobs = [
        {
          id: 1,
          title: "Job 1",
          company: "Company 1",
          location: "Location 1",
          url: "https://example.com/1",
          source: "source1",
          score: 0.9,
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          title: "Job 2",
          company: "Company 2",
          location: "Location 2",
          url: "https://example.com/2",
          source: "source2",
          score: 0.8,
          created_at: "2024-01-16T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(3); // header + 2 rows
    });

    it("handles null/undefined values", () => {
      const jobs = [
        {
          id: 1,
          title: "Engineer",
          company: "Company",
          location: null,
          url: "https://example.com",
          source: "linkedin",
          score: 0.5,
          created_at: "2024-01-15T10:00:00Z",
          remote: null,
          salary_min: null,
          salary_max: undefined,
        },
      ];

      const csv = jobsToCSV(jobs);
      expect(csv).toBeDefined();
      // Should not throw errors
    });

    it("escapes commas in values", () => {
      const jobs = [
        {
          id: 1,
          title: "Care Coordinator, Intake",
          company: "Community Care, Inc.",
          location: "Austin, TX",
          url: "https://example.com",
          source: "linkedin",
          score: 0.7,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      // Values with commas should be quoted
      expect(csv).toContain('"Care Coordinator, Intake"');
      expect(csv).toContain('"Community Care, Inc."');
      expect(csv).toContain('"Austin, TX"');
    });

    it("escapes quotes in values", () => {
      const jobs = [
        {
          id: 1,
          title: 'Engineer "Senior"',
          company: "Company",
          location: "Location",
          url: "https://example.com",
          source: "linkedin",
          score: 0.6,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      // Quotes should be escaped by doubling
      expect(csv).toContain('"Engineer ""Senior"""');
    });

    it("handles remote boolean values", () => {
      const remoteJob = {
        id: 1,
        title: "Remote Job",
        company: "Company",
        location: "Remote",
        url: "https://example.com",
        source: "linkedin",
        score: 0.9,
        created_at: "2024-01-15T10:00:00Z",
        remote: true,
      };

      const onsiteJob = {
        ...remoteJob,
        id: 2,
        title: "Onsite Job",
        remote: false,
      };

      const unknownJob = {
        ...remoteJob,
        id: 3,
        title: "Unknown Job",
        remote: null,
      };

      const csv = jobsToCSV([remoteJob, onsiteJob, unknownJob]);
      const lines = csv.split("\n");

      expect(lines[1]).toContain("Yes"); // remote: true
      expect(lines[2]).toContain("No"); // remote: false
      // remote: null should be empty
    });

    it("handles NaN score as N/A", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Company",
          location: "Location",
          url: "https://example.com",
          source: "linkedin",
          score: NaN,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      expect(csv).toContain("N/A");
      expect(csv).not.toContain("NaN%");
    });

    it("handles Infinity score as N/A", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Company",
          location: "Location",
          url: "https://example.com",
          source: "linkedin",
          score: Infinity,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      expect(csv).toContain("N/A");
      expect(csv).not.toContain("Infinity%");
    });

    it("handles negative Infinity score as N/A", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Company",
          location: "Location",
          url: "https://example.com",
          source: "linkedin",
          score: -Infinity,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      expect(csv).toContain("N/A");
    });

    it("handles null score as N/A", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Company",
          location: "Location",
          url: "https://example.com",
          source: "linkedin",
          score: null,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      expect(csv).toContain("N/A");
    });

    it("formats score as percentage", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Company",
          location: "Location",
          url: "https://example.com",
          source: "linkedin",
          score: 0.856,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      expect(csv).toContain("86%"); // Rounded
    });
  });

  describe("downloadFile", () => {
    let mockLink: {
      href: string;
      download: string;
      click: ReturnType<typeof vi.fn>;
    };
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockAppendChild: ReturnType<typeof vi.fn>;
    let mockRemoveChild: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(
        mockLink as unknown as HTMLAnchorElement,
      );
      mockAppendChild = vi
        .spyOn(document.body, "appendChild")
        .mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      mockRemoveChild = vi
        .spyOn(document.body, "removeChild")
        .mockReturnValue(mockLink as unknown as HTMLAnchorElement);

      mockCreateObjectURL = vi.fn().mockReturnValue("blob:test-url");
      mockRevokeObjectURL = vi.fn();
      globalThis.URL.createObjectURL = mockCreateObjectURL;
      globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("creates blob with content and mimeType", () => {
      downloadFile("test content", "test.txt", "text/plain");

      expect(mockCreateObjectURL).toHaveBeenCalled();
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
    });

    it("sets download filename on link", () => {
      downloadFile("test content", "my-file.csv");

      expect(mockLink.download).toBe("my-file.csv");
    });

    it("defaults to text/csv mimeType", () => {
      downloadFile("test content", "test.csv");

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it("triggers click on link", () => {
      downloadFile("test", "test.csv");

      expect(mockLink.click).toHaveBeenCalled();
    });

    it("cleans up after download", () => {
      downloadFile("test", "test.csv");

      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });
  });

  describe("exportJobsToCSV", () => {
    let mockLink: {
      href: string;
      download: string;
      click: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockLink = {
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
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:url");
      globalThis.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("exports jobs and triggers download", () => {
      const jobs = [
        {
          id: 1,
          title: "Test Job",
          company: "Test Co",
          location: "Remote",
          url: "https://example.com",
          source: "test",
          score: 0.9,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      exportJobsToCSV(jobs);

      expect(mockLink.click).toHaveBeenCalled();
    });

    it("uses provided filename", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Co",
          location: "Loc",
          url: "https://example.com",
          source: "test",
          score: 0.5,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      exportJobsToCSV(jobs, "custom-filename.csv");

      expect(mockLink.download).toBe("custom-filename.csv");
    });

    it("generates default filename with date", () => {
      const jobs = [
        {
          id: 1,
          title: "Job",
          company: "Co",
          location: "Loc",
          url: "https://example.com",
          source: "test",
          score: 0.5,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      exportJobsToCSV(jobs);

      expect(mockLink.download).toMatch(
        /^jobsentinel-export-\d{4}-\d{2}-\d{2}\.csv$/,
      );
    });
  });

  describe("exportConfigToJSON", () => {
    let mockLink: {
      href: string;
      download: string;
      click: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockLink = {
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
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:url");
      globalThis.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const captureExportedJson = async <T,>(blob: Blob | null): Promise<T> => {
      expect(blob).not.toBeNull();
      return JSON.parse(await (blob as Blob).text()) as T;
    };

    it("exports config as JSON", () => {
      const config = { setting: "value" };

      exportConfigToJSON(config);

      expect(mockLink.click).toHaveBeenCalled();
    });

    it("uses provided filename", () => {
      const config = { setting: "value" };

      exportConfigToJSON(config, "my-config.json");

      expect(mockLink.download).toBe("my-config.json");
    });

    it("generates default filename with date", () => {
      const config = { setting: "value" };

      exportConfigToJSON(config);

      expect(mockLink.download).toMatch(
        /^jobsentinel-config-\d{4}-\d{2}-\d{2}\.json$/,
      );
    });

    it("sanitizes email password from alerts config", async () => {
      let capturedBlob: Blob | null = null;
      globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:url";
      });

      const config = {
        alerts: {
          email: {
            smtp_password: "secret123",
            other_setting: "keep this",
          },
        },
      };

      exportConfigToJSON(config);

      const content = await captureExportedJson<{
        alerts: { email: { smtp_password: string; other_setting: string } };
      }>(capturedBlob);
      expect(content.alerts.email.smtp_password).toBe("");
      expect(content.alerts.email.other_setting).toBe("keep this");
    });

    it("sanitizes linkedin session cookie", async () => {
      let capturedBlob: Blob | null = null;
      globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:url";
      });

      const config = {
        linkedin: {
          session_cookie: "secret-cookie",
          other_setting: "keep",
        },
      };

      exportConfigToJSON(config);

      const content = await captureExportedJson<{
        linkedin: { session_cookie: string; other_setting: string };
      }>(capturedBlob);
      expect(content.linkedin.session_cookie).toBe("");
      expect(content.linkedin.other_setting).toBe("keep");
    });

    it("sanitizes all supported credential fields recursively", async () => {
      let capturedBlob: Blob | null = null;
      globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:url";
      });

      const config = {
        alerts: {
          slack: { webhook_url: "slack-secret", enabled: true },
          email: { smtp_password: "smtp-secret", smtp_server: "smtp.test" },
          discord: { webhook_url: "discord-secret" },
          telegram: { bot_token: "telegram-secret", chat_id: "123" },
          teams: { webhook_url: "teams-secret" },
        },
        linkedin: { session_cookie: "linkedin-secret", query: "engineer" },
        usajobs: { api_key: "usajobs-secret", email: "user@example.com" },
        credentials: {
          slack_webhook: "slack-field-secret",
          discord_webhook: "discord-field-secret",
          teams_webhook: "teams-field-secret",
          telegram_bot_token: "telegram-field-secret",
          usajobs_api_key: "usajobs-field-secret",
          linkedin_cookie: "linkedin-field-secret",
          smtp_password: "smtp-field-secret",
        },
        nested: [{ api_key: "array-secret", label: "keep" }],
      };

      exportConfigToJSON(config);

      const content = await captureExportedJson<typeof config>(capturedBlob);
      expect(content.alerts.slack.webhook_url).toBe("");
      expect(content.alerts.email.smtp_password).toBe("");
      expect(content.alerts.discord.webhook_url).toBe("");
      expect(content.alerts.telegram.bot_token).toBe("");
      expect(content.alerts.teams.webhook_url).toBe("");
      expect(content.linkedin.session_cookie).toBe("");
      expect(content.usajobs.api_key).toBe("");
      expect(content.credentials.slack_webhook).toBe("");
      expect(content.credentials.discord_webhook).toBe("");
      expect(content.credentials.teams_webhook).toBe("");
      expect(content.credentials.telegram_bot_token).toBe("");
      expect(content.credentials.usajobs_api_key).toBe("");
      expect(content.credentials.linkedin_cookie).toBe("");
      expect(content.credentials.smtp_password).toBe("");
      expect(content.nested[0]?.api_key).toBe("");
      expect(content.alerts.email.smtp_server).toBe("smtp.test");
      expect(content.usajobs.email).toBe("user@example.com");
      expect(content.nested[0]?.label).toBe("keep");
    });
  });

  describe("importConfigFromJSON", () => {
    let mockInput: {
      type: string;
      accept: string;
      onchange: ((e: Event) => void) | null;
      oncancel: (() => void) | null;
      click: ReturnType<typeof vi.fn>;
      files: FileList | null;
    };

    beforeEach(() => {
      mockInput = {
        type: "",
        accept: "",
        onchange: null,
        oncancel: null,
        click: vi.fn(),
        files: null,
      };

      vi.spyOn(document, "createElement").mockReturnValue(
        mockInput as unknown as HTMLInputElement,
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("creates file input with correct attributes", async () => {
      const promise = importConfigFromJSON();

      expect(mockInput.type).toBe("file");
      expect(mockInput.accept).toBe(".json,application/json");
      expect(mockInput.click).toHaveBeenCalled();

      // Cancel to resolve promise
      mockInput.oncancel?.();
      await promise;
    });

    it("returns null when cancelled", async () => {
      const promise = importConfigFromJSON();

      mockInput.oncancel?.();

      const result = await promise;
      expect(result).toBeNull();
    });

    it("returns null when no file selected", async () => {
      const promise = importConfigFromJSON();

      // Simulate change event with no files
      mockInput.files = null;
      mockInput.onchange?.({ target: mockInput } as unknown as Event);

      const result = await promise;
      expect(result).toBeNull();
    });

    it("returns null when files array is empty", async () => {
      const promise = importConfigFromJSON();

      // Simulate change event with empty files
      mockInput.files = { length: 0, item: () => null } as unknown as FileList;
      mockInput.onchange?.({ target: mockInput } as unknown as Event);

      const result = await promise;
      expect(result).toBeNull();
    });

    it("parses and returns valid JSON file", async () => {
      const testConfig = { setting: "value", nested: { key: 123 } };

      // Create a mock file with a mocked text() method
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(testConfig)),
      };

      const promise = importConfigFromJSON<typeof testConfig>();

      mockInput.files = {
        length: 1,
        0: mockFile,
        item: (index: number) => (index === 0 ? mockFile : null),
      } as unknown as FileList;

      // Trigger the onchange handler
      mockInput.onchange?.({ target: mockInput } as unknown as Event);

      const result = await promise;
      expect(result).toEqual(testConfig);
    });

    it("returns null for invalid JSON", async () => {
      // Create a mock file with invalid JSON content
      const mockFile = {
        text: vi.fn().mockResolvedValue("not valid json {{{"),
      };

      const promise = importConfigFromJSON();

      mockInput.files = {
        length: 1,
        0: mockFile,
        item: (index: number) => (index === 0 ? mockFile : null),
      } as unknown as FileList;
      mockInput.onchange?.({ target: mockInput } as unknown as Event);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
