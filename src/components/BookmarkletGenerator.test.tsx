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
    expect(copyButton).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(/I understand this risk and want to use Browser Import/i),
    );
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
    expect(screen.queryByText("Support number")).not.toBeInTheDocument();
    expect(screen.queryByText("Browser helper number")).not.toBeInTheDocument();
    expect(screen.queryByText("Import Helper")).not.toBeInTheDocument();
    expect(screen.getByText("Browser Import")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /turn off/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /copy browser button/i })).toBeInTheDocument();
    expect(screen.getAllByText(/copy.*after each saved job/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/copy a fresh browser button/i)).toBeInTheDocument();
    expect(screen.getAllByText(/closed and reopened/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/when JobSentinel restarts/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local safety code/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /optional browser button setting/i }));
    expect(screen.queryByText("Advanced browser button setting")).not.toBeInTheDocument();
    expect(screen.queryByText("Browser helper number")).not.toBeInTheDocument();
    expect(screen.getByText("Button setup number")).toBeInTheDocument();
    expect(screen.getByLabelText("Button setup number")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save number/i })).toBeDisabled();
    expect(screen.queryByText("Connection Number")).not.toBeInTheDocument();
    expect(screen.queryByText("Support number")).not.toBeInTheDocument();
    expect(screen.getByText(/help instructions tell you otherwise/i)).toBeInTheDocument();
    expect(screen.queryByText(/unless a support reply asks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/server port/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookmarklet code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookmarklet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local safety token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/schema\.org/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DOM parsing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/any job posting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/supported sites/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/major job boards/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/import helper/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^LinkedIn$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Indeed$/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /trusted public job pages/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cmd\/Ctrl\+D/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookmark address field/i)).not.toBeInTheDocument();
    expect(screen.getByText(/recommended: paste the job link into jobsentinel/i)).toBeInTheDocument();
    expect(screen.getByText(/use browser button only if you already use browser bookmarks/i)).toBeInTheDocument();
    expect(screen.getByText(/Use your browser's Add Bookmark option/i)).toBeInTheDocument();
    expect(screen.getByText(/paste the copied text into the bookmark link field/i)).toBeInTheDocument();
    expect(screen.queryByText(/where the bookmark stores the page address/i)).not.toBeInTheDocument();
    expect(screen.getByText(/official career pages usually work best/i)).toBeInTheDocument();
    expect(screen.getByText(/company application pages/i)).toBeInTheDocument();
    expect(screen.getByText(/do not let JobSentinel read saved pages/i)).toBeInTheDocument();
    expect(screen.getByText(/respects those controls/i)).toBeInTheDocument();
    expect(screen.getByText(/Restricted Site Warning/i)).toBeInTheDocument();
    expect(screen.getByText(/can violate their User Agreement or terms/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/I understand this risk and want to use Browser Import/i),
    ).toBeInTheDocument();
  });

  it("gates Browser Import until the user accepts restricted-site risk", async () => {
    mockInvoke.mockResolvedValueOnce({
      port: 4321,
      enabled: false,
    });

    render(<BookmarkletGenerator />);

    const turnOnButton = await screen.findByRole("button", { name: /turn on/i });
    fireEvent.click(turnOnButton);

    expect(
      await screen.findByText(/Review the restricted-site warning and check the box/i),
    ).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalledWith("start_bookmarklet_server", { port: 4321 });

    fireEvent.click(
      screen.getByLabelText(/I understand this risk and want to use Browser Import/i),
    );
    fireEvent.click(turnOnButton);

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("start_bookmarklet_server", { port: 4321 }),
    );
  });

  it("shows safe copy guidance when browser clipboard copy fails", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        port: 4321,
        enabled: true,
      })
      .mockRejectedValueOnce(new Error("token=secret resume=private-file"));

    render(<BookmarkletGenerator />);

    const copyButton = await screen.findByRole("button", { name: /copy browser button/i });
    fireEvent.click(
      screen.getByLabelText(/I understand this risk and want to use Browser Import/i),
    );
    await waitFor(() => expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);

    expect(await screen.findByText(/could not copy browser button/i)).toBeInTheDocument();
    expect(screen.getByText(/allow clipboard access, then click copy browser button again/i)).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/token=secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resume=private-file/i)).not.toBeInTheDocument();
  });

  it("shows plain recovery when Browser Import cannot load", async () => {
    mockInvoke.mockRejectedValueOnce(
      new Error("token=secret resume=private-file"),
    );

    render(<BookmarkletGenerator />);

    expect(await screen.findByText(/Browser Import could not load/i)).toBeInTheDocument();
    expect(screen.getByText(/close and reopen settings/i)).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/browser import settings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/token=secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resume=private-file/i)).not.toBeInTheDocument();
  });

  it("shows plain recovery when Browser Import cannot be changed", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        port: 4321,
        enabled: false,
      })
      .mockRejectedValueOnce(new Error("token=secret resume=private-file"));

    render(<BookmarkletGenerator />);

    const turnOnButton = await screen.findByRole("button", { name: /turn on/i });
    fireEvent.click(
      screen.getByLabelText(/I understand this risk and want to use Browser Import/i),
    );
    fireEvent.click(turnOnButton);

    expect(await screen.findByText(/Browser Import could not be changed/i)).toBeInTheDocument();
    expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
    expect(screen.queryByText(/Could not update browser import/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/token=secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resume=private-file/i)).not.toBeInTheDocument();
  });

  it("shows plain recovery when the browser button number cannot be saved", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        port: 4321,
        enabled: false,
      })
      .mockRejectedValueOnce(new Error("token=secret resume=private-file"));

    render(<BookmarkletGenerator />);

    fireEvent.click(await screen.findByRole("button", { name: /optional browser button setting/i }));
    fireEvent.change(screen.getByLabelText("Button setup number"), { target: { value: "4322" } });
    fireEvent.click(screen.getByRole("button", { name: /save number/i }));

    expect(
      await screen.findByText(/That browser button number could not be saved/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/help instructions give you a different number/i)).toBeInTheDocument();
    expect(screen.queryByText(/browser import connection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/token=secret/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resume=private-file/i)).not.toBeInTheDocument();
  });

  it("validates the browser button number before saving", async () => {
    mockInvoke.mockResolvedValueOnce({
      port: 4321,
      enabled: false,
    });

    render(<BookmarkletGenerator />);

    fireEvent.click(await screen.findByRole("button", { name: /optional browser button setting/i }));
    const portInput = screen.getByLabelText("Button setup number");
    const saveButton = screen.getByRole("button", { name: /save number/i });

    fireEvent.change(portInput, { target: { value: "80" } });

    expect(await screen.findByText(/Use a number from 1024 to 65535/i)).toBeInTheDocument();
    expect(portInput).toHaveAttribute("aria-invalid", "true");
    expect(saveButton).toBeDisabled();
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    fireEvent.change(portInput, { target: { value: "4322" } });

    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("set_bookmarklet_port", { port: 4322 }),
    );
  });
});
