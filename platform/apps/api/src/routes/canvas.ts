import type { Request, Response } from "express";
import type {
  CanvasNodePatch,
  CreateCanvasNodeInput,
  CreateCollectionInput,
  CreateEdgeInput,
  Store,
} from "../store/types.js";

/**
 * The Lu Computer CANVAS routes (cockpit.md Part C — "The composable canvas").
 * The `CanvasNode` / `Edge` / `Collection` Prisma models + Store methods already
 * exist; these HTTP routes make the canvas REAL — nodes, positions, and edges
 * persist per org so the canvas survives reloads and is the source of truth for an
 * agent's working set (edges are capability grants).
 *
 *   GET    /api/canvas?orgId=            → { nodes, edges, collections }
 *   POST   /api/canvas/nodes            { orgId, type, x, y, w?, h?, refId? } → node
 *   PATCH  /api/canvas/nodes/:id        { x?, y?, w?, h?, refId? }            → node
 *   DELETE /api/canvas/nodes/:id                                             → { ok }
 *   POST   /api/canvas/edges            { orgId, fromId, toId, kind }        → edge
 *   DELETE /api/canvas/edges/:id                                            → { ok }
 *   POST   /api/canvas/collections      { orgId, name, agentId? }            → collection
 *
 * All org-scoped; the org is read from the body (writes) or the query (the GET
 * read). Structurally compatible with the `{ store, now }` deps app.ts passes.
 */
export interface CanvasRouteDeps {
  store: Store;
}

/** The node kinds the "+" menu can create (cockpit.md Part C — node types). */
const NODE_TYPES = ["terminal", "note", "file", "folder", "site", "agent"] as const;
/** The edge kinds = capability grants: reads (context) | uses (tool) | produces (output). */
const EDGE_KINDS = ["reads", "uses", "produces"] as const;

/** True for a present, non-blank string field. */
function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** True for a finite number (rejects NaN / Infinity / non-numbers). */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Read the (required) orgId query param; returns undefined + writes a 400 when missing/blank. */
function requireOrgIdQuery(req: Request, res: Response): string | undefined {
  const orgId = req.query.orgId ?? req.query.org_id;
  if (!isFilled(orgId)) {
    res.status(400).json({ error: "orgId query param is required" });
    return undefined;
  }
  return orgId.trim();
}

/**
 * GET /api/canvas?orgId=...
 * The whole canvas for the org in one shot — every node, edge, and collection. → { nodes, edges, collections }.
 */
export function createGetCanvasRoute(deps: CanvasRouteDeps) {
  return async function getCanvas(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgIdQuery(req, res);
    if (!orgId) return;
    try {
      const [nodes, edges, collections] = await Promise.all([
        deps.store.listCanvasNodes(orgId),
        deps.store.listEdges(orgId),
        deps.store.listCollections(orgId),
      ]);
      res.status(200).json({ nodes, edges, collections });
    } catch (err) {
      console.error("[/api/canvas] error:", err);
      res.status(500).json({ error: "failed to load the canvas" });
    }
  };
}

/**
 * POST /api/canvas/nodes  { orgId, type, x, y, w?, h?, refId? }
 * Create a node on the canvas plane. `type` ∈ terminal|note|file|folder|site|agent;
 * x/y are required plane coordinates; w/h/refId are optional. → the created node.
 */
export function createCreateNodeRoute(deps: CanvasRouteDeps) {
  return async function postNode(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const type = b.type;

    if (!isFilled(orgId)) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    if (!isFilled(type) || !(NODE_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ error: `type must be one of ${NODE_TYPES.join("|")}` });
      return;
    }
    if (!isFiniteNumber(b.x) || !isFiniteNumber(b.y)) {
      res.status(400).json({ error: "x and y must be finite numbers" });
      return;
    }

    const input: CreateCanvasNodeInput = { orgId: orgId.trim(), type, x: b.x, y: b.y };
    if (isFiniteNumber(b.w)) input.w = b.w;
    if (isFiniteNumber(b.h)) input.h = b.h;
    if (isFilled(b.refId)) input.refId = b.refId.trim();

    try {
      const node = await deps.store.createCanvasNode(input);
      res.status(201).json(node);
    } catch (err) {
      console.error("[/api/canvas/nodes] create error:", err);
      res.status(500).json({ error: "failed to create the node" });
    }
  };
}

