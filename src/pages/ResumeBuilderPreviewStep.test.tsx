import { render } from "@testing-library/react";
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
  it("sanitizes scriptable HTML and clobberable named properties", () => {
    const { container } = render(
      <ResumeBuilderPreviewStep
        templates={templates}
        selectedTemplate="Classic"
        previewHtml={
          '<a id="document" name="location" href="javascript:alert(1)" onclick="alert(2)">Portfolio</a><form id="constructor"></form><script>alert(3)</script>'
        }
        atsAnalysis={null}
        onSelectTemplate={vi.fn()}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
    expect(container.innerHTML).not.toContain("onclick");
    expect(container.innerHTML).not.toContain('id="document"');
    expect(container.innerHTML).not.toContain('name="location"');
    expect(container.innerHTML).not.toContain('id="constructor"');
    expect(container).toHaveTextContent("Portfolio");
  });
});
