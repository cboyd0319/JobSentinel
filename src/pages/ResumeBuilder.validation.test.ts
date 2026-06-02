import { describe, expect, it } from "vitest";
import {
  canProceedResumeBuilderStep,
  getResumeBuilderStepValidationMessage,
} from "./resumeBuilderValidation";

const validContact = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  phone: null,
  linkedin: null,
  github: null,
  location: null,
  website: null,
};

const validInput = {
  contact: validContact,
  summary: "Experienced operations coordinator.",
  experiences: [
    {
      id: 1,
      title: "Operations Coordinator",
      company: "Example Co",
      location: null,
      start_date: "2024-01",
      end_date: null,
      achievements: ["Improved weekly reporting."],
    },
  ],
  educations: [
    {
      id: 1,
      degree: "Certificate",
      institution: "Community College",
      location: null,
      graduation_date: null,
      gpa: null,
      honors: [],
    },
  ],
  skills: [{ name: "Scheduling", category: "Operations", proficiency: null }],
};

describe("Resume Builder step validation copy", () => {
  it("uses action-first copy for missing details", () => {
    expect(
      getResumeBuilderStepValidationMessage(1, {
        ...validInput,
        contact: { ...validContact, name: "" },
      })
    ).toBe("Add your name.");

    expect(
      getResumeBuilderStepValidationMessage(2, {
        ...validInput,
        summary: "            ",
      })
    ).toBe("Write a summary of at least 10 characters.");

    expect(
      getResumeBuilderStepValidationMessage(3, {
        ...validInput,
        experiences: [],
      })
    ).toBe("Add one work experience before continuing.");

    expect(
      getResumeBuilderStepValidationMessage(4, {
        ...validInput,
        educations: [],
      })
    ).toBe("Add one education entry before continuing.");

    expect(
      getResumeBuilderStepValidationMessage(5, {
        ...validInput,
        skills: [],
      })
    ).toBe("Add one skill before continuing.");
  });

  it("allows complete steps to continue", () => {
    for (const step of [1, 2, 3, 4, 5]) {
      expect(canProceedResumeBuilderStep(step, validInput)).toBe(true);
      expect(getResumeBuilderStepValidationMessage(step, validInput)).toBe("");
    }
  });
});
