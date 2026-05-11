import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, User, FileText, Bell, Settings, HelpCircle, LogOut, ChevronRight, Shield, Video, CheckCircle2, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/welcome");
  };

  const goCvDocs = () => navigate(profile?.cv_path ? "/cv-documents" : "/upload-cv");

  // Derive values BEFORE using them
  const accountType = profile?.account_type ?? "premium";
  const initial = (profile?.full_name ?? user?.email ?? "?")[0]?.toUpperCase();
  const isQuickJobs = accountType === "quick_jobs";
  const expiresAt = profile?.subscription_expires_at;
  const isActive = profile?.subscription_status === "active" && expiresAt && new Date(expiresAt) > new Date();

  // Job poster: only personal info + log out
  const jobPosterItems = [
    { icon: User, label: "Personal Information", onClick: () => navigate("/profile-setup") },
    { icon: LogOut, label: "Log Out", onClick: handleSignOut },
  ];

  const items = isAdmin
    ? [
        { icon: Shield, label: "Admin Dashboard", onClick: () => navigate("/admin") },
        { icon: Settings, label: "Settings", onClick: () => navigate("/settings") },
        { icon: HelpCircle, label: "Privacy & Help", onClick: () => navigate("/privacy") },
        { icon: LogOut, label: "Log Out", onClick: handleSignOut },
      ]
    : isQuickJobs
    ? jobPosterItems
    : [
        { icon: User, label: "Personal Information", onClick: () => navigate("/profile-setup") },
        { icon: FileText, label: "CV & Documents", onClick: goCvDocs },
        { icon: Video, label: "Interview Preparation", onClick: () => navigate("/interview-prep") },
        { icon: CheckCircle2, label: "Delivered Services", onClick: () => navigate("/delivered-services") },
        { icon: Bell, label: "Notifications", onClick: () => navigate("/notifications") },
        { icon: Settings, label: "Settings", onClick: () => navigate("/settings") },
        { icon: HelpCircle, label: "Privacy & Help", onClick: () => navigate("/privacy") },
        { icon: LogOut, label: "Log Out", onClick: handleSignOut },
      ];

  return (
    <div className="flex-1 flex flex-col p-5">
      <div className="flex items-center gap-3 pb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-glow to-primary flex items-center justify-center text-forest-foreground font-bold text-xl">
          {initial}
        </div>
        <div>
          <p className="font-bold">{profile?.full_name || "Welcome"}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {isQuickJobs ? (
        // ---- Job Poster upsell banner ----
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
            <Zap className="w-7 h-7 text-primary" />
            <div>
              <p className="font-semibold text-sm">Job Poster Account</p>
              <p className="text-[11px] text-muted-foreground">Post quick gigs in Botswana.</p>
            </div>
          </div>
          {/* Subscription upsell */}
          <div className="bg-gradient-to-br from-forest to-forest/80 rounded-2xl p-5 text-forest-foreground">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-warning" />
              <p className="font-bold text-sm">Unlock the full Talenthub experience</p>
            </div>
            <p className="text-xs opacity-80 mb-4 leading-relaxed">
              Browse and swipe on jobs, get AI-powered cover letters, CV scoring, Interview Prep and more. Start with a free 3-day trial.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/subscribe")}
                className="w-full h-10 rounded-xl bg-warning text-warning-foreground font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" /> Start 3-Day Free Trial
              </button>
              <p className="text-[10px] text-center opacity-60">Then P50/month. Cancel anytime.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${isActive ? "bg-forest text-forest-foreground" : "bg-card border border-border"} rounded-2xl p-4 flex items-center gap-3 shadow-card`}>
          <Crown className={`w-7 h-7 ${isActive ? "text-warning" : "text-muted-foreground"}`} />
          <div className="flex-1">
            <p className="font-semibold text-sm flex items-center gap-2">
              {isActive ? "Active" : "Inactive"}
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${isActive ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}>
                {isActive ? "Subscribed" : "No subscription"}
              </span>
            </p>
            <p className={`text-[11px] ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
              {isActive
                ? `Active until ${new Date(expiresAt).toLocaleDateString()}`
                : "P50/month unlocks job matching, AI cover letters and more"}
            </p>
          </div>
          {!isActive && (
            <button onClick={() => navigate("/subscribe")} className="text-xs font-semibold text-primary">
              Renew
            </button>
          )}
        </div>
      )}

      <div className="mt-6 bg-card rounded-2xl shadow-soft divide-y divide-border">
        {items.map(({ icon: Icon, label, onClick }) => (
          <button key={label} onClick={onClick} className="w-full flex items-center gap-3 p-4 text-left">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm">{label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Profile;
