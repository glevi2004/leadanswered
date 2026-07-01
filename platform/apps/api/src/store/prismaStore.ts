import { getPrisma } from "@leadanswered/db";
import type {
  ContractorConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
  TimeRange,
} from "@leadanswered/core";
import { createConversationLock } from "./conversationLock.js";
import type {
  AppointmentPatch,
  AppointmentRecord,
  BookOutcome,
  ConversationRecord,
  CreateLeadInput,
  LeadContext,
  LeadFieldPatch,
  LeadRecord,
  MessageRecord,
  RecipientRecord,
  Store,
} from "./types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToContractor(r: any): ContractorConfig {
  return {
    id: r.id,
    name: r.name,
    companyName: r.companyName,
    sarahName: r.sarahName,
    personaNotes: r.sarahPersonaNotes,
    projectTypes: r.projectTypes,
    serviceArea: {
      baseLocations: (r.baseLocations as any) ?? [],
      includeOverrides: r.includeOverrides,
      excludeOverrides: r.excludeOverrides,
    },
    qualificationRules: (r.qualificationRules as any) ?? {},
    standingAvailability: (r.standingAvailability as any) ?? { timezone: "UTC", windows: [] },
    twilioNumber: r.twilioNumber,
    slug: r.slug ?? null,
    escalationTopics: r.escalationTopics?.length ? r.escalationTopics : null,
  };
}

function mapLead(l: any): LeadRecord {
  return {
    id: l.id,
    contractorId: l.contractorId,
    contactName: l.contactName,
    contactPhone: l.contactPhone,
    projectHint: l.projectHint,
    serviceTown: l.serviceTown,
    serviceZip: l.serviceZip,
    fullAddress: l.fullAddress,
    status: l.status,
  };
}

function mapConv(c: any): ConversationRecord {
  return { id: c.id, leadId: c.leadId, state: c.state as Stage, gathered: (c.gathered as GatheredInfo) ?? {} };
}

function mapMsg(m: any): MessageRecord {
  return { id: m.id, conversationId: m.conversationId, direction: m.direction, body: m.body, providerSid: m.providerSid };
}

function mapAppt(a: any): AppointmentRecord {
  return {
    id: a.id,
    leadId: a.leadId,
    contractorId: a.contractorId,
    startIso: a.startAt.toISOString(),
    endIso: a.endAt.toISOString(),
    status: a.status,
  };
}

/**
 * Classify a Postgres integrity-constraint error from a booking write. Our constraints
 * (defined in the migration) put their names in the error detail, so we match on them.
 * Returns null for anything that isn't one of our booking conflicts (re-thrown).
 */
function classifyAppointmentConflict(e: unknown): "slot_taken" | "lead_has_active" | null {
  const err = e as any;
  const blob = `${err?.message ?? ""} ${JSON.stringify(err?.meta ?? "")} ${String(err?.cause ?? "")}`;
  if (blob.includes("appt_one_active_per_lead")) return "lead_has_active";
  if (blob.includes("appt_no_overlap_per_contractor") || blob.includes("appt_unique_active_start_per_contractor"))
    return "slot_taken";
  // 23P01 = exclusion_violation, 23505 = unique_violation; P2002 = Prisma unique. Default to slot_taken.
  if (blob.includes("23P01") || blob.includes("23505") || err?.code === "P2002") return "slot_taken";
  return null;
}

/** Production Store backed by Postgres via Prisma. Only constructed when DATABASE_URL is set. */
export class PrismaStore implements Store {
  private db = getPrisma();
  private lock = createConversationLock();

  withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T> {
    return this.lock(conversationId, fn);
  }

  async getContractor(id: string): Promise<ContractorConfig | null> {
    const r = await this.db.contractor.findUnique({ where: { id } });
    return r ? rowToContractor(r) : null;
  }

  async getContractorByTwilioNumber(toNumber: string): Promise<ContractorConfig | null> {
    const r = await this.db.contractor.findFirst({ where: { twilioNumber: toNumber } });
    return r ? rowToContractor(r) : null;
  }

  async getContractorBySlug(slug: string): Promise<ContractorConfig | null> {
    const r = await this.db.contractor.findUnique({ where: { slug } });
    return r ? rowToContractor(r) : null;
  }

