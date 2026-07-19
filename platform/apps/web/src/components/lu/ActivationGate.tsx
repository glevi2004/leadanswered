"use client";

import { Building2, Check, Rocket } from "lucide-react";
import { useLu } from "./lu-context";
import { useOnboardingMode, useDockData, usePublishApprovals, companyProfileFromArtifact } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The onboarding activation gate, rendered in the thread. When the interview converges Lu
 * finalizes the company profile (the final `business_context` doc) and stages the
 * `activate_departments` approval. This card shows that profile and the single action that
 * boots the company — accepting resolves the approval (departments go live) and ends
 * onboarding-mode. Returns null unless onboarding is active and a finalized profile exists.
 */
export function ActivationGate() {
  const { dockOpen, prefillComposer } = useLu();
  const onboarding = useOnboardingMode(dockOpen);
  const dataActive = dockOpen && onboarding;
  const { artifacts } = useDockData(dataActive);
  const { approvals, resolve, pending } = usePublishApprovals(dataActive);

  if (!onboarding) return null;

  const docs = artifacts.filter((a) => a.kind === "doc");
  const profileDoc = [...docs].reverse().find((a) => companyProfileFromArtifact(a.payload) !== null);
  const profile = profileDoc ? companyProfileFromArtifact(profileDoc.payload) : null;
  if (!profile) return null;

  const activate = approvals.find((a) => a.action === "activate_departments") ?? null;
  const busy = activate ? pending.has(activate.id) : false;

  const rows = [
    { label: "Company", value: profile.classification.companyType },
    { label: "Industry", value: profile.classification.industry },
    { label: "Serves", value: profile.classification.userType },
  ].filter((r) => r.value.trim() !== "");

  return (
    <div className="neu-card mt-3 rounded-2xl bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-1.5">
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <p className="t-title text-foreground">Your company is ready</p>
      </div>

      {profile.summary && <p className="t-body mt-1.5 text-muted-foreground">{profile.summary}</p>}

      {rows.length > 0 && (
        <dl className="neu-card-in mt-3 overflow-hidden rounded-xl">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={cn("flex items-center justify-between gap-3 px-3 py-2", i > 0 && "border-t border-border/60")}
            >
              <dt className="shrink-0 text-[12px] text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 truncate text-right text-[13px] font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {profile.values.length > 0 && (
        <ul className="mt-3 space-y-1">
          {profile.values.map((v, i) => (
            <li key={i} className="flex gap-1.5 text-[13px] text-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0">{v}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !activate}
          onClick={() => activate && resolve(activate.id, "approved")}
          className="gloss-ink press inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
        >
          <Rocket className="size-3.5" /> {busy ? "Activating…" : "Accept & activate departments"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => prefillComposer("")}
          className="gloss press rounded-lg px-3 py-1.5 text-[12px] font-medium text-foreground disabled:opacity-60"
        >
          Ask Lu for changes
        </button>
      </div>
    </div>
  );
}
