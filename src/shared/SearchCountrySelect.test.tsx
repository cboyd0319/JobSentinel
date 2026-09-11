/** Verifies the local country selector validates its static IPC table and preserves optional choices. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchCountrySelect } from "./SearchCountrySelect";
import { searchCountryLabel } from "./searchCountry";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);

describe("SearchCountrySelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads canonical country choices and emits a selected code or Any country", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockInvoke.mockResolvedValue([["GB", "United Kingdom"], ["US", "United States"]]);

    render(<SearchCountrySelect onChange={onChange} value={null} />);

    const select = await screen.findByRole("combobox", {
      name: "Search country (optional)",
    });
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Any country" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "United Kingdom" })).toBeInTheDocument();
    expect(screen.getByText(/Filters job lists and future alert checks/)).toHaveTextContent(
      "running checks keep their starting settings",
    );

    await user.selectOptions(select, "GB");
    expect(onChange).toHaveBeenLastCalledWith("GB");
    await user.selectOptions(select, "");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("keeps a saved country and offers retry when the supplied option table is malformed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockInvoke
      .mockResolvedValueOnce([["gb", "United Kingdom"], ["GB", "Duplicate"]])
      .mockResolvedValueOnce([["GB", "United Kingdom"]]);

    render(<SearchCountrySelect onChange={onChange} value="GB" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load country choices");
    const select = screen.getByRole("combobox", { name: "Search country (optional)" });
    expect(select).toHaveValue("GB");
    await user.selectOptions(select, "");
    expect(onChange).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole("button", { name: "Retry country choices" }));

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "United Kingdom" })).toBeInTheDocument();
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("does not turn a legacy countryUS value into a country selection", async () => {
    mockInvoke.mockResolvedValue([["US", "United States"]]);

    render(<SearchCountrySelect onChange={vi.fn()} value="countryUS" />);

    expect(await screen.findByRole("combobox", { name: "Search country (optional)" })).toHaveValue("");
  });

  it.each([
    ["an empty table", []],
    ["a malformed pair", [["GB"]]],
    ["a blank label", [["GB", " "]]],
    ["more than 249 entries", Array.from({ length: 250 }, (_, index) => [
      `X${String(index).padStart(2, "0")}`,
      "Country",
    ])],
  ])("rejects %s", async (_description, result) => {
    mockInvoke.mockResolvedValue(result);

    render(<SearchCountrySelect onChange={vi.fn()} value={null} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load country choices");
  });

  it("uses English display names with a code fallback", () => {
    expect(searchCountryLabel("GB")).toBe("United Kingdom");
    expect(searchCountryLabel("not-a-code")).toBe("not-a-code");
  });
});
