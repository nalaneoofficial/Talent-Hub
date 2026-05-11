import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, CreditCard, Lock, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFlag } from "@/lib/featureFlags";
import { toast } from "sonner";

const PRICE_BWP = 250;

const FOCUS_OPTIONS = [
  "ATS optimisation", "Career change", "Gap in employment",
  "Highlight achievements", "Entry-level / graduate", "Senior / executive level",
  "Skills & keywords", "Layout & formatting", "LinkedIn alignment", "Other",
];

const CVRevamp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const revampEnabled = useFlag("revamp_enabled");
  const paymentsEnabled = useFlag("payments_enabled");
  const revampPaymentsOn = useFlag("cv_revamp_payments");
  const betaMode = useFlag("beta_mode");
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentJob, setCurrentJob] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [attachments, setAttachments] = useState<Array<{ file: File; label: string }>>([]);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"none" | "select" | "confirm">(revampPaymentsOn ? "select" : "none");
  const [revampLevel, setRevampLevel] = useState<"entry" | "mid" | "senior" | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ status: string; level: string | null; amount: number | null }>({ status: "skipped_beta", level: null, amount: null });

  const loadLatest = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("revamp_requests")
      .select("fulfilment_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestStatus((data as any)?.fulfilment_status ?? null);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("current_job_title,cv_path").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.current_job_title) setCurrentJob(data.current_job_title);
        if (data?.cv_path) setCvPath(data.cv_path);
      });
    loadLatest();
  }, [user]);

  useEffect(() => {
    if (revampPaymentsOn && paymentStep === "none" && !submitted) setPaymentStep("select");
  }, [revampPaymentsOn]);

  if (!revampEnabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Lock className="w-10 h-10 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Revamp service paused</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Our partner coaches are at capacity. Please check back soon.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-6">Go back</Button>
      </div>
    );
  }

  if (revampPaymentsOn && paymentStep === "select") {
    return (
      <div className="flex-1 flex flex-col bg-background p-6 overflow-y-auto">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center self-start">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="mt-4 text-2xl font-bold">Choose your level</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick the package that matches your experience.</p>
        <div className="mt-6 space-y-3 pb-8">
          <button onClick={() => { setRevampLevel("entry"); setPaymentStep("confirm"); }}
            className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors">
            <div className="flex items-center justify-between"><p className="font-bold">Entry Level</p><p className="font-bold text-primary">P150</p></div>
            <p className="text-xs text-muted-foreground mt-1">For candidates with 0-3 years experience</p>
          </button>
          <button onClick={() => { setRevampLevel("mid"); setPaymentStep("confirm"); }}
            className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors">
            <div className="flex items-center justify-between"><p className="font-bold">Mid Level</p><p className="font-bold text-primary">P200</p></div>
            <p className="text-xs text-muted-foreground mt-1">For candidates with 4-9 years experience</p>
          </button>
          <button onClick={() => { setRevampLevel("senior"); setPaymentStep("confirm"); }}
            className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors">
            <div className="flex items-center justify-between"><p className="font-bold">Senior Level</p><p className="font-bold text-primary">P300</p></div>
            <p className="text-xs text-muted-foreground mt-1">For professionals with 10+ years experience</p>
          </button>
        </div>
      </div>
    );
  }

  if (revampPaymentsOn && paymentStep === "confirm" && revampLevel) {
    const amount = revampLevel === "entry" ? 150 : revampLevel === "mid" ? 200 : 300;
    const proceed = (status: "paid" | "skipped_beta") => {
      setPaymentInfo({ status, level: revampLevel, amount });
      setPaymentStep("none");
      toast.success("Payment confirmed — complete your request below");
    };
    return (
      <div className="flex-1 flex flex-col bg-background p-6 overflow-y-auto">
        <button onClick={() => setPaymentStep("select")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center self-start">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">{revampLevel === "entry" ? "Entry Level" : revampLevel === "mid" ? "Mid Level" : "Senior Level"}</p>
          <p className="text-4xl font-bold mt-1">P{amount}</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs">Mock payment — payment gateway coming soon</p>
          <Button onClick={() => proceed("paid")} className="mt-6 w-full max-w-xs h-12 bg-forest hover:bg-forest/90 rounded-xl">
            Confirm & Pay P{amount}
          </Button>
          <button onClick={() => proceed("skipped_beta")} className="mt-3 text-xs text-muted-foreground">Skip payment (beta)</button>
        </div>
      </div>
    );
  }

  const toggleFocus = (f: string) =>
    setFocus((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f]);

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({ file: f, label: f.name.replace(/\.[^.]+$/, "") }));
    setAttachments((p) => [...p, ...arr]);
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Upload attachments to app-docs
      const paths: string[] = [];
      for (const a of attachments) {
        const ext = a.file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/revamp/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("app-docs").upload(path, a.file, {
          contentType: a.file.type || undefined, upsert: false,
        });
        if (upErr) { console.warn("attachment upload failed", upErr); continue; }
        paths.push(path);
      }

      // Build notes from chips + labels + custom
      const focusParts = [...focus];
      if (focus.includes("Other") && otherText.trim()) focusParts.push(otherText.trim());
      const labelLines = attachments.length
        ? "\nAttachments:\n" + attachments.map((a, i) => `${i + 1}. ${a.label}`).join("\n")
        : "";
      const notes = (focusParts.join(", ") + labelLines).slice(0, 2000);

      const { error, data: inserted } = await supabase.from("revamp_requests").insert({
        user_id: user.id,
        current_job_title: currentJob || null,
        target_job_title: targetJob || null,
        notes: notes || null,
        cv_path: cvPath,
        attachment_paths: paths,
        payment_status: paymentInfo.status as any,
        revamp_level: paymentInfo.level,
        revamp_amount: paymentInfo.amount,
        fulfilment_status: "new",
      } as any).select("id").single();
      if (error) throw error;
      if (inserted?.id) setSubmittedId(inserted.id);
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit request");
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Request received</h2>
        {submittedId && (
          <div className="mt-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground">Your Request ID</p>
            <p className="text-lg font-bold text-primary font-mono">CVR-{submittedId.substring(0, 4).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground mt-1">Save this ID to track your request.</p>
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground max-w-xs">
          Our partner coach will review your CV and reach out within 2 business days.
        </p>
        <Button onClick={() => navigate("/swipe")} className="mt-8 bg-forest hover:bg-forest/90 rounded-xl">
          Back to jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex-1 flex flex-col bg-background overflow-hidden">
      <div className="p-6 pb-3 shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 flex-1 overflow-y-auto pb-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CV Revamp</h1>
            <p className="text-xs text-muted-foreground">Pro coaches rewrite your CV for ATS</p>
          </div>
        </div>

        {betaMode && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-warning-foreground">
            <strong>Beta:</strong> You are using the beta version. Premium features and payment are not yet active.
          </div>
        )}

        {latestStatus && <RevampProgress status={latestStatus} />}

        <div className="space-y-3">
          <div>
            <Label htmlFor="current">Current role (optional)</Label>
            <Input id="current" value={currentJob} onChange={(e) => setCurrentJob(e.target.value)} placeholder="e.g. Junior Accountant" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="target">Target role</Label>
            <Input id="target" value={targetJob} onChange={(e) => setTargetJob(e.target.value)} placeholder="e.g. Finance Manager" maxLength={120} />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">What should the coach focus on?</Label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((f) => {
              const selected = focus.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFocus(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
          {focus.includes("Other") && (
            <Input
              className="mt-2"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Tell the coach what to focus on"
              maxLength={300}
            />
          )}
        </div>

        <div>
          <Label className="mb-2 block">Supporting documents</Label>
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }} />
          {attachments.map((a, i) => (
            <div key={i} className="mb-2 bg-card rounded-2xl p-3 border border-border space-y-2">
              <div className="flex items-center gap-3">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-xs truncate text-muted-foreground">{a.file.name}</p>
                <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                value={a.label}
                onChange={(ev) => setAttachments((p) => p.map((x, j) => j === i ? { ...x, label: ev.target.value } : x))}
                placeholder="Document name e.g. Degree Certificate"
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border outline-none"
              />
            </div>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full text-xs text-primary border border-dashed border-border rounded-xl py-2.5 flex items-center justify-center gap-2"
          >
            <Paperclip className="w-3.5 h-3.5" /> Add document
          </button>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            💡 Required: Most recent CV, Academic Certificates, Professional Certifications/Short Courses, Professional licenses/memberships, References/ID/Driving License.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Attached CV</p>
          <p className="text-sm font-medium mt-0.5">{cvPath ? "Your uploaded CV will be shared with the coach" : "No CV on file — upload one from your profile first"}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Service fee</span>
            </div>
            <span className="font-bold">BWP {paymentInfo.amount || PRICE_BWP}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {paymentsEnabled
              ? "You'll be charged once your request is accepted."
              : "Payments are coming soon. During beta, requests are free."}
          </p>
        </div>
      </div>

      <div className="p-6 pt-3 border-t border-border bg-card shrink-0">
        <Button onClick={submit} disabled={submitting || !cvPath} className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : paymentsEnabled ? "Continue to payment" : "Submit request"}
        </Button>
      </div>
    </div>
  );
};

export default CVRevamp;

const REVAMP_STEPS = [
  { key: "new", label: "Submitted" },
  { key: "in_progress", label: "In Progress" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const RevampProgress = ({ status }: { status: string }) => {
  const idx = Math.max(0, REVAMP_STEPS.findIndex((s) => s.key === status));
  const isCancelled = status === "cancelled";
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Your latest request</p>
      <div className="flex items-center justify-between">
        {REVAMP_STEPS.map((s, i) => {
          const active = i <= idx;
          const isThisStep = i === idx;
          const color = isCancelled && isThisStep
            ? "bg-destructive text-destructive-foreground"
            : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground";
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${color}`}>{i + 1}</div>
              <p className={`text-[10px] mt-1 text-center ${isThisStep ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</p>
              {i < REVAMP_STEPS.length - 1 && (
                <div className={`hidden ${i < REVAMP_STEPS.length - 1 ? "" : ""}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${isCancelled ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${((idx + 1) / REVAMP_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
};
