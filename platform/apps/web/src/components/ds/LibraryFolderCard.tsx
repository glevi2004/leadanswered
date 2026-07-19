import { cn } from "@/lib/utils";
import { FileThumb } from "./FileThumb";

export interface LibraryFolderFile {
  id: string;
  name: string;
  kind: "doc" | "image";
  previewUrl?: string;
}

/**
 * LibraryFolderCard — the Library's grid-view folder tile: a raised neu-card holding a 2×2 grid
 * of the folder's file previews (empty slots dashed) with the folder name + file count below.
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
      className={cn(
        "neu-card press block w-full rounded-2xl bg-card p-2 text-left transition-shadow",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        {thumbs.map((f) => (
          <FileThumb key={f.id} name={f.name} kind={f.kind} previewUrl={f.previewUrl} className="aspect-square" />
        ))}
        {Array.from({ length: empties }).map((_, i) => (
          <div key={`e${i}`} className="aspect-square rounded-lg border border-dashed border-border/60" />
        ))}
      </div>
      <div className="px-1 pb-0.5 pt-2.5">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {files.length} {files.length === 1 ? "file" : "files"}
        </p>
      </div>
    </button>
  );
}
