import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import {
  assembleAgentSystemPrompt,
  sanitizeReply,
  type EmailSender,
  type SmsSender,
} from "@leadanswered/core";
import { buildTools, type ToolState } from "./tools.js";
import type { Store } from "../store/types.js";

export interface AgentDeps {
  model: LanguageModel;
  store: Store;
  sms: SmsSender;
  email?: EmailSender;
  now: Date;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Run one agent turn (SCOPE §5): the model reasons over the conversation, calls
 * the deterministic tools (which make every decision + side-effect), and returns
 * the SMS reply text. `state` is mutated by the tools (gathered + lead status);
 * the caller reads it after to persist/observe what happened.
 */
export async function generateAgentReply(
  deps: AgentDeps,
  state: ToolState,
  history: ChatTurn[],
): Promise<string> {
  const tools = buildTools(
    { store: deps.store, sms: deps.sms, email: deps.email, now: deps.now },
    state,
  );
  const pastAppts = await deps.store.getAppointmentsByLead(state.lead.id);
  const system = assembleAgentSystemPrompt({
    contractor: state.contractor,
    leadName: state.lead.contactName,
    gathered: state.gathered,
    now: deps.now,
    leadStatus: state.lead.status,
    hasBooking: state.lead.status === "booked",
    channel: state.lead.source,
    relationship: summarizeRelationship(pastAppts),
  });
  // Langfuse trace context: sessionId groups every turn of one lead's SMS thread,
  // userId attributes it to the contractor (the customer), tags enable filtering.
  const meta = {
    sessionId: state.conversation.id,
    userId: state.contractor.id,
    tags: ["sarah-agent"],
    leadId: state.lead.id,
    contractorId: state.contractor.id,
  };

  const result = await generateText({
    model: deps.model,
    system,
    messages: history,
    tools,
    stopWhen: stepCountIs(6), // bound latency/cost per SMS turn
    experimental_telemetry: { isEnabled: true, functionId: "sarah-turn", metadata: meta },
  });

  let text = result.text.trim();
  // Haiku sometimes ends a turn on a tool call (e.g. escalate) with no closing
  // message. Force a short text reply from the tool results so we never send an
  // empty SMS (and never store an empty message that would corrupt the history).
  if (!text) {
    const followup = await generateText({
      model: deps.model,
      system,
      messages: [...(history as ModelMessage[]), ...result.response.messages],
      tools,
      toolChoice: "none",
      experimental_telemetry: { isEnabled: true, functionId: "sarah-turn-closing", metadata: meta },
    });
    text = followup.text.trim();
  }
  return sanitizeReply(text || "Thanks! Give me one moment and I'll be right back with you.");
}

/** A compact relationship cue for the prompt — surfaces the appointment history a returning customer has. */
function summarizeRelationship(appts: { status: string }[]): string | undefined {
  const onRecord = appts.filter((a) => a.status !== "cancelled");
  if (onRecord.length === 0) return undefined;
  return `this customer has ${onRecord.length} appointment(s) with us on record, so greet them with warmth and continuity.`;
}
