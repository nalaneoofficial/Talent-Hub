import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { forwardRef, useEffect, useState } from "react";
import { useApp, Job, computeMatch } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Heart, X, Undo2, Bookmark, MapPin, Briefcase, Clock, GraduationCap, Calendar, Settings2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { industryImageUrl } from "@/lib/industryImage";
import { supabase } from "@/integrations/supabase/client";

const formatDeadline = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 7) return `Closes in ${days} days`;
  return `Apply by ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
};

const SwipeCard = forwardRef<HTMLDivElement, { job: Job; match: number; onSwipe: (a: "pass" | "like" | "save") => void; isTop: boolean; }>(({
  job, match, onSwipe, isTop,
}, ref) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, 0], [1, 0]);
  const saveOpacity = useTransform(y, [-120, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe("like");
    else if (info.offset.x < -100) onSwipe("pass");
    else if (info.offset.y < -100) onSwipe("save");
  };

  const deadline = formatDeadline(job.application_deadline);
  const employment = job.employment_type || job.job_type;
  const heroUrl = industryImageUrl(job.industry, 800, 400);

  return (
    <motion.div
      ref={ref}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      style={{ x, y, rotate, touchAction: "none" }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Card with image header + dark olive body, like the concept */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-glow flex flex-col bg-forest text-forest-foreground">
        {/* Industry hero image header */}
        <div className="h-44 relative shrink-0 overflow-hidden bg-secondary">
          <img
            src={heroUrl}
            alt={`${job.industry} industry`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute top-3 right-3 bg-background text-foreground rounded-full px-3 py-1 text-xs font-bold shadow-soft">
            {match}% Match
          </div>
          {deadline && (
            <div className="absolute bottom-3 right-3 bg-warning text-warning-foreground rounded-full px-3 py-1 text-[11px] font-semibold flex items-center gap-1 shadow-soft">
              <Calendar className="w-3 h-3" /> {deadline}
            </div>
          )}
        </div>

        {/* Dark olive body */}
        <div className="p-5 space-y-3 flex-1 min-h-0">
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold opacity-70">{job.industry}</p>
          <h2 className="text-3xl font-bold leading-tight">{job.title}</h2>
          <p className="text-base opacity-80">{job.company}</p>

          <div className="grid grid-cols-2 gap-2 text-xs opacity-90 pt-1">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{job.location}</span>
            <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 shrink-0" />{employment}</span>
            {typeof job.required_years_experience === "number" && (
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0" />{job.required_years_experience}+ yrs</span>
            )}
            {job.required_qualification && (
              <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 shrink-0" />{job.required_qualification}</span>
            )}
          </div>

          {job.salary_range && <p className="text-sm font-semibold opacity-95">{job.salary_range}</p>}

          <p className="text-sm opacity-90 leading-relaxed line-clamp-3 pt-1">{job.description}</p>

          {job.skills.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.slice(0, 6).map((s) => (
                  <span key={s} className="text-[11px] bg-forest-foreground/15 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <motion.div style={{ opacity: likeOpacity }} className="absolute top-12 left-6 border-4 border-success text-success rounded-xl px-4 py-2 text-2xl font-black -rotate-12 pointer-events-none">LIKE</motion.div>
        <motion.div style={{ opacity: passOpacity }} className="absolute top-12 right-6 border-4 border-destructive text-destructive rounded-xl px-4 py-2 text-2xl font-black rotate-12 pointer-events-none">PASS</motion.div>
        <motion.div style={{ opacity: saveOpacity }} className="absolute top-1/3 left-1/2 -translate-x-1/2 border-4 border-warning text-warning rounded-xl px-4 py-2 text-2xl font-black pointer-events-none">SAVE</motion.div>
      </div>
    </motion.div>
  );
});
SwipeCard.displayName = "SwipeCard";

const Swipe = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { user } = useAuth();
  const { swipeJobs, jobs: allJobs, swipes, swipe, undo, loading, profile } = useApp();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("subscription_status").eq("id", user.id).maybeSingle()
      .then(({ data }) => setSubscriptionStatus(data?.subscription_status ?? "free"));
  }, [user]);

  const seen = new Set(swipes.map((s) => s.job_id));
  const usingFallback = swipeJobs.length === 0 && allJobs.length > 0;
  const sourceJobs = usingFallback ? allJobs : swipeJobs;
  const remaining = sourceJobs.filter((j) => !seen.has(j.id));
  const top = remaining[0];
  const next = remaining[1];

  const handleSwipe = (action: "pass" | "like" | "save") => {
    if (!top) return;
    swipe(top, action);
  };

  if (loading || subscriptionStatus === null) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading jobs…</div>;
  }

  // Subscription gate — lock out non-active non-admin users
  if (!isAdmin && subscriptionStatus !== "active") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Crown className="w-9 h-9 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Subscription Required</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Job swiping, matching, and applications are available to active subscribers. Start your 3-day free trial to unlock everything.
        </p>
        <Button onClick={() => navigate("/subscribe")} className="mt-6 bg-forest hover:bg-forest/90 rounded-xl gap-2">
          <Crown className="w-4 h-4" /> Start Free Trial
        </Button>
        <button onClick={() => navigate("/profile")} className="mt-3 text-xs text-muted-foreground">Go to profile</button>
      </div>
    );
  }

  // Admins shouldn't apply to jobs — send them to admin dashboard.
  if (isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Settings2 className="w-9 h-9 text-primary" />
        </div>
        <h2 className="text-xl font-bold">You're signed in as admin</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Job swiping is for candidates. Manage jobs, users and analytics from the admin dashboard.
        </p>
        <Button onClick={() => navigate("/admin")} className="mt-6 bg-forest hover:bg-forest/90 rounded-xl">
          Open Admin Dashboard
        </Button>
      </div>
    );
  }

  if (!top) {
    const likedCount = swipes.filter((s) => s.action === "like").length;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">You've seen all the matched roles!</h2>
        <p className="text-sm text-muted-foreground mt-2">What would you like to do next?</p>
        <div className="mt-6 w-full max-w-xs space-y-2">
          <Button onClick={() => navigate("/matches")} className="w-full bg-forest hover:bg-forest/90 rounded-xl">
            Review matched roles ({likedCount})
          </Button>
          <Button variant="outline" onClick={() => navigate("/all-jobs")} className="w-full rounded-xl">
            View all available roles
          </Button>
        </div>
      </div>
    );
  }

  const heroBgUrl = industryImageUrl(top.industry, 600, 800);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Blurred industry background — pops behind the floating card */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${heroBgUrl})` }}
      />
      <div className="absolute inset-0 -z-10 backdrop-blur-2xl bg-background/40" />

      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold drop-shadow-sm">For You</h1>
        <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-soft">
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {usingFallback && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-warning/15 border border-warning/30 text-xs text-warning-foreground/90 text-center">
          No roles match your selected industries yet — showing all available roles
        </div>
      )}

      {/* Floating card */}
      <div className="relative flex-1 mx-4 mb-3">
        <AnimatePresence>
          {next && (
            <div key={next.id} className="absolute inset-0 scale-95 opacity-50">
              <SwipeCard job={next} match={computeMatch(next, profile)} onSwipe={() => {}} isTop={false} />
            </div>
          )}
          <SwipeCard key={top.id} job={top} match={computeMatch(top, profile)} onSwipe={handleSwipe} isTop />
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-4 pb-4 px-5">
        <button onClick={() => handleSwipe("pass")} className="w-14 h-14 rounded-full bg-card shadow-card flex items-center justify-center text-destructive hover:scale-105 transition-transform">
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <button onClick={undo} className="w-12 h-12 rounded-full bg-card shadow-card flex items-center justify-center text-warning hover:scale-105 transition-transform">
          <Undo2 className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <button onClick={() => handleSwipe("like")} className="w-16 h-16 rounded-full bg-success shadow-card flex items-center justify-center text-success-foreground hover:scale-105 transition-transform">
          <Heart className="w-7 h-7 fill-current" />
        </button>
        <button onClick={() => handleSwipe("save")} className="w-12 h-12 rounded-full bg-card shadow-card flex items-center justify-center text-primary hover:scale-105 transition-transform">
          <Bookmark className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default Swipe;
