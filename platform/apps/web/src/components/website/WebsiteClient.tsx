"use client";

import * as React from "react";
import { toast } from "sonner";
import type { SarahMessage } from "@/lib/data/shared";
import type { SeoSnapshot, Site, SitePage, SiteVersion } from "@/lib/data/website/types";
import { scriptedSiteReply, siteToken } from "@/lib/data/fixtures/apex";
import { SarahThread } from "@/components/sarah/SarahThread";
import { SarahComposer } from "@/components/sarah/SarahComposer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BuilderTopBar, type BuilderMode } from "./BuilderTopBar";
import { PreviewCanvas } from "./PreviewCanvas";
import { VersionHistorySheet } from "./VersionHistorySheet";
import { PerformanceTab } from "./PerformanceTab";

/**
 * The Lovable-style takeover builder (03 §2): full viewport, the chat column
 * replaces the sidebar, the preview floats as a canvas, one top bar of chrome.
 * Mock seam (00 §5): scripted replies, optimistic mutations, /p/[token]
 * fixture snapshots — the same page Sarah texts as a view-only link.
 */

/** contentNumber picks which fixture snapshot renders (restores show old content). */
export type ClientSiteVersion = SiteVersion & { contentNumber: number };

const SITE_CHIPS = ["Add a page", "Change the hours", "New hero photo", "How do I look on Google?"];

// Chat-column resize bounds (mirrors SidebarResizer's pattern).
const CHAT_MIN = 280;
const CHAT_MAX = 480;
const CHAT_DEFAULT = 340;

let localId = 0;
const nextId = () => `wsl_${++localId}`;

