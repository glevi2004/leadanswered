import { notFound } from "next/navigation";
import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { getContactMock, getContactReal } from "@/lib/data/crm";
import { APEX } from "@/lib/data/fixtures/apex";
import { ContactDetail } from "@/components/crm/ContactDetail";

export default async function ContactPage({ params }: { params: Promise<{ contactId: string }> }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const { contactId } = await params;
  const tz = demo ? APEX.timezone : organizationTz(organization);

  const detail = demo ? getContactMock(contactId) : await getContactReal(organization.id, contactId);
  if (!detail) notFound();

  return <ContactDetail detail={detail} demo={demo} timezone={tz} />;
}
