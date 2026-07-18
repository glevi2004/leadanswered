import type { Store } from "../store/types.js";

/**
 * BYO-connect status + the dispatch gate (docs/byo-connect.md §"Gate Engineer
 * dispatch"). An org is "connected" for a provider when it has a stored,
 * usable token — a GitHub `userToken` / a Vercel `accessToken`. The Engineer is
 * only dispatchable once BOTH are connected (the customer builds into THEIR own
 * accounts). The platform's env-token fallback (getGit()/getDeploy()) stays for
 * dogfooding but is a separate, non-gated path.
 */

export interface ConnectStatus {
  github: boolean;
  vercel: boolean;
  supabase: boolean;
}

/** Whether the org has a usable GitHub / Vercel / Supabase connection (GET /api/connect/status).
 *  Supabase = the company's one shared, Engineering-anchored project (docs/canvas.md §"the backend");
 *  connected once a project ref + service key are stored (Management token is optional). */
export async function connectionStatus(store: Store, orgId: string): Promise<ConnectStatus> {
  const [gh, vc, sb] = await Promise.all([
    store.getGithubConnection(orgId),
    store.getVercelConnection(orgId),
    store.getSupabaseConnection(orgId),
  ]);
  return {
    // GitHub: an App installation (Phase 2 — installationId, tokens minted per run) OR a pasted PAT.
    github: !!(gh?.installationId || gh?.userToken),
    vercel: !!vc?.accessToken,
    supabase: !!(sb?.projectRef && sb?.serviceKey),
  };
}

/** The dispatch gate: true only when BOTH GitHub and Vercel are connected. */
export async function orgHasConnections(store: Store, orgId: string): Promise<boolean> {
  const s = await connectionStatus(store, orgId);
  return s.github && s.vercel;
}
