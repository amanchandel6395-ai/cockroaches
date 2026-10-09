import { BACKGROUNDS, CHIPS, MAX_TEXT, SCOPES, type Scope } from "@/lib/roach-prompts";

export type BgChoice = { id: string; text: string };

export function CustomizePanel({
  custom, setCustom, scope, setScope, bg, setBg, disabled,
}: {
  custom: string; setCustom: (s: string) => void;
  scope: Scope; setScope: (s: Scope) => void;
  bg: BgChoice; setBg: (b: BgChoice) => void;
  disabled?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-xl uppercase">Customize your transformation</h2>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button key={c.label} disabled={disabled} onClick={() => setCustom(c.prompt)}
            className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold hover:border-primary">
            {c.label}
          </button>
        ))}
      </div>
      <textarea
        value={custom} maxLength={MAX_TEXT} disabled={disabled} rows={3}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="Describe your dream cockroach transformation..."
        className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <label className="text-xs font-semibold uppercase text-muted-foreground">What to change</label>
      <div className="grid grid-cols-3 gap-2">
        {SCOPES.map((s) => (
          <button key={s.id} disabled={disabled} onClick={() => setScope(s.id)} aria-pressed={scope === s.id}
            className={`rounded-xl border px-2 py-2 text-xs font-semibold ${scope === s.id ? "border-primary bg-accent" : "border-border text-muted-foreground"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <BackgroundPicker bg={bg} setBg={setBg} disabled={disabled} />
    </section>
  );
}

export function BackgroundPicker({ bg, setBg, disabled }: { bg: BgChoice; setBg: (b: BgChoice) => void; disabled?: boolean }) {
  return (
    <>
      <label className="text-xs font-semibold uppercase text-muted-foreground">Change background (optional)</label>
      <div className="flex flex-wrap gap-2">
        <button disabled={disabled} onClick={() => setBg({ id: "", text: "" })}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${bg.id === "" ? "border-primary bg-accent" : "border-border text-muted-foreground"}`}>Keep original</button>
        {BACKGROUNDS.map((b) => (
          <button key={b.id} disabled={disabled} onClick={() => setBg({ id: b.id, text: b.prompt })}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${bg.id === b.id ? "border-primary bg-accent" : "border-border text-muted-foreground"}`}>
            {b.label}
          </button>
        ))}
        <button disabled={disabled} onClick={() => setBg({ id: "custom", text: bg.id === "custom" ? bg.text : "" })}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${bg.id === "custom" ? "border-primary bg-accent" : "border-border text-muted-foreground"}`}>Custom…</button>
      </div>
      {bg.id === "custom" && (
        <input value={bg.text} maxLength={MAX_TEXT} disabled={disabled} onChange={(e) => setBg({ id: "custom", text: e.target.value })}
          placeholder="e.g. a giant throne in a dark red palace"
          className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary" />
      )}
    </>
  );
}
