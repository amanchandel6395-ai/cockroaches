import { useRef, useState } from "react";
import { Camera, Download, ImageUp, Plus, RefreshCw, Share2, Trash2, Undo2, Wand2 } from "lucide-react";
import { useCamera } from "./useCamera";
import { CameraSwitcher, Frame, StylePicker, BigButton, Pill } from "./ui";
import { CustomizePanel, BackgroundPicker, type BgChoice } from "./CustomizePanel";
import { CaptionPanel } from "./CaptionPanel";
import { streamImage } from "@/lib/stream-image";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, summarize, type RoachStyle, type Scope } from "@/lib/roach-prompts";

type Status = "idle" | "processing" | "done" | "error";

async function dataUrlToBlob(u: string) { return (await fetch(u)).blob(); }

async function composeWithCaption(src: string, caption: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  if (caption.trim()) {
    const size = Math.round(c.width / 16);
    ctx.font = `${size}px Anton, Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    const words = caption.trim().toUpperCase().split(/\s+/);
    const lines: string[] = []; let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > c.width * 0.9 && line) { lines.push(line); line = w; } else line = t;
    }
    lines.push(line);
    lines.forEach((l, i) => {
      const y = c.height - size * 0.8 - (lines.length - 1 - i) * size * 1.15;
      ctx.lineWidth = size / 6; ctx.strokeStyle = "black"; ctx.strokeText(l, c.width / 2, y);
      ctx.fillStyle = "white"; ctx.fillText(l, c.width / 2, y);
    });
  }
  // Watermark (removed once paid downloads are connected)
  const ws = Math.round(c.width / 22);
  ctx.save();
  ctx.font = `${ws}px Anton, Impact, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.textAlign = "center";
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(-Math.PI / 6);
  for (let y = -c.height; y < c.height; y += ws * 4) for (let x = -c.width; x < c.width; x += ws * 9) ctx.fillText("ROACHIFY", x, y);
  ctx.restore();
  return new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
}

export function PhotoMode() {
  const cam = useCamera(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<RoachStyle>("realistic");
  const [custom, setCustom] = useState("");
  const [scope, setScope] = useState<Scope>("face");
  const [bg, setBg] = useState<BgChoice>({ id: "", text: "" });
  const [editBg, setEditBg] = useState<BgChoice>({ id: "", text: "" });
  const [caption, setCaption] = useState("");
  const [burn, setBurn] = useState(true);
  const [captionTick, setCaptionTick] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const result = history[history.length - 1] ?? null;

  const setSource = (b: Blob) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(b); setPhotoUrl(URL.createObjectURL(b));
    setHistory([]); setStatus("idle"); setError(null); setCaption("");
  };

  const capture = () => {
    const v = cam.videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (cam.facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && (setSource(b), cam.stop()), "image/jpeg", 0.92);
  };

  const onFile = (f?: File) => {
    if (!f) return;
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return setError("Please choose a JPEG, PNG or WebP photo.");
    if (f.size > MAX_IMAGE_BYTES) return setError("That photo is over 10 MB. Try a smaller one.");
    cam.stop(); setSource(f);
  };

  const run = async (source: Blob, opts: { scope: Scope; custom: string; background: string }) => {
    setStatus("processing"); setError(null); setPreview(null); setIsFinal(false); setShowSummary(false);
    const form = new FormData();
    form.append("image", source, source instanceof File ? source.name : "photo.png");
    form.append("style", style);
    form.append("scope", opts.scope);
    form.append("custom", opts.custom);
    form.append("background", opts.background);
    let last: string | null = null;
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { window.location.href = "/auth"; return; }
      await streamImage("/api/roachify", form, (src, final) => { setPreview(src); setIsFinal(final); if (final) last = src; }, undefined, { Authorization: `Bearer ${sess.session.access_token}` });
      if (last) setHistory((h) => [...h, last!]);
      setPreview(null); setStatus("done"); setCaptionTick((t) => t + 1);
    } catch (e) {
      setPreview(null); setStatus(history.length ? "done" : "error");
      const msg = e instanceof Error ? e.message : "";
      setError(msg.includes("401") ? "Please sign in to continue." : msg.includes("quota") ? "Your free image is used up — get 10 more for ₹9 on the Plans page." : msg.includes("402") ? "AI credits have run out. Please top up to keep roachifying."
        : msg.includes("429") ? "Too many requests right now. Wait a moment and retry."
        : msg.includes("400") ? (msg.split(" 400 ")[1] || "That request wasn't accepted.")
        : "The transformation failed. Please try again.");
    }
  };

  const transform = () => photo && run(photo, { scope, custom, background: bg.text });
  const changeBg = async () => result && editBg.text.trim() && run(await dataUrlToBlob(result), { scope: "background", custom: "", background: editBg.text });

  const reset = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null); setPhotoUrl(null); setHistory([]); setStatus("idle"); setError(null); setCaption("");
  };

  const finalBlob = async () => composeWithCaption(result!, burn ? caption : "");
  const download = async () => {
    if (!result) return;
    const url = URL.createObjectURL(await finalBlob());
    const a = document.createElement("a"); a.href = url; a.download = "roachified.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const share = async () => {
    if (!result) return;
    const file = new File([await finalBlob()], "roachified.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "ROACHIFY", text: caption }).catch(() => {});
    else download();
  };

  const showing = preview ?? result ?? photoUrl;
  const busy = status === "processing";
  const summary = summarize({ style, scope, custom, background: bg.text });

  return (
    <div className="flex flex-col gap-4">
      <Frame>
        {showing ? (
          <img src={showing} draggable={false} onContextMenu={(e) => e.preventDefault()} alt={result ? "Your cockroach transformation" : "Your photo"}
            className={`h-full w-full object-cover transition-[filter] duration-700 ${preview && !isFinal ? "blur-2xl" : "blur-0"}`} />
        ) : (
          <video ref={cam.videoRef} playsInline muted
            className={`h-full w-full object-cover ${cam.facing === "user" ? "-scale-x-100" : ""} ${cam.active ? "" : "hidden"}`} />
        )}
        {result && !preview && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
            <span className="-rotate-[30deg] font-display text-6xl uppercase opacity-25">Roachify</span>
          </div>
        )}
        {result && !preview && burn && caption.trim() && (
          <p className="pointer-events-none absolute inset-x-4 bottom-6 text-center font-display text-2xl uppercase [-webkit-text-stroke:1px_black] [paint-order:stroke] drop-shadow-lg">{caption}</p>
        )}
        {!showing && !cam.active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-muted-foreground">Snap a selfie or upload a photo to begin your metamorphosis.</p>
            <Pill onClick={() => cam.start()}><Camera className="h-4 w-4" /> Open camera</Pill>
          </div>
        )}
        {busy && (
          <>
            <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-muted">
              <div className="h-full w-1/3 animate-[slide_1.2s_ease-in-out_infinite] bg-roach" />
            </div>
            <div className="absolute inset-x-0 bottom-16 text-center text-sm font-semibold drop-shadow">Growing antennae… this can take up to a minute</div>
          </>
        )}
        {cam.active && !showing && (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
            <CameraSwitcher facing={cam.facing} onChange={(f) => cam.start(f)} />
            <button aria-label="Capture photo" onClick={capture} className="h-14 w-14 rounded-full border-4 border-foreground bg-primary shadow-glow" />
          </div>
        )}
      </Frame>

      {(cam.error || error) && (
        <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">{cam.error || error}</p>
      )}

      {result ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Pill onClick={download} disabled={busy}><Download className="h-4 w-4" /> Download</Pill>
            <Pill onClick={share} disabled={busy}><Share2 className="h-4 w-4" /> Share</Pill>
            <Pill onClick={reset} disabled={busy}><Trash2 className="h-4 w-4" /> Delete</Pill>
            <Pill onClick={() => setHistory((h) => h.slice(0, -1))} disabled={busy}><Undo2 className="h-4 w-4" /> {history.length > 1 ? "Undo" : "Back"}</Pill>
            <Pill onClick={transform} disabled={busy}><RefreshCw className="h-4 w-4" /> Try again</Pill>
            <Pill onClick={reset} disabled={busy}><Plus className="h-4 w-4" /> New</Pill>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={burn} onChange={(e) => setBurn(e.target.checked)} className="accent-primary" /> Put caption on the image when downloading
          </label>
          <CaptionPanel context={summary.join("; ")} caption={caption} setCaption={setCaption} trigger={captionTick} />
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-xl uppercase">Change background</h2>
            <BackgroundPicker bg={editBg} setBg={setEditBg} disabled={busy} />
            <Pill onClick={changeBg} disabled={busy || !editBg.text.trim()} wide><Wand2 className="h-4 w-4" /> Apply background</Pill>
          </section>
        </>
      ) : (
        <>
          {photo && (
            <>
              <StylePicker value={style} onChange={setStyle} disabled={busy} />
              <CustomizePanel custom={custom} setCustom={setCustom} scope={scope} setScope={setScope} bg={bg} setBg={setBg} disabled={busy} />
            </>
          )}
          {showSummary && (
            <div className="rounded-2xl border border-primary/60 bg-accent p-4 text-sm">
              <p className="mb-1 font-semibold">Here's what we'll do:</p>
              <ul className="list-disc pl-5">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
              <button onClick={() => setShowSummary(false)} className="mt-2 text-xs font-semibold underline">Edit prompt</button>
            </div>
          )}
          <BigButton onClick={showSummary ? transform : () => setShowSummary(true)} disabled={!photo || busy}>
            {busy ? "Transforming…" : showSummary ? "Confirm & go" : status === "error" ? "Retry" : "Make me a cockroach"}
          </BigButton>
          <div className="grid grid-cols-2 gap-3">
            <Pill onClick={() => fileRef.current?.click()} disabled={busy}><ImageUp className="h-4 w-4" /> Upload photo</Pill>
            <Pill onClick={() => { reset(); cam.start(); }} disabled={busy}><Camera className="h-4 w-4" /> {photo ? "Retake" : "Camera"}</Pill>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
