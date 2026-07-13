/** DEV-ONLY visual check for the Website builder takeover (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import {
  APEX,
  APEX_ACTIONS,
  APEX_APPROVALS,
  APEX_SEO,
  APEX_SITE,
  APEX_SITE_CHAT,
  APEX_SITE_PAGES,
  APEX_SITE_VERSIONS,
  APEX_THREAD,
} from "@/lib/data/fixtures/apex";
import { WebsiteClient } from "@/components/website/WebsiteClient";

export default async function DevWebsite({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const sp = await searchParams;
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <WebsiteClient
        site={APEX_SITE}
        pages={APEX_SITE_PAGES}
        versions={APEX_SITE_VERSIONS}
        seo={APEX_SEO}
        chat={APEX_SITE_CHAT}
        initialDevice={sp.device === "phone" ? "phone" : "desktop"}
      />
    </SarahProvider>
  );
}
