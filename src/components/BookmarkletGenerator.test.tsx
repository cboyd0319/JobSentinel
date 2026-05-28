import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookmarkletGenerator } from "./BookmarkletGenerator";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("BookmarkletGenerator", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("copies hidden setup code with the local auth token", async () => {
    mockInvoke.mockResolvedValueOnce({
      port: 4321,
      enabled: true,
      authToken: "token-123",
    });

    render(<BookmarkletGenerator />);

    const copyButton = await screen.findByRole("button", { name: /copy setup code/i });
    await waitFor(() => expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("X-JobSentinel-Token"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("token-123"));
    expect(screen.queryByText(/token-123/)).not.toBeInTheDocument();
  });

  it("uses plain browser-import copy instead of server and structured-data jargon", async () => {
    mockInvoke.mockResolvedValueOnce({
      port: 4321,
      enabled: true,
      authToken: "token-123",
    });

    render(<BookmarkletGenerator />);

    expect(
      await screen.findByRole("heading", { name: /browser import button/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Connection Number")).toBeInTheDocument();
    expect(screen.getByText("Import Helper")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn off/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy setup code/i })).toBeInTheDocument();
    expect(screen.getByText(/setup code is hidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/server port/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookmarklet code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/schema\.org/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DOM parsing/i)).not.toBeInTheDocument();
  });
});
