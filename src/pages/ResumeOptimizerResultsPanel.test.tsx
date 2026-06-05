import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResumeOptimizerResultsPanel } from "./ResumeOptimizerResultsPanel";
import type { AtsAnalysisResult } from "./resumeOptimizerModel";

const baseAnalysis: AtsAnalysisResult = {
  overall_score: 82,
  keyword_score: 80,
  format_score: 84,
  completeness_score: 82,
  keyword_matches: [],
  missing_keywords: [],
  missing_keyword_details: [],
  requirement_reviews: [],
  hard_constraint_risks: [],
  format_issues: [],
  suggestions: [],
};

const jobAnalysis: AtsAnalysisResult = {
  ...baseAnalysis,
  keyword_matches: [
    {
      keyword: "onboarding",
      importance: "Required",
      found_in: ["experience"],
      frequency: 2,
    },
    {
      keyword: "retention",
      importance: "Preferred",
      found_in: ["summary"],
      frequency: 1,
    },
  ],
  missing_keywords: ["account management"],
  missing_keyword_details: [
    {
      keyword: "account management",
      importance: "Required",
    },
  ],
};

const groupedGapAnalysis: AtsAnalysisResult = {
  ...baseAnalysis,
  missing_keywords: ["case management", "salesforce", "CRM"],
  missing_keyword_details: [
    {
      keyword: "case management",
      importance: "Required",
    },
    {
      keyword: "salesforce",
      importance: "Preferred",
    },
    {
      keyword: "CRM",
      importance: "Industry",
    },
  ],
};

const requirementReviewAnalysis: AtsAnalysisResult = {
  ...baseAnalysis,
  overall_score: 60,
  keyword_matches: [
    {
      keyword: "scheduling",
      importance: "Required",
      found_in: ["skills"],
      frequency: 1,
    },
  ],
  missing_keywords: ["security clearance"],
  missing_keyword_details: [
    {
      keyword: "security clearance",
      importance: "Required",
    },
  ],
  requirement_reviews: [
    {
      keyword: "security clearance",
      importance: "Required",
      match_state: "Missing",
      evidence_sections: [],
      hard_constraint: true,
      recommendation:
        "Only add it if true. If this is required and not true, treat the role as higher risk.",
    },
    {
      keyword: "crm",
      importance: "Required",
      match_state: "Partial",
      evidence_sections: ["skills"],
      hard_constraint: false,
      recommendation:
        "Found in a lighter evidence area. Add supporting evidence only if true.",
    },
    {
      keyword: "scheduling",
      importance: "Required",
      match_state: "Direct",
      evidence_sections: ["current experience", "recent experience", "skills"],
      hard_constraint: false,
      recommendation:
        "Found visible evidence. Keep it clear and tied to real work or credentials.",
    },
  ],
  hard_constraint_risks: [
    {
      requirement: "security clearance",
      category: "SecurityClearance",
      score_cap: 60,
      reason: "A required hard constraint was not clearly found in the resume.",
      action:
        "If the clearance is not current or true for you, do not claim it. Check this before tailoring.",
    },
  ],
};

function renderPanel(
  analysisResult: AtsAnalysisResult | null,
  props: Partial<ComponentProps<typeof ResumeOptimizerResultsPanel>> = {},
) {
  return render(
    <ResumeOptimizerResultsPanel
      analyzing={false}
      analysisResult={analysisResult}
      canShowComparison={false}
      showComparison={false}
      jobDescription=""
      comparisonResumeText=""
      onToggleComparison={vi.fn()}
      {...props}
    />,
  );
}

