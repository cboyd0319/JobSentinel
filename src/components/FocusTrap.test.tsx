import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusTrap } from "./FocusTrap";

describe("FocusTrap", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <FocusTrap>
          <button>Button 1</button>
          <button>Button 2</button>
        </FocusTrap>
      );

      expect(screen.getByRole("button", { name: "Button 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Button 2" })).toBeInTheDocument();
    });

    it("renders without errors when no focusable elements exist", () => {
      render(
        <FocusTrap>
          <div>No focusable elements</div>
        </FocusTrap>
      );

      expect(screen.getByText("No focusable elements")).toBeInTheDocument();
    });
  });

  describe("initial focus", () => {
    it("focuses first focusable element when active", async () => {
      render(
        <FocusTrap active={true}>
          <button>First button</button>
          <button>Second button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const firstButton = screen.getByRole("button", { name: "First button" });
      expect(firstButton).toHaveFocus();
    });

    it("does not focus element when active is false", () => {
      render(
        <FocusTrap active={false}>
          <button>First button</button>
          <button>Second button</button>
        </FocusTrap>
      );

      const firstButton = screen.getByRole("button", { name: "First button" });
      expect(firstButton).not.toHaveFocus();
    });

    it("defaults to active when prop is not provided", async () => {
      render(
        <FocusTrap>
          <button>First button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const firstButton = screen.getByRole("button", { name: "First button" });
      expect(firstButton).toHaveFocus();
    });

    it("focuses first input element", async () => {
      render(
        <FocusTrap>
          <input aria-label="First input" />
          <button>Button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const firstInput = screen.getByLabelText("First input");
      expect(firstInput).toHaveFocus();
    });
  });

  describe("Tab key navigation", () => {
    it("moves focus forward through elements on Tab", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button1 = screen.getByRole("button", { name: "Button 1" });
      const button2 = screen.getByRole("button", { name: "Button 2" });

      expect(button1).toHaveFocus();

      await user.tab();
      expect(button2).toHaveFocus();
    });

    it("wraps focus to first element when Tab is pressed on last element", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button1 = screen.getByRole("button", { name: "Button 1" });
      const button3 = screen.getByRole("button", { name: "Button 3" });

      // Focus last button
      button3.focus();
      expect(button3).toHaveFocus();

      // Tab should wrap to first
      await user.tab();
      expect(button1).toHaveFocus();
    });

    it("moves focus backward with Shift+Tab", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </FocusTrap>
      );

      const button1 = screen.getByRole("button", { name: "Button 1" });
      const button2 = screen.getByRole("button", { name: "Button 2" });

      // Move to button 2
      button2.focus();
      expect(button2).toHaveFocus();

      // Shift+Tab should go back to button 1
      await user.tab({ shift: true });
      expect(button1).toHaveFocus();
    });

    it("wraps focus to last element when Shift+Tab is pressed on first element", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button1 = screen.getByRole("button", { name: "Button 1" });
      const button3 = screen.getByRole("button", { name: "Button 3" });

      expect(button1).toHaveFocus();

      // Shift+Tab should wrap to last
      await user.tab({ shift: true });
      expect(button3).toHaveFocus();
    });

    it("does not trap focus when active is false", async () => {
      const user = userEvent.setup();

      render(
        <>
          <button>Outside button</button>
          <FocusTrap active={false}>
            <button>Inside button 1</button>
            <button>Inside button 2</button>
          </FocusTrap>
        </>
      );

      screen.getByRole("button", { name: "Inside button 1" });
      const insideButton2 = screen.getByRole("button", { name: "Inside button 2" });

      insideButton2.focus();
      expect(insideButton2).toHaveFocus();

      // Tab should not trap focus (normal behavior)
      await user.tab();
      // Focus can leave the trap area
      expect(insideButton2).not.toHaveFocus();
    });
  });

  describe("focusable elements", () => {
    it("includes buttons in focus trap", async () => {
      render(
        <FocusTrap>
          <button>Button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button = screen.getByRole("button", { name: "Button" });
      expect(button).toHaveFocus();
    });

    it("includes links in focus trap", async () => {
      render(
        <FocusTrap>
          <a href="#test">Link</a>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const link = screen.getByRole("link", { name: "Link" });
      expect(link).toHaveFocus();
    });

    it("includes inputs in focus trap", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <input aria-label="Input 1" />
          <input aria-label="Input 2" />
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const input1 = screen.getByLabelText("Input 1");
      const input2 = screen.getByLabelText("Input 2");

      expect(input1).toHaveFocus();

      await user.tab();
      expect(input2).toHaveFocus();
    });

    it("includes textareas in focus trap", async () => {
      render(
        <FocusTrap>
          <textarea aria-label="Textarea" />
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const textarea = screen.getByLabelText("Textarea");
      expect(textarea).toHaveFocus();
    });

    it("includes select elements in focus trap", async () => {
      render(
        <FocusTrap>
          <select aria-label="Select">
            <option>Option</option>
          </select>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const select = screen.getByLabelText("Select");
      expect(select).toHaveFocus();
    });

    it("includes elements with tabindex in focus trap", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <div tabIndex={0}>Focusable div 1</div>
          <div tabIndex={0}>Focusable div 2</div>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const div1 = screen.getByText("Focusable div 1");
      const div2 = screen.getByText("Focusable div 2");

      expect(div1).toHaveFocus();

      await user.tab();
      expect(div2).toHaveFocus();
    });

    it("excludes disabled buttons from focus trap", async () => {
      render(
        <FocusTrap>
          <button disabled>Disabled button</button>
          <button>Enabled button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const enabledButton = screen.getByRole("button", { name: "Enabled button" });
      expect(enabledButton).toHaveFocus();
    });

    it("excludes disabled inputs from focus trap", async () => {
      render(
        <FocusTrap>
          <input disabled aria-label="Disabled input" />
          <input aria-label="Enabled input" />
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const enabledInput = screen.getByLabelText("Enabled input");
      expect(enabledInput).toHaveFocus();
    });

    it("excludes elements with tabindex -1 from focus trap", async () => {
      render(
        <FocusTrap>
          <div tabIndex={-1}>Not focusable</div>
          <button>Focusable button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button = screen.getByRole("button", { name: "Focusable button" });
      expect(button).toHaveFocus();
    });
  });

  describe("edge cases", () => {
    it("handles single focusable element", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <button>Only button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button = screen.getByRole("button", { name: "Only button" });
      expect(button).toHaveFocus();

      // Tab should keep focus on the same element
      await user.tab();
      expect(button).toHaveFocus();

      // Shift+Tab should also keep focus
      await user.tab({ shift: true });
      expect(button).toHaveFocus();
    });

    it("handles dynamic addition of focusable elements", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <FocusTrap>
          <button>Button 1</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button1 = screen.getByRole("button", { name: "Button 1" });
      expect(button1).toHaveFocus();

      // Add another button
      rerender(
        <FocusTrap>
          <button>Button 1</button>
          <button>Button 2</button>
        </FocusTrap>
      );

      // Tab should now move to the new button
      await user.tab();
      const button2 = screen.getByRole("button", { name: "Button 2" });
      expect(button2).toHaveFocus();
    });

    it("does not interfere with non-Tab keys", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <button>Button</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button = screen.getByRole("button", { name: "Button" });
      expect(button).toHaveFocus();

      // Press other keys - should not affect focus
      await user.keyboard("{Enter}");
      expect(button).toHaveFocus();

      await user.keyboard("{Escape}");
      expect(button).toHaveFocus();
    });
  });

  describe("nested structure", () => {
    it("handles nested focusable elements", async () => {
      const user = userEvent.setup();

      render(
        <FocusTrap>
          <div>
            <button>Nested button 1</button>
            <div>
              <button>Deeply nested button</button>
            </div>
          </div>
          <button>Button 2</button>
        </FocusTrap>
      );

      // Wait for requestAnimationFrame to complete
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      const button1 = screen.getByRole("button", { name: "Nested button 1" });
      const deepButton = screen.getByRole("button", { name: "Deeply nested button" });
      const button2 = screen.getByRole("button", { name: "Button 2" });

      expect(button1).toHaveFocus();

      await user.tab();
      expect(deepButton).toHaveFocus();

      await user.tab();
      expect(button2).toHaveFocus();
    });
  });
});
