import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { SarahWidget } from "@/components/sarah/SarahWidget";
import { WebsiteClient } from "@/components/website/WebsiteClient";
import {
  APEX_SEO,
  APEX_SITE,
  APEX_SITE_CHAT,
  APEX_SITE_PAGES,
  APEX_SITE_VERSIONS,
} from "@/lib/data/fixtures/apex";

export const metadata = { title: "Website — Lead Answered" };

/** 03-website: the Lovable-style takeover builder. Preview on fixtures; teaser for real partners. */
export default async function WebsitePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "website", demo);

  if (status === "coming_soon") {
    // The teaser keeps a way home + the widget (its CTA opens Sarah).
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center px-3">
          <Link
            href="/home"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        </header>
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
          <GatedState label="Website" promise={MODULES.website.promise ?? ""} />
        </div>
        <SarahWidget />
      </div>
    );
  }

  return (
    <WebsiteClient
      site={APEX_SITE}
      pages={APEX_SITE_PAGES}
      versions={APEX_SITE_VERSIONS}
      seo={APEX_SEO}
      chat={APEX_SITE_CHAT}
    />
  );
}
