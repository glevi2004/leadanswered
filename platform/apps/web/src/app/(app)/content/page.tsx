import { redirect } from "next/navigation";

/** Content now lives under Agents (fixed-nav consolidation). Detail/composer routes stay. */
export default function ContentIndexRedirect() {
  redirect("/agents/content");
}
