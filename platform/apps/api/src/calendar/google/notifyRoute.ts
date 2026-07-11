import type { Request, Response } from "express";
import type { SmsSender } from "@leadanswered/core";
import { env } from "../../env.js";
import { enqueueInboundSync } from "../../queue.js";
import type { Store } from "../../store/types.js";
import { runInboundSync } from "./inbound.js";

/**
 * POST /google/notifications — Google's push webhook (GOOGLE_CALENDAR.md §9/§13). The body carries no
 * diff, so we authenticate the channel (id + our secret token), ack immediately, and trigger an
 * incremental sync (queued if Redis is up, else inline). We never trust the request body.
 */
export interface NotifyDeps {
  store: Store;
  sms: SmsSender;
  now?: () => Date;
}

export function createGoogleNotifyRoute(deps: NotifyDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const channelId = req.header("x-goog-channel-id") ?? "";
    const channelToken = req.header("x-goog-channel-token") ?? "";
    res.status(200).end(); // ack fast; do the work async

    if (!channelId) return;
    const conn = await deps.store.getCalendarConnectionByChannel(channelId);
    if (!conn) return;
    if (conn.channelToken && conn.channelToken !== channelToken) {
      console.warn("[calendar] webhook channel token mismatch — ignoring");
      return;
    }
    if (env.REDIS_URL) {
      await enqueueInboundSync(conn.organizationId).catch((e) => console.error("[calendar] enqueue inbound failed:", e));
    } else {
      await runInboundSync(deps, conn.organizationId).catch((e) => console.error("[calendar] inline inbound sync failed:", e));
    }
  };
}
