import { env } from "./env.js";

export interface InboundMedia {
  url: string;
  contentType: string;
}

export interface DownloadedImage {
  mediaType: string;
  data: Uint8Array;
}

/** Cap how many images we attach per turn (latency/cost + model limits). */
const MAX_IMAGES = 4;

/**
 * Download Twilio-hosted MMS images. Twilio media URLs require HTTP basic auth
 * (AccountSid:AuthToken), so Claude can't fetch them directly — we pull the bytes
 * here and hand them to the model. Returns [] on any failure (turn falls back to text).
 */
export async function downloadTwilioImages(media: InboundMedia[]): Promise<DownloadedImage[]> {
  if (media.length === 0 || !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return [];
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const out: DownloadedImage[] = [];
  for (const m of media.slice(0, MAX_IMAGES)) {
    try {
      const res = await fetch(m.url, { headers: { Authorization: `Basic ${auth}` } });
      if (!res.ok) {
        console.error(`[media] download ${res.status} for ${m.url}`);
        continue;
      }
      const data = new Uint8Array(await res.arrayBuffer());
      out.push({ mediaType: m.contentType || res.headers.get("content-type") || "image/jpeg", data });
    } catch (err) {
      console.error("[media] download failed:", err);
    }
  }
  return out;
}
