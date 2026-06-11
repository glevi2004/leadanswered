import { describe, it, expect } from "vitest";
import { geocodeZip, normalizeZip, distanceMiles } from "./geo.js";

describe("geo", () => {
  it("normalizeZip extracts a 5-digit zip", () => {
    expect(normalizeZip("75024")).toBe("75024");
    expect(normalizeZip("75024-1234")).toBe("75024");
    expect(normalizeZip("zip is 75093 ok")).toBe("75093");
    expect(normalizeZip("nope")).toBeNull();
    expect(normalizeZip(null)).toBeNull();
  });

  it("geocodeZip returns a centroid for known zips, null otherwise", () => {
    expect(geocodeZip("75024")).toEqual({ lat: 33.078, lng: -96.747 });
    expect(geocodeZip("99999")).toBeNull();
  });

  it("distanceMiles is ~0 for the same point and grows with separation", () => {
    const a = { lat: 33.078, lng: -96.747 };
    expect(distanceMiles(a, a)).toBeCloseTo(0, 5);
    const plano = geocodeZip("75093")!;
    const houston = geocodeZip("77002")!;
    expect(distanceMiles(a, plano)).toBeLessThan(10);
    expect(distanceMiles(a, houston)).toBeGreaterThan(150);
  });
});
