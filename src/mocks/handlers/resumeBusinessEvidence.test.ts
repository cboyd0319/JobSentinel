import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume business evidence handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("treats A/P and A/R as accounts payable and receivable mock evidence", async () => {
    const payableResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Processed A/P batches and reconciled vendor statements."],
          },
        ],
      },
      jobDescription: "Required: accounts payable",
    });
    expect(payableResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "accounts payable",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const receivableResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Handled accounts receivable aging for client payments."],
          },
        ],
      },
      jobDescription: "Required: A/R",
    });
    expect(receivableResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "accounts receivable",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats bookkeeping and bookkeeper as equivalent mock evidence", async () => {
    const bookkeepingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Worked as bookkeeper for monthly close and vendor files."],
          },
        ],
      },
      jobDescription: "Required: bookkeeping",
    });
    expect(bookkeepingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bookkeeping",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const bookkeeperResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Handled bookkeeping for monthly close and vendor files."],
          },
        ],
      },
      jobDescription: "Required: bookkeeper",
    });
    expect(bookkeeperResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bookkeeping",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats QuickBooks and QBO as equivalent mock evidence", async () => {
    const quickbooksResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used QBO for invoice entry and vendor files."],
          },
        ],
      },
      jobDescription: "Required: QuickBooks",
    });
    expect(quickbooksResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "quickbooks",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const qboResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used QuickBooks for invoice entry and vendor files."],
          },
        ],
      },
      jobDescription: "Required: QBO",
    });
    expect(qboResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "quickbooks",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats point of sale and POS system as equivalent mock evidence", async () => {
    const pointOfSaleResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used POS systems for returns and daily drawer close."],
          },
        ],
      },
      jobDescription: "Required: point of sale",
    });
    expect(pointOfSaleResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "point of sale",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const posSystemResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used point of sale tools for returns and daily drawer close."],
          },
        ],
      },
      jobDescription: "Required: POS system",
    });
    expect(posSystemResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "point of sale",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats cashier and cash handling as equivalent mock evidence", async () => {
    const cashierResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Handled cash handling for front counter orders."],
          },
        ],
      },
      jobDescription: "Required: cashier",
    });
    expect(cashierResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cashier",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const cashHandlingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Worked as cashier for front counter orders."],
          },
        ],
      },
      jobDescription: "Required: cash handling",
    });
    expect(cashHandlingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cash handling",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats logistics and shipping or receiving as equivalent mock evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Handled shipping and receiving for clinic supply orders."],
          },
        ],
      },
      jobDescription: "Required: logistics",
    });
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "logistics",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats inventory and stockroom wording as equivalent mock evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Tracked stockroom counts and stock management for supply orders."],
          },
        ],
      },
      jobDescription: "Required: inventory",
    });
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "inventory",
          match_state: "Strong",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats procurement and purchasing as equivalent mock evidence", async () => {
    const procurementResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported purchasing for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: procurement",
    });
    expect(procurementResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "procurement",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const purchasingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported procurement for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: purchasing",
    });
    expect(purchasingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "purchasing",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats vendor and supplier management as equivalent mock evidence", async () => {
    const vendorResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported supplier management for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: vendor management",
    });
    expect(vendorResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vendor management",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const supplierResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported vendor management for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: supplier management",
    });
    expect(supplierResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "supplier management",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats budgeting and budget tracking as equivalent mock evidence", async () => {
    const budgetingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported budget tracking for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: budgeting",
    });
    expect(budgetingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "budgeting",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const trackingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported budgeting for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: budget tracking",
    });
    expect(trackingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "budget tracking",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats hyphenated document-review terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported document-review checks for client files."],
          },
        ],
      },
      jobDescription: "Required: document review",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "document review",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "document-review",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported document review checks for client files."],
          },
        ],
      },
      jobDescription: "Required: document-review",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "document-review",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "document review",
        }),
      ]),
    );
  });

  it("treats hyphenated records-management terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported records-management checks for client files."],
          },
        ],
      },
      jobDescription: "Required: records management",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "records management",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "records-management",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported records management checks for client files."],
          },
        ],
      },
      jobDescription: "Required: records-management",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "records-management",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "records management",
        }),
      ]),
    );
  });

  it("treats hyphenated case-files terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported case-files checks for client intake."],
          },
        ],
      },
      jobDescription: "Required: case files",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "case files",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "case-files",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported case files checks for client intake."],
          },
        ],
      },
      jobDescription: "Required: case-files",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "case-files",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "case files",
        }),
      ]),
    );
  });

  it("treats hyphenated legal-research terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported legal-research checks for client files."],
          },
        ],
      },
      jobDescription: "Required: legal research",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "legal research",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "legal-research",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported legal research checks for client files."],
          },
        ],
      },
      jobDescription: "Required: legal-research",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "legal-research",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "legal research",
        }),
      ]),
    );
  });

  it("treats hyphenated policy-analysis terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported policy-analysis checks for client programs."],
          },
        ],
      },
      jobDescription: "Required: policy analysis",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "policy analysis",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "policy-analysis",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported policy analysis checks for client programs."],
          },
        ],
      },
      jobDescription: "Required: policy-analysis",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "policy-analysis",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "policy analysis",
        }),
      ]),
    );
  });

  it("treats hyphenated grant-administration terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported grant-administration checks for client programs."],
          },
        ],
      },
      jobDescription: "Required: grant administration",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "grant administration",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "grant-administration",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported grant administration checks for client programs."],
          },
        ],
      },
      jobDescription: "Required: grant-administration",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "grant-administration",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "grant administration",
        }),
      ]),
    );
  });

  it("treats hyphenated financial-reconciliation terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: [
              "Supported financial-reconciliation checks for client accounts.",
            ],
          },
        ],
      },
      jobDescription: "Required: financial reconciliation",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "financial reconciliation",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "financial-reconciliation",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: [
              "Supported financial reconciliation checks for client accounts.",
            ],
          },
        ],
      },
      jobDescription: "Required: financial-reconciliation",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "financial-reconciliation",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "financial reconciliation",
        }),
      ]),
    );
  });

  it("treats hyphenated loan-processing terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported loan-processing checks for client accounts."],
          },
        ],
      },
      jobDescription: "Required: loan processing",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "loan processing",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "loan-processing",
        }),
      ]),
    );

    const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported loan processing checks for client accounts."],
          },
        ],
      },
      jobDescription: "Required: loan-processing",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "loan-processing",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "loan processing",
        }),
      ]),
    );
  });
});
