import { describe, it, expect, vi } from "vitest";
import {
  selectDeliveries,
  sendNotifications,
  type Recipient,
  type SmsSender,
} from "./notifications.js";

const owner: Recipient = {
  id: "r1",
  name: "Owner",
  phone: "+18335550001",
  email: "owner@apex.com",
  subscriptions: [
    { eventType: "booking_confirmed", channels: "both" },
    { eventType: "new_qualified_lead", channels: "both" },
  ],
};
const officeSmsOnly: Recipient = {
  id: "r2",
  name: "Office",
  phone: "+18335550002",
  email: "office@apex.com",
  subscriptions: [{ eventType: "booking_confirmed", channels: "sms" }],
};

describe("selectDeliveries (SCOPE §5.2)", () => {
  it("routes booking_confirmed to both channels for the owner, sms-only for the office", () => {
    const d = selectDeliveries("booking_confirmed", [owner, officeSmsOnly]);
    expect(d).toContainEqual({ recipient: owner, channel: "sms" });
    expect(d).toContainEqual({ recipient: owner, channel: "email" });
    expect(d).toContainEqual({ recipient: officeSmsOnly, channel: "sms" });
    expect(d.filter((x) => x.recipient === officeSmsOnly && x.channel === "email")).toHaveLength(0);
  });

  it("opt-in events don't fire to non-subscribers", () => {
    // neither recipient is subscribed to disqualified_lead
    expect(selectDeliveries("disqualified_lead", [owner, officeSmsOnly])).toHaveLength(0);
  });

  it("skips a channel the recipient has no address for", () => {
    const noEmail: Recipient = { ...owner, email: null };
    const d = selectDeliveries("booking_confirmed", [noEmail]);
    expect(d).toEqual([{ recipient: noEmail, channel: "sms" }]);
  });
});

describe("sendNotifications", () => {
  it("delivers to subscribed channels and reports counts", async () => {
    const sms: SmsSender = { send: vi.fn().mockResolvedValue(undefined) };
    const email = { send: vi.fn().mockResolvedValue(undefined) };
    const res = await sendNotifications(
      "booking_confirmed",
      [owner],
      { subject: "s", smsBody: "sms", emailBody: "email" },
      { sms, email },
    );
    expect(res).toEqual({ sent: 2, failed: 0 });
    expect(sms.send).toHaveBeenCalledWith("+18335550001", "sms");
    expect(email.send).toHaveBeenCalledWith("owner@apex.com", "s", "email");
  });

  it("a failing send is counted but never throws (must not block the conversation)", async () => {
    const sms: SmsSender = { send: vi.fn().mockRejectedValue(new Error("twilio down")) };
    const res = await sendNotifications(
      "booking_confirmed",
      [officeSmsOnly],
      { subject: "s", smsBody: "sms", emailBody: "email" },
      { sms },
    );
    expect(res).toEqual({ sent: 0, failed: 1 });
  });
});
