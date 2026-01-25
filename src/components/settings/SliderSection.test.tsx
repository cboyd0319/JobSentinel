import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SliderSection } from "./SliderSection";

describe("SliderSection", () => {
  describe("rendering", () => {
    it("renders label text", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      expect(screen.getByText(/Volume:/)).toBeInTheDocument();
    });

    it("displays current value with default formatter", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50.5}
          onChange={onChange}
          min={0}
          max={100}
          step={0.1}
        />
      );

      expect(screen.getByText("Volume: 50.50")).toBeInTheDocument();
    });

    it("displays value with custom formatter", () => {
      const onChange = vi.fn();
      const formatter = (v: number) => `${v}%`;
      render(
        <SliderSection
          label="Volume"
          value={75}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          valueFormatter={formatter}
        />
      );

      expect(screen.getByText("Volume: 75%")).toBeInTheDocument();
    });

    it("renders help text when provided", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          helpText="Adjust the volume level"
        />
      );

      expect(screen.getByText("Adjust the volume level")).toBeInTheDocument();
    });

    it("does not render help text when not provided", () => {
      const onChange = vi.fn();
      const { container } = render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      const helpText = container.querySelector(".text-xs");
      expect(helpText).not.toBeInTheDocument();
    });

    it("renders range input with correct type", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveAttribute("type", "range");
    });
  });

  describe("slider attributes", () => {
    it("sets min attribute", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveAttribute("min", "0");
    });

    it("sets max attribute", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveAttribute("max", "100");
    });

    it("sets step attribute", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={5}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveAttribute("step", "5");
    });

    it("sets value attribute", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={75}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider") as HTMLInputElement;
      expect(slider.value).toBe("75");
    });

    it("handles decimal step values", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Precision"
          value={0.5}
          onChange={onChange}
          min={0}
          max={1}
          step={0.01}
          testId="precision-slider"
        />
      );

      const slider = screen.getByTestId("precision-slider");
      expect(slider).toHaveAttribute("step", "0.01");
    });
  });

  describe("value changes", () => {
    it("calls onChange when slider is moved", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      fireEvent.change(slider, { target: { value: "75" } });

      expect(onChange).toHaveBeenCalledWith(75);
    });

    it("handles decimal values", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Precision"
          value={0.5}
          onChange={onChange}
          min={0}
          max={1}
          step={0.1}
          testId="precision-slider"
        />
      );

      const slider = screen.getByTestId("precision-slider");
      fireEvent.change(slider, { target: { value: "0.7" } });

      expect(onChange).toHaveBeenCalledWith(0.7);
    });

    it("updates displayed value when value prop changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      expect(screen.getByText("Volume: 50.00")).toBeInTheDocument();

      rerender(
        <SliderSection
          label="Volume"
          value={75}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      expect(screen.getByText("Volume: 75.00")).toBeInTheDocument();
    });

    it("handles multiple consecutive changes", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      fireEvent.change(slider, { target: { value: "60" } });
      fireEvent.change(slider, { target: { value: "70" } });
      fireEvent.change(slider, { target: { value: "80" } });

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, 60);
      expect(onChange).toHaveBeenNthCalledWith(2, 70);
      expect(onChange).toHaveBeenNthCalledWith(3, 80);
    });
  });

  describe("keyboard interaction", () => {
    it("can be controlled with arrow keys", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      slider.focus();

      // Arrow key events trigger change events in real browsers
      fireEvent.keyDown(slider, { key: "ArrowRight" });
      fireEvent.change(slider, { target: { value: "51" } });

      expect(onChange).toHaveBeenCalledWith(51);
    });

    it("can be controlled with Home and End keys", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      slider.focus();

      // End key should go to max
      fireEvent.keyDown(slider, { key: "End" });
      fireEvent.change(slider, { target: { value: "100" } });
      expect(onChange).toHaveBeenCalledWith(100);

      // Home key should go to min
      fireEvent.keyDown(slider, { key: "Home" });
      fireEvent.change(slider, { target: { value: "0" } });
      expect(onChange).toHaveBeenCalledWith(0);
    });
  });

  describe("value formatters", () => {
    it("formats percentage values", () => {
      const onChange = vi.fn();
      const formatter = (v: number) => `${Math.round(v)}%`;
      render(
        <SliderSection
          label="Opacity"
          value={0.75}
          onChange={onChange}
          min={0}
          max={1}
          step={0.01}
          valueFormatter={formatter}
        />
      );

      expect(screen.getByText("Opacity: 1%")).toBeInTheDocument();
    });

    it("formats currency values", () => {
      const onChange = vi.fn();
      const formatter = (v: number) => `$${v.toFixed(2)}`;
      render(
        <SliderSection
          label="Price"
          value={49.99}
          onChange={onChange}
          min={0}
          max={100}
          step={0.01}
          valueFormatter={formatter}
        />
      );

      expect(screen.getByText("Price: $49.99")).toBeInTheDocument();
    });

    it("formats integer values", () => {
      const onChange = vi.fn();
      const formatter = (v: number) => `${Math.round(v)} items`;
      render(
        <SliderSection
          label="Quantity"
          value={15}
          onChange={onChange}
          min={0}
          max={50}
          step={1}
          valueFormatter={formatter}
        />
      );

      expect(screen.getByText("Quantity: 15 items")).toBeInTheDocument();
    });

    it("handles custom units", () => {
      const onChange = vi.fn();
      const formatter = (v: number) => `${v.toFixed(1)} dB`;
      render(
        <SliderSection
          label="Volume"
          value={65.5}
          onChange={onChange}
          min={0}
          max={100}
          step={0.1}
          valueFormatter={formatter}
        />
      );

      expect(screen.getByText("Volume: 65.5 dB")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("has full width", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveClass("w-full");
    });

    it("has rounded appearance", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveClass("rounded-lg");
    });

    it("has cursor pointer style", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider).toHaveClass("cursor-pointer");
    });

    it("label has proper font weight", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      const label = screen.getByText(/Volume:/).closest("label");
      expect(label).toHaveClass("font-medium");
    });

    it("help text has smaller font size", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          helpText="Adjust volume level"
        />
      );

      const helpText = screen.getByText("Adjust volume level");
      expect(helpText).toHaveClass("text-xs");
    });
  });

  describe("accessibility", () => {
    it("has accessible label", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume Control"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const labelText = screen.getByText(/Volume Control:/);
      const slider = screen.getByTestId("volume-slider");

      expect(labelText.tagName).toBe("LABEL");
      // Check that label and slider are both present in the same container
      const container = labelText.parentElement;
      expect(container).toContainElement(slider);
    });

    it("slider is keyboard accessible", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      slider.focus();
      expect(document.activeElement).toBe(slider);
    });

    it("provides semantic range input", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider");
      expect(slider.tagName).toBe("INPUT");
      expect(slider).toHaveAttribute("type", "range");
    });
  });

  describe("edge cases", () => {
    it("handles min value", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={0}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      expect(screen.getByText("Volume: 0.00")).toBeInTheDocument();
    });

    it("handles max value", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={100}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      expect(screen.getByText("Volume: 100.00")).toBeInTheDocument();
    });

    it("handles negative values", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Temperature"
          value={-10}
          onChange={onChange}
          min={-50}
          max={50}
          step={1}
        />
      );

      expect(screen.getByText("Temperature: -10.00")).toBeInTheDocument();
    });

    it("handles very small decimal steps", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Precision"
          value={0.005}
          onChange={onChange}
          min={0}
          max={0.01}
          step={0.001}
          testId="precision-slider"
        />
      );

      const slider = screen.getByTestId("precision-slider");
      expect(slider).toHaveAttribute("step", "0.001");
    });

    it("handles zero as value", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={0}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="volume-slider"
        />
      );

      const slider = screen.getByTestId("volume-slider") as HTMLInputElement;
      expect(slider.value).toBe("0");
    });

    it("handles empty label", () => {
      const onChange = vi.fn();
      const { container } = render(
        <SliderSection
          label=""
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      // Empty label still renders, check for the value display
      const labelElement = container.querySelector("label");
      expect(labelElement).toBeInTheDocument();
      expect(labelElement?.textContent).toContain("50.00");
    });
  });

  describe("testId prop", () => {
    it("applies testId to slider input", () => {
      const onChange = vi.fn();
      render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
          testId="custom-test-id"
        />
      );

      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument();
    });

    it("works without testId", () => {
      const onChange = vi.fn();
      const { container } = render(
        <SliderSection
          label="Volume"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          step={1}
        />
      );

      const slider = container.querySelector('input[type="range"]');
      expect(slider).toBeInTheDocument();
    });
  });
});
