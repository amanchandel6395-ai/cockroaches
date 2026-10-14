import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { claimOrder } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";

const KEY = "roachify_pending_order";

/** After a guest pays and then signs in, attach the paid order to their account. */
export function ClaimPending() {
  const { user } = useAuth();
  const claim = useServerFn(claimOrder);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const id = localStorage.getItem(KEY);
    if (!user || !id) return;
    let tries = 0;
    const run = async () => {
      const r = await claim({ data: { orderId: id } }).catch(() => ({ status: "error" }));
      if (r.status === "done") { localStorage.removeItem(KEY); setMsg("Payment linked to your account 🎉"); }
      else if (r.status === "pending" && tries++ < 10) setTimeout(run, 3000);
      else if (r.status === "taken" || r.status === "missing") localStorage.removeItem(KEY);
      else setMsg("Payment is still processing. Refresh in a minute.");
    };
    run();
  }, [user, claim]);
  return msg ? <p role="status" className="rounded-xl border border-primary bg-accent px-4 py-3 text-center text-sm">{msg}</p> : null;
}
