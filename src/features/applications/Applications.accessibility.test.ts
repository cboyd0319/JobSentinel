import { closestCorners } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";
import { APPLICATION_DRAG_COLLISION_DETECTION } from "./applicationsDnd";

describe("Applications drag and drop accessibility", () => {
  it("uses a collision strategy that works for keyboard dragging", () => {
    expect(APPLICATION_DRAG_COLLISION_DETECTION).toBe(closestCorners);
  });
});
