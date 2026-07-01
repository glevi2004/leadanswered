import { describe, it, expect } from "vitest";
import { extractPhone } from "./ownerHandoff.js";

describe("extractPhone", () => {
  it("pulls a phone number out of messy free text", () => {
    expect(extractPhone("their contact is +5541991939881")).toBe("+5541991939881");
    expect(extractPhone("call the owner at (617) 555-1234 thanks")).toBe("6175551234");
    expect(extractPhone("owner: 617.555.1234")).toBe("6175551234");
    expect(extractPhone("the owner is Jane at 617-555-9090")).toBe("6175559090");
  });
  it("returns null when there's no plausible number", () => {
    expect(extractPhone("I'll ask them")).toBeNull();
    expect(extractPhone("apt 12")).toBeNull(); // too few digits
  });
});
