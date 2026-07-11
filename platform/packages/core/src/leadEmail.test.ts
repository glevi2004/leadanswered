import { describe, it, expect } from "vitest";
import {
  parseLeadEmail,
  normalizePhone,
  slugFromLeadAddress,
  organizationLeadAddress,
} from "./leadEmail.js";

describe("normalizePhone", () => {
  it("normalizes a 10-digit US number to E.164", () => {
    expect(normalizePhone("(978) 810-5602")).toBe("+19788105602");
  });
  it("handles a leading 1", () => {
    expect(normalizePhone("1-978-810-5602")).toBe("+19788105602");
  });
  it("rejects too-short / non-numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
  });
});

describe("slugFromLeadAddress", () => {
  it("extracts the slug from leads+{slug}@domain", () => {
    expect(slugFromLeadAddress("leads+apex@leads.leadanswered.com")).toBe("apex");
  });
  it("handles a display-name wrapped address", () => {
    expect(slugFromLeadAddress("Apex Leads <leads+apex@leads.leadanswered.com>")).toBe("apex");
  });
  it("enforces the domain when provided", () => {
    expect(slugFromLeadAddress("leads+apex@evil.com", "leads.leadanswered.com")).toBeNull();
    expect(slugFromLeadAddress("leads+apex@leads.leadanswered.com", "leads.leadanswered.com")).toBe("apex");
  });
  it("returns null for a non-lead address", () => {
    expect(slugFromLeadAddress("hello@leadanswered.com")).toBeNull();
  });
  it("round-trips with organizationLeadAddress", () => {
    const addr = organizationLeadAddress("apex", "leads.leadanswered.com");
    expect(slugFromLeadAddress(addr)).toBe("apex");
  });
});

describe("parseLeadEmail", () => {
  it("parses a generic labeled contact-form notification (text body)", () => {
    const r = parseLeadEmail({
      subject: "New lead from your website",
      textBody: [
        "You have a new contact form submission:",
        "Name: John Smith",
        "Email: john@example.com",
        "Phone: (978) 810-5602",
        "Message: My roof is leaking after the storm, need someone to look at it.",
      ].join("\n"),
    });
    expect(r.contactName).toBe("John Smith");
    expect(r.contactPhone).toBe("+19788105602");
    expect(r.projectHint).toMatch(/roof is leaking/i);
  });

  it("does not mistake the company-name line for the contact name", () => {
    const r = parseLeadEmail({
      textBody: ["Company Name: Acme LLC", "Name: Jane Doe", "Phone: 617-539-2063"].join("\n"),
    });
    expect(r.contactName).toBe("Jane Doe");
    expect(r.contactPhone).toBe("+16175392063");
  });

  it("parses an HTML-only body", () => {
    const r = parseLeadEmail({
      subject: "Website inquiry",
      htmlBody:
        "<div><p><strong>Name:</strong> Maria Lopez</p><p><strong>Cell:</strong> 9788105602</p><p><strong>Project:</strong> Full roof replacement quote</p></div>",
    });
    expect(r.contactName).toBe("Maria Lopez");
    expect(r.contactPhone).toBe("+19788105602");
    expect(r.projectHint).toMatch(/roof replacement/i);
  });

  it("falls back to a cleaned subject for the project hint when no message field", () => {
    const r = parseLeadEmail({
      subject: "New lead from website: gutter cleaning",
      textBody: "Name: Bob\nPhone: 978.810.5602",
    });
    expect(r.projectHint).toBe("gutter cleaning");
  });

  it("returns null phone (graceful) when no plausible number is present", () => {
    const r = parseLeadEmail({ subject: "Hi", textBody: "Name: Sam\nMessage: please call me" });
    expect(r.contactPhone).toBeNull();
    expect(r.contactName).toBe("Sam");
  });
});
