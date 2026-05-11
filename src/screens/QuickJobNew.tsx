import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useFlag } from "@/lib/featureFlags";

const CATEGORIES = ["Babysitting", "Cleaning", "Gardening", "Painting", "Tutoring", "Driving", "Event Help", "Moving", "Cooking", "Security", "Delivery", "Other"];
const PAY_TYPES = ["hourly", "fixed"];

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().min(2),
  description: z.string().trim().min(5).max(800),
  pay_amount: z.coerce.number().min(0),
  pay_type: z.string(),
  location: z.string().trim().min(2).max(120),
  date_needed: z.string().min(1),
  duration: z.string().trim().min(1).max(120),
  contact_number: z.string().trim().min(5).max(40),
  preferred_gender: z.string(),
});

const QuickJobNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const paymentsOn = useFlag("quick_jobs_payments");
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [accountType, setAccountType] = useState<string>("");
  const [stage, setStage] = useState<"form" | "pay" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "", description: "", pay_amount: "", pay_type: "hourly",
    location: "", date_needed: "", duration: "", contact_number: "", preferred_gender: "Any",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,cv_path,onboarding_complete,account_type").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setProfileName((data as any)?.full_name ?? "");
        setAccountType((data as any)?.account_type ?? "");
        setProfileReady(Boolean((data as any)?.cv_path && (data as any)?.onboarding_complete));
      });
  }, [user]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPay = () => {
    const r = schema.safeParse(form);
    if (!r.success) {
      toast.error(Object.values(r.error.flatten().fieldErrors).flat()[0] ?? "Check inputs");
      return;
    }
    if (paymentsOn) setStage("pay");
    else submitJob("skipped_beta");
  };

  const submitJob = async (paymentStatus: "paid" | "skipped_beta") => {
    if (!user) return;
    setBusy(true);
    const parsed = schema.parse(form);
    const { error } = await supabase.from("quick_jobs" as any).insert({
      posted_by: user.id,
      poster_name: profileName,
      title: parsed.title,
      category: parsed.category,
      description: parsed.description,
      pay_amount: parsed.pay_amount,
      pay_type: parsed.pay_type,
      location: parsed.location,
      date_needed: parsed.date_needed,
      duration: parsed.duration,
      contact_number: parsed.contact_number,
      preferred_gender: parsed.preferred_gender,
      status: "pending",
      is_active: false,
      payment_status: paymentStatus,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStage("done");
  };

  const confirmPayment = () => submitJob("paid");

  // Job posters (quick_jobs account type) are always allowed to post — no CV needed
  if (profileReady === false && accountType !== "quick_jobs") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <p className="font-semibold">Complete your profile first</p>
        <p className="text-sm text-muted-foreground mt-1">Upload your CV and finish onboarding to post a Quick Job.</p>
        <Button onClick={() => navigate("/profile-setup")} className="mt-4 bg-forest hover:bg-forest/90 rounded-xl">Complete profile</Button>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <p className="font-bold text-lg">Sent for review</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">Your post will go live once an admin approves it.</p>
        <Button onClick={() => navigate("/quick-jobs")} className="mt-5 bg-forest hover:bg-forest/90 rounded-xl">Done</Button>
      </div>
    );
  }

  if (stage === "pay") {
    return (
      <div className="flex-1 flex flex-col bg-background p-5">
        <button onClick={() => setStage("form")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center self-start">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Posting fee</p>
          <p className="text-4xl font-bold mt-1">P10</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs">Mock payment — real provider integration is coming. Confirm to send the post for admin review.</p>
          <Button disabled={busy} onClick={confirmPayment} className="mt-6 w-full max-w-xs h-12 bg-forest hover:bg-forest/90 rounded-xl">
            {busy ? "Submitting…" : "Confirm payment"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">Post a Quick Job</h1>
      </div>
      <div className="p-5 space-y-3">
        <F label="Title">
          <Input value={form.title} onChange={(e) => update("title", e.target.value)} className="h-11 rounded-xl bg-card" />
        </F>
        <F label="Category">
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Description">
          <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="rounded-xl bg-card min-h-[80px]" />
        </F>
        <div className="grid grid-cols-2 gap-2">
          <F label="Pay amount (BWP)">
            <Input type="number" value={form.pay_amount} onChange={(e) => update("pay_amount", e.target.value)} className="h-11 rounded-xl bg-card" />
          </F>
          <F label="Pay type">
            <Select value={form.pay_type} onValueChange={(v) => update("pay_type", v)}>
              <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </F>
        </div>
        <F label="Location"><Input value={form.location} onChange={(e) => update("location", e.target.value)} className="h-11 rounded-xl bg-card" /></F>
        <div className="grid grid-cols-2 gap-2">
          <F label="Date needed"><Input type="date" value={form.date_needed} onChange={(e) => update("date_needed", e.target.value)} className="h-11 rounded-xl bg-card" /></F>
          <F label="Duration"><Input value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="e.g. 4 hours" className="h-11 rounded-xl bg-card" /></F>
        </div>
        <F label="Contact number"><Input value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="+267 …" className="h-11 rounded-xl bg-card" /></F>
        <F label="Preferred candidate gender">
          <Select value={form.preferred_gender} onValueChange={(v) => update("preferred_gender", v)}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Non-specific (Any)</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <Button onClick={onPay} className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl mt-2">{paymentsOn ? "Continue to payment" : "Submit post"}</Button>
      </div>
    </div>
  );
};

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default QuickJobNew;
