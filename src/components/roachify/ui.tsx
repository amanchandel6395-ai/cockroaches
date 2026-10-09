import type { ReactNode } from "react";
import { ChevronRight, Bug } from "lucide-react";
import { STYLES, type RoachStyle } from "@/lib/roach-prompts";
import type { Facing } from "./useCamera";

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-border bg-card">
      {children}
      {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "left-4 bottom-4 border-l-2 border-b-2", "right-4 bottom-4 border-r-2 border-b-2"].map((c) => (
        <span key={c} className={`pointer-events-none absolute h-8 w-8 rounded-sm border-foreground/80 ${c}`} />
      ))}
    </div>
  );
}

export function BigButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-full bg-roach px-6 py-5 font-display text-2xl uppercase text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
    >
      <Bug className="h-6 w-6" />
      {children}
      <ChevronRight className="h-6 w-6" />
    </button>
  );
}

export function Pill({ children, onClick, disabled, wide }: { children: ReactNode; onClick: () => void; disabled?: boolean; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3.5 font-semibold text-secondary-foreground transition hover:border-primary disabled:opacity-40 ${wide ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

export function CameraSwitcher({ facing, onChange }: { facing: Facing; onChange: (f: Facing) => void }) {
  return (
    <div className="flex rounded-full bg-background/80 p-1 backdrop-blur">
      {(["user", "environment"] as Facing[]).map((f) => (
        <button
          key={f}
          aria-label={f === "user" ? "Front camera" : "Back camera"}
          onClick={() => onChange(f)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${facing === f ? "bg-foreground text-background" : "text-muted-foreground"}`}
        >
          {f === "user" ? "Front" : "Back"}
        </button>
      ))}
    </div>
  );
}

export function StylePicker({ value, onChange, disabled }: { value: RoachStyle; onChange: (s: RoachStyle) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cockroach style">
      {STYLES.map((s) => (
        <button
          key={s.id}
          role="radio"
          aria-checked={value === s.id}
          disabled={disabled}
          onClick={() => onChange(s.id)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${value === s.id ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
