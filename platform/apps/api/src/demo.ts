import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import type { SmsSender } from "@leadanswered/core";
import { handleInbound, type ConversationDeps } from "./conversationService.js";

/**
 * Demo harness (NOT a product feature): put the contractor's OWNER thread on a browser phone that
 * behaves exactly like their real number. Messages Sarah sends the owner are teed to the browser
 * instead of Twilio; text typed in the browser is injected through the REAL inbound path, so Sarah
 * reacts identically to a real contractor SMS. Only the transport for that one thread changes.
 * Enabled only when DEMO_TOKEN is set. See SCOPE §5.3.
 */

export interface DemoOwnerMessage {
  to: string;
  body: string;
  ts: number;
}

interface BufferedMessage extends DemoOwnerMessage {
  seq: number;
}

/**
 * In-process ring buffer of owner-bound messages. SplitSmsSender publishes; the browser polls
 * `/messages?since=<seq>` on a short interval. Buffering (vs raw SSE) means a brief network/proxy
 * hiccup on the browser never loses a message — the next poll catches up from the cursor.
 */
export class DemoBus {
  private buf: BufferedMessage[] = [];
  private seq = 0;
  private cap = 200;
  publish(msg: DemoOwnerMessage): void {
    this.seq += 1;
    this.buf.push({ ...msg, seq: this.seq });
    if (this.buf.length > this.cap) this.buf.shift();
  }
  /** Current cursor (highest seq handed out). */
  latest(): number {
    return this.seq;
  }
  /** Every buffered message newer than `since`. */
  since(since: number): BufferedMessage[] {
    return this.buf.filter((m) => m.seq > since);
  }
}

/**
 * Wraps the real SMS sender. A message addressed to a demo-owner phone is teed to the browser
 * (DemoBus) and NOT sent over Twilio; everything else (the LEAD's texts, relays to the homeowner)
 * goes out for real. So the owner's assistant thread shows up in the demo phone while the customer
 * still gets real SMS on their actual device.
 */
export class SplitSmsSender implements SmsSender {
  constructor(
    private real: SmsSender,
    private demoPhones: Set<string>,
    private bus: DemoBus,
  ) {}
  async send(to: string, body: string): Promise<void> {
    if (this.demoPhones.has(to)) {
      this.bus.publish({ to, body, ts: Date.now() });
      return;
    }
    await this.real.send(to, body);
  }
}

export interface DemoConfig {
  /** Shared secret gating all /demo endpoints. */
  token: string;
  /** The contractor's Sarah/assistant number — the inbound "To" when we inject an owner reply. */
  twilioNumber: string;
  /** The owner's recipient phone — the inbound "From" (so `maybeRelayContractorReply` matches it). */
  ownerPhone: string;
}

/** The live contractor phone, in a browser. Same backend; one thread delivered over a browser. */
export function createDemoRouter(deps: ConversationDeps, bus: DemoBus, cfg: DemoConfig): Router {
  const router = Router();
  const authed = (req: Request): boolean =>
    req.query.key === cfg.token || req.get("x-demo-token") === cfg.token;

  // The phone page (reuses the landing-page iMessage look).
  router.get("/contractor", (req: Request, res: Response) => {
    if (!authed(req)) return void res.status(401).send("unauthorized");
    res.type("html").send(phonePage(cfg.token));
  });

  // Owner-bound messages since a cursor (browser polls this). No `since` = just the current
  // cursor (a baseline call on page load, so the thread starts clean without old backlog).
  router.get("/contractor/messages", (req: Request, res: Response) => {
    if (!authed(req)) return void res.status(401).end();
    const raw = req.query.since;
    const since = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
    if (!Number.isFinite(since)) return void res.json({ latest: bus.latest(), messages: [] });
    const messages = bus.since(since).map((m) => ({ seq: m.seq, body: m.body, ts: m.ts }));
    res.json({ latest: bus.latest(), messages });
  });

  // Owner reply → injected through the REAL inbound path (identical to a contractor SMS).
  router.post("/contractor/send", async (req: Request, res: Response) => {
    if (!authed(req)) return void res.status(401).end();
    const text = String(req.body?.text ?? "").trim();
    if (!text) return void res.status(400).json({ error: "empty" });
    try {
      await handleInbound(deps, {
        toNumber: cfg.twilioNumber,
        fromNumber: cfg.ownerPhone,
        body: text,
        providerSid: `demo-${randomUUID()}`,
      });
      res.json({ ok: true });
    } catch (e) {
      console.error("[demo] owner send failed:", e);
      res.status(500).json({ error: "failed" });
    }
  });

  return router;
}