/**
 * PATCH /api/canvas/nodes/:id  { x?, y?, w?, h?, refId? }
 * Update a node — chiefly its position (drag) and size (resize), or its backing
 * record (`refId`). Only the provided fields are patched. → the updated node.
 */
export function createUpdateNodeRoute(deps: CanvasRouteDeps) {
  return async function patchNode(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const b = req.body ?? {};

    const patch: CanvasNodePatch = {};
    if (b.x !== undefined) {
      if (!isFiniteNumber(b.x)) {
        res.status(400).json({ error: "x must be a finite number" });
        return;
      }
      patch.x = b.x;
    }
    if (b.y !== undefined) {
      if (!isFiniteNumber(b.y)) {
        res.status(400).json({ error: "y must be a finite number" });
        return;
      }
      patch.y = b.y;
    }
    if (b.w !== undefined) patch.w = isFiniteNumber(b.w) ? b.w : null;
    if (b.h !== undefined) patch.h = isFiniteNumber(b.h) ? b.h : null;
    if (b.refId !== undefined) patch.refId = isFilled(b.refId) ? b.refId.trim() : null;

    try {
      const node = await deps.store.updateCanvasNode(id, patch);
      res.status(200).json(node);
    } catch (err) {
      console.error("[/api/canvas/nodes/:id] update error:", err);
      res.status(500).json({ error: "failed to update the node" });
    }
  };
}

/** DELETE /api/canvas/nodes/:id → { ok:true }. Idempotent. */
export function createDeleteNodeRoute(deps: CanvasRouteDeps) {
  return async function deleteNode(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    try {
      await deps.store.deleteCanvasNode(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/canvas/nodes/:id] delete error:", err);
      res.status(500).json({ error: "failed to delete the node" });
    }
  };
}

/**
 * POST /api/canvas/edges  { orgId, fromId, toId, kind }
 * Draw a directed edge — a CAPABILITY GRANT. `kind` ∈ reads|uses|produces
 * (reads = context, uses = a tool/terminal, produces = an agent output). → the created edge.
 */
export function createCreateEdgeRoute(deps: CanvasRouteDeps) {
  return async function postEdge(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const fromId = b.fromId ?? b.from_id;
    const toId = b.toId ?? b.to_id;
    const kind = b.kind;

    if (!isFilled(orgId) || !isFilled(fromId) || !isFilled(toId)) {
      res.status(400).json({ error: "orgId, fromId and toId are required" });
      return;
    }
    if (!isFilled(kind) || !(EDGE_KINDS as readonly string[]).includes(kind)) {
      res.status(400).json({ error: `kind must be one of ${EDGE_KINDS.join("|")}` });
      return;
    }

    const input: CreateEdgeInput = {
      orgId: orgId.trim(),
      fromId: fromId.trim(),
      toId: toId.trim(),
      kind,
    };

    try {
      const edge = await deps.store.createEdge(input);
      res.status(201).json(edge);
    } catch (err) {
      console.error("[/api/canvas/edges] create error:", err);
      res.status(500).json({ error: "failed to create the edge" });
    }
  };
}

/** DELETE /api/canvas/edges/:id → { ok:true }. Idempotent. */
export function createDeleteEdgeRoute(deps: CanvasRouteDeps) {
  return async function deleteEdge(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    try {
      await deps.store.deleteEdge(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/canvas/edges/:id] delete error:", err);
      res.status(500).json({ error: "failed to delete the edge" });
    }
  };
}

/**
 * POST /api/canvas/collections  { orgId, name, agentId? }
 * Create a folder / library — a boundary around member nodes that, connected to an
 * agent, becomes its library. `agentId` optionally scopes it to one agent. → the collection.
 */
export function createCreateCollectionRoute(deps: CanvasRouteDeps) {
  return async function postCollection(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const name = b.name;

    if (!isFilled(orgId)) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    if (!isFilled(name)) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const input: CreateCollectionInput = { orgId: orgId.trim(), name: name.trim() };
    if (isFilled(b.agentId ?? b.agent_id)) input.agentId = (b.agentId ?? b.agent_id).trim();

    try {
      const collection = await deps.store.createCollection(input);
      res.status(201).json(collection);
    } catch (err) {
      console.error("[/api/canvas/collections] create error:", err);
      res.status(500).json({ error: "failed to create the collection" });
    }
  };
}