describe("ResumeOptimizerResultsPanel", () => {
  it("renders loading and empty states without inputs", () => {
    const { rerender } = render(
      <ResumeOptimizerResultsPanel
        analyzing={true}
        analysisResult={null}
        canShowComparison={false}
        showComparison={false}
        jobDescription=""
        comparisonResumeText=""
        onToggleComparison={vi.fn()}
      />,
    );

    expect(screen.getByText("Reviewing resume...")).toBeInTheDocument();

    rerender(
      <ResumeOptimizerResultsPanel
        analyzing={false}
        analysisResult={null}
        canShowComparison={false}
        showComparison={false}
        jobDescription=""
        comparisonResumeText=""
        onToggleComparison={vi.fn()}
      />,
    );

    expect(screen.getByText("No review yet")).toBeInTheDocument();
    expect(screen.getByText(/choose or add a resume/i)).toBeInTheDocument();
  });

  it("renders plain job match results and copied-resume comparison", async () => {
    const user = userEvent.setup();
    const onToggleComparison = vi.fn();
    const onReviewInResumeBuilder = vi.fn();

    renderPanel(jobAnalysis, {
      canShowComparison: true,
      showComparison: true,
      jobDescription: "Need onboarding, retention, and account management experience",
      comparisonResumeText: "Improved onboarding and retention for accounts.",
      onToggleComparison,
      onReviewInResumeBuilder,
    });

    expect(screen.getByText("Resume Fit")).toBeInTheDocument();
    expect(screen.getByText("Job Words Overview")).toBeInTheDocument();
    expect(screen.getByText("Job words")).toBeInTheDocument();
    expect(screen.getByText("Resume Quality")).toBeInTheDocument();
    expect(screen.getByText("Overall fit")).toBeInTheDocument();
    expect(
      screen.getByText("Local evidence review, not a hiring prediction or a promise about employer systems."),
    ).toBeInTheDocument();
    expect(screen.getByText("Words Found (2)")).toBeInTheDocument();
    expect(screen.getByText("Words To Review (1)")).toBeInTheDocument();
    expect(
      screen.getByText("Only use these words when they honestly fit your experience and improve clarity."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Do not force words you cannot support with real work, training, or credentials."),
    ).toBeInTheDocument();
    expect(screen.getByText("Resume-Job Comparison")).toBeInTheDocument();
    expect(screen.getByText("Job Requirements")).toBeInTheDocument();
    expect(screen.getByText("Your Resume")).toBeInTheDocument();
    expect(screen.getByText(/improved/i)).toBeInTheDocument();
    expect(screen.queryByText("Overall Match")).not.toBeInTheDocument();
    expect(screen.queryByText(/Keyword Matches/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing Keywords/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /hide comparison/i }));
    await user.click(screen.getByRole("button", { name: /review in resume builder/i }));

    expect(onToggleComparison).toHaveBeenCalledTimes(1);
    expect(onReviewInResumeBuilder).toHaveBeenCalledTimes(1);
  });

  it("keeps comparison hidden for active saved resume reviews", () => {
    renderPanel(jobAnalysis, {
      canShowComparison: false,
      showComparison: true,
      comparisonResumeText: "private active resume text",
    });

    expect(screen.queryByRole("button", { name: /show comparison/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Resume-Job Comparison")).not.toBeInTheDocument();
    expect(screen.queryByText(/private active resume text/i)).not.toBeInTheDocument();
  });

  it("groups words to review by required, preferred, and other job-post language", () => {
    renderPanel(groupedGapAnalysis);

    expect(screen.getByText("Words To Review (3)")).toBeInTheDocument();
    expect(screen.getByText("Required to Review")).toBeInTheDocument();
    expect(screen.getByText("Preferred to Review")).toBeInTheDocument();
    expect(screen.getByText("Nice-to-Have or Other to Review")).toBeInTheDocument();
    expect(screen.getByText("case management")).toBeInTheDocument();
    expect(screen.getByText("salesforce")).toBeInTheDocument();
    expect(screen.getByText("CRM")).toBeInTheDocument();
    expect(screen.getByText(/start with required job-post language/i)).toBeInTheDocument();
  });

  it("renders requirement reviews, hard requirements, and plain evidence labels", () => {
    renderPanel(requirementReviewAnalysis);

    expect(screen.getByText("Evidence status")).toBeInTheDocument();
    expect(screen.getByText("Check must-haves first")).toBeInTheDocument();
    expect(screen.getByText(/required item needs verification before tailoring/i)).toBeInTheDocument();
    expect(screen.getByText("What To Do Next")).toBeInTheDocument();
    expect(screen.getByText(/check security clearance before tailoring/i)).toBeInTheDocument();
    expect(screen.getByText("Hard Requirements To Check (1)")).toBeInTheDocument();
    expect(screen.getByText("Security clearance")).toBeInTheDocument();
    expect(screen.getAllByText("Check first").length).toBeGreaterThan(0);
    expect(screen.getByText("Requirement Review (3)")).toBeInTheDocument();
    expect(screen.getByText("Visible evidence")).toBeInTheDocument();
    expect(screen.getAllByText("Needs support").length).toBeGreaterThan(0);
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByText("Hard requirement")).toBeInTheDocument();
    expect(
      screen.getByText("Found in: current role experience, recent role experience, skills list"),
    ).toBeInTheDocument();
    expect(screen.getByText("No clear resume evidence found")).toBeInTheDocument();
  });

  it("renders safe format issue and suggestion labels", () => {
    renderPanel({
      ...baseAnalysis,
      format_issues: [
        {
          severity: "Warning",
          issue: "Summary could be easier to read",
          fix: "Use one short paragraph.",
        },
      ],
      suggestions: [
        {
          category: "AddKeyword",
          suggestion: "Add account management if it honestly fits.",
          impact: "Helps align the resume with the job post.",
        },
        {
          category: "FormatFix",
          suggestion:
            "Review the resume for prompt-injection-like instructions, hidden text, or invisible characters before using it.",
          impact:
            "Keeps the resume readable and avoids tactics that can backfire with employers or screening systems.",
        },
        {
          category: "ReorderContent",
          suggestion: "Move recent patient coordination work above older roles.",
          impact: "Makes the most relevant evidence easier to find first.",
        },
      ],
    });

    expect(screen.getByText("Details to Check (1)")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Possible edit to review: Use one short paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Suggestions (3)")).toBeInTheDocument();
    expect(screen.getByText("Review job words")).toBeInTheDocument();
    expect(screen.getByText("Safety check")).toBeInTheDocument();
    expect(screen.getByText("Reorder content")).toBeInTheDocument();
    expect(screen.getByText(/why it helps: keeps the resume readable/i)).toBeInTheDocument();
    expect(screen.queryByText("FormatFix")).not.toBeInTheDocument();
    expect(screen.queryByText("AddKeyword")).not.toBeInTheDocument();
    expect(screen.queryByText("ReorderContent")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Warning$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/How to fix/i)).not.toBeInTheDocument();
  });

  it("shows unavailable score labels while keeping evidence visible", () => {
    renderPanel({
      ...jobAnalysis,
      overall_score: Number.NaN,
      keyword_score: Infinity,
      format_score: -5,
      completeness_score: 125,
    });

    expect(screen.getByText("Resume Fit")).toBeInTheDocument();
    expect(screen.getAllByText("Score not shown").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Words Found (2)")).toBeInTheDocument();
    expect(screen.getByText("Words To Review (1)")).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity|125/)).not.toBeInTheDocument();
  });
});
