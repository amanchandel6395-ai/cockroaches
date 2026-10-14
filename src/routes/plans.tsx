import { createFileRoute, Link } from "@tanstack/react-router";
import { PlanCard } from "@/components/roachify/Paywall";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Pricing — ROACHIFY" },
      { name: "description", content: "Image packs from ₹9, Video Plan ₹199 and Combo Plan ₹299. Pay with UPI, cards or netbanking." },
      { property: "og:title", content: "Plans & Pricing — ROACHIFY" },
      { property: "og:description", content: "Image packs from ₹9, Video Plan ₹199 and Combo Plan ₹299." },
    ],
  }),
  component: Plans,
});

function Plans() {
  return (
    <main className="min-h-screen bg-stage px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Link to="/" className="text-sm text-muted-foreground">← Back</Link>
        <h1 className="text-center font-display text-5xl uppercase text-roach">Plans</h1>
        <p className="text-center text-sm text-muted-foreground">Your first cockroach image is free 🪳</p>
        <PlanCard product="image_pack" />
        <PlanCard product="video_plan" />
        <PlanCard product="combo_plan" highlight />
      </div>
    </main>
  );
}
