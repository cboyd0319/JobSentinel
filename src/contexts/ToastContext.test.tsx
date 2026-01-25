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

      const dismissButton = screen.getByLabelText("Dismiss");
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
  });
});
