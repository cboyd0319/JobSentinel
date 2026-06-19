import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoverLetterReviewChecklist } from "./CoverLetterReviewChecklist";

describe("CoverLetterReviewChecklist", () => {
  it("keeps cover letter review guidance visible before copying or sending", () => {
    render(<CoverLetterReviewChecklist />);

    expect(screen.getByText("Cover Letter Review")).toBeInTheDocument();
    expect(screen.getByText("Replace blanks")).toBeInTheDocument();
    expect(screen.getByText(/Fill in every bracketed blank before sending/i)).toBeInTheDocument();
    expect(screen.getByText("Verify claims")).toBeInTheDocument();
    expect(screen.getByText(/Keep only skills, years, metrics, and examples you can defend/i)).toBeInTheDocument();
    expect(screen.getByText("Match the job")).toBeInTheDocument();
    expect(screen.getByText(/Check company, role, location, and hiring-manager wording/i)).toBeInTheDocument();
    expect(screen.queryByText(/guarantee/i)).not.toBeInTheDocument();
  });
});
