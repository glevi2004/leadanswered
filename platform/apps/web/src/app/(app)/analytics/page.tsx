import { redirect } from "next/navigation";

/** Analytics folds into the Dashboard (fixed-nav consolidation). */
export default function AnalyticsIndexRedirect() {
  redirect("/home");
}
