import { getPrisma } from "@leadanswered/db";
import type {
  ContractorConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
} from "@leadanswered/core";
import type {
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
    standingAvailability:
      (r.standingAvailability as any) ?? { timezone: "UTC", slots: [] },
    twilioNumber: r.twilioNumber,
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
  return {
    id: c.id,
    leadId: c.leadId,
    state: c.state as Stage,
    gathered: (c.gathered as GatheredInfo) ?? {},
  };
}

function mapMsg(m: any): MessageRecord {
  return {
    id: m.id,
    conversationId: m.conversationId,
    direction: m.direction,
    body: m.body,
    providerSid: m.providerSid,
  };
}

/** Production Store backed by Postgres via Prisma. Only constructed when DATABASE_URL is set. */
export class PrismaStore implements Store {
  private db = getPrisma();

  async getContractor(id: string): Promise<ContractorConfig | null> {
    const r = await this.db.contractor.findUnique({ where: { id } });
    return r ? rowToContractor(r) : null;
  }

  async getContractorByTwilioNumber(
    toNumber: string,
  ): Promise<ContractorConfig | null> {
    const r = await this.db.contractor.findFirst({ where: { twilioNumber: toNumber } });
    return r ? rowToContractor(r) : null;
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
        status: "new",
      },
    });
    const gathered: GatheredInfo = { projectType: input.projectHint ?? null };
    const conv = await this.db.conversation.create({
      data: { leadId: lead.id, state: "greeting", gathered: gathered as any },
    });
    return {
      lead: mapLead(lead),
      contractor,
      conversation: mapConv(conv),
      messages: [],
    };
  }

  async findActiveContextByPhones(
    toNumber: string,
    fromNumber: string,
  ): Promise<LeadContext | null> {
    const contractor = await this.db.contractor.findFirst({
      where: { twilioNumber: toNumber },
    });
    if (!contractor) return null;
    const lead = await this.db.lead.findFirst({
      where: {
        contractorId: contractor.id,
        contactPhone: fromNumber,
        conversation: { state: { not: "done" } },
      },
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

  async messageExistsByProviderSid(sid: string): Promise<boolean> {
    const m = await this.db.message.findUnique({ where: { providerSid: sid } });
    return m != null;
  }

  async appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord> {
    const m = await this.db.message.create({
      data: {
        conversationId,
        direction: msg.direction,
        body: msg.body,
        providerSid: msg.providerSid ?? null,
      },
    });
    return mapMsg(m);
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

  async createAppointment(input: {
    leadId: string;
    contractorId: string;
    slotIso: string;
  }): Promise<{ id: string }> {
    const a = await this.db.appointment.create({
      data: {
        leadId: input.leadId,
        contractorId: input.contractorId,
        slotDatetime: new Date(input.slotIso),
        status: "confirmed",
      },
    });
    return { id: a.id };
  }
}
