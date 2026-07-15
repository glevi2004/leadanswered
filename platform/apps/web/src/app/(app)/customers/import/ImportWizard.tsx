"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SarahIcon } from "@/components/icons/sarah";
import { cn } from "@/lib/utils";

/**
 * "Your history" — the 4-step import wizard (05-crm §2). Mock-simulated per
 * 00 §5 until the worker-backed ImportJob ships; the flow, voice, and states
 * are the spec's. Prerequisite for the Reviews campaign (09).
 */

const STEPS = ["Upload", "Map columns", "Preview", "Import"] as const;

const SAMPLE_COLUMNS: { source: string; guess: string; sample: string }[] = [
  { source: "Customer Name", guess: "name", sample: "Frank Sullivan" },
  { source: "Phone", guess: "phone", sample: "(617) 555-1000" },
  { source: "Email", guess: "email", sample: "frank@…" },
  { source: "Address", guess: "address", sample: "12 Elm St, Newton" },
  { source: "Last Job Date", guess: "lastJobAt", sample: "2024-09-14" },
  { source: "Memo", guess: "note", sample: "Gutter replacement" },
];

const FIELDS = ["name", "phone", "email", "address", "town", "zip", "lastJobAt", "note", "skip"];

export function ImportWizard({ demo }: { demo: boolean }) {
  const [step, setStep] = React.useState(0);
  const [source, setSource] = React.useState<"csv" | "quickbooks" | "jobber" | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [mapping, setMapping] = React.useState(Object.fromEntries(SAMPLE_COLUMNS.map((c) => [c.source, c.guess])));
  const [progress, setProgress] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const done = progress >= 214;

  const run = () => {
    setRunning(true);
    const t = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(214, p + Math.ceil(Math.random() * 9) + 4);
        if (next >= 214) window.clearInterval(t);
        return next;
      });
    }, 120);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link href="/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Customers
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Bring your history in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sarah reads your customer list and knows your business day one.
          {!demo && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">preview — import ships soon</span>}
        </p>
      </div>

      {/* stepper */}
      <ol className="flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                i < step || done ? "border-foreground bg-foreground text-background" : i === step ? "border-foreground" : "text-muted-foreground",
              )}
            >
              {i < step || done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn(i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                { key: "csv", label: "CSV file" },
                { key: "quickbooks", label: "QuickBooks export" },
                { key: "jobber", label: "Jobber export" },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSource(s.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-sm transition-colors",
                  source === s.key ? "border-foreground/40 bg-muted font-medium" : "hover:bg-muted/50",
                )}
              >
                <FileSpreadsheet className="size-4 text-muted-foreground" /> {s.label}
              </button>
            ))}
          </div>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40",
              !source && "pointer-events-none opacity-50",
            )}
          >
            <Upload className="size-5" />
            {fileName ?? "Drop your file here, or click to choose"}
            <input
              type="file"
              accept=".csv,.xlsx,.iif"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "apex-customers.csv")}
            />
          </label>
          <div className="flex justify-end">
            <Button className="btn-glow gap-1.5" disabled={!source} onClick={() => { if (!fileName) setFileName("apex-customers.csv"); setStep(1); }}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">We guessed the columns — fix any that look wrong.</p>
          <div className="overflow-hidden rounded-xl border">
            {SAMPLE_COLUMNS.map((c, i) => (
              <div key={c.source} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", i > 0 && "border-t")}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.source}</p>
                  <p className="truncate text-xs text-muted-foreground">e.g. {c.sample}</p>
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                <select
                  value={mapping[c.source]}
                  onChange={(e) => setMapping((m) => ({ ...m, [c.source]: e.target.value }))}
                  className="h-8 rounded-lg border bg-background px-2 text-sm outline-none focus:border-ring"
                >
                  {FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f === "skip" ? "— skip —" : f}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button className="btn-glow gap-1.5" onClick={() => setStep(2)}>
              Preview <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">214 rows</span> · 3 match existing contacts —{" "}
            <span className="text-muted-foreground">we'll merge, not duplicate.</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["Frank Sullivan", "Rosa Delgado", "Tom Whalen"].map((n, i) => (
              <div key={n} className="rounded-xl border p-3">
                <p className="text-sm font-medium">{n}</p>
                <p className="text-xs text-muted-foreground">(617) 555-{1000 + i} · Newton</p>
                <p className="mt-1 text-[11px] text-muted-foreground">customer · past customer · quickbooks</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">…and 211 more.</p>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button className="btn-glow gap-1.5" onClick={() => { setStep(3); run(); }}>
              Import 214 customers <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border bg-card p-10 text-center">
          {!done ? (
            <>
              <span className="btn-glow flex size-11 items-center justify-center rounded-full">
                <SarahIcon className="size-5" />
              </span>
              <div className="w-full max-w-sm">
                <p className="mb-2 text-sm font-medium">Sarah is reading your history… {progress} of 214</p>
                <Progress value={(progress / 214) * 100} />
              </div>
              <p className="text-xs text-muted-foreground">Safe to leave this page — the import keeps running.</p>
            </>
          ) : (
            <>
              <span className="btn-glow flex size-11 items-center justify-center rounded-full">
                <Check className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold">Sarah read your history — she knows your business now.</p>
                <p className="mt-1 text-sm text-muted-foreground">214 customers imported · 3 merged · 0 skipped</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" nativeButton={false} render={<Link href="/customers" />}>See them in your customers</Button>
                <Button className="btn-glow gap-1.5" nativeButton={false} render={<Link href="/reviews" />}>
                  Start your review campaign <ArrowRight className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
