import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeRoleFamilyCoverageCard } from "./ResumeRoleFamilyCoverageCard";

describe("ResumeRoleFamilyCoverageCard", () => {
  it("shows broad resume role support without implying unsupported edits", () => {
    render(<ResumeRoleFamilyCoverageCard />);

    expect(screen.getByText("Role Coverage")).toBeInTheDocument();
    expect(screen.getByText(/technical, content, operations/i)).toBeInTheDocument();
    expect(screen.getByText(/sales, and early career/i)).toBeInTheDocument();
    expect(
      screen.getByText(/JobSentinel uses these lanes to ask for proof before suggesting wording/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Healthcare")).toBeInTheDocument();
    expect(screen.getByText("Trades")).toBeInTheDocument();
    expect(screen.getByText("Early career")).toBeInTheDocument();
    expect(screen.queryByText(/guarantee/i)).not.toBeInTheDocument();
  });
});
