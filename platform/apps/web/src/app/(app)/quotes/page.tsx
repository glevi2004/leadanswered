import { redirect } from "next/navigation";

/** Quotes now live under Money (fixed-nav consolidation). Detail/composer routes stay. */
export default function QuotesIndexRedirect() {
  redirect("/money");
}
