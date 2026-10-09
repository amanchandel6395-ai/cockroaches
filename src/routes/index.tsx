import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Bug, Video } from "lucide-react";
import { PhotoMode } from "@/components/roachify/PhotoMode";
import { VideoMode } from "@/components/roachify/VideoMode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROACHIFY — Turn your face into a cockroach with AI" },
      { name: "description", content: "Snap a selfie and let AI give you a photorealistic cockroach face. Realistic, funny or horror." },
      { property: "og:title", content: "ROACHIFY — Become a cockroach" },
      { property: "og:description", content: "Snap a selfie and let AI give you a photorealistic cockroach face." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mode, setMode] = useState<"photo" | "video">("photo");
  return (
    <main className="min-h-screen bg-stage px-4 pb-10 pt-6">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <h1 className="flex items-center justify-center gap-1 font-display text-6xl uppercase text-roach">
          Ro<Bug className="h-12 w-12 text-primary" aria-hidden />achify
        </h1>
        <div className="grid grid-cols-2 rounded-2xl border border-border bg-secondary p-1" role="tablist">
          {(["photo", "video"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${mode === m ? "bg-roach text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
            >
              {m === "photo" ? <Camera className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              {m === "photo" ? "Selfie" : "Video"}
            </button>
          ))}
        </div>
        {mode === "photo" ? <PhotoMode key="p" /> : <VideoMode key="v" />}
        <p className="text-center text-xs text-muted-foreground">
          Privacy: photos are sent only to our AI for the transformation and are never stored or published.
        </p>
      </div>
    </main>
  );
}
