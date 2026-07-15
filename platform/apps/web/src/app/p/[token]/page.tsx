import type { Metadata } from "next";
import { SitePreview } from "@/components/website/SitePreview";

/**
 * The public site-preview page (03 §5) — the view-only link Sarah texts, and
 * the src the in-app PreviewCanvas iframes (`?embed=1` hides the top bar).
 * Security posture: shows, never does — the GET is side-effect-free (SMS apps
 * prefetch every texted URL), noindex, zero publish power. Real mode swaps the
 * fixture token map for HMAC-signed { organizationId, siteId, versionId, exp }.
 */

export const metadata: Metadata = {
  title: "Site preview",
  robots: { index: false, follow: false },
};

/** Fixture tokens (mock seam): demo_vN → version N's snapshot. v14 = the open draft. */
const TOKEN_VERSION: Record<string, number> = {
  demo_v0: 0, // the blank starter canvas (freshly-onboarded org, no site yet)
  demo_v11: 11,
  demo_v12: 12,
  demo_v13: 13,
  demo_v14: 14,
};
const DRAFT_TOKENS = new Set(["demo_v14"]);

function ExpiredPreview() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl" aria-hidden>⏳</p>
        <h1 className="mt-3 text-lg font-semibold text-zinc-900">This preview has expired</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Text Sarah for a fresh link — your live site is untouched.
        </p>
      </div>
    </div>
  );
}

export default async function PublicSitePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string; embed?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const version = TOKEN_VERSION[token];
  if (version === undefined) return <ExpiredPreview />;

  const path = sp.page && sp.page.startsWith("/") ? sp.page : "/";
  const embed = sp.embed === "1";
  const isDraft = DRAFT_TOKENS.has(token);
  const hrefFor = (p: string) => `/p/${token}?page=${encodeURIComponent(p)}${embed ? "&embed=1" : ""}`;

  return (
    <div className="min-h-screen bg-zinc-50">
      {!embed && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-zinc-900 px-4 py-2 text-xs text-white">
          <span className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full ${isDraft ? "bg-amber-400" : "bg-emerald-400"}`} />
            {isDraft ? "Draft preview — not published yet" : "Published version"}
            <span className="text-white/50">· v{version}</span>
          </span>
          <span className="text-white/60">apexroofingma.com · sent by Sarah</span>
        </div>
      )}
      <SitePreview version={version} path={path} hrefFor={hrefFor} />
    </div>
  );
}
