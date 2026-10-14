import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRODUCTS, type Product } from "./plans";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: e } = await supabase.from("entitlements").select("*").eq("user_id", userId).maybeSingle();
    const { count } = await supabase.from("usage_log").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "image");
    const active = !!e?.plan && !!e.plan_expires_at && new Date(e.plan_expires_at) > new Date();
    return {
      imageCredits: e?.image_credits ?? 0,
      downloadCredits: e?.download_credits ?? 0,
      plan: active ? e!.plan : null,
      planExpiresAt: active ? e!.plan_expires_at : null,
      freeImageLeft: (count ?? 0) === 0,
    };
  });

export const useDownloadCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("consume_quota", { _user: context.userId, _kind: "download" });
    return { ok: String(data).startsWith("ok"), reason: String(data).split(":")[1] ?? "" };
  });

// Payment gateway (Razorpay) — needs RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET from the owner.
// Public: guests pay first, then sign up and claim the order.
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ product: z.enum(["image_pack", "download", "video_plan", "combo_plan"]) }).parse(d))
  .handler(async ({ data }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !secret) return { error: "Payments are being set up. Please check back soon!" as string, order: null };
    const p = PRODUCTS[data.product as Product];
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${keyId}:${secret}`), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: p.price * 100, currency: "INR", notes: { product: data.product } }),
    });
    if (!res.ok) return { error: "Couldn't start payment. Please try again.", order: null };
    const order = (await res.json()) as { id: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").insert({ user_id: null, product: data.product, amount_inr: p.price, provider_order_id: order.id });
    return { error: null, order: { id: order.id, keyId, amount: p.price * 100, name: p.name } };
  });

export const claimOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().min(5).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.rpc("claim_payment", { _order: data.orderId, _user: context.userId });
    return { status: String(r) };
  });