  async findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null> {
    const l = await this.db.lead.findUnique({ where: { sourceMessageId }, select: { id: true } });
    return l ?? null;
  }

  async getRecipients(contractorId: string): Promise<RecipientRecord[]> {
    const rs = await this.db.notificationRecipient.findMany({
      where: { contractorId },
      include: { subscriptions: true },
    });
    return rs.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      subscriptions: r.subscriptions.map((s) => ({
        eventType: s.eventType as NotificationEventType,
        channels: s.channels as "sms" | "email" | "both",
      })),
    }));
  }

  async createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext> {
    const contractor = await this.getContractor(input.contractorId);
    if (!contractor) throw new Error(`unknown contractor ${input.contractorId}`);
    const lead = await this.db.lead.create({
      data: {
        contractorId: input.contractorId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        projectHint: input.projectHint ?? null,
        source: input.source ?? "manual",
        sourceMessageId: input.sourceMessageId ?? null,
        status: "new",
      },
    });
    const gathered: GatheredInfo = { projectType: input.projectHint ?? null };
    const conv = await this.db.conversation.create({
      data: { leadId: lead.id, state: "greeting", gathered: gathered as any },
    });
    return { lead: mapLead(lead), contractor, conversation: mapConv(conv), messages: [] };
  }

  async findActiveContextByPhones(toNumber: string, fromNumber: string): Promise<LeadContext | null> {
    const contractor = await this.db.contractor.findFirst({ where: { twilioNumber: toNumber } });
    if (!contractor) return null;
    const lead = await this.db.lead.findFirst({
      where: { contractorId: contractor.id, contactPhone: fromNumber, conversation: { state: { not: "done" } } },
      orderBy: { createdAt: "desc" },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!lead || !lead.conversation) return null;
    return {
      lead: mapLead(lead),
      contractor: rowToContractor(contractor),
      conversation: mapConv(lead.conversation),
      messages: lead.conversation.messages.map(mapMsg),
    };
  }

  async getContextByLeadId(leadId: string): Promise<LeadContext | null> {
    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!lead || !lead.conversation) return null;
    const contractor = await this.getContractor(lead.contractorId);
    if (!contractor) return null;
    return {
      lead: mapLead(lead),
      contractor,
      conversation: mapConv(lead.conversation),
      messages: lead.conversation.messages.map(mapMsg),
    };
  }

  async appendInboundIdempotent(
    conversationId: string,
    msg: { body: string; providerSid?: string | null },
  ): Promise<{ inserted: boolean }> {
    try {
      await this.db.message.create({
        data: { conversationId, direction: "inbound", body: msg.body, providerSid: msg.providerSid ?? null },
      });
      return { inserted: true };
    } catch (e) {
      if ((e as any)?.code === "P2002") return { inserted: false }; // duplicate providerSid → already handled
      throw e;
    }
  }

  async appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord> {
    const m = await this.db.message.create({
      data: { conversationId, direction: msg.direction, body: msg.body, providerSid: msg.providerSid ?? null },
    });
    return mapMsg(m);
  }

  async transitionLeadStatus(leadId: string, from: string[], to: string): Promise<boolean> {
    const r = await this.db.lead.updateMany({
      where: { id: leadId, status: { in: from as any } },
      data: { status: to as any },
    });
    return r.count > 0;
  }

  async updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void> {
    await this.db.lead.update({
      where: { id: leadId },
      data: {
        projectHint: patch.projectHint,
        serviceTown: patch.serviceTown,
        serviceZip: patch.serviceZip,
        fullAddress: patch.fullAddress,
        status: patch.status as any,
      },
    });
  }

  async updateConversation(
    conversationId: string,
    patch: { state?: Stage; gathered?: GatheredInfo },
  ): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: { state: patch.state as any, gathered: patch.gathered as any },
    });
  }

  async bookAppointment(input: {
    leadId: string;
    contractorId: string;
    startIso: string;
    endIso: string;
    timezone: string;
  }): Promise<BookOutcome> {
    try {
      const a = await this.db.$transaction(async (tx) => {
        const appt = await tx.appointment.create({
          data: {
            leadId: input.leadId,
            contractorId: input.contractorId,
            startAt: new Date(input.startIso),
            endAt: new Date(input.endIso),
            timezone: input.timezone,
            status: "confirmed",
          },
        });
        await tx.lead.update({ where: { id: input.leadId }, data: { status: "booked" } });
        await tx.conversation.update({ where: { leadId: input.leadId }, data: { state: "booked" } });
        return appt;
      });
      return { ok: true, id: a.id, startIso: a.startAt.toISOString(), endIso: a.endAt.toISOString() };
    } catch (e) {
      const reason = classifyAppointmentConflict(e);
      if (reason) return { ok: false, reason };
      throw e;
    }
  }

  async getBusyTimes(
    contractorId: string,
    window: { startIso: string; endIso: string },
  ): Promise<TimeRange[]> {
    const rows = await this.db.appointment.findMany({
      where: {
        contractorId,
        status: { in: ["proposed", "confirmed"] },
        startAt: { lt: new Date(window.endIso) },
        endAt: { gt: new Date(window.startIso) },
      },
      select: { startAt: true, endAt: true },
    });
    return rows.map((r) => ({ startAt: r.startAt, endAt: r.endAt }));
  }

  async getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null> {
    const a = await this.db.appointment.findFirst({
      where: { leadId, status: { in: ["confirmed", "proposed"] } },
      orderBy: { createdAt: "desc" },
    });
    return a ? mapAppt(a) : null;
  }

  async rescheduleAppointment(id: string, startIso: string, endIso: string): Promise<BookOutcome> {
    try {
      const a = await this.db.$transaction(async (tx) => {
        const cur = await tx.appointment.findUnique({ where: { id } });
        if (!cur) throw new Error(`appointment ${id} not found`);
        return tx.appointment.update({
          where: { id },
          data: {
            startAt: new Date(startIso),
            endAt: new Date(endIso),
            status: "confirmed",
            rescheduledFromIso: cur.startAt,
          },
        });
      });
      return { ok: true, id: a.id, startIso: a.startAt.toISOString(), endIso: a.endAt.toISOString() };
    } catch (e) {
      const reason = classifyAppointmentConflict(e);
      if (reason) return { ok: false, reason };
      throw e;
    }
  }

  async updateAppointment(id: string, patch: AppointmentPatch): Promise<void> {
    await this.db.appointment.update({
      where: { id },
      data: {
        startAt: patch.startIso !== undefined ? new Date(patch.startIso) : undefined,
        endAt: patch.endIso !== undefined ? new Date(patch.endIso) : undefined,
        status: patch.status as any,
        rescheduledFromIso:
          patch.rescheduledFromIso != null
            ? new Date(patch.rescheduledFromIso)
            : patch.rescheduledFromIso === null
              ? null
              : undefined,
        cancelledAt:
          patch.cancelledAt != null ? new Date(patch.cancelledAt) : patch.cancelledAt === null ? null : undefined,
        cancelReason: patch.cancelReason,
      },
    });
  }

  async createEscalation(input: {
    leadId: string;
    contractorId: string;
    conversationId: string;
    question: string;
  }) {
    const e = await this.db.escalation.create({ data: { ...input, status: "open" } });
    return {
      id: e.id,
      leadId: e.leadId,
      contractorId: e.contractorId,
      conversationId: e.conversationId,
      question: e.question,
      status: e.status,
    };
  }

  async findOpenEscalationByContractorReply(contractorId: string) {
    const e = await this.db.escalation.findFirst({
      where: { contractorId, status: "open" },
      orderBy: { createdAt: "desc" },
    });
    return e
      ? {
          id: e.id,
          leadId: e.leadId,
          contractorId: e.contractorId,
          conversationId: e.conversationId,
          question: e.question,
          status: e.status,
        }
      : null;
  }

  async resolveEscalationIfOpen(id: string, answer: string): Promise<boolean> {
    const r = await this.db.escalation.updateMany({
      where: { id, status: "open" },
      data: { answer, status: "resolved", resolvedAt: new Date() },
    });
    return r.count > 0;
  }
}
