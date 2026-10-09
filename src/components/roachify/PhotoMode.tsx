import { useRef, useState } from "react";
import { Camera, Download, ImageUp, RefreshCw, Share2, Trash2 } from "lucide-react";
import { useCamera } from "./useCamera";
import { CameraSwitcher, Frame, StylePicker, BigButton, Pill } from "./ui";
import { streamImage } from "@/lib/stream-image";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, type RoachStyle } from "@/lib/roach-prompts";

type Status = "idle" | "processing" | "done" | "error";

export function PhotoMode() {
  const cam = useCamera(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<RoachStyle>("realistic");

  const setSource = (b: Blob) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(b);
    setPhotoUrl(URL.createObjectURL(b));
    setResult(null);
    setStatus("idle");
    setError(null);
  };

  const capture = () => {
    const v = cam.videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (cam.facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && (setSource(b), cam.stop()), "image/jpeg", 0.92);
  };

  const onFile = (f?: File) => {
    if (!f) return;
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return setError("Please choose a JPEG, PNG or WebP photo.");
    if (f.size > MAX_IMAGE_BYTES) return setError("That photo is over 10 MB. Try a smaller one.");
    cam.stop();
    setSource(f);
  };

  const transform = async () => {
    if (!photo) return;
    setStatus("processing");
    setError(null);
    setResult(null);
    setIsFinal(false);
    const form = new FormData();
    form.append("image", photo, photo instanceof File ? photo.name : "selfie.jpg");
    form.append("style", style);
    try {
      await streamImage("/api/roachify", form, (src, final) => {
        setResult(src);
        setIsFinal(final);
      });
      setStatus("done");
    } catch (e) {
      setResult(null);
      setStatus("error");
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("402")
          ? "AI credits have run out. Please top up to keep roachifying."
          : msg.includes("429")
            ? "Too many requests right now. Wait a moment and retry."
            : "The transformation failed. Please try again.",
      );
    }
  };

  const reset = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl(null);
    setResult(null);
    setStatus("idle");
    setError(null);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "roachified.png";
    a.click();
  };

  const share = async () => {
    if (!result) return;
    const blob = await (await fetch(result)).blob();
    const file = new File([blob], "roachified.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "ROACHIFY" }).catch(() => {});
    else download();
  };

  const showing = result ?? photoUrl;

  return (
    <div className="flex flex-col gap-4">
      <Frame>
        {showing ? (
          <img
            src={showing}
            alt={result ? "Your cockroach transformation" : "Your photo"}
            className={`h-full w-full object-cover transition-[filter] duration-700 ${result && !isFinal ? "blur-2xl" : "blur-0"}`}
          />
        ) : (
          <video
            ref={cam.videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${cam.facing === "user" ? "-scale-x-100" : ""} ${cam.active ? "" : "hidden"}`}
          />
        )}
        {!showing && !cam.active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-muted-foreground">Snap a selfie or upload a photo to begin your metamorphosis.</p>
            <Pill onClick={() => cam.start()}>
              <Camera className="h-4 w-4" /> Open camera
            </Pill>
          </div>
        )}
        {status === "processing" && (
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-muted">
            <div className="h-full w-1/3 animate-[slide_1.2s_ease-in-out_infinite] bg-roach" />
          </div>
        )}
        {status === "processing" && (
          <div className="absolute inset-x-0 bottom-16 text-center text-sm font-semibold drop-shadow">
            Growing antennae… this can take up to a minute
          </div>
        )}
        {cam.active && !showing && (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
            <CameraSwitcher facing={cam.facing} onChange={(f) => cam.start(f)} />
            <button
              aria-label="Capture photo"
              onClick={capture}
              className="h-14 w-14 rounded-full border-4 border-foreground bg-primary shadow-glow"
            />
          </div>
        )}
      </Frame>

      {(cam.error || error) && (
        <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
          {cam.error || error}
        </p>
      )}

      {photo && status !== "done" && <StylePicker value={style} onChange={setStyle} disabled={status === "processing"} />}

      {status === "done" && result ? (
        <div className="grid grid-cols-3 gap-3">
          <Pill onClick={download}><Download className="h-4 w-4" /> Download</Pill>
          <Pill onClick={share}><Share2 className="h-4 w-4" /> Share</Pill>
          <Pill onClick={reset}><Trash2 className="h-4 w-4" /> Delete</Pill>
          <div className="col-span-3">
            <Pill onClick={() => { setResult(null); setStatus("idle"); }} wide>
              <RefreshCw className="h-4 w-4" /> Try another style
            </Pill>
          </div>
        </div>
      ) : (
        <>
          <BigButton onClick={transform} disabled={!photo || status === "processing"}>
            {status === "processing" ? "Transforming…" : status === "error" ? "Retry" : "Make me a cockroach"}
          </BigButton>
          <div className="grid grid-cols-2 gap-3">
            <Pill onClick={() => fileRef.current?.click()}><ImageUp className="h-4 w-4" /> Upload photo</Pill>
            <Pill onClick={() => { reset(); cam.start(); }} disabled={status === "processing"}>
              <Camera className="h-4 w-4" /> {photo ? "Retake" : "Camera"}
            </Pill>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
