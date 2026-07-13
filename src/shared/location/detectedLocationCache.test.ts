import { beforeEach, describe, expect, it } from "vitest";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type DetectedLocation,
} from "./detectedLocationCache";

describe("detected location cache", () => {
  const location: DetectedLocation = {
    city: "Denver",
    region: "Colorado",
    country: "United States",
    timezone: "America/Denver",
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("caches and reads a valid detected location", () => {
    cacheDetectedLocation(location);

    expect(readCachedDetectedLocation()).toEqual(location);
  });

  it("rejects malformed cached JSON", () => {
    window.sessionStorage.setItem("detected_location", "{");

    expect(readCachedDetectedLocation()).toBeNull();
    expect(window.sessionStorage.getItem("detected_location")).toBeNull();
  });

  it("rejects cached values with missing fields", () => {
    window.sessionStorage.setItem(
      "detected_location",
      JSON.stringify({ city: "Denver", region: "Colorado" }),
    );

    expect(readCachedDetectedLocation()).toBeNull();
    expect(window.sessionStorage.getItem("detected_location")).toBeNull();
  });
});
