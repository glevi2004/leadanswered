"use client";

import * as React from "react";

/**
 * Canvas persistence (COCKPIT Part C) — the client for the same-origin canvas proxy routes
 * (`/api/canvas/*`, built by another agent). Replaces the localStorage-only canvas: nodes,
 * their positions, and the EDGES (capability grants) live in the DB per org. The browser
 * never sends an orgId — the proxy resolves the session org.
 *
 * CONTRACT:
 *   GET    /api/canvas               -> { nodes, edges, collections }
 *   POST   /api/canvas/nodes         { type,x,y,w?,h?,refId? }        -> node
 *   PATCH  /api/canvas/nodes/:id     { x?,y?,w?,h? }
 *   DELETE /api/canvas/nodes/:id
 *   POST   /api/canvas/edges         { fromId,toId,kind }             -> edge
 *   DELETE /api/canvas/edges/:id
 *
 * DEGRADES GRACEFULLY: if the proxy routes don't exist yet (or a call fails) the mutation
 * still applies OPTIMISTICALLY to local state, so the canvas keeps working (in-memory) and
 * never crashes — persistence just resumes once the routes land.
 *
 * MVP CONTENT NOTE: the node CONTRACT carries no free-text field, so per-node content — a
 * note's markdown, a site's URL, a file's name, a folder's label — is mirrored to
 * localStorage (keyed by node id) AND sent as an extra `content` field the proxy may keep.
 * Structure (type/position/edges) is the DB source of truth; content is best-effort until a
 * backing-record (Artifact/Site/Collection) API lands.
 */

export type CanvasNodeType = "terminal" | "note" | "file" | "folder" | "site" | "agent";
export type EdgeKind = "reads" | "uses" | "produces";

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  w?: number | null;
  h?: number | null;
  refId?: string | null;
  content?: string | null;
}

export interface CanvasEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: EdgeKind;
}

export interface CanvasCollection {
  id: string;
  label?: string | null;
  nodeIds?: string[];
}

export interface CanvasGraph {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  collections: CanvasCollection[];
}

export interface NewNodeInput {
  type: CanvasNodeType;
  x: number;
  y: number;
  w?: number;
  h?: number;
  refId?: string;
  content?: string;
}

const CONTENT_KEY = "lu_canvas_content_v1";

/* ------------------------------ content mirror ------------------------------ */

function loadContentMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CONTENT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveContentMap(map: Record<string, string>): void {
  try {
    window.localStorage.setItem(CONTENT_KEY, JSON.stringify(map));
  } catch {
    /* full/unavailable — structure still persists to the DB */
  }
}

/* ------------------------------ fetch helpers ------------------------------ */

async function req<T>(url: string, init: RequestInit | undefined, fallback: T): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) return fallback;
    // some mutations return no body
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return null; // network / route-missing → caller keeps optimistic state
  }
}

let localSeq = 0;
const tempId = () => `local-${Date.now().toString(36)}-${localSeq++}`;

/**
 * The canvas graph, loaded from the DB on mount and mutated through the proxy. Every mutator
 * updates local state immediately (optimistic) so the UI is snappy and survives a missing
 * backend; the server response reconciles ids when it arrives.
 */
