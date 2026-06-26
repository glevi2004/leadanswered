import { describe, it, expect } from "vitest";
import { geocodeZip, geocodeCity, normalizeZip, distanceMiles } from "./geo.js";

describe("geo", () => {
  it("normalizeZip extracts a 5-digit zip", () => {
    expect(normalizeZip("02458")).toBe("02458");
    expect(normalizeZip("02458-1234")).toBe("02458");
    expect(normalizeZip("zip is 02459 ok")).toBe("02459");
    expect(normalizeZip("nope")).toBeNull();
    expect(normalizeZip(null)).toBeNull();
  });

  it("geocodeZip returns a centroid for known zips, null otherwise", () => {
    const p = geocodeZip("02458")!; // Newton, MA
    expect(p.lat).toBeCloseTo(42.35, 1);
    expect(p.lng).toBeCloseTo(-71.19, 1);
    expect(geocodeZip("99999")).toBeNull();
    expect(geocodeZip("nope")).toBeNull();
  });

  it("geocodeCity resolves a city+state, flags ambiguous names, reports not_found", () => {
    const newton = geocodeCity("Newton", "MA");
    expect(newton.status).toBe("resolved");
    expect(newton.point!.lat).toBeCloseTo(42.35, 1);

    expect(geocodeCity("newton", "ma").status).toBe("resolved"); // case-insensitive

    const springfield = geocodeCity("Springfield"); // many states, none given
    expect(springfield.status).toBe("ambiguous");
    expect(springfield.states).toContain("MA");
    expect(springfield.states!.length).toBeGreaterThan(1);

    expect(geocodeCity("Nowhereville", "MA").status).toBe("not_found");
    expect(geocodeCity("").status).toBe("not_found");
  });

  it("distanceMiles is ~0 for the same point and grows with separation", () => {
    const newton = geocodeZip("02458")!;
    expect(distanceMiles(newton, newton)).toBeCloseTo(0, 5);
    const newtonCenter = geocodeZip("02459")!;
    const hyannis = geocodeZip("02601")!;
    expect(distanceMiles(newton, newtonCenter)).toBeLessThan(10);
    expect(distanceMiles(newton, hyannis)).toBeGreaterThan(40);
  });
});
