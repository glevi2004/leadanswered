import { redirect } from "next/navigation";

/** Agents fold into the canvas — every agent id lands there (the Lu chat is the dock now). */
export default async function AgentDetailPage() {
  redirect("/canvas");
}