export function useCanvasGraph(active: boolean): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  collections: CanvasCollection[];
  loaded: boolean;
  createNode: (input: NewNodeInput) => Promise<CanvasNode>;
  moveNode: (id: string, x: number, y: number) => void;
  resizeNode: (id: string, w: number, h: number) => void;
  deleteNode: (id: string) => void;
  setNodeContent: (id: string, content: string) => void;
  ensureAgentNode: (dept: string, x: number, y: number) => Promise<string>;
  createEdge: (fromId: string, toId: string, kind: EdgeKind) => Promise<void>;
  deleteEdge: (id: string) => void;
} {
  const [nodes, setNodes] = React.useState<CanvasNode[]>([]);
  const [edges, setEdges] = React.useState<CanvasEdge[]>([]);
  const [collections, setCollections] = React.useState<CanvasCollection[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const contentRef = React.useRef<Record<string, string>>({});
  const nodesRef = React.useRef<CanvasNode[]>(nodes);
  nodesRef.current = nodes;
  const patchTimers = React.useRef<Record<string, number>>({});

  /* ---- initial load (once, while active) — merge server content with the local mirror ---- */
  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    contentRef.current = loadContentMap();
    (async () => {
      const data = await req<CanvasGraph>("/api/canvas", undefined, {
        nodes: [],
        edges: [],
        collections: [],
      });
      if (!alive) return;
      if (data) {
        const withContent = data.nodes.map((n) => ({
          ...n,
          content: n.content ?? contentRef.current[n.id] ?? null,
        }));
        setNodes(withContent);
        setEdges(data.edges ?? []);
        setCollections(data.collections ?? []);
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  const rememberContent = React.useCallback((id: string, content: string) => {
    contentRef.current = { ...contentRef.current, [id]: content };
    saveContentMap(contentRef.current);
  }, []);

  const createNode = React.useCallback(
    async (input: NewNodeInput): Promise<CanvasNode> => {
      const optimistic: CanvasNode = {
        id: tempId(),
        type: input.type,
        x: input.x,
        y: input.y,
        w: input.w ?? null,
        h: input.h ?? null,
        refId: input.refId ?? null,
        content: input.content ?? null,
      };
      setNodes((prev) => [...prev, optimistic]);
      if (input.content != null) rememberContent(optimistic.id, input.content);

      const saved = await req<CanvasNode>(
        "/api/canvas/nodes",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
        optimistic,
      );
      if (saved && saved.id && saved.id !== optimistic.id) {
        // reconcile the temp id → the real DB id (and carry content across)
        if (input.content != null) rememberContent(saved.id, input.content);
        const real: CanvasNode = { ...saved, content: saved.content ?? input.content ?? null };
        setNodes((prev) => prev.map((n) => (n.id === optimistic.id ? real : n)));
        return real;
      }
      return optimistic;
    },
    [rememberContent],
  );

  const schedulePatch = React.useCallback((id: string, body: Record<string, number>) => {
    const timers = patchTimers.current;
    if (timers[id]) window.clearTimeout(timers[id]);
    timers[id] = window.setTimeout(() => {
      delete timers[id];
      if (id.startsWith("local-")) return; // never persisted → nothing to PATCH yet
      void req(`/api/canvas/nodes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }, null);
    }, 300);
  }, []);

  const moveNode = React.useCallback(
    (id: string, x: number, y: number) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
      schedulePatch(id, { x, y });
    },
    [schedulePatch],
  );

  const resizeNode = React.useCallback(
    (id: string, w: number, h: number) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, w, h } : n)));
      schedulePatch(id, { w, h });
    },
    [schedulePatch],
  );

  const deleteNode = React.useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.fromId !== id && e.toId !== id)); // cascade locally
    if (!id.startsWith("local-")) {
      void req(`/api/canvas/nodes/${id}`, { method: "DELETE" }, null);
    }
  }, []);

  const setNodeContent = React.useCallback(
    (id: string, content: string) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
      rememberContent(id, content);
    },
    [rememberContent],
  );

  const ensureAgentNode = React.useCallback(
    async (dept: string, x: number, y: number): Promise<string> => {
      const existing = nodesRef.current.find((n) => n.type === "agent" && n.refId === dept);
      if (existing) return existing.id;
      const node = await createNode({ type: "agent", x, y, refId: dept });
      return node.id;
    },
    [createNode],
  );

  const createEdge = React.useCallback(
    async (fromId: string, toId: string, kind: EdgeKind): Promise<void> => {
      // no dupes (same from/to/kind)
      if (edges.some((e) => e.fromId === fromId && e.toId === toId && e.kind === kind)) return;
      const optimistic: CanvasEdge = { id: tempId(), fromId, toId, kind };
      setEdges((prev) => [...prev, optimistic]);
      const saved = await req<CanvasEdge>(
        "/api/canvas/edges",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fromId, toId, kind }),
        },
        optimistic,
      );
      if (saved && saved.id && saved.id !== optimistic.id) {
        setEdges((prev) => prev.map((e) => (e.id === optimistic.id ? saved : e)));
      }
    },
    [edges],
  );

  const deleteEdge = React.useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    if (!id.startsWith("local-")) {
      void req(`/api/canvas/edges/${id}`, { method: "DELETE" }, null);
    }
  }, []);

  return {
    nodes,
    edges,
    collections,
    loaded,
    createNode,
    moveNode,
    resizeNode,
    deleteNode,
    setNodeContent,
    ensureAgentNode,
    createEdge,
    deleteEdge,
  };
}
