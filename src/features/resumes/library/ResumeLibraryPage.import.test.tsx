import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeInvoke, safeInvokeWithToast } from "../../../utils/api";
import ResumeLibraryPage from "./ResumeLibraryPage";

const mockSafeInvoke = vi.mocked(safeInvoke);
const mockSafeInvokeWithToast = vi.mocked(safeInvokeWithToast);

vi.mock("../../../utils/api", () => ({
  safeInvoke: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

describe("Resume page structured import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

it("imports structured resumes through backend-owned file handling", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);
    mockSafeInvokeWithToast.mockResolvedValue(42);
    mockSafeInvoke.mockImplementation((command: string) => {
      switch (command) {
        case "get_active_resume":
          return Promise.resolve(null);
        case "list_all_resumes":
        case "get_user_skills":
        case "get_recent_matches":
          return Promise.resolve([]);
        default:
          return Promise.resolve(null);
      }
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No Resume Added")).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: "Import from resume app" })[0]);

    expect(mockSafeInvokeWithToast).toHaveBeenCalledWith(
      "select_and_import_json_resume",
      undefined,
      expect.anything(),
      { logContext: "Import structured resume data" },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
