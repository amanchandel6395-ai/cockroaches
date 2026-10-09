import { useEffect, useRef, useState } from "react";
import { Circle, Pause, Play, Square, Upload, Video } from "lucide-react";
import { useCamera } from "./useCamera";
import { CameraSwitcher, Frame, Pill, StylePicker } from "./ui";
import type { RoachStyle } from "@/lib/roach-prompts";

const LIMIT = 15;
const MAX_BYTES = 50 * 1024 * 1024;

export function VideoMode() {
  const cam = useCamera(true);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
  const [secs, setSecs] = useState(0);
  const [clip, setClip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<RoachStyle>("realistic");

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (secs >= LIMIT && state !== "idle") recRef.current?.stop();
  }, [secs, state]);

  const record = () => {
    const stream = cam.streamRef.current;
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") return setError("Recording isn't supported in this browser. Upload a video instead.");
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: rec.mimeType });
      setClip(URL.createObjectURL(blob));
      setState("idle");
      cam.stop();
    };
    rec.start(250);
    recRef.current = rec;
    setSecs(0);
    setState("recording");
  };

  const togglePause = () => {
    const r = recRef.current;
    if (!r) return;
    if (state === "recording") { r.pause(); setState("paused"); }
    else { r.resume(); setState("recording"); }
  };

  const onFile = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) return setError("Please choose a video file.");
    if (f.size > MAX_BYTES) return setError("Video must be under 50 MB.");
    setError(null);
    cam.stop();
    setClip(URL.createObjectURL(f));
  };

  return (
    <div className="flex flex-col gap-4">
      <Frame>
        {clip ? (
          <video src={clip} controls playsInline className="h-full w-full object-cover" />
        ) : (
          <video ref={cam.videoRef} playsInline muted className={`h-full w-full object-cover ${cam.facing === "user" ? "-scale-x-100" : ""} ${cam.active ? "" : "hidden"}`} />
        )}
        {!clip && !cam.active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-muted-foreground">Record up to {LIMIT} seconds or upload a clip.</p>
            <Pill onClick={() => cam.start()}><Video className="h-4 w-4" /> Open camera</Pill>
          </div>
        )}
        {state !== "idle" && (
          <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-sm font-bold">
            ● 0:{String(secs).padStart(2, "0")} / 0:{LIMIT}
          </div>
        )}
        {cam.active && !clip && (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
            {state === "idle" ? (
              <>
                <CameraSwitcher facing={cam.facing} onChange={(f) => cam.start(f)} />
                <button aria-label="Start recording" onClick={record} className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-foreground bg-primary shadow-glow">
                  <Circle className="h-5 w-5 fill-current" />
                </button>
              </>
            ) : (
              <>
                <button aria-label={state === "paused" ? "Resume" : "Pause"} onClick={togglePause} className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  {state === "paused" ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </button>
                <button aria-label="Stop recording" onClick={() => recRef.current?.stop()} className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-foreground bg-primary">
                  <Square className="h-5 w-5 fill-current" />
                </button>
              </>
            )}
          </div>
        )}
      </Frame>

      {(cam.error || error) && (
        <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">{cam.error || error}</p>
      )}

      {clip && (
        <>
          <StylePicker value={style} onChange={setStyle} />
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Video cockroach mode is coming soon</p>
            Your clip is ready and stays on your device. AI video transformation isn't connected yet — try Photo mode for now.
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Pill onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload video</Pill>
        <Pill onClick={() => { setClip(null); cam.start(); }} disabled={state !== "idle"}><Video className="h-4 w-4" /> {clip ? "Retake" : "Record"}</Pill>
      </div>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
