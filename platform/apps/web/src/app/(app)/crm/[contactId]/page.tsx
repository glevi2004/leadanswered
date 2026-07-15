import { redirect } from "next/navigation";

/** Legacy /crm/[contactId] bookmark → the renamed Customers surface. */
export default async function CrmContactRedirect({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;
  redirect(`/customers/${contactId}`);
}
