"use client";
import { useState } from "react";
import { ReportMock } from "@/components/site/illustrations";
import { cn } from "@/lib/utils";

/** Lets visitors flip the sample report between the Ocean and Sunset themes. */
export function ThemeShowcase() {
  const [t, setT] = useState<"ocean" | "sunset">("ocean");
  return (
    <div>
      <div className="mb-6 flex justify-center gap-2">
        {([["ocean", "Ocean blue", "#2563eb"], ["sunset", "Sunset orange", "#ea580c"]] as const).map(([k, l, c]) => (
          <button key={k} onClick={() => setT(k)} className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all", t === k ? "bg-card shadow-lg" : "text-muted-foreground hover:bg-muted")}>
            <i className="size-3.5 rounded-full" style={{ background: c }} />{l}
          </button>
        ))}
      </div>
      <ReportMock theme={t} className="mx-auto w-full max-w-2xl drop-shadow-2xl" />
    </div>
  );
}
