import { describe, expect, it } from "vitest";
import {
  MAJOR_ATS_PORTAL_REVIEW_CHECKS,
  RESUME_BULLET_FRAMEWORKS,
  RESUME_EXPORT_INTEGRITY_CHECKS,
  RESUME_REFERENCE_DECISIONS,
} from "./resumeWritingTaxonomy";

describe("resumeWritingTaxonomy", () => {
  it("keeps bullet frameworks evidence-first and non-magical", () => {
    const frameworkIds = RESUME_BULLET_FRAMEWORKS.map((framework) => framework.id);

    expect(frameworkIds).toEqual(
      expect.arrayContaining(["action_scope_method_outcome", "xyz", "car"]),
    );

    for (const framework of RESUME_BULLET_FRAMEWORKS) {
      expect(framework.label).toBeTruthy();
      expect(framework.whenToUse).toBeTruthy();
      expect(framework.promptQuestions.length).toBeGreaterThanOrEqual(3);
      expect(framework.reviewReminder).toMatch(/true|evidence|defend/i);
      expect(`${framework.label} ${framework.whenToUse} ${framework.reviewReminder}`).not.toMatch(
        /beat ats|guarantee|trick|hack/i,
      );
    }
  });

  it("turns resume-template research into local export checks", () => {
    const checkIds = RESUME_EXPORT_INTEGRITY_CHECKS.map((check) => check.id);

    expect(checkIds).toEqual(
      expect.arrayContaining([
        "selectable_text",
        "reading_order",
        "portable_data",
        "employer_file_request",
        "portal_field_review",
      ]),
    );

    for (const check of RESUME_EXPORT_INTEGRITY_CHECKS) {
      expect(check.label).toBeTruthy();
      expect(check.userAction).toBeTruthy();
      expect(check.userAction).not.toMatch(/install|terminal|command/i);
    }
  });

  it("keeps major ATS portal review guidance reusable and candidate-side", () => {
    expect(MAJOR_ATS_PORTAL_REVIEW_CHECKS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "greenhouse",
          label: "Greenhouse",
        }),
        expect.objectContaining({
          id: "workday",
          label: "Workday",
        }),
        expect.objectContaining({
          id: "taleo_oracle",
          label: "Taleo / Oracle Recruiting",
        }),
      ]),
    );

    for (const portal of MAJOR_ATS_PORTAL_REVIEW_CHECKS) {
      expect(portal.candidateAction).toMatch(
        /review|confirm|check|correct|application|profile|field/i,
      );
      expect(portal.candidateAction).not.toMatch(/submit automatically|bypass|trick/i);
      expect(portal.sourceSignal).toMatch(/resume|profile|application|job board|database/i);
    }
  });

  it("records why external resume tools are references instead of bundled templates", () => {
    expect(RESUME_REFERENCE_DECISIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "do_not_copy_templates" }),
        expect.objectContaining({ id: "public_profile_import_needs_consent" }),
        expect.objectContaining({ id: "ai_drafts_need_fact_check" }),
      ]),
    );

    for (const decision of RESUME_REFERENCE_DECISIONS) {
      expect(decision.guidance).toBeTruthy();
      expect(decision.privacyNote).toMatch(/local|consent|license|external/i);
    }
  });
});
