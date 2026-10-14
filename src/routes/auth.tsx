import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ROACHIFY" },
      { name: "description", content: "Sign in to ROACHIFY to save your credits and plans." },
      { property: "og:title", content: "Sign in — ROACHIFY" },
      { property: "og:description", content: "Sign in to ROACHIFY to save your credits and plans." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : "Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message); else nav({ to: "/" });
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Google sign-in failed. Try again.");
    else if (!r.redirected) nav({ to: "/" });
  };

  const input = "w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary";
  return (
    <main className="flex min-h-screen items-center justify-center bg-stage px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-card p-6">
        <h1 className="text-center font-display text-4xl uppercase text-roach">Roachify</h1>
        {typeof window !== "undefined" && localStorage.getItem("roachify_pending_order") && (
          <p className="rounded-xl border border-primary bg-accent p-3 text-center text-sm">✅ Payment ho gaya! Ab account banaiye taaki aapke credits save ho jayein.</p>
        )}
        <p className="text-center text-sm text-muted-foreground">{mode === "in" ? "Sign in to continue" : "Create your account"}</p>
        <button onClick={google} className="rounded-xl border border-border bg-secondary py-3 font-semibold">Continue with Google</button>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          <button disabled={busy} className="rounded-full bg-roach py-3 font-display text-lg uppercase text-primary-foreground shadow-glow disabled:opacity-50">
            {mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>
        {msg && <p role="alert" className="text-center text-sm">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-sm text-muted-foreground underline">
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
