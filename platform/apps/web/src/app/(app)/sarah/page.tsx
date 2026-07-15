import { SarahPageClient } from "./SarahPageClient";

export const metadata = { title: "AI Assistant — Lu Computer" };

export default function SarahPage() {
  // Fills the frame's scroll area (the layout wrapper is a min-h-full flex column).
  // The full-page Lu chat — the same thread as the dock, abstracted from the canvas.
  return (
    <div className="flex min-h-[480px] flex-1 flex-col">
      <SarahPageClient />
    </div>
  );
}
