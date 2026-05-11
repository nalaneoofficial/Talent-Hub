import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Layers, Heart, FileText, User, Bell, LayoutDashboard, Zap, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const candidateTabs = [
  { to: "/swipe", label: "Swipe", icon: Layers },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/quick-jobs", label: "Quick Jobs", icon: Zap },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

// Job posters only: Alerts + Post Job + Profile
const jobPosterTabs = [
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/quick-jobs/new", label: "Post Job", icon: PlusCircle },
  { to: "/profile", label: "Profile", icon: User },
];

// Inactive-subscription users: Alerts + Profile only (locked out of job posting too)
const inactiveTabs = [
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const adminTabs = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => {
  const { user, isAdmin } = useAuth();
  const [unread, setUnread] = useState(0);
  const [quickJobsGlow, setQuickJobsGlow] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free");

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    fetchCount();

    // Fetch account type + subscription for nav gating
    supabase.from("profiles").select("account_type, subscription_status").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setAccountType(data?.account_type ?? null);
        setSubscriptionStatus(data?.subscription_status ?? "free");
      });

    const ch = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        fetchCount,
      )
      .subscribe();

    // Check for new quick jobs
    const checkQuickJobs = async () => {
      const { data } = await supabase.from("quick_jobs").select("created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const lastViewed = localStorage.getItem("last_quick_job_view");
        if (!lastViewed || new Date(data.created_at).getTime() > Number(lastViewed)) {
          setQuickJobsGlow(true);
          setTimeout(() => setQuickJobsGlow(false), 4000);
        }
      }
    };
    checkQuickJobs();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Determine which tab set to use
  const isJobPoster = accountType === "quick_jobs";
  const isSubscriptionInactive = !isAdmin && !isJobPoster && subscriptionStatus !== "active";
  let tabs = candidateTabs;
  if (isAdmin) tabs = adminTabs;
  else if (isJobPoster) tabs = jobPosterTabs;
  else if (isSubscriptionInactive) tabs = inactiveTabs;

  return (
    <nav className="border-t border-border bg-card/95 backdrop-blur px-2 py-2 flex justify-around">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => {
            if (to === "/quick-jobs") {
              setQuickJobsGlow(false);
              localStorage.setItem("last_quick_job_view", Date.now().toString());
            }
          }}
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon className={`w-5 h-5 ${to === "/quick-jobs" && quickJobsGlow ? "text-yellow-500 fill-yellow-500 animate-pulse drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                {to === "/notifications" && unread > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
