import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { SecureCredentialInput } from "./SecureCredentialInput";

beforeEach(() => {
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SecureCredentialInput", () => {
  describe("basic rendering", () => {
    it("renders the label", () => {
      render(
        <SecureCredentialInput
          label="Webhook URL"
          stored={false}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText("Webhook URL")).toBeInTheDocument();
    });

    it("renders help text when provided", () => {
      render(
        <SecureCredentialInput
          label="Webhook URL"
          helpText="Paste the URL from your Slack app settings"
          stored={false}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(
        screen.getByText("Paste the URL from your Slack app settings"),
      ).toBeInTheDocument();
    });

    it("does not render help text section when not provided", () => {
      render(
        <SecureCredentialInput
          label="Webhook URL"
          stored={false}
          value=""
          onChange={vi.fn()}
        />,
      );
      // No hint paragraph should be rendered
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
    });
  });

  describe("input type", () => {
    it("defaults to password type", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={false}
          value="secret"
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByDisplayValue("secret")).toHaveAttribute(
        "type",
        "password",
      );
    });

    it("renders text type when specified", () => {
      render(
        <SecureCredentialInput
          label="Webhook URL"
          stored={false}
          value="https://hooks.slack.com/abc"
          onChange={vi.fn()}
          type="text"
        />,
      );
      expect(
        screen.getByDisplayValue("https://hooks.slack.com/abc"),
      ).toHaveAttribute("type", "text");
    });
  });

  describe("default placeholder", () => {
    it("shows 'Paste your <label>' when not stored", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={false}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(
        screen.getByPlaceholderText("Paste your api key"),
      ).toBeInTheDocument();
    });

    it("shows 'Enter new <label> to update' when stored", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={true}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(
        screen.getByPlaceholderText("Enter new api key to update"),
      ).toBeInTheDocument();
    });

    it("uses custom placeholder when provided, ignoring stored state", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={true}
          value=""
          onChange={vi.fn()}
          placeholder="Custom placeholder"
        />,
      );
      expect(
        screen.getByPlaceholderText("Custom placeholder"),
      ).toBeInTheDocument();
    });
  });

  describe("SecurityBadge", () => {
    it("shows stored badge text when credential is stored", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={true}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText("Stored in macOS Keychain")).toBeInTheDocument();
    });

    it("shows 'Will store' badge text when credential is not stored", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={false}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(
        screen.getByText("Will store in macOS Keychain"),
      ).toBeInTheDocument();
    });

    it("shows Windows Credential Manager on windows platform", () => {
      vi.spyOn(window.navigator, "platform", "get").mockReturnValue("Win32");
      render(
        <SecureCredentialInput
          label="API Key"
          stored={true}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(
        screen.getByText("Stored in Windows Credential Manager"),
      ).toBeInTheDocument();
    });

    it("shows System Keyring on non-mac non-windows platform", () => {
      vi.spyOn(window.navigator, "platform", "get").mockReturnValue(
        "Linux x86_64",
      );
      render(
        <SecureCredentialInput
          label="API Key"
          stored={true}
          value=""
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText("Stored in System Keyring")).toBeInTheDocument();
    });
  });

  describe("onChange", () => {
    it("calls onChange for each keystroke with the new character value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <SecureCredentialInput
          label="API Key"
          stored={false}
          value=""
          onChange={onChange}
        />,
      );

      await user.type(screen.getByPlaceholderText("Paste your api key"), "xyz");

      // Controlled input: each keystroke fires onChange with just that character
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, "x");
      expect(onChange).toHaveBeenNthCalledWith(2, "y");
      expect(onChange).toHaveBeenNthCalledWith(3, "z");
    });
  });

  describe("testId forwarding", () => {
    it("forwards testId to the root container", () => {
      render(
        <SecureCredentialInput
          label="API Key"
          stored={false}
          value=""
          onChange={vi.fn()}
          testId="slack-webhook-input"
        />,
      );
      expect(screen.getByTestId("slack-webhook-input")).toBeInTheDocument();
    });
  });
});
