import { StarRating } from "@/components/app/StarRating";

/**
 * The "review ask creative" (REBRAND §3.5): a phone-frame SMS mockup — owner
 * photo (MMS) + five stars + the personalized message. Wizard step 2 + the
 * expanded approval view reuse this.
 */
export function AskPreview({ template, link, firstName = "Mike" }: { template: string; link: string; firstName?: string }) {
  const body = template
    .replaceAll("{firstName}", firstName)
    .replaceAll("{ownerFirst}", "Marcus")
    .replaceAll("{business}", "Apex Roofing")
    .replaceAll("{link}", "");
  return (
    <div className="mx-auto w-64 rounded-[2rem] border-4 border-foreground/80 bg-background p-3 pt-6 shadow-lg">
      <p className="mb-2 text-center text-[10px] text-muted-foreground">Apex Roofing · (844) 415-7642</p>
      <div className="flex flex-col gap-1.5 [--bubble-surface:var(--background)]">
        {/* the MMS: owner photo */}
        <div className="msg msg-them flex h-24 w-32 items-center justify-center overflow-hidden p-0">
          <span className="flex size-full items-center justify-center bg-muted text-2xl font-bold text-muted-foreground">
            MR
          </span>
        </div>
        <div className="msg msg-them">
          <StarRating rating={5} className="mb-1" />
          <span className="block text-[13px]">{body.trim()}</span>
          <span className="block truncate text-[12px] text-blue-600 underline">{link}</span>
        </div>
      </div>
    </div>
  );
}
