import { cn } from "@/lib/utils";

/**
 * PixelIcon — crisp pixel-art glyphs (ref: Cofounder blue folder tile).
 * Filled + blocky, the deliberate opposite of the app's stroke line-icons.
 * Reserved for object/asset representations (files, folders, apps, artifacts).
 * Wrap in <PixelTile> for the glossy raised app-icon look.
 */
export type PixelGlyph = "folder" | "file" | "app" | "sparkle" | "chart";

const BLUE = { hi: "#8cc4ff", face: "#4aa3ff", shade: "#2b7fe0", ink: "#1c5fb0" };
const GREEN = { hi: "#9be3a6", face: "#4fca6a", shade: "#2fa64f", ink: "#1f7d3a" };
const AMBER = { hi: "#ffd88a", face: "#f7b64c", shade: "#e2952a", ink: "#b26e15" };
const VIOLET = { hi: "#c8b6ff", face: "#9b7bff", shade: "#7a55ee", ink: "#5a3bc0" };
const PALETTES = { blue: BLUE, green: GREEN, amber: AMBER, violet: VIOLET };

export function PixelIcon({
  glyph = "folder",
  color = "blue",
  size = 40,
  className,
}: {
  glyph?: PixelGlyph;
  color?: keyof typeof PALETTES;
  size?: number;
  className?: string;
}) {
  const p = PALETTES[color];
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("pixel-crisp", className)}
      role="img"
      aria-label={glyph}
    >
      {glyph === "folder" && (
        <>
          {/* back tab */}
          <rect x="4" y="7" width="12" height="4" fill={p.shade} />
          <rect x="14" y="9" width="4" height="2" fill={p.shade} />
          {/* body */}
          <rect x="4" y="10" width="24" height="17" fill={p.face} />
          {/* top gloss + bottom shade */}
          <rect x="4" y="10" width="24" height="2" fill={p.hi} />
          <rect x="4" y="25" width="24" height="2" fill={p.shade} />
          {/* pixel-stepped corners (punch the bg back through) */}
          <rect x="4" y="10" width="2" height="2" fill={p.hi} />
          <rect x="26" y="10" width="2" height="2" fill={p.face} />
          {/* mini "chart" inside (echoes the ref) */}
          <rect x="18" y="14" width="8" height="9" fill={p.hi} opacity="0.5" />
          <rect x="19" y="20" width="2" height="2" fill={p.ink} />
          <rect x="21" y="18" width="2" height="4" fill={p.ink} />
          <rect x="23" y="16" width="2" height="6" fill={p.ink} />
        </>
      )}
      {glyph === "file" && (
        <>
          <rect x="7" y="4" width="15" height="24" fill={p.hi} opacity="0.35" />
          <rect x="8" y="5" width="16" height="22" fill="#ffffff" />
          <rect x="8" y="5" width="16" height="22" fill={p.face} opacity="0.14" />
          {/* folded corner */}
          <rect x="20" y="5" width="4" height="4" fill={p.face} />
          <rect x="20" y="5" width="4" height="1" fill={p.hi} />
          {/* text lines */}
          <rect x="11" y="12" width="10" height="2" fill={p.shade} />
          <rect x="11" y="16" width="10" height="2" fill={p.shade} opacity="0.6" />
          <rect x="11" y="20" width="6" height="2" fill={p.shade} opacity="0.6" />
        </>
      )}
      {glyph === "app" && (
        <>
          <rect x="5" y="5" width="22" height="22" rx="2" fill={p.face} />
          <rect x="5" y="5" width="22" height="3" fill={p.hi} />
          <rect x="5" y="24" width="22" height="3" fill={p.shade} />
          <rect x="11" y="11" width="4" height="4" fill="#fff" />
          <rect x="17" y="11" width="4" height="4" fill="#fff" />
          <rect x="11" y="17" width="10" height="3" fill="#fff" opacity="0.85" />
        </>
      )}
      {glyph === "sparkle" && (
        <>
          <rect x="14" y="4" width="4" height="10" fill={p.hi} />
          <rect x="14" y="18" width="4" height="10" fill={p.face} />
          <rect x="4" y="14" width="10" height="4" fill={p.face} />
          <rect x="18" y="14" width="10" height="4" fill={p.shade} />
          <rect x="14" y="14" width="4" height="4" fill="#fff" />
        </>
      )}
      {glyph === "chart" && (
        <>
          <rect x="5" y="5" width="22" height="22" rx="2" fill={p.face} opacity="0.16" />
          <rect x="8" y="18" width="4" height="6" fill={p.shade} />
          <rect x="14" y="13" width="4" height="11" fill={p.face} />
          <rect x="20" y="8" width="4" height="16" fill={p.hi} />
        </>
      )}
    </svg>
  );
}

/**
 * DeptIcon — pixel-art glyphs for the eight fixed departments (Lu's org canvas).
 * Same blocky filled language as PixelIcon, one signature hue per department, so a
 * department reads at a glance on nodes, dept headers, task rows and the sidebar.
 */
export type Dept =
  | "ops" | "finance" | "legal" | "engineering" | "design" | "marketing" | "sales" | "support";

