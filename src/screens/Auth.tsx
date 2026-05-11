import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  fullName: z.string().trim().min(2, "Enter your name").max(100).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const accountType: "quick_jobs" | "premium" | "employer" | "partner" = (location.state as any)?.accountType || "premium";
  const initialMode = (location.state as any)?.mode || "signup";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName: mode === "signup" ? fullName : undefined });
    if (!parsed.success) {
      toast.error(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile-setup`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        // If email confirmation is required, session will be null
        if (!data.session) {
          toast.success("Check your email to verify your account before signing in.", { duration: 8000 });
          setMode("signin");
        } else {
          // Persist account type or roles
          if (accountType === "partner") {
            await supabase.from("user_roles").insert({ user_id: data.user!.id, role: "partner" });
            toast.success("Partner account created! Welcome to the network.");
            navigate("/partner");
          } else if (accountType === "employer") {
            await supabase.from("profiles").update({ account_type: "employer" }).eq("id", data.user!.id);
            toast.success("Employer account created! Post your first job.");
            navigate("/employer");
          } else {
            await supabase.from("profiles").update({
              account_type: accountType,
              subscription_status: accountType === "quick_jobs" ? "none" : "free",
            }).eq("id", data.user!.id);
            if (accountType === "quick_jobs") {
              toast.success("Account created! Post your Quick Job.");
              navigate("/quick-jobs");
            } else {
              toast.success("Account created! Let's complete your profile.");
              navigate("/profile-setup");
            }
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        
        // Route users based on their role
        const { data: u } = await supabase.auth.getUser();
        if (u?.user) {
          const [{ data: rolesData }, { data: profileData }] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", u.user.id),
            supabase.from("profiles").select("account_type").eq("id", u.user.id).maybeSingle()
          ]);
          
          const roles = new Set((rolesData || []).map((r: any) => r.role));
          if (roles.has("admin")) {
            navigate("/admin");
          } else if (roles.has("partner")) {
            navigate("/partner");
          } else if (profileData?.account_type === "employer") {
            navigate("/employer");
          } else if (profileData?.account_type === "quick_jobs") {
            // Job posters land on their alerts/post page, not the candidate swipe feed
            navigate("/notifications");
          } else {
            navigate("/swipe");
          }
        } else {
          navigate("/swipe");
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
      if (msg.toLowerCase().includes("already")) toast.error("That email is already registered. Try signing in.");
      else if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("not confirmed")) toast.error("Please verify your email first — check your inbox.");
      else if (msg.toLowerCase().includes("invalid login")) toast.error("Wrong email or password.");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const isB2B = location.pathname.includes("b2b-auth") || accountType === "partner" || accountType === "employer";

  const authForm = (
    <div className={`flex flex-col bg-background p-6 w-full max-w-md mx-auto`}>
      {!isB2B && (
        <button onClick={() => navigate("/welcome")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center self-start mb-6">
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}

      <div className={`flex justify-center ${isB2B ? 'mt-4' : 'mt-2'}`}>
        <Logo size={92} />
      </div>

      <h1 className="mt-6 text-2xl font-bold">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {mode === "signup"
          ? "Start swiping into your next role."
          : "Sign in to continue your job search."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Thato Molefe" className="h-11 rounded-xl bg-card" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 rounded-xl bg-card" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-11 rounded-xl bg-card" />
        </div>

        <Button type="submit" disabled={busy} className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <button
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="mt-6 text-xs text-center text-muted-foreground"
      >
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <span className="text-primary font-semibold">{mode === "signup" ? "Sign in" : "Create account"}</span>
      </button>
    </div>
  );

  if (!isB2B) {
    return <div className="min-h-screen flex flex-col">{authForm}</div>;
  }

  const isPartner = location.pathname.includes("partner") || accountType === "partner";

  return (
    <div className="min-h-screen w-full flex bg-background selection:bg-primary/30">
      {/* Left Side - Branding & Value Prop */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#1a2318] flex-col justify-between p-12 text-white border-r border-white/5">
        
        {/* 3D Animated Background inside the left panel */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-primary/20 rounded-full mix-blend-screen filter blur-3xl animate-[bounce_8s_infinite] opacity-60"></div>
          <div className="absolute top-[60%] left-[60%] w-96 h-96 bg-orange-500/10 rounded-full mix-blend-screen filter blur-3xl animate-[bounce_12s_infinite_reverse] opacity-50"></div>
          <div className="absolute top-[30%] left-[70%] w-48 h-48 bg-primary/10 rounded-full mix-blend-screen filter blur-3xl animate-[ping_10s_infinite] opacity-40"></div>
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>
        </div>

        <div className="relative z-10">
          <Logo size={40} className="mb-12 text-white" />
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
            {isPartner ? "Empower careers, grow your practice." : "Start hiring today with top-tier talent."}
          </h1>
          <p className="text-lg text-white/80 mb-12 max-w-md">
            {isPartner 
              ? "Join Talenthub's exclusive network of CV revamp experts and career coaches." 
              : "Post jobs, schedule interviews, and make offers with our streamlined applicant tracking tools."}
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                {isPartner ? "Access a steady stream of verified clients ready for your expertise." : "Post your job in minutes and instantly fill your pipeline with qualified candidates."}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                {isPartner ? "Manage all requests, documents, and payments in one secure portal." : "Schedule interviews, gather feedback, and collaborate with your team."}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                {isPartner ? "Set your own schedule and scale your coaching impact." : "No credit card required. Simple, transparent pricing for all sizes."}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm max-w-md">
           <div className="flex items-center gap-3 mb-3">
             <div className="flex -space-x-2">
               <div className="w-8 h-8 rounded-full border-2 border-[#1a2318] bg-primary/80" />
               <div className="w-8 h-8 rounded-full border-2 border-[#1a2318] bg-orange-500/80" />
               <div className="w-8 h-8 rounded-full border-2 border-[#1a2318] bg-blue-500/80" />
             </div>
             <p className="text-xs font-medium text-white">Trusted by 500+ professionals</p>
           </div>
           <p className="text-sm text-white/70">"Talenthub has transformed the way we connect with the right people. The platform is intuitive and incredibly powerful."</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col relative bg-background">
        <div className="absolute top-6 left-6 z-20">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 px-3 py-1.5 rounded-full">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-[420px] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden relative">
            <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-orange-500" />
            {authForm}
          </div>
        </div>
        
        <div className="p-6 text-center text-[10px] text-muted-foreground border-t border-border/50">
           © {new Date().getFullYear()} Talenthub. By continuing, you agree to our <a href="#" className="underline hover:text-foreground">Terms & Conditions</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};

export default Auth;
