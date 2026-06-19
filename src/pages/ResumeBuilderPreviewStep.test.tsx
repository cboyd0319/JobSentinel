import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResumeBuilderPreviewStep } from "./ResumeBuilderPreviewStep";

const templates = [
  {
    id: "Classic" as const,
    name: "Classic",
    description: "Readable resume template",
    preview_image: "",
  },
];

describe("ResumeBuilderPreviewStep", () => {
  it("shows local export checks learned from resume-template references", () => {
    render(
      <ResumeBuilderPreviewStep
        templates={templates}
        selectedTemplate="Classic"
        previewHtml=""
        atsAnalysis={null}
        onSelectTemplate={vi.fn()}
      />,
    );

    expect(screen.getByText("Export checks")).toBeInTheDocument();
    expect(screen.getByText(/Selectable text/i)).toBeInTheDocument();
    expect(screen.getByText(/Reading order/i)).toBeInTheDocument();
    expect(screen.getByText(/Portable data/i)).toBeInTheDocument();
    expect(screen.getByText(/Employer file request/i)).toBeInTheDocument();
    expect(screen.getByText(/Portal field review/i)).toBeInTheDocument();
    expect(screen.queryByText(/beat ATS/i)).not.toBeInTheDocument();
  });

  it("renders sanitized resume HTML in a sandboxed iframe", () => {
    const { container } = render(
      <ResumeBuilderPreviewStep
        templates={templates}
        selectedTemplate="Classic"
        previewHtml={
          '<style>.name{color:#111}</style><h1 class="name">Portfolio</h1><a id="document" name="location" href="javascript:alert(1)" target="_blank" onclick="alert(2)">Link</a><form id="constructor"></form><script>alert(3)</script>'
        }
        atsAnalysis={null}
        onSelectTemplate={vi.fn()}
      />,
    );

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute("sandbox", "");

    const srcDoc = iframe?.getAttribute("srcdoc") ?? "";
    expect(srcDoc).toContain("<style>.name{color:#111}</style>");
    expect(srcDoc).toContain('class="name"');
    expect(srcDoc).not.toContain("<script");
    expect(srcDoc).not.toContain("<form");
    expect(srcDoc).not.toContain("javascript:");
    expect(srcDoc).not.toContain("onclick");
    expect(srcDoc).not.toContain("target=");
    expect(srcDoc).not.toContain('id="document"');
    expect(srcDoc).not.toContain('name="location"');
    expect(srcDoc).not.toContain('id="constructor"');
    expect(srcDoc).toContain("Portfolio");
  });
});
