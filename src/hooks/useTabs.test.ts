import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabs } from "./useTabs";

type TestTabId = "overview" | "skills" | "companies";

const testTabs = [
  { id: "overview" as const, label: "Overview", icon: "📊" },
  { id: "skills" as const, label: "Skills", icon: "🔧", badge: 5 },
  { id: "companies" as const, label: "Companies", icon: "🏢" },
];

describe("useTabs", () => {
  it("should initialize with default tab", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );
    expect(result.current.activeTab).toBe("overview");
  });

  it("should change active tab", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    act(() => {
      result.current.setActiveTab("skills");
    });

    expect(result.current.activeTab).toBe("skills");
  });

  it("should call onChange callback when tab changes", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview", onChange })
    );

    act(() => {
      result.current.setActiveTab("companies");
    });

    expect(onChange).toHaveBeenCalledWith("companies");
  });

  it("should check if tab is active", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    expect(result.current.isActive("overview")).toBe(true);
    expect(result.current.isActive("skills")).toBe(false);
  });

  it("should return correct tab props", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const tabProps = result.current.getTabProps(testTabs[0]);

    expect(tabProps).toMatchObject({
      role: "tab",
      "aria-selected": true,
      "aria-controls": "overview-panel",
      id: "overview-tab",
    });
  });

  it("should return correct panel props", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const panelProps = result.current.getPanelProps("overview");

    expect(panelProps).toMatchObject({
      role: "tabpanel",
      "aria-labelledby": "overview-tab",
      id: "overview-panel",
      hidden: false,
    });
  });

  it("should hide inactive panel", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const panelProps = result.current.getPanelProps("skills");

    expect(panelProps.hidden).toBe(true);
  });

  it("should handle tab click in getTabProps", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const tabProps = result.current.getTabProps(testTabs[1]);

    act(() => {
      tabProps.onClick();
    });

    expect(result.current.activeTab).toBe("skills");
  });

  it("should not change tab if disabled", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const disabledTab = { ...testTabs[1], disabled: true };
    const tabProps = result.current.getTabProps(disabledTab);

    act(() => {
      tabProps.onClick();
    });

    expect(result.current.activeTab).toBe("overview");
  });

  it("should include disabled attribute for disabled tabs", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const disabledTab = { ...testTabs[1], disabled: true };
    const tabProps = result.current.getTabProps(disabledTab);

    expect(tabProps.disabled).toBe(true);
  });

  it("should update aria-selected when tab changes", () => {
    const { result } = renderHook(() =>
      useTabs<TestTabId>({ defaultTab: "overview" })
    );

    const initialProps = result.current.getTabProps(testTabs[1]);
    expect(initialProps["aria-selected"]).toBe(false);

    act(() => {
      result.current.setActiveTab("skills");
    });

    const updatedProps = result.current.getTabProps(testTabs[1]);
    expect(updatedProps["aria-selected"]).toBe(true);
  });
});
