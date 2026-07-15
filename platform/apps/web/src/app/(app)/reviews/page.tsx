import { redirect } from "next/navigation";

/** Reviews now live under Agents (fixed-nav consolidation). Detail/composer routes stay. */
export default function ReviewsIndexRedirect() {
  redirect("/agents/reviews");
}