export function WebsiteClient({
  site,
  pages,
  versions: initialVersions,
  seo,
  chat,
  initialDevice = "desktop",
}: {
  site: Site;
  pages: SitePage[];
  versions: SiteVersion[];
  seo: SeoSnapshot;
  chat: SarahMessage[];
  /** Dev-harness hook: start in phone view for screenshot checks. */
  initialDevice?: "desktop" | "phone";
}) {
  const [versions, setVersions] = React.useState<ClientSiteVersion[]>(() =>
    initialVersions.map((v) => ({ ...v, contentNumber: v.number })),
  );
  const [publishedId, setPublishedId] = React.useState(site.publishedVersionId);
  const [draftId, setDraftId] = React.useState<string | undefined>(site.draftVersionId);
  const [messages, setMessages] = React.useState<SarahMessage[]>(chat);
  const [typing, setTyping] = React.useState(false);
  const [editInFlight, setEditInFlight] = React.useState(false);
  const [mode, setMode] = React.useState<BuilderMode>("site");
  const [pagePath, setPagePath] = React.useState("/");
  const [device, setDevice] = React.useState<"desktop" | "phone">(initialDevice);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  // Drag-resizable chat column (like the app sidebar): CSS var, localStorage,
  // double-click resets. Live via style property — no re-render while dragging.
  const shellRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const saved = Number(window.localStorage.getItem("builder_chat_width"));
    if (saved >= CHAT_MIN && saved <= CHAT_MAX) shellRef.current?.style.setProperty("--builder-chat", `${saved}px`);
  }, []);
  const clampChat = (x: number) => Math.min(CHAT_MAX, Math.max(CHAT_MIN, x));
  const onChatResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = shellRef.current;
    if (!el) return;
    // The preview iframe swallows pointer events the moment the cursor crosses it,
    // which stalls the drag. Capture the pointer on the handle AND disable iframe
    // hit-testing for the duration — both, so the drag never skips.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const frames = Array.from(document.querySelectorAll("iframe"));
    frames.forEach((f) => ((f as HTMLIFrameElement).style.pointerEvents = "none"));
    const left = el.getBoundingClientRect().left;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => el.style.setProperty("--builder-chat", `${clampChat(ev.clientX - left)}px`);
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      frames.forEach((f) => (f as HTMLIFrameElement).style.removeProperty("pointer-events"));
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      window.localStorage.setItem("builder_chat_width", String(Math.round(clampChat(ev.clientX - left))));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const resetChatWidth = () => {
    shellRef.current?.style.setProperty("--builder-chat", `${CHAT_DEFAULT}px`);
    window.localStorage.setItem("builder_chat_width", String(CHAT_DEFAULT));
  };

  const byId = (id?: string) => versions.find((v) => v.id === id);
  const published = byId(publishedId) ?? versions[0];
  const draft = byId(draftId);
  const previewVersion = draft ?? published;

  const previewSrc = `/p/${siteToken(previewVersion.contentNumber)}?page=${encodeURIComponent(pagePath)}&embed=1&r=${refreshNonce}`;
  const previewHref = `/p/${siteToken(previewVersion.contentNumber)}?page=${encodeURIComponent(pagePath)}`;
  const liveHref = `/p/${siteToken(published.contentNumber)}`;

  const appendSarah = (body: string, delay = 900) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setEditInFlight(false);
      setMessages((m) => [...m, { id: nextId(), at: new Date().toISOString(), role: "sarah", body, via: "app" }]);
      setRefreshNonce((n) => n + 1); // the preview "flashes" when her change lands
    }, delay + Math.random() * 500);
  };

  const sendSiteMessage = (body: string) => {
    const text = body.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: nextId(), at: new Date().toISOString(), role: "owner", body: text, via: "app" }]);

    const scripted = scriptedSiteReply(text);
    if (!scripted.edit) {
      // a question, not a change — e.g. "How do I look on Google?" → Performance
      appendSarah(scripted.reply);
      if (/google|rank|seo|found|chatgpt/i.test(text)) window.setTimeout(() => setMode("performance"), 1600);
      return;
    }

    setEditInFlight(true);
    if (draft) {
      // one open draft — more edits extend it (03 §2)
      setVersions((list) => list.map((v) => (v.id === draft.id ? { ...v, summary: scripted.edit!.summary } : v)));
    } else {
      const id = nextId();
      setVersions((list) => [
        {
          id,
          siteId: site.id,
          number: Math.max(...list.map((v) => v.number)) + 1,
          summary: scripted.edit!.summary,
          createdAt: new Date().toISOString(),
          editIds: [],
          contentNumber: published.contentNumber,
        },
        ...list,
      ]);
      setDraftId(id);
    }
    appendSarah(scripted.reply, 1400);
  };

  const publish = () => {
    if (!draft) return;
    const n = draft.number;
    setVersions((list) => list.map((v) => (v.id === draft.id ? { ...v, publishedAt: new Date().toISOString() } : v)));
    setPublishedId(draft.id);
    setDraftId(undefined);
    toast.success(`Published — ${site.domain} is live with v${n}.`);
    setMessages((m) => [
      ...m,
      { id: nextId(), at: new Date().toISOString(), role: "sarah", body: `v${n} is live on ${site.domain} ✓`, via: "app" },
    ]);
  };

  const discard = () => {
    if (!draft) return;
    setVersions((list) => list.filter((v) => v.id !== draft.id));
    setDraftId(undefined);
    setDiscardOpen(false);
    toast(`Draft discarded — your live site is untouched.`);
    setMessages((m) => [
      ...m,
      {
        id: nextId(),
        at: new Date().toISOString(),
        role: "sarah",
        body: "Scrapped that draft — your live site hasn't changed. Just say the word if you want to try it again.",
        via: "app",
      },
    ]);
  };

  const restore = (versionId: string) => {
    const source = byId(versionId);
    if (!source) return;
    const id = nextId();
    setVersions((list) => [
      {
        id,
        siteId: site.id,
        number: Math.max(...list.map((v) => v.number)) + 1,
        summary: `Restored v${source.number} — ${source.summary}`,
        createdAt: new Date().toISOString(),
        editIds: [],
        contentNumber: source.contentNumber,
      },
      // restoring replaces any open draft (there's exactly ONE at a time)
      ...list.filter((v) => v.id !== draftId),
    ]);
    setDraftId(id);
    setHistoryOpen(false);
    toast.success(`v${source.number} is open as a new draft — publish to make it live.`);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sidebar text-foreground">
      <BuilderTopBar
        domain={site.domain}
        mode={mode}
        onModeChange={setMode}
        pages={pages}
        activePath={pagePath}
        onPathChange={setPagePath}
        device={device}
        onDeviceChange={setDevice}
        onRefresh={() => setRefreshNonce((n) => n + 1)}
        previewHref={previewHref}
        liveHref={liveHref}
        draftOpen={!!draft}
        versionNumber={previewVersion.number}
        draftSummary={draft?.summary}
        onPublish={publish}
        onHistory={() => setHistoryOpen(true)}
        onDiscard={() => setDiscardOpen(true)}
      />

      <div ref={shellRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* the chat column — naked on the shell background, it IS the sidebar here */}
        <aside className="order-2 flex h-[42dvh] min-h-0 shrink-0 flex-col gap-2 px-2 pb-2 [--bubble-surface:var(--sidebar)] lg:order-1 lg:h-auto lg:w-[var(--builder-chat,340px)] lg:pr-0">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SarahThread messages={messages} typing={typing} />
          </div>
          <SarahComposer onSend={sendSiteMessage} chips={SITE_CHIPS} placeholder="Ask for a change…" />
        </aside>

        {/* drag handle between chat and canvas (desktop) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the chat column"
          onPointerDown={onChatResizeStart}
          onDoubleClick={resetChatWidth}
          className="group order-1 hidden w-2 shrink-0 cursor-col-resize lg:block"
        >
          <div className="mx-auto h-full w-[3px] rounded-full bg-transparent transition-colors duration-150 group-hover:bg-primary/25 group-active:bg-primary/40" />
        </div>

        {/* the canvas */}
        <section className="order-1 min-h-0 flex-1 px-2 pb-2 lg:order-2 lg:pl-0">
          {mode === "site" ? (
            <PreviewCanvas src={previewSrc} domain={site.domain} device={device} busy={editInFlight} />
          ) : (
            <div className="h-full overflow-y-auto rounded-2xl border bg-background p-5 shadow-[0_8px_32px_rgba(16,24,40,0.12)]">
              <PerformanceTab site={site} seo={seo} />
            </div>
          )}
        </section>
      </div>

      <VersionHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        publishedId={publishedId}
        draftId={draftId}
        onRestore={restore}
      />

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this draft?</DialogTitle>
            <DialogDescription>
              The changes Sarah drafted go away and your live site stays exactly as it is. She can always redo them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDiscardOpen(false)}>
              Keep the draft
            </Button>
            <Button variant="destructive" size="sm" onClick={discard}>
              Discard draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
