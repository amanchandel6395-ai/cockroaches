import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";

export function useCamera(withAudio: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(
    async (mode: Facing = facing) => {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser doesn't support camera access. Try uploading instead.");
        return;
      }
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: withAudio,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setFacing(mode);
        setActive(true);
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow it in your browser settings, or upload instead."
            : "No camera available. You can upload a file instead.",
        );
      }
    },
    [facing, stop, withAudio],
  );

  useEffect(() => stop, [stop]);

  return { videoRef, streamRef, facing, active, error, start, stop };
}
