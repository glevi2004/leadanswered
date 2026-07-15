import type { Site, SiteBundle, SitePresetId } from "./types";
import { getPreset } from "./presets";
import {
  APEX_SEO,
  APEX_SITE,
  APEX_SITE_CHAT,
  APEX_SITE_PAGES,
  APEX_SITE_VERSIONS,
} from "../fixtures/apex";

/**
 * Multi-site provider behind the mock↔real seam (00 §5, 03-website).
 *
 * Sites live in a module-level, org-keyed in-memory store (like the other demo
 * stores) — created sites survive navigation within the running server, but
 * nothing persists. Mature (Apex) seeds ONE site (APEX_SITE) lazily on first
 * read; New / real orgs start with zero. Real hosting/deploy/DNS is out of
 * scope: publish + customDomain are modeled as plain fields on the mock seam.
 */

/** The demo org whose store seeds the Apex fixture site (demo mode maps here). */
export const SEEDED_ORG_ID = APEX_SITE.organizationId; // "org_apex"

/**
 * Which store bucket a request reads. Demo mode (Mature, or the la_demo cookie)
 * always resolves to the seeded Apex org so the walkthrough shows the demo site;
 * everything else reads its own org id (honest-empty until a site is created).
 */
export function siteStoreKey(organization: Record<string, unknown> | null | undefined, demo: boolean): string {
  if (demo) return SEEDED_ORG_ID;
  return (organization?.id as string) ?? "org_new";
}

/** The Apex demo site as a full bundle, enriched with the multi-site fields. */
function apexBundle(): SiteBundle {
  return {
    site: {
      ...APEX_SITE,
      name: APEX_SITE.name ?? "Apex Roofing",
      preset: APEX_SITE.preset ?? "marketing",
      published: APEX_SITE.published ?? true,
    },
    pages: APEX_SITE_PAGES,
    versions: APEX_SITE_VERSIONS,
    seo: APEX_SEO,
    chat: APEX_SITE_CHAT,
  };
}

/** orgId → (siteId → bundle). Seeded lazily on first access per org. */
const stores = new Map<string, Map<string, SiteBundle>>();

function orgStore(orgId: string): Map<string, SiteBundle> {
  let store = stores.get(orgId);
  if (!store) {
    store = new Map<string, SiteBundle>();
    if (orgId === SEEDED_ORG_ID) {
      const seed = apexBundle();
      store.set(seed.site.id, seed);
    }
    stores.set(orgId, store);
  }
  return store;
}

/* ----------------------------------- mock ------------------------------------- */

/** Every site this org owns (browse grid). */
export function listSitesMock(orgId: string): Site[] {
  return Array.from(orgStore(orgId).values()).map((b) => b.site);
}

/** One site's full builder bundle, or null when it doesn't exist. */
export function getSiteMock(orgId: string, siteId: string): SiteBundle | null {
  return orgStore(orgId).get(siteId) ?? null;
}

/** Stamp out a new site from a preset, add it to the org's store, return it. */
export function createSiteMock(orgId: string, preset: SitePresetId): Site {
  const template = getPreset(preset);
  if (!template) throw new Error(`Unknown site preset: ${preset}`);
  const bundle = template.build(orgId);
  orgStore(orgId).set(bundle.site.id, bundle);
  return bundle.site;
}

/** Remove a site; true if it existed. */
export function deleteSiteMock(orgId: string, siteId: string): boolean {
  return orgStore(orgId).delete(siteId);
}

/* ----------------------------------- real ------------------------------------- */
// Signature-mirroring stubs. Real hosting/deploy/DNS is out of scope; when a
// backend lands these read/write the Site tables. Empty for now (honest-empty).

export async function listSitesReal(_organizationId: string): Promise<Site[]> {
  return [];
}

export async function getSiteReal(_organizationId: string, _siteId: string): Promise<SiteBundle | null> {
  return null;
}

export async function createSiteReal(_organizationId: string, _preset: SitePresetId): Promise<Site | null> {
  return null;
}

export async function deleteSiteReal(_organizationId: string, _siteId: string): Promise<boolean> {
  return false;
}
