import { cn } from "@/lib/utils";
import { FileThumb } from "./FileThumb";

export interface LibraryFolderFile {
  id: string;
  name: string;
  kind: "doc" | "image";
  previewUrl?: string;
}

/**
 * LibraryFolderCard — the Library's grid-view folder tile: a raised, square neu-card with a 2×2
 * grid of square file previews (empty slots dashed) and the folder name + count below.
 * Sizes per the design harness (neu-card p-2.5, aspect-square thumbs, t-title/t-label).
 */
export function LibraryFolderCard({
  label,
  files,
  onOpen,
  className,
}: {
  label: string;
  files: LibraryFolderFile[];
  onOpen?: () => void;
  className?: string;
}) {
  const thumbs = files.slice(0, 4);
  const empties = Math.max(0, 4 - thumbs.length);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("neu-card press block w-full rounded-2xl bg-card p-2.5 text-left", className)}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {thumbs.map((f) => (
          <FileThumb key={f.id} name={f.name} kind={f.kind} previewUrl={f.previewUrl} className="aspect-square" />
        ))}
        {Array.from({ length: empties }).map((_, i) => (
          <div key={`e${i}`} className="aspect-square rounded-lg border border-dashed border-border/60" />
        ))}
      </div>
      <div className="px-0.5 pt-2">
        <p className="t-title truncate text-foreground">{label}</p>
        <p className="t-label text-muted-foreground">
          {files.length} {files.length === 1 ? "file" : "files"}
        </p>
      </div>
    </button>
  );
}
