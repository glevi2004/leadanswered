import { describe, it, expect } from "vitest";
import { DemoBus, SplitSmsSender } from "./demo.js";
import { CapturingSms } from "./testkit.js";

describe("SplitSmsSender", () => {
  it("tees owner-phone messages to the browser bus, keeps everything else on the real sender", async () => {
    const real = new CapturingSms();
    const bus = new DemoBus();
    const sms = new SplitSmsSender(real, new Set(["(617) 539-2063"]), bus);

    await sms.send("(617) 539-2063", "escalation for the owner"); // owner → browser buffer
    await sms.send("+19788105602", "reply for the homeowner"); // lead → real Twilio

    expect(bus.since(0).map((m) => ({ to: m.to, body: m.body }))).toEqual([
      { to: "(617) 539-2063", body: "escalation for the owner" },
    ]);
    expect(real.sent).toEqual([{ to: "+19788105602", body: "reply for the homeowner" }]);
  });
});
