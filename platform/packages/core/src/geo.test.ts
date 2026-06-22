import { describe, it, expect } from "vitest";
import { geocodeZip, normalizeZip, distanceMiles } from "./geo.js";

describe("geo", () => {
  it("normalizeZip extracts a 5-digit zip", () => {
    expect(normalizeZip("02458")).toBe("02458");
    expect(normalizeZip("02458-1234")).toBe("02458");
    expect(normalizeZip("zip is 02459 ok")).toBe("02459");
    expect(normalizeZip("nope")).toBeNull();
    expect(normalizeZip(null)).toBeNull();
  });

  it("geocodeZip returns a centroid for known zips, null otherwise", () => {
    expect(geocodeZip("02458")).toEqual({ lat: 42.351, lng: -71.205 });
    expect(geocodeZip("99999")).toBeNull();
  });

  it("distanceMiles is ~0 for the same point and grows with separation", () => {
    const a = { lat: 42.351, lng: -71.205 }; // Newton
    expect(distanceMiles(a, a)).toBeCloseTo(0, 5);
    const newtonCenter = geocodeZip("02459")!;
    const hyannis = geocodeZip("02601")!;
    expect(distanceMiles(a, newtonCenter)).toBeLessThan(10);
    expect(distanceMiles(a, hyannis)).toBeGreaterThan(40);
  });
});
