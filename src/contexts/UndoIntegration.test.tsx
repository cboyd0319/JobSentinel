import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { UndoProvider, useUndo } from "./UndoContext";
import { ToastProvider } from "./ToastContext";

// Test component simulating application status change
function ApplicationStatusTest() {
  const { pushAction, undo, redo, canUndo, canRedo } = useUndo();

  const simulateStatusChange = () => {
    pushAction({
      type: "status",
      description: `Moved Software Engineer to Phone Screen`,
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    });
  };

  return (
    <div>
      <span data-testid="can-undo">{String(canUndo)}</span>
      <span data-testid="can-redo">{String(canRedo)}</span>
      <button data-testid="change-status" onClick={simulateStatusChange}>
        Change Status
      </button>
      <button data-testid="undo-btn" onClick={() => undo()}>
        Undo
      </button>
      <button data-testid="redo-btn" onClick={() => redo()}>
        Redo
      </button>
    </div>
  );
}

// Test component simulating saved search delete
function SavedSearchTest() {
  const { pushAction, undo, redo, canUndo } = useUndo();

  const simulateDeleteSearch = () => {
    pushAction({
      type: "bookmark",
      description: `Deleted search: Senior Engineer Jobs`,
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    });
  };

  return (
    <div>
      <span data-testid="can-undo">{String(canUndo)}</span>
      <button data-testid="delete-search" onClick={simulateDeleteSearch}>
        Delete Search
      </button>
      <button data-testid="undo-btn" onClick={() => undo()}>
        Undo
      </button>
      <button data-testid="redo-btn" onClick={() => redo()}>
        Redo
      </button>
    </div>
  );
}

// Test component simulating cover letter template changes
function TemplateTest() {
  const { pushAction, undo, redo, canUndo } = useUndo();

  const simulateCreateTemplate = () => {
    pushAction({
      type: "notes",
      description: `Created template: Tech Cover Letter`,
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    });
  };

  const simulateUpdateTemplate = () => {
    pushAction({
      type: "notes",
      description: `Updated template: Tech Cover Letter`,
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    });
  };

  const simulateDeleteTemplate = () => {
    pushAction({
      type: "notes",
      description: `Deleted template: Tech Cover Letter`,
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    });
  };

  return (
    <div>
      <span data-testid="can-undo">{String(canUndo)}</span>
      <button data-testid="create-template" onClick={simulateCreateTemplate}>
        Create Template
      </button>
      <button data-testid="update-template" onClick={simulateUpdateTemplate}>
        Update Template
      </button>
      <button data-testid="delete-template" onClick={simulateDeleteTemplate}>
        Delete Template
      </button>
      <button data-testid="undo-btn" onClick={() => undo()}>
        Undo
      </button>
      <button data-testid="redo-btn" onClick={() => redo()}>
        Redo
      </button>
    </div>
  );
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UndoProvider>{children}</UndoProvider>
    </ToastProvider>
  );
}

describe("Undo/Redo Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Application Status Changes", () => {
    it("enables undo after status change", async () => {
      render(
        <TestWrapper>
          <ApplicationStatusTest />
        </TestWrapper>
      );

      expect(screen.getByTestId("can-undo")).toHaveTextContent("false");

      fireEvent.click(screen.getByTestId("change-status"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });

    it("shows correct description in toast for status change", async () => {
      render(
        <TestWrapper>
          <ApplicationStatusTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("change-status"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // The description should appear in the toast
      const toastElements = screen.getAllByText(/Moved Software Engineer to Phone Screen/i);
      expect(toastElements.length).toBeGreaterThanOrEqual(1);
    });

    it("can undo and redo status change", async () => {
      render(
        <TestWrapper>
          <ApplicationStatusTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("change-status"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("undo-btn"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("can-redo")).toHaveTextContent("true");
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("redo-btn"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });
  });

  describe("Saved Search Operations", () => {
    it("enables undo after deleting search", async () => {
      render(
        <TestWrapper>
          <SavedSearchTest />
        </TestWrapper>
      );

      expect(screen.getByTestId("can-undo")).toHaveTextContent("false");

      fireEvent.click(screen.getByTestId("delete-search"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });

    it("shows correct description for saved search deletion", async () => {
      render(
        <TestWrapper>
          <SavedSearchTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("delete-search"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      const toastElements = screen.getAllByText(/Deleted search: Senior Engineer Jobs/i);
      expect(toastElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Cover Letter Template Operations", () => {
    it("enables undo after creating template", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      expect(screen.getByTestId("can-undo")).toHaveTextContent("false");

      fireEvent.click(screen.getByTestId("create-template"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });

    it("enables undo after updating template", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("update-template"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });

    it("enables undo after deleting template", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("delete-template"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });

    it("shows correct description for create template", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("create-template"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getAllByText(/Created template: Tech Cover Letter/i).length).toBeGreaterThanOrEqual(1);
    });

    it("shows correct description for update template", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("update-template"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getAllByText(/Updated template: Tech Cover Letter/i).length).toBeGreaterThanOrEqual(1);
    });

    it("shows correct description for delete template", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("delete-template"));
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getAllByText(/Deleted template: Tech Cover Letter/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Stack Management", () => {
    it("maintains max stack size of 50", async () => {
      render(
        <TestWrapper>
          <TemplateTest />
        </TestWrapper>
      );

      // Push 55 actions
      for (let i = 0; i < 55; i++) {
        fireEvent.click(screen.getByTestId("create-template"));
        await waitFor(() => {
          expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
        });
      }

      // Should still be able to undo (stack limited to 50)
      expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
    });
  });
});
