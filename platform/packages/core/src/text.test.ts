import { describe, it, expect } from "vitest";
import { sanitizeReply } from "./text.js";

describe("sanitizeReply", () => {
  it("replaces em-dashes with a spaced hyphen", () => {
    expect(sanitizeReply("Thanks for choosing Apex — see you then!")).toBe(
      "Thanks for choosing Apex - see you then!",
    );
  });

  it("replaces en-dashes too", () => {
    expect(sanitizeReply("9am–5pm")).toBe("9am - 5pm");
  });

  it("collapses doubled spaces and trims", () => {
    expect(sanitizeReply("  Hello   there  ")).toBe("Hello there");
  });

  it("leaves clean multi-line text intact (each slot on its own line)", () => {
    const t = "Here are some times:\nMonday 9am\nTuesday 11am";
    expect(sanitizeReply(t)).toBe(t);
  });

  it("contains no em/en dash after sanitizing", () => {
    expect(sanitizeReply("a — b – c")).not.toMatch(/[—–]/);
  });
});
