import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardShortcutsHelp, ShortcutKey } from "./KeyboardShortcutsHelp";

// Mock the OnboardingTour hook
vi.mock("../../hooks/useOnboarding", () => ({
  useOnboarding: vi.fn(() => ({
    startTour: vi.fn(),
    hasCompletedTour: false,
  })),
}));

// Import the mocked module to access the mock functions
import { useOnboarding } from "../../hooks/useOnboarding";

const mockUseOnboarding = vi.mocked(useOnboarding);

describe("ShortcutKey", () => {
  it("renders the key text", () => {
    render(<ShortcutKey>K</ShortcutKey>);

    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("renders as kbd element", () => {
    render(<ShortcutKey>Enter</ShortcutKey>);

    const kbd = screen.getByText("Enter");
    expect(kbd.tagName.toLowerCase()).toBe("kbd");
  });

  it("applies styling classes", () => {
    render(<ShortcutKey>⌘</ShortcutKey>);

    const kbd = screen.getByText("⌘");
    expect(kbd.className).toContain("font-mono");
    expect(kbd.className).toContain("rounded");
  });
});

describe("KeyboardShortcutsHelp", () => {
  const mockStartTour = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnboarding.mockReturnValue({
      startTour: mockStartTour,
      hasCompletedTour: false,
      isActive: false,
      currentStep: 0,
      endTour: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
    });
  });

  describe("rendering", () => {
    it("does not render when isOpen is false", () => {
      render(<KeyboardShortcutsHelp isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Keyboard Help")).toBeInTheDocument();
      expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
    });
  });

  describe("shortcut sections", () => {
    it("renders Moving around section", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Moving around")).toBeInTheDocument();
      expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    });

    it("renders Job actions section", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Job actions")).toBeInTheDocument();
    });

    it("renders App-wide section", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("App-wide")).toBeInTheDocument();
      expect(screen.queryByText("Global")).not.toBeInTheDocument();
    });

    it("renders Search and refresh section", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Search and refresh")).toBeInTheDocument();
      expect(screen.queryByText("Filters & Search")).not.toBeInTheDocument();
    });
  });

  describe("navigation shortcuts", () => {
    it("shows move down shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Move down")).toBeInTheDocument();
      expect(screen.getByText("j")).toBeInTheDocument();
    });

    it("shows move up shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Move up")).toBeInTheDocument();
      expect(screen.getByText("k")).toBeInTheDocument();
    });
  });

  describe("action shortcuts", () => {
    it("shows open job shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Open job")).toBeInTheDocument();
    });

    it("shows hide job shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Hide job")).toBeInTheDocument();
    });

    it("shows toggle bookmark shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Save or unsave job")).toBeInTheDocument();
      expect(screen.queryByText("Toggle bookmark")).not.toBeInTheDocument();
      expect(screen.queryByText("Toggle selection")).not.toBeInTheDocument();
    });
  });

  describe("global shortcuts", () => {
    it("shows quick actions shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Open quick actions")).toBeInTheDocument();
    });

    it("shows settings shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Open settings")).toBeInTheDocument();
    });

    it("shows undo shortcut", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Undo last action")).toBeInTheDocument();
    });
  });

  describe("help hint", () => {
    it("shows hint about ? key", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/anytime to show this help/)).toBeInTheDocument();
    });
  });

  describe("guided tour button", () => {
    it('shows "Take a guided tour" when tour not completed', () => {
      mockUseOnboarding.mockReturnValue({
        startTour: mockStartTour,
        hasCompletedTour: false,
        isActive: false,
        currentStep: 0,
        endTour: vi.fn(),
        nextStep: vi.fn(),
        prevStep: vi.fn(),
      });

      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Take a guided tour")).toBeInTheDocument();
    });

    it('shows "Retake the guided tour" when tour completed', () => {
      mockUseOnboarding.mockReturnValue({
        startTour: mockStartTour,
        hasCompletedTour: true,
        isActive: false,
        currentStep: 0,
        endTour: vi.fn(),
        nextStep: vi.fn(),
        prevStep: vi.fn(),
      });

      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("Retake the guided tour")).toBeInTheDocument();
    });

    it("starts tour and closes modal when clicked", () => {
      const onClose = vi.fn();
      mockUseOnboarding.mockReturnValue({
        startTour: mockStartTour,
        hasCompletedTour: false,
        isActive: false,
        currentStep: 0,
        endTour: vi.fn(),
        nextStep: vi.fn(),
        prevStep: vi.fn(),
      });

      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByText("Take a guided tour"));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockStartTour).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("has region with aria-label", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByRole("region", { name: "Keyboard help reference" })).toBeInTheDocument();
    });

    it("has list roles for shortcut sections", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      const lists = screen.getAllByRole("list");
      expect(lists.length).toBeGreaterThan(0);
    });

    it("has listitem roles for individual shortcuts", () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);

      const items = screen.getAllByRole("listitem");
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
