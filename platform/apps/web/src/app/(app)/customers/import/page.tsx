import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { ImportWizard } from "./ImportWizard";

export const metadata = { title: "Import your history — Lead Answered" };

export default async function ImportPage() {
  await requireOrganization();
  const demo = await isDemoMode();
  return <ImportWizard demo={demo} />;
}
