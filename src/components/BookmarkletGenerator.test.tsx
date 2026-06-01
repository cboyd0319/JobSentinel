import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookmarkletGenerator } from "./BookmarkletGenerator";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("BookmarkletGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies the hidden browser button without exposing the local auth token to the page", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        port: 4321,
        enabled: true,
      })
      .mockResolvedValueOnce(undefined);

    render(<BookmarkletGenerator />);

    const copyButton = await screen.findByRole("button", { name: /copy browser button/i });
    await waitFor(() => expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);

    expect(mockInvoke).toHaveBeenCalledWith("get_bookmarklet_config");
    expect(mockInvoke).toHaveBeenCalledWith("copy_bookmarklet_code");
    expect(screen.queryByText(/token-123/)).not.toBeInTheDocument();
  });

  it("uses plain browser-import copy instead of server and structured-data jargon", async () => {
    mockInvoke.mockResolvedValueOnce({
      port: 4321,
      enabled: true,
    });

    render(<BookmarkletGenerator />);

    expect(
      await screen.findByRole("heading", { name: /install browser button/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Connection Number")).not.toBeInTheDocument();
    expect(screen.getByText("Import Helper")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /turn off/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy browser button/i })).toBeInTheDocument();
    expect(screen.getByText(/copy it again after about one hour/i)).toBeInTheDocument();
    expect(screen.getByText(/local safety code/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /advanced connection settings/i }));
    expect(screen.getByText("Connection Number")).toBeInTheDocument();
    expect(screen.queryByText(/server port/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookmarklet code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookmarklet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local safety token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/schema\.org/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DOM parsing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/any job posting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/supported sites/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/major job boards/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^LinkedIn$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Indeed$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/official career pages usually work best/i)).toBeInTheDocument();
    expect(screen.getByText(/company application pages/i)).toBeInTheDocument();
    expect(screen.getByText(/does not bypass those controls/i)).toBeInTheDocument();
  });

  it("shows safe copy guidance when browser clipboard copy fails", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        port: 4321,
        enabled: true,
      })
      .mockRejectedValueOnce(new Error("token=secret /Users/chad/private.txt"));

    render(<BookmarkletGenerator />);

    const copyButton = await screen.findByRole("button", { name: /copy browser button/i });
    await waitFor(() => expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);

    expect(await screen.findByText(/could not copy browser button/i)).toBeInTheDocument();
    expect(screen.getByText(/allow clipboard access and try again/i)).toBeInTheDocument();
    expect(screen.queryByText(/token=secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/Users\/chad/i)).not.toBeInTheDocument();
  });
});
