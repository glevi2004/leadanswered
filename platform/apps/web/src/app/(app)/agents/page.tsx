import { redirect } from "next/navigation";

/**
 * Legacy surface (docs/product.md §7 honesty sweep, 2026-07-17): the old preset grid
 * (receptionist / reviews / content / follow-ups) was the pre-pivot SMS product, rendered
 * every preset as hardcoded "hired", and its Manage links dead-ended back here. Agents now
 * live on the canvas and in the dock's Company tab — send anyone who lands here there.
 */
export default function AgentsPage() {
  redirect("/canvas");
}
