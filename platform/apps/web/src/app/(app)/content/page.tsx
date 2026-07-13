import { Check } from "lucide-react";
import { organizationTz, requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { PageHeader } from "@/components/app/PageHeader";
import { ContentHome } from "@/components/content/ContentHome";
import { APEX, APEX_POSTS, APEX_SOCIAL_POSTS } from "@/lib/data/fixtures/apex";

export const metadata = { title: "Content — Lead Answered" };

/** 04-content: Sarah writes it — you say go. Preview on fixtures; teaser for real partners. */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const organization = await requireOrganization();
  const { tab } = await searchParams;
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "content", demo);

  if (status === "coming_soon") {
    return <GatedState label="Content" promise={MODULES.content.promise ?? ""} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Content"
        description="Text Sarah the photos — she writes the post, you say go."
        actions={
          <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span aria-hidden className="flex size-4 items-center justify-center rounded-full bg-muted font-serif text-[10px] font-bold">
              f
            </span>
            Facebook — Apex Roofing
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          </span>
        }
      />
      <ContentHome
        posts={APEX_POSTS}
        socials={APEX_SOCIAL_POSTS}
        timezone={demo ? APEX.timezone : organizationTz(organization)}
        defaultTab={tab}
      />
    </div>
  );
}
