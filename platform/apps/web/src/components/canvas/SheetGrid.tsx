"use client";

import * as React from "react";
import { Table2 } from "lucide-react";
import { sheetData } from "@/lib/canvas/sheets";

/**
 * A lightweight, in-house editable spreadsheet — rendered live (crisp + interactive)
 * inside a canvas sheet node once you zoom into it. Cells are contenteditable; edits
 * live in local state (mock). This is the "native sheet" flavor; a linked Google
 * Sheet / imported .xlsx would swap this body for an embed iframe / parsed grid.
 */
export function SheetGrid({ id }: { id: string }) {
  const base = sheetData(id);
  const [rows, setRows] = React.useState<string[][]>(base?.rows ?? []);
  if (!base) return <div className="grid h-full place-items-center text-sm text-muted-foreground">No sheet.</div>;

  const edit = (r: number, c: number, v: string) =>
    setRows((prev) => prev.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? v : cell)) : row)));

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b bg-muted px-3 py-2">
        <Table2 className="size-4 text-emerald-500" />
        <span className="text-sm font-medium text-foreground">{base.title}</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{rows.length} rows</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-9 border-b border-r bg-muted px-2 py-1.5 text-center font-mono text-[11px] text-muted-foreground">#</th>
              {base.columns.map((col) => (
                <th key={col} className="border-b border-r bg-muted px-3 py-1.5 text-left text-xs font-semibold text-foreground last:border-r-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="group/row">
                <td className="border-b border-r bg-muted/40 px-2 py-1.5 text-center font-mono text-[11px] text-muted-foreground">{r + 1}</td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => edit(r, c, e.currentTarget.textContent ?? "")}
                    className="cursor-text border-b border-r px-3 py-1.5 tabular-nums text-foreground outline-none last:border-r-0 focus:bg-emerald-500/10 focus:ring-1 focus:ring-inset focus:ring-emerald-500/40"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
