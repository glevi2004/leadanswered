import { redirect } from "next/navigation";

/** Legacy /crm bookmark → the renamed Customers surface. */
export default function CrmRedirect() {
  redirect("/customers");
}
