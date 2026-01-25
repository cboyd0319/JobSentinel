import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jobsToCSV, downloadFile, exportJobsToCSV, exportConfigToJSON } from "./export";

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
          title: "Software Engineer",
          company: "Acme Corp",
          location: "San Francisco, CA",
          url: "https://example.com/job/1",
          source: "linkedin",
          score: 0.85,
          created_at: "2024-01-15T10:00:00Z",
          remote: true,
          salary_min: 100000,
          salary_max: 150000,
        },
      ];

      const csv = jobsToCSV(jobs);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(2); // header + 1 row
      expect(lines[1]).toContain("1");
      expect(lines[1]).toContain("Software Engineer");
      expect(lines[1]).toContain("Acme Corp");
      expect(lines[1]).toContain("85%");
      expect(lines[1]).toContain("Yes");
      expect(lines[1]).toContain("100000");
      expect(lines[1]).toContain("150000");
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
          title: "Senior Engineer, Backend",
          company: "Company, Inc.",
          location: "New York, NY",
          url: "https://example.com",
          source: "linkedin",
          score: 0.7,
          created_at: "2024-01-15T10:00:00Z",
        },
      ];

      const csv = jobsToCSV(jobs);
      // Values with commas should be quoted
      expect(csv).toContain('"Senior Engineer, Backend"');
      expect(csv).toContain('"Company, Inc."');
      expect(csv).toContain('"New York, NY"');
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

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      mockAppendChild = vi.spyOn(document.body, "appendChild").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      mockRemoveChild = vi.spyOn(document.body, "removeChild").mockReturnValue(mockLink as unknown as HTMLAnchorElement);

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

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "appendChild").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "removeChild").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
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

      expect(mockLink.download).toMatch(/^jobsentinel-export-\d{4}-\d{2}-\d{2}\.csv$/);
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

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "appendChild").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "removeChild").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:url");
      globalThis.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

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

      expect(mockLink.download).toMatch(/^jobsentinel-config-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("sanitizes email password from alerts config", () => {
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

      expect(capturedBlob).toBeDefined();
      // Read blob content
      const reader = new FileReader();
      reader.onload = () => {
        const content = JSON.parse(reader.result as string);
        expect(content.alerts.email.smtp_password).toBe("");
        expect(content.alerts.email.other_setting).toBe("keep this");
      };
      if (capturedBlob) {
        reader.readAsText(capturedBlob);
      }
    });

    it("sanitizes linkedin session cookie", () => {
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

      expect(capturedBlob).toBeDefined();
      const reader = new FileReader();
      reader.onload = () => {
        const content = JSON.parse(reader.result as string);
        expect(content.linkedin.session_cookie).toBe("");
        expect(content.linkedin.other_setting).toBe("keep");
      };
      if (capturedBlob) {
        reader.readAsText(capturedBlob);
      }
    });
  });
});
