import { describe, expect, it } from "vitest";
import {
  toAtsResumeData,
  toExportResumeData,
  toTemplateResumeData,
  type ResumeData,
} from "./resumeBuilderData";

function createResumeWithEvidenceSections(): ResumeData {
  return {
    id: 7,
    contact: {
      name: "Applicant Example",
      email: "applicant@example.test",
      phone: null,
      linkedin: null,
      github: null,
      location: null,
      website: null,
    },
    summary: "Operations coordinator focused on accessible services.",
    experience: [],
    education: [],
    skills: [],
    certifications: [
      {
        name: "Certified Community Health Worker",
        issuer: "State Health Board",
        date_obtained: "2024",
        expiration_date: null,
        credential_id: "CHW-123",
      },
    ],
    projects: [
      {
        name: "Clinic Intake Redesign",
        description: "Improved appointment intake for community clinic.",
        technologies: ["Scheduling", "Patient intake"],
        url: "https://example.test/project",
        start_date: null,
        end_date: null,
      },
    ],
    created_at: "2026-06-18T00:00:00Z",
    updated_at: "2026-06-18T00:00:00Z",
  };
}

describe("resume builder data conversion", () => {
  it("preserves certification and project evidence for preview, export, and ATS review", () => {
    const resume = createResumeWithEvidenceSections();

    expect(toTemplateResumeData(resume).certifications).toEqual([
      {
        name: "Certified Community Health Worker",
        issuer: "State Health Board",
        date: "2024",
        expiry: null,
      },
    ]);
    expect(toTemplateResumeData(resume).projects).toEqual([
      {
        name: "Clinic Intake Redesign",
        description: "Improved appointment intake for community clinic.",
        technologies: ["Scheduling", "Patient intake"],
        url: "https://example.test/project",
        start_date: null,
        end_date: null,
      },
    ]);

    expect(toExportResumeData(resume).certifications).toEqual([
      {
        name: "Certified Community Health Worker",
        issuer: "State Health Board",
        date: "2024",
        credential_id: "CHW-123",
      },
    ]);
    expect(toExportResumeData(resume).projects).toEqual([
      {
        name: "Clinic Intake Redesign",
        description: "Improved appointment intake for community clinic.",
        technologies: ["Scheduling", "Patient intake"],
        url: "https://example.test/project",
      },
    ]);

    expect(toAtsResumeData(resume).certifications).toEqual([
      "Certified Community Health Worker - State Health Board - 2024 - Credential ID: CHW-123",
    ]);
    expect(toAtsResumeData(resume).projects).toEqual([
      "Clinic Intake Redesign - Improved appointment intake for community clinic. - Technologies: Scheduling, Patient intake - https://example.test/project",
    ]);
  });
});
