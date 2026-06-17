import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "./ToastContext";
import { useToast } from "../hooks/useToast";

// Test component that uses the toast context
function TestComponent() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success("Success!", "Operation completed")}>
        Show Success
      </button>
      <button onClick={() => toast.error("Error!", "Something went wrong")}>
        Show Error
      </button>
      <button onClick={() => toast.warning("Warning!", "Be careful")}>
        Show Warning
      </button>
      <button onClick={() => toast.info("Info", "Just letting you know")}>
        Show Info
      </button>
      <button
        onClick={() =>
          toast.success("With Action", "Click the button", {
            label: "Undo",
            onClick: vi.fn(),
          })
        }
      >
        Show With Action
      </button>
    </div>
  );
}

describe("ToastContext", () => {
  describe("ToastProvider", () => {
    it("renders children", () => {
      render(
        <ToastProvider>
          <div>Child content</div>
        </ToastProvider>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("does not show toasts initially", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("toast methods", () => {
    it("shows success toast", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Success"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Success!")).toBeInTheDocument();
      expect(screen.getByText("Operation completed")).toBeInTheDocument();
    });

    it("uses readable surface toast colors instead of low-contrast bright fills", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Warning"));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveClass("bg-white", "text-surface-900", "border-amber-700");
      expect(alert).not.toHaveClass("bg-warning", "text-white");
      expect(screen.getByText("Be careful")).toHaveClass("text-surface-700");
    });

    it("keeps toast text click-through while controls remain clickable", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show With Action"));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveClass("pointer-events-none");
      expect(screen.getByText("Undo")).toHaveClass("pointer-events-auto");
      expect(screen.getByLabelText(/Dismiss.*notification/i))
        .toHaveClass("pointer-events-auto");
    });

    it("portals the toast viewport to the document body", async () => {
      render(
        <ToastProvider>
          <div data-testid="app-shell">
            <TestComponent />
          </div>
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Warning"));

      const viewport = await screen.findByTestId("toast-viewport");
      expect(viewport.parentElement).toBe(document.body);
      expect(viewport).toHaveClass("fixed", "bottom-4", "right-4", "justify-end");
    });

    it("shows error toast", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Error"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Error!")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows warning toast", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Warning"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Warning!")).toBeInTheDocument();
      expect(screen.getByText("Be careful")).toBeInTheDocument();
    });

    it("shows info toast", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Info"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Info")).toBeInTheDocument();
      expect(screen.getByText("Just letting you know")).toBeInTheDocument();
    });

    it("shows toast with action button", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show With Action"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByText("Undo")).toBeInTheDocument();
    });
  });

  describe("toast dismiss button", () => {
    it("removes toast when dismiss button is clicked", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Success"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText(/Dismiss.*notification/i);
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("multiple toasts", () => {
    it("can show multiple toasts", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Success"));
      fireEvent.click(screen.getByText("Show Error"));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts).toHaveLength(2);
      });
    });

    it("limits visible toasts to the newest three", async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Show Success"));
      fireEvent.click(screen.getByText("Show Error"));
      fireEvent.click(screen.getByText("Show Warning"));
      fireEvent.click(screen.getByText("Show Info"));

      await waitFor(() => {
        expect(screen.getAllByRole("alert")).toHaveLength(3);
      });

      expect(screen.queryByText("Success!")).not.toBeInTheDocument();
      expect(screen.getByText("Error!")).toBeInTheDocument();
      expect(screen.getByText("Warning!")).toBeInTheDocument();
      expect(screen.getByText("Info")).toBeInTheDocument();
    });
  });
});
