import { requireOrganization } from "@/lib/dashboard-auth";
import { SarahPageClient } from "./SarahPageClient";

export const metadata = { title: "Sarah — KiwiOS" };

export default async function SarahPage() {
  await requireOrganization();
  return (
    // Fills the frame's scroll area (the layout wrapper is a min-h-full flex column).
    <div className="flex min-h-[480px] flex-1 flex-col">
      <SarahPageClient />
    </div>
  );
}
