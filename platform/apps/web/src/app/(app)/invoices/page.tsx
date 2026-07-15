import { redirect } from "next/navigation";

/** Invoices now live under Money (fixed-nav consolidation). Detail/composer routes stay. */
export default function InvoicesIndexRedirect() {
  redirect("/money");
}
