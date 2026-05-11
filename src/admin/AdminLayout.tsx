import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Users, BarChart3, Bell, ArrowLeft, LogOut, Shield, Sparkles, Flag, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const items = [
  { to: "/admin", end: true, label: "Dashboard", icon: BarChart3 },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/quick-jobs", label: "Quick Jobs", icon: Zap },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/revamp", label: "CV Revamp", icon: Sparkles },
  { to: "/admin/late-deliveries", label: "Late Deliveries", icon: AlertTriangle },
  { to: "/admin/flags", label: "Feature Flags", icon: Flag },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { isAdmin, loading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingQuickJobs, setPendingQuickJobs] = useState(0);
  const [lateCount, setLateCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("quick_jobs").select("id", { count: "exact" }).eq("status", "pending")
      .then(({ count }) => setPendingQuickJobs(count ?? 0));
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from("revamp_requests").select("id", { count: "exact" }).lt("created_at", threeDaysAgo).not("fulfilment_status", "eq", "delivered"),
      supabase.from("interview_preps" as any).select("id", { count: "exact" }).lt("created_at", threeDaysAgo).not("status", "eq", "delivered"),
    ]).then(([r, p]) => setLateCount((r.count ?? 0) + (p.count ?? 0)));
  }, [isAdmin]);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/swipe", { replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Checking access…</div>;
  }

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 bg-card border-r border-border flex flex-col transition-all`}>
        <div className="h-14 px-3 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Shield className="w-4 h-4" />
          </div>
          {!collapsed && <span className="font-bold text-sm">Admin</span>}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {items.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && label === "Quick Jobs" && pendingQuickJobs > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingQuickJobs}
                </span>
              )}
              {!collapsed && label === "Late Deliveries" && lateCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {lateCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-border space-y-1">
          <button
            onClick={() => navigate("/swipe")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Back to app</span>}
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full text-[11px] text-muted-foreground py-1 hover:text-foreground"
          >
            {collapsed ? "›" : "‹ collapse"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
