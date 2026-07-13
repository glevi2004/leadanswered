import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Display-only 1–5 stars (09-reviews §6; also used by CRM timeline + analytics). */
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("size-3.5", i < rating ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
    </span>
  );
}
