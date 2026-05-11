import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FEATURES = [
  "Swipe and match with jobs",
  "AI-generated cover letters",
  "CV ATS scoring",
  "CV Revamp requests",
  "Interview Preparation",
  "Browse Quick Jobs",
];

const Subscribe = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const activate = async (trialDays: number) => {
    if (!user) { navigate("/auth"); return; }
    setBusy(true);
    const expires = new Date();
    expires.setDate(expires.getDate() + trialDays);
    const { error } = await supabase.from("profiles").update({
      subscription_status: "active",
      subscription_expires_at: expires.toISOString(),
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (trialDays === 3) {
      toast.success("Your 3-day free trial is now active! Welcome to Talenthub 🎉");
    } else {
      toast.success("Welcome to Talenthub! Your subscription is active.");
    }
    navigate("/swipe");
  };

  return (
    <div className="flex-1 flex flex-col bg-background p-6 overflow-y-auto">
      <div className="flex justify-center mt-2"><Logo size={72} /></div>
      <div className="mt-6 text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
          <Crown className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Unlock Talenthub</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Full access to job matching, AI cover letters, CV scoring and more
        </p>
      </div>

      <div className="mt-5 bg-card border border-border rounded-2xl p-5 space-y-3">
        {FEATURES.map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-success shrink-0" /> {f}
          </div>
        ))}
      </div>

      {/* 3-day trial — primary CTA */}
      <div className="mt-5 bg-gradient-to-br from-forest to-forest/80 rounded-2xl p-5 text-forest-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-warning" />
          <p className="font-bold text-base">3-Day Free Trial</p>
        </div>
        <p className="text-xs opacity-80 mb-4">Get full access for 3 days, completely free. No payment required to start.</p>
        <Button
          onClick={() => activate(3)}
          disabled={busy}
          className="w-full h-11 bg-warning hover:bg-warning/90 text-warning-foreground rounded-xl font-semibold"
        >
          {busy ? "Activating…" : "Start Free Trial — 3 Days"}
        </Button>
      </div>

      {/* Paid plan */}
      <div className="mt-4 text-center">
        <p className="text-3xl font-bold">P50 <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
        <p className="text-[11px] text-muted-foreground mt-1">Mock payment — payment gateway coming soon</p>
      </div>

      <div className="mt-4 space-y-2">
        <Button onClick={() => activate(30)} disabled={busy} className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
          {busy ? "Activating…" : "Subscribe for P50/month"}
        </Button>
        <button onClick={() => activate(30)} disabled={busy} className="w-full text-xs text-muted-foreground">
          Skip for now (beta access)
        </button>
      </div>
    </div>
  );
};

export default Subscribe;
