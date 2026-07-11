import { requireOrganization } from "@/lib/dashboard-auth";
import { SarahPageClient } from "./SarahPageClient";

export const metadata = { title: "Sarah — Lead Answered" };

export default async function SarahPage() {
  await requireOrganization();
  return (
    <div className="h-[calc(100dvh-8.5rem)] min-h-[480px]">
      <SarahPageClient />
    </div>
  );
}
