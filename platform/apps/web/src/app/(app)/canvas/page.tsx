import { requireOrganization } from "@/lib/dashboard-auth";
import { CompanyCanvas } from "@/components/canvas/CompanyCanvas";

export const metadata = { title: "Canvas — Lead Answered" };

/**
 * The company canvas, INSIDE the app shell (2026-07-15). Lu at the center, every
 * department orbiting her, each agent's pages as live previews. Selecting an agent
 * drives Lu's dock. Rendered full-bleed: the wrapper cancels the layout's forced
 * padding (-m-4 -mb-24 / sm:-m-6) and gives the graph a bounded height so its
 * h-full viewport fills the content card.
 */
export default async function CanvasPage() {
  await requireOrganization();
  return (
    <div className="-m-4 -mb-24 flex h-[calc(100svh-2rem)] flex-col overflow-hidden sm:-m-6">
      <CompanyCanvas />
    </div>
  );
}
