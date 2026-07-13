import { SarahPageClient } from "./SarahPageClient";

export const metadata = { title: "Sarah — Lead Answered" };

const TABS = new Set(["chat", "activity", "approvals"]);

export default async function SarahPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    // Fills the frame's scroll area (the layout wrapper is a min-h-full flex column).
    // Escalations live in the SarahProvider (seeded by the layout) — one source, all surfaces.
    <div className="flex min-h-[480px] flex-1 flex-col">
      <SarahPageClient defaultTab={tab && TABS.has(tab) ? tab : "chat"} />
    </div>
  );
}
