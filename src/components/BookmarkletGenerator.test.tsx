import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookmarkletGenerator } from "./BookmarkletGenerator";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("BookmarkletGenerator", () => {
  it("includes the bookmarklet auth token in generated code", async () => {
    mockInvoke.mockResolvedValueOnce({
      port: 4321,
      enabled: true,
      authToken: "token-123",
    });

    render(<BookmarkletGenerator />);

    await waitFor(() => {
      expect(screen.getByText(/X-JobSentinel-Token/)).toBeInTheDocument();
    });

    expect(screen.getByText(/token-123/)).toBeInTheDocument();
  });
});
