import { createFileRoute } from "@tanstack/react-router";

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const body = await request.text();
        const given = request.headers.get("x-razorpay-signature") ?? "";
        const expected = await hmacHex(secret, body);
        if (given.length !== expected.length || given !== expected) return new Response("Bad signature", { status: 401 });
        const ev = JSON.parse(body) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } } };
        const pay = ev.payload?.payment?.entity;
        if ((ev.event === "payment.captured" || ev.event === "order.paid") && pay?.order_id) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.rpc("grant_purchase", { _order: pay.order_id, _payment: pay.id });
        }
        return new Response("ok");
      },
    },
  },
});
