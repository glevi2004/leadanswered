import type { Request, Response } from "express";
import type { Store } from "../store/types.js";
import { githubAppConfigured, mintInstallationToken } from "../git/githubApp.js";
import { getDeployForOrg } from "../deploy/index.js";
import { recordEvent } from "../agent/journal.js";

/**
 * EXISTING-PROJECT IMPORT (DEVELOPMENT ladder step 2; workflow §8b): point Lu at a repo the
 * owner already has. The GitHub App install scopes which repos are visible; importing creates
 * an `imported` Site row (+ links the matching Vercel project when one exists) and records the
 * REPO PROFILE (setup/test commands) the sandbox + verification run. The rest of the pipeline
 * (clone → branch → PR → preview → verify → gated merge) is repo-agnostic already.
 */

export interface ProjectRouteDeps {
  store: Store;
}

const GITHUB_API = "https://api.github.com";

function isFilled(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/** The token that can LIST the org's repos: app-install mint, else the pasted PAT. */
async function orgGithubToken(store: Store, orgId: string): Promise<string | null> {
  const conn = await store.getGithubConnection(orgId);
  if (conn?.installationId && githubAppConfigured()) {
    try {
      return await mintInstallationToken(conn.installationId);
    } catch (err) {
      console.warn(`[projects] mint failed for org ${orgId}:`, (err as Error).message);
    }
  }
  return conn?.userToken ?? null;
}

/** GET /api/github/repos?orgId= → { repos: [{ fullName, private, defaultBranch }] } */
export function createListReposRoute(deps: ProjectRouteDeps) {
  return async function getRepos(req: Request, res: Response): Promise<void> {
    const orgId = req.query.orgId ?? req.query.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    try {
      const conn = await deps.store.getGithubConnection(orgId);
      const token = await orgGithubToken(deps.store, orgId);
      if (!token) {
        res.status(200).json({ repos: [] });
        return;
      }
      // App installs list their granted repos; PAT mode lists the user's own.
      const url =
        conn?.installationId && githubAppConfigured()
          ? `${GITHUB_API}/installation/repositories?per_page=100`
          : `${GITHUB_API}/user/repos?affiliation=owner,collaborator&per_page=100&sort=updated`;
      const resp = await fetch(url, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "lu-computer",
        },
      });
      if (!resp.ok) {
        res.status(200).json({ repos: [] });
        return;
      }
      const data = (await resp.json()) as
        | { repositories?: Array<Record<string, unknown>> }
        | Array<Record<string, unknown>>;
      const list = Array.isArray(data) ? data : (data.repositories ?? []);
      const repos = list
        .map((r) => ({
          fullName: String(r.full_name ?? ""),
          private: Boolean(r.private),
          defaultBranch: String(r.default_branch ?? "main"),
        }))
        .filter((r) => r.fullName);
      res.status(200).json({ repos });
    } catch (err) {
      console.error("[/api/github/repos] error:", err);
      res.status(200).json({ repos: [] });
    }
  };
}

/**
 * POST /api/projects/import  { orgId, repoFullName, setupCommand?, testCommand? }
 * → verifies access, links the matching Vercel project when one exists, creates the imported
 * Site (idempotent by repoFullName), journals it. → { ok, siteId, vercelLinked }.
 */
export function createImportProjectRoute(deps: ProjectRouteDeps) {
  return async function postImport(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const repoFullName = String(b.repoFullName ?? b.repo_full_name ?? "").trim();
    const setupCommand = isFilled(b.setupCommand) ? String(b.setupCommand).trim() : null;
    const testCommand = isFilled(b.testCommand) ? String(b.testCommand).trim() : null;
    if (!isFilled(orgId) || !repoFullName.includes("/")) {
      res.status(400).json({ ok: false, error: "orgId and repoFullName (owner/name) are required" });
      return;
    }

    try {
      // 1) Verify the org's token can actually see the repo.
      const token = await orgGithubToken(deps.store, orgId);
      if (!token) {
        res.status(400).json({ ok: false, error: "connect GitHub first" });
        return;
      }
      const check = await fetch(`${GITHUB_API}/repos/${repoFullName}`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "lu-computer" },
      });
      if (!check.ok) {
        res.status(400).json({ ok: false, error: "that repo isn't visible to your GitHub connection" });
        return;
      }

      // 2) Idempotent: re-importing updates the profile instead of duplicating.
      const existing = (await deps.store.listSites(orgId)).find((s) => s.repoFullName === repoFullName);
      if (existing) {
        const updated = await deps.store.updateSite(existing.id, {
          kind: "imported",
          setupCommand,
          testCommand,
        });
        res.status(200).json({ ok: true, siteId: updated.id, vercelLinked: Boolean(updated.vercelProjectId), updated: true });
        return;
      }

      // 3) Link the matching Vercel project if one exists (by repo name).
      const repoName = repoFullName.split("/").pop() ?? repoFullName;
      let vercelProjectId: string | null = null;
      try {
        const deploy = await getDeployForOrg(deps.store, orgId);
        vercelProjectId = (await deploy.findProject(repoName))?.projectId ?? null;
      } catch {
        /* no Vercel link yet — open_preview creates a project on first build */
      }

      const site = await deps.store.createSite({
        orgId,
        departmentKey: "engineering",
        repoFullName,
        vercelProjectId,
        status: vercelProjectId ? "live" : "draft",
        kind: "imported",
        setupCommand,
        testCommand,
      });
      await recordEvent(deps.store, {
        orgId,
        kind: "project_imported",
        message: `Imported ${repoFullName}${vercelProjectId ? " (Vercel project linked)" : ""}`,
        payload: { siteId: site.id, repoFullName, vercelProjectId },
      });
      res.status(200).json({ ok: true, siteId: site.id, vercelLinked: Boolean(vercelProjectId) });
    } catch (err) {
      console.error("[/api/projects/import] error:", err);
      res.status(500).json({ ok: false, error: "import failed" });
    }
  };
}

/**
 * POST /api/projects/profile  { orgId, siteId, setupCommand?, testCommand? }
 * → update a project's repo profile. → { ok }.
 */
export function createUpdateProfileRoute(deps: ProjectRouteDeps) {
  return async function postProfile(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const siteId = String(b.siteId ?? "").trim();
    if (!isFilled(orgId) || !siteId) {
      res.status(400).json({ ok: false, error: "orgId and siteId are required" });
      return;
    }
    try {
      const site = await deps.store.getSite(siteId);
      if (!site || site.orgId !== orgId) {
        res.status(404).json({ ok: false, error: "project not found" });
        return;
      }
      await deps.store.updateSite(siteId, {
        setupCommand: isFilled(b.setupCommand) ? String(b.setupCommand).trim() : null,
        testCommand: isFilled(b.testCommand) ? String(b.testCommand).trim() : null,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/projects/profile] error:", err);
      res.status(500).json({ ok: false, error: "profile update failed" });
    }
  };
}
