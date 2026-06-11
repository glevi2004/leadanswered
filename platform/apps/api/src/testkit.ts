import type { EmailSender, SarahOutput, SmsSender } from "@leadanswered/core";
import type { ChatTurn, SarahAi } from "./claude.js";

export class CapturingSms implements SmsSender {
  sent: { to: string; body: string }[] = [];
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  }
}

export class CapturingEmail implements EmailSender {
  sent: { to: string; subject: string; body: string }[] = [];
  async send(to: string, subject: string, body: string): Promise<void> {
    this.sent.push({ to, subject, body });
  }
}

/** A deterministic stand-in for Claude: returns queued outputs and records every call. */
export class ScriptedAi implements SarahAi {
  calls: { systemPrompt: string; history: ChatTurn[] }[] = [];
  private queue: SarahOutput[];
  constructor(outputs: SarahOutput[]) {
    this.queue = [...outputs];
  }
  async generate(systemPrompt: string, history: ChatTurn[]): Promise<SarahOutput> {
    this.calls.push({ systemPrompt, history });
    const next = this.queue.shift();
    if (!next) throw new Error("ScriptedAi: no more scripted outputs");
    return next;
  }
  get lastSystemPrompt(): string {
    return this.calls.at(-1)?.systemPrompt ?? "";
  }
}

export class ThrowingAi implements SarahAi {
  async generate(): Promise<SarahOutput> {
    throw new Error("AI unavailable");
  }
}

/** Build a SarahOutput with sensible empty defaults for the extracted fields. */
export function sarah(
  reply: string,
  extracted: Partial<SarahOutput["extracted"]> = {},
  action: SarahOutput["proposed_action"] = "none",
): SarahOutput {
  return {
    reply,
    extracted: {
      project_type: extracted.project_type ?? "",
      service_town: extracted.service_town ?? "",
      service_zip: extracted.service_zip ?? "",
      full_address: extracted.full_address ?? "",
      is_decision_maker: extracted.is_decision_maker ?? "unknown",
      chosen_slot: extracted.chosen_slot ?? "",
    },
    proposed_action: action,
  };
}
