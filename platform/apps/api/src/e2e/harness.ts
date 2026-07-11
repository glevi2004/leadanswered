import { anthropic } from "@ai-sdk/anthropic";
import { NOTIFICATION_EVENT_TYPES, type OrganizationConfig } from "@leadanswered/core";
import { env } from "../env.js";
import { MemoryStore } from "../store/memoryStore.js";
import { CapturingEmail, CapturingSms } from "../testkit.js";
import { createLeadAndGreet } from "../leadService.js";
import { handleInbound } from "../conversationService.js";
import { testOrganization } from "../seed.js";
import type { RecipientRecord } from "../store/types.js";

/** E2E tests hit the REAL Claude API. They're gated: dormant unless RUN_E2E is set (see e2e/README.md). */
export const RUN_E2E = !!process.env.RUN_E2E;

/** The organization's own phone — used to assert notification/hand-off/escalation pings. */
export const OWNER_PHONE = "+18335559999";
/** Default recipient: subscribed to EVERY event so any notification is assertable in a scenario. */
const DEFAULT_RECIPIENTS: RecipientRecord[] = [
  {
    id: "recip_owner",
    name: "Marcus (owner)",
    phone: OWNER_PHONE,
    email: "marcus@apexroofing.example",
    subscriptions: NOTIFICATION_EVENT_TYPES.map((eventType) => ({ eventType, channels: "both" as const })),
  },
];

function requireApiKey(): void {
  if (!env.ANTHROPIC_API_KEY)
    throw new Error("E2E tests need ANTHROPIC_API_KEY — set it in apps/api/.env, then run with RUN_E2E=1.");
}

export interface ConversationOpts {
  organization?: OrganizationConfig;
  recipients?: RecipientRecord[];
  /** Fixed clock (ISO) so availability is deterministic relative to `now`. */
  now: string;
  customerPhone?: string;
  customerName?: string;
  projectHint?: string | null;
  allowColdInbound?: boolean;
}

export interface Conversation {
  leadId: string;
  opening: string;
  store: MemoryStore;
  sms: CapturingSms;
  email: CapturingEmail;
  organization: OrganizationConfig;
  customerPhone: string;
  /** The customer texts `body`; returns Sarah's reply ("" if skipped/error). */
  say(body: string): Promise<string>;
  /** Re-send the same providerSid to simulate a duplicate webhook. */
  sayRaw(body: string, providerSid: string): Promise<{ status: string; reply?: string }>;
  /** A organization recipient texts back (e.g. answering an escalation). */
  ownerReply(body: string, fromRecipientPhone: string): Promise<{ status: string; reply?: string }>;
  status(): Promise<string>;
  appointments(): ReturnType<MemoryStore["getAppointments"]>;
  escalations(): ReturnType<MemoryStore["getEscalations"]>;
  /** The id→ISO map of times last offered (written by check_availability) — for tz assertions. */
  offeredSlots(): Promise<Record<string, string>>;
  transcript(): Promise<string>;
  /** SMS sent to organization recipients (notifications, hand-off, escalation). */
  ownerSms(): { to: string; body: string }[];
  /** SMS sent to the customer (Sarah's replies + escalation relays). */
  customerSms(): { to: string; body: string }[];
}

/** Start a real-Claude conversation: seed store + inject anthropic model, fire the opening greeting. */
export async function startConversation(opts: ConversationOpts): Promise<Conversation> {
  requireApiKey();
  const organization = opts.organization ?? testOrganization;
  const recips = opts.recipients ?? DEFAULT_RECIPIENTS;
  const recipPhones = new Set(recips.map((r) => r.phone).filter(Boolean) as string[]);

  const store = new MemoryStore();
  store.seedOrganization(organization, recips);
  const sms = new CapturingSms();
  const email = new CapturingEmail();
  const now = () => new Date(opts.now);
  const model = anthropic(env.AI_MODEL);
  const customerPhone = opts.customerPhone ?? "+15555550100";
  const deps = { store, model, sms, email, now, allowColdInbound: opts.allowColdInbound };
  const toNumber = organization.twilioNumber!;
  let sid = 0;

  const { leadId, opening } = await createLeadAndGreet(deps, {
    organizationId: organization.id,
    contactName: opts.customerName ?? "Test Customer",
    contactPhone: customerPhone,
    projectHint: opts.projectHint ?? null,
  });

  return {
    leadId,
    opening,
    store,
    sms,
    email,
    organization,
    customerPhone,
    async say(body) {
      const r = await handleInbound(deps, { toNumber, fromNumber: customerPhone, body, providerSid: `E2E-${++sid}` });
      return r.status === "ok" ? (r.reply ?? "") : "";
    },
    sayRaw(body, providerSid) {
      return handleInbound(deps, { toNumber, fromNumber: customerPhone, body, providerSid });
    },
    ownerReply(body, fromRecipientPhone) {
      return handleInbound(deps, { toNumber, fromNumber: fromRecipientPhone, body, providerSid: `E2E-C-${++sid}` });
    },
    async status() {
      const ctx = await store.getContextByLeadId(leadId);
      return ctx?.lead.status ?? "unknown";
    },
    appointments: () => store.getAppointments(),
    escalations: () => store.getEscalations(),
    async offeredSlots() {
      const ctx = await store.getContextByLeadId(leadId);
      return ctx?.conversation.gathered?.offeredSlots ?? {};
    },
    async transcript() {
      const ctx = await store.getContextByLeadId(leadId);
      return (ctx?.messages ?? [])
        .filter((m) => m.body && m.body.trim())
        .map((m) => `${m.direction === "inbound" ? "Customer" : "Sarah"}: ${m.body}`)
        .join("\n");
    },
    ownerSms: () => sms.sent.filter((s) => recipPhones.has(s.to)),
    customerSms: () => sms.sent.filter((s) => s.to === customerPhone),
  };
}
