import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hourglass, Sparkles, Plus, MapPin, Calendar, Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
const obscureName = (name: string | null) => {
  if (!name || name.trim() === "") return "anonymous";
  return name.trim().split(" ").map(p => {
    if (p.length <= 2) return p.toUpperCase();
    return p[0].toUpperCase() + "*".repeat(p.length - 2) + p[p.length - 1].toUpperCase();
  }).join(" ");
};

const QuickJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [accountType, setAccountType] = useState<string>("premium");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [passedJobs, setPassedJobs] = useState<Set<string>>(new Set());
  const [interestedJobs, setInterestedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem("last_quick_job_view", Date.now().toString());
  }, []);

  useEffect(() => {
    (async () => {
      const { data: flag } = await supabase
        .from("feature_flags").select("enabled").eq("key", "quick_jobs").maybeSingle();
      const isOn = Boolean((flag as any)?.enabled);
      setEnabled(isOn);
      
      let contactInfo = "";

      if (user) {
        const { data: p } = await supabase.from("profiles")
          .select("cv_path,onboarding_complete,account_type,phone,email").eq("id", user.id).maybeSingle();
        const at = (p as any)?.account_type ?? "premium";
        setAccountType(at);
        setProfileReady(at === "quick_jobs" || Boolean((p as any)?.cv_path && (p as any)?.onboarding_complete));
      }
      
      if (isOn) {
        const { data } = await supabase
          .from("quick_jobs" as any)
          .select("*")
          .eq("status", "approved")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        setJobs((data as any[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const handlePass = (jobId: string) => {
    setPassedJobs(prev => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });
  };

  const handleInterested = async (jobId: string) => {
    if (!user) return;
    try {
      const { data: p } = await supabase.from("profiles").select("phone,email,full_name").eq("id", user.id).single();
      
      // Save interest to DB
      await supabase.from("quick_job_interests" as any).insert({
        quick_job_id: jobId,
        user_id: user.id,
        contact_info: p?.phone || p?.email || "No contact info",
        user_name: p?.full_name || "Anonymous",
      } as any);

      setInterestedJobs(prev => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });

      // Send real-time notification to the poster
      const job = jobs.find(j => j.id === jobId);
      if (job?.posted_by) {
        await supabase.from("notifications").insert({
          user_id: job.posted_by,
          title: "New Quick Job Interest",
          body: `${p?.full_name || "Someone"} is interested in "${job.title}". Contact: ${p?.phone || p?.email || "No contact provided"}.`,
          type: "quick_job_interest",
          job_id: jobId
        });
      }

      toast.success("Interest sent to the poster!");
    } catch (err) {
      toast.error("Failed to send interest");
    }
  };

  if (!enabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Hourglass className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Quick Jobs is coming soon</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Stay tuned — we're building a fast way to find and post short, local gigs in Botswana.
        </p>
        <span className="mt-4 text-[10px] uppercase tracking-wider bg-warning/15 text-warning font-bold px-3 py-1 rounded-full">
          Beta locked
        </span>
      </div>
    );
  }

  const visibleJobs = jobs.filter(j => !passedJobs.has(j.id) && !interestedJobs.has(j.id));

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Quick Jobs</h1>
        <Button
          size="sm"
          onClick={() => navigate(profileReady ? "/quick-jobs/new" : "/profile-setup")}
          className="rounded-xl bg-forest hover:bg-forest/90"
        >
          <Plus className="w-4 h-4 mr-1" /> Post
        </Button>
      </div>

      <div className="px-5 pb-5 space-y-3">
        {!profileReady && accountType !== "quick_jobs" && (
          <div className="rounded-2xl bg-card p-4 text-sm border border-border">
            Complete your profile and upload your CV before posting a Quick Job.
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : visibleJobs.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground text-center border border-border">
            No more quick jobs available right now. Check back later!
          </div>
        ) : (
          visibleJobs.map((j) => (
            <div key={j.id} className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden flex flex-col">
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{j.title}</p>
                    <p className="text-[11px] text-muted-foreground">{j.category}</p>
                  </div>
                  <span className="text-xs font-bold text-primary whitespace-nowrap">BWP {j.pay_amount}</span>
                </div>
                
                <div className="max-h-24 overflow-y-auto pr-2 scrollbar-thin">
                  <p className="text-xs text-muted-foreground leading-relaxed">{j.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1">
                  {j.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{j.location}</span>}
                  {j.date_needed && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{j.date_needed}</span>}
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Posted by {obscureName(j.poster_name)} · {j.pay_type} · {j.duration}
                  {j.preferred_gender && j.preferred_gender !== 'Any' ? ` · Prefers: ${j.preferred_gender}` : ''}
                </p>
              </div>
              
              <div className="grid grid-cols-2 border-t border-border mt-auto">
                <button 
                  onClick={() => handlePass(j.id)}
                  className="py-3 flex items-center justify-center gap-2 text-muted-foreground hover:bg-secondary/50 transition-colors font-medium text-sm"
                >
                  <X className="w-4 h-4" /> Pass
                </button>
                <button 
                  onClick={() => handleInterested(j.id)}
                  className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors font-medium text-sm border-l border-border"
                >
                  <Check className="w-4 h-4" /> Interested
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuickJobs;
