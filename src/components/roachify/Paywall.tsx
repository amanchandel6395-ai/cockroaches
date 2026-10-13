import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { createOrder } from "@/lib/account.functions";
import { PRODUCTS, type Product } from "@/lib/plans";

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } } }

function loadRazorpay() {
  return new Promise<boolean>((res) => {
    if (window.Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true); s.onerror = () => res(false);
    document.body.appendChild(s);
  });
}

export function PlanCard({ product, highlight, onPaid }: { product: Product; highlight?: boolean; onPaid?: () => void }) {
  const p = PRODUCTS[product];
  const order = useServerFn(createOrder);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pay = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await order({ data: { product } });
      if (r.error || !r.order) { setMsg(r.error); return; }
      if (!(await loadRazorpay()) || !window.Razorpay) { setMsg("Couldn't load the payment window."); return; }
      new window.Razorpay({
        key: r.order.keyId, order_id: r.order.id, amount: r.order.amount, currency: "INR",
        name: "ROACHIFY", description: r.order.name, theme: { color: "#e11d2e" },
        handler: () => { setMsg("Payment received! Updating your account…"); setTimeout(() => onPaid?.(), 2500); },
      }).open();
    } catch { setMsg("Please sign in first."); } finally { setBusy(false); }
  };
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${highlight ? "border-primary bg-accent shadow-glow" : "border-border bg-card"}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl uppercase">{p.name}</h3>
        <p><span className="font-display text-3xl">₹{p.price}</span> <span className="text-xs text-muted-foreground">{p.desc}</span></p>
      </div>
      <ul className="flex flex-col gap-1 text-sm">{p.perks.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>)}</ul>
      <button onClick={pay} disabled={busy} className="rounded-full bg-roach py-3 font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? "Opening…" : `Pay ₹${p.price}`}
      </button>
      <p className="text-center text-xs text-muted-foreground">UPI · Debit/Credit card · Netbanking</p>
      {msg && <p role="alert" className="text-center text-sm">{msg}</p>}
    </div>
  );
}

export function Paywall({ text, product, onClose, onPaid }: { text: string; product: Product; onClose: () => void; onPaid?: () => void }) {
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur sm:items-center">
      <div className="relative flex w-full max-w-sm flex-col gap-3">
        <button aria-label="Close" onClick={onClose} className="absolute -top-10 right-0 rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
        <p className="rounded-2xl bg-card p-4 text-center font-semibold">{text}</p>
        <PlanCard product={product} highlight onPaid={onPaid} />
      </div>
    </div>
  );
}