/** Self-contained phone page — the landing-page iMessage bubbles + a live SSE thread + composer. */
function phonePage(token: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Owner phone</title>
<style>
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #d9dbe1; font-family: -apple-system, "SF Pro Text", system-ui, "Inter", sans-serif;
  }
  .phone { width: 390px; height: 780px; background: #fff; border-radius: 46px;
    box-shadow: 0 30px 80px rgba(16,24,40,.28); overflow: hidden; display: flex; flex-direction: column;
    border: 10px solid #111; }
  .hdr { text-align: center; padding: 12px 0 10px; border-bottom: 1px solid #e9e9eb; }
  .hdr .av { width: 44px; height: 44px; border-radius: 50%; margin: 4px auto 5px;
    background: #34c759; color: #fff; font-weight: 700; font-size: 18px;
    display: flex; align-items: center; justify-content: center; }
  .hdr .nm { font-size: 12.5px; color: #1b1b1f; font-weight: 600; }
  .thread { flex: 1; overflow-y: auto; padding: 14px 12px 8px; display: flex; flex-direction: column; gap: 3px; background: #fff; }
  .row { display: flex; }
  .row.them { justify-content: flex-start; }
  .row.me { justify-content: flex-end; }
  .msg { position: relative; max-width: 75%; padding: 7px 13px 8px; border-radius: 18px;
    font-size: 15px; line-height: 1.32; word-wrap: break-word; white-space: pre-wrap; margin: 3px 3px; }
  .msg-them { background: #e9e9eb; color: #1b1b1f; }
  .msg-me { background: #34c759; color: #fff; }
  .msg-them::before { content:""; position:absolute; z-index:0; bottom:0; left:-7px; height:19px; width:19px; background:#e9e9eb; border-bottom-right-radius:16px; }
  .msg-them::after  { content:""; position:absolute; z-index:1; bottom:0; left:-11px; height:19px; width:11px; background:#fff; border-bottom-right-radius:11px; }
  .msg-me::before   { content:""; position:absolute; z-index:0; bottom:0; right:-7px; height:19px; width:19px; background:#34c759; border-bottom-left-radius:16px; }
  .msg-me::after    { content:""; position:absolute; z-index:1; bottom:0; right:-11px; height:19px; width:11px; background:#fff; border-bottom-left-radius:11px; }
  .composer { display: flex; gap: 8px; padding: 9px 12px 16px; border-top: 1px solid #e9e9eb; }
  .composer input { flex: 1; border: 1px solid #d1d1d6; border-radius: 20px; padding: 9px 14px; font: inherit; font-size: 15px; outline: none; }
  .composer button { border: none; background: #34c759; color: #fff; width: 38px; height: 38px; border-radius: 50%; font-size: 18px; cursor: pointer; }
  .composer button:disabled { opacity: .4; }
</style>
</head>
<body>
  <div class="phone">
    <div class="hdr"><div class="av">A</div><div class="nm">Lead Answered</div></div>
    <div class="thread" id="thread"></div>
    <form class="composer" id="composer" autocomplete="off">
      <input id="input" placeholder="Text Message" />
      <button type="submit" id="send">&#8593;</button>
    </form>
  </div>
<script>
  const TOKEN = ${JSON.stringify(token)};
  const thread = document.getElementById("thread");
  function bubble(text, side) {
    const row = document.createElement("div"); row.className = "row " + side;
    const b = document.createElement("div"); b.className = "msg msg-" + (side === "me" ? "me" : "them");
    b.textContent = text; row.appendChild(b); thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  }
  const KEY = encodeURIComponent(TOKEN);
  let cursor = 0;
  async function tick() {
    try {
      const r = await fetch("/demo/contractor/messages?key=" + KEY + "&since=" + cursor);
      const d = await r.json();
      for (const m of (d.messages || [])) bubble(m.body, "them");
      if (typeof d.latest === "number") cursor = d.latest;
    } catch (_) {}
  }
  // Baseline from the current cursor so only NEW messages show (clean thread on every reload).
  fetch("/demo/contractor/messages?key=" + KEY)
    .then((r) => r.json())
    .then((d) => { cursor = d.latest || 0; })
    .catch(() => {})
    .finally(() => setInterval(tick, 1500));
  const form = document.getElementById("composer"), input = document.getElementById("input");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = ""; bubble(text, "me");
    try {
      await fetch("/demo/contractor/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-token": TOKEN },
        body: JSON.stringify({ text }),
      });
    } catch (_) {}
  });
</script>
</body>
</html>`;
}
