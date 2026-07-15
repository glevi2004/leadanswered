import { redirect } from "next/navigation";

/** Follow-ups now live under Agents (fixed-nav consolidation). */
export default function FollowupsIndexRedirect() {
  redirect("/agents/followups");
}
