import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FileThumb — a single file's preview tile: an image asset shows its picture; a doc shows a
 * document glyph on a recessed field. The building block of the Library's grid cards.
 */
export function FileThumb({
  name,
  kind,
  previewUrl,
  className,
}: {
  name: string;
  kind: "doc" | "image";
  previewUrl?: string;
  className?: string;
}) {
  return (
    <div className={cn("neu-card-in grid place-items-center overflow-hidden rounded-lg", className)}>
      {kind === "image" && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={name} className="size-full object-cover" />
      ) : (
        <FileText className="size-6 text-muted-foreground/45" />
      )}
    </div>
  );
}
