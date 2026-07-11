"use client";

import { useState } from "react";
import { buildConfig, stateFromInitial, type OnboardingInitial } from "@/lib/onboarding-state";
import { SECTIONS } from "@/components/config/sections";
import { saveOnboardingAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Always-editable settings — same sections as onboarding, but flat with one Save. */
export function SettingsForm({ initial }: { initial: OnboardingInitial }) {
  const [state, setState] = useState(() => stateFromInitial(initial));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  const update = (patch: Partial<typeof state>) => {
    setState((s) => ({ ...s, ...patch }));
    setMsg(null);
  };

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveOnboardingAction(buildConfig(state));
    setSaving(false);
    setMsg(res?.error ? { error: res.error } : { ok: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map(({ key, title, subtitle, Component }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Component state={state} update={update} />
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t bg-background/90 px-6 py-3 backdrop-blur">
        {msg?.ok && <span className="text-sm text-primary">Saved ✓</span>}
        {msg?.error && <span className="text-sm text-destructive">{msg.error}</span>}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
