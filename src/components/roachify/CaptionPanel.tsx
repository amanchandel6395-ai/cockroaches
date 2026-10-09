import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, RefreshCw, Check } from "lucide-react";
import { generateCaptions } from "@/lib/captions.functions";

type Lang = "hinglish" | "hindi" | "english";
type Tone = "funny" | "savage" | "meme" | "horror" | "dramatic";

export function CaptionPanel({ context, caption, setCaption, trigger }: {
  context: string; caption: string; setCaption: (s: string) => void; trigger: number;
}) {
  const gen = useServerFn(generateCaptions);
  const [auto, setAuto] = useState(true);
  const [lang, setLang] = useState<Lang>("hinglish");
  const [tone, setTone] = useState<Tone>("funny");
  const [tags, setTags] = useState(false);
  const [instr, setInstr] = useState("");
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await gen({ data: { language: lang, tone, hashtags: tags, instructions: instr.slice(0, 300), context: context.slice(0, 600) } });
      if (r.error) setError(r.error);
      else { setList(r.captions); if (r.captions[0]) setCaption(r.captions[0]); }
    } catch { setError("Couldn't write captions right now."); }
    setLoading(false);
  }, [gen, lang, tone, tags, instr, context, setCaption]);

  useEffect(() => { if (trigger && auto) run(); }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = "rounded-lg border border-input bg-background px-2 py-1.5 text-sm";
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl uppercase">Captions</h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-primary" /> Auto-generate
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className={sel}>
          <option value="hinglish">Hinglish</option><option value="hindi">Hindi</option><option value="english">English</option>
        </select>
        <select aria-label="Tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)} className={sel}>
          {["funny", "savage", "meme", "horror", "dramatic"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={tags} onChange={(e) => setTags(e.target.checked)} className="accent-primary" /> Hashtags</label>
      </div>
      <input value={instr} onChange={(e) => setInstr(e.target.value)} maxLength={300} placeholder="Custom caption instructions (optional)"
        className="rounded-xl border border-input bg-background p-2.5 text-sm" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Writing captions…</p>}
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c}>
            <button onClick={() => setCaption(c)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${caption === c ? "border-primary bg-accent" : "border-border"}`}>{c}</button>
          </li>
        ))}
      </ul>
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="Your caption (edit freely)"
        className="resize-none rounded-xl border border-input bg-background p-2.5 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={run} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold disabled:opacity-40">
          <RefreshCw className="h-4 w-4" /> {list.length ? "Regenerate" : "Generate"}
        </button>
        <button disabled={!caption} onClick={async () => { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold disabled:opacity-40">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
        </button>
      </div>
    </section>
  );
}
