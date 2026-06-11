import type {
  ContractorConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
} from "@leadanswered/core";

export interface LeadRecord {
  id: string;
  contractorId: string;
  contactName: string;
  contactPhone: string;
  projectHint: string | null;
  serviceTown: string | null;
  serviceZip: string | null;
  fullAddress: string | null;
  status: string;
}

export interface ConversationRecord {
  id: string;
  leadId: string;
  state: Stage;
  gathered: GatheredInfo;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  body: string;
  providerSid: string | null;
}

export interface RecipientRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  subscriptions: {
    eventType: NotificationEventType;
    channels: "sms" | "email" | "both";
  }[];
}

export interface LeadContext {
  lead: LeadRecord;
  contractor: ContractorConfig;
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export interface CreateLeadInput {
  contractorId: string;
  contactName: string;
  contactPhone: string;
  projectHint?: string | null;
  source?: string;
}

export type LeadFieldPatch = Partial<
  Pick<LeadRecord, "projectHint" | "serviceTown" | "serviceZip" | "fullAddress" | "status">
>;

/** Persistence port. Implemented by MemoryStore (demo/tests) and PrismaStore (production). */
export interface Store {
  getContractor(id: string): Promise<ContractorConfig | null>;
  getContractorByTwilioNumber(toNumber: string): Promise<ContractorConfig | null>;
  getRecipients(contractorId: string): Promise<RecipientRecord[]>;
  createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext>;
  findActiveContextByPhones(
    toNumber: string,
    fromNumber: string,
  ): Promise<LeadContext | null>;
  getContextByLeadId(leadId: string): Promise<LeadContext | null>;
  messageExistsByProviderSid(sid: string): Promise<boolean>;
  appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord>;
  updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void>;
  updateConversation(
    conversationId: string,
    patch: { state?: Stage; gathered?: GatheredInfo },
  ): Promise<void>;
  createAppointment(input: {
    leadId: string;
    contractorId: string;
    slotIso: string;
  }): Promise<{ id: string }>;
}
