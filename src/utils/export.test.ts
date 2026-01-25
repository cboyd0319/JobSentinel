import { describe, it, expect } from "vitest";
import { jobsToCSV } from "./export";

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
});
