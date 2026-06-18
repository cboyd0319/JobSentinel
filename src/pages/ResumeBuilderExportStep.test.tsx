import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResumeBuilderExportStep } from "./ResumeBuilderExportStep";

describe("ResumeBuilderExportStep", () => {
  it("calls the JSON Resume export handler from the export controls", async () => {
    const user = userEvent.setup();
    const onExportJson = vi.fn();

    render(
      <ResumeBuilderExportStep
        exporting={false}
        onExportDocx={vi.fn()}
        onExportJson={onExportJson}
        onExportPdf={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /download json/i }));

    expect(onExportJson).toHaveBeenCalledOnce();
  });
});