const DEPT_PALETTE: Record<Dept, { hi: string; face: string; shade: string }> = {
  ops: { hi: "#cbd5e1", face: "#64748b", shade: "#334155" },
  finance: { hi: "#6ee7b7", face: "#10b981", shade: "#047857" },
  legal: { hi: "#c8b6ff", face: "#9b7bff", shade: "#5a3bc0" },
  engineering: { hi: "#8cc4ff", face: "#4aa3ff", shade: "#1c5fb0" },
  design: { hi: "#f9a8d4", face: "#ec4899", shade: "#be185d" },
  marketing: { hi: "#ffd88a", face: "#f7b64c", shade: "#b26e15" },
  sales: { hi: "#9be3a6", face: "#4fca6a", shade: "#1f7d3a" },
  support: { hi: "#7dd3fc", face: "#38bdf8", shade: "#0284c7" },
};

export function DeptIcon({ dept = "engineering", size = 40, className }: { dept?: Dept; size?: number; className?: string }) {
  const p = DEPT_PALETTE[dept];
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={cn("pixel-crisp", className)} role="img" aria-label={dept}>
      {dept === "ops" && (
        <>
          <rect x="6" y="1.5" width="4" height="2" fill={p.shade} /><rect x="6" y="12.5" width="4" height="2" fill={p.shade} />
          <rect x="1.5" y="6" width="2" height="4" fill={p.shade} /><rect x="12.5" y="6" width="2" height="4" fill={p.shade} />
          <rect x="3.5" y="3.5" width="9" height="9" fill={p.face} /><rect x="3.5" y="3.5" width="9" height="2" fill={p.hi} />
          <rect x="6" y="6" width="4" height="4" fill="#fff" opacity="0.9" />
        </>
      )}
      {dept === "finance" && (
        <>
          <rect x="3" y="3" width="10" height="10" rx="1.5" fill={p.face} /><rect x="3" y="3" width="10" height="2" fill={p.hi} />
          <rect x="7" y="4.5" width="2" height="7" fill={p.shade} />
          <rect x="5" y="5" width="4" height="1.8" fill={p.shade} /><rect x="7" y="9.2" width="4" height="1.8" fill={p.shade} />
        </>
      )}
      {dept === "legal" && (
        <>
          <rect x="7.2" y="2" width="1.6" height="11" fill={p.shade} /><rect x="3" y="4" width="10" height="1.6" fill={p.face} />
          <rect x="2" y="6" width="3.5" height="2" fill={p.hi} /><rect x="10.5" y="6" width="3.5" height="2" fill={p.hi} />
          <rect x="5" y="12.5" width="6" height="1.8" fill={p.shade} />
        </>
      )}
      {dept === "engineering" && (
        <>
          <rect x="4" y="7" width="2" height="2" fill={p.face} /><rect x="5.5" y="5" width="2" height="2" fill={p.hi} /><rect x="5.5" y="9" width="2" height="2" fill={p.shade} />
          <rect x="10" y="7" width="2" height="2" fill={p.face} /><rect x="8.5" y="5" width="2" height="2" fill={p.hi} /><rect x="8.5" y="9" width="2" height="2" fill={p.shade} />
        </>
      )}
      {dept === "design" && (
        <>
          <rect x="3" y="3" width="4.6" height="4.6" fill="#ec4899" /><rect x="8.4" y="3" width="4.6" height="4.6" fill="#f59e0b" />
          <rect x="3" y="8.4" width="4.6" height="4.6" fill="#3b82f6" /><rect x="8.4" y="8.4" width="4.6" height="4.6" fill="#10b981" />
        </>
      )}
      {dept === "marketing" && (
        <>
          <rect x="2.5" y="6.5" width="3" height="3" fill={p.shade} /><rect x="5.5" y="5.5" width="4" height="5" fill={p.face} />
          <rect x="9.5" y="4" width="2.5" height="8" fill={p.hi} />
          <rect x="12.8" y="4.5" width="1.4" height="1.4" fill={p.face} /><rect x="12.8" y="9.5" width="1.4" height="1.4" fill={p.face} />
        </>
      )}
      {dept === "sales" && (
        <>
          <rect x="2.5" y="10" width="2.2" height="3.5" fill={p.shade} /><rect x="6" y="7" width="2.2" height="6.5" fill={p.face} /><rect x="9.5" y="4.5" width="2.2" height="9" fill={p.hi} />
          <rect x="11.5" y="2.5" width="2.5" height="2.5" fill={p.shade} /><rect x="10" y="4" width="2.5" height="1.6" fill={p.shade} />
        </>
      )}
      {dept === "support" && (
        <>
          <rect x="2" y="3" width="12" height="8" rx="2" fill={p.face} /><rect x="2" y="3" width="12" height="2" fill={p.hi} />
          <rect x="4.5" y="11" width="3" height="2.3" fill={p.face} />
          <rect x="5" y="6.2" width="1.6" height="1.6" fill="#fff" /><rect x="7.2" y="6.2" width="1.6" height="1.6" fill="#fff" /><rect x="9.4" y="6.2" width="1.6" height="1.6" fill="#fff" />
        </>
      )}
    </svg>
  );
}

/**
 * PixelTile — the glossy raised app-icon plate the pixel glyph sits on
 * (ref: Cofounder folder in a white rounded tile with soft shadow).
 */
export function PixelTile({
  children,
  size = 72,
  className,
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid place-items-center rounded-[18px] bg-card elev-2", className)}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
