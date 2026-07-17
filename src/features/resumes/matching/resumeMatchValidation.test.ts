import { describe, expect, it } from "vitest";
import { parseAtsResumeInput } from "./resumeMatchValidation";

function canonicalInput(): Record<string, unknown> {
  return {
    resume: {
      personal: {
        name: "Jordan Lee",
        email: "jordan@example.com",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
      },
      summary: "Program operations lead",
      experience: [],
      education: [],
      skills: [],
      certifications: [{
        name: "Project Management",
        issuer: "Professional Institute",
        date_obtained: "2024-01",
        expiration_date: null,
        credential_id: null,
      }],
      projects: [{
        name: "Intake Redesign",
        description: "Simplified client intake",
        technologies: ["Excel"],
        url: null,
        start_date: null,
        end_date: null,
      }],
      clearance: null,
      military_info: null,
    },
    custom_sections: { volunteering: ["Food bank coordinator"] },
  };
}

describe("parseAtsResumeInput", () => {
  it("accepts the complete canonical analysis contract", () => {
    const input = canonicalInput();

    expect(parseAtsResumeInput(JSON.stringify(input))).toEqual(input);
  });

  it("rejects incomplete certification and project fields", () => {
    const invalidCertification = canonicalInput();
    const certificationResume = invalidCertification.resume as Record<string, unknown>;
    certificationResume.certifications = [{ name: "Incomplete", issuer: "Issuer" }];

    const invalidProject = canonicalInput();
    const projectResume = invalidProject.resume as Record<string, unknown>;
    projectResume.projects = [{
      name: "Incomplete",
      description: "Missing canonical fields",
    }];

    expect(parseAtsResumeInput(JSON.stringify(invalidCertification))).toBeNull();
    expect(parseAtsResumeInput(JSON.stringify(invalidProject))).toBeNull();
  });
});
