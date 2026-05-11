import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, FileText, Eye, TrendingUp, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

type Stats = {
  totalJobs: number;
  totalUsers: number;
  totalApplications: number;
  totalViews: number;
  conversion: number; // %
  pendingQuickJobs: number;
};

const Card = ({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: any; hint?: string }) => (
  <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <p className="text-3xl font-bold mt-2">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [perJob, setPerJob] = useState<Array<{ title: string; views: number; apps: number; conv: number }>>([]);

  useEffect(() => {
    (async () => {
      const [jobsR, profilesR, appsR, viewsR, jobsListR, appsListR, viewsListR, pendingQuickJobsR] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("job_views").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("id,title").order("created_at", { ascending: false }).limit(50),
        supabase.from("applications").select("job_id").eq("status", "submitted"),
        supabase.from("job_views").select("job_id"),
        supabase.from("quick_jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const totalApps = appsR.count ?? 0;
      const totalViews = viewsR.count ?? 0;
      setStats({
        totalJobs: jobsR.count ?? 0,
        totalUsers: profilesR.count ?? 0,
        totalApplications: totalApps,
        totalViews,
        conversion: totalViews ? Math.round((totalApps / totalViews) * 100) : 0,
        pendingQuickJobs: pendingQuickJobsR.count ?? 0,
      });

      const viewsByJob = new Map<string, number>();
      (viewsListR.data ?? []).forEach((v: any) => viewsByJob.set(v.job_id, (viewsByJob.get(v.job_id) ?? 0) + 1));
      const appsByJob = new Map<string, number>();
      (appsListR.data ?? []).forEach((a: any) => appsByJob.set(a.job_id, (appsByJob.get(a.job_id) ?? 0) + 1));
      const rows = (jobsListR.data ?? []).map((j: any) => {
        const v = viewsByJob.get(j.id) ?? 0;
        const a = appsByJob.get(j.id) ?? 0;
        return { title: j.title, views: v, apps: a, conv: v ? Math.round((a / v) * 100) : 0 };
      }).sort((a, b) => b.views - a.views);
      setPerJob(rows);
    })();
  }, []);

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Live activity across TalentHub Botswana.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        <Card label="Active jobs" value={stats?.totalJobs ?? "…"} icon={Briefcase} />
        <Card label="Users" value={stats?.totalUsers ?? "…"} icon={Users} />
        <Card label="Job views" value={stats?.totalViews ?? "…"} icon={Eye} />
        <Card label="Applications" value={stats?.totalApplications ?? "…"} icon={FileText} />
        <Card label="Conversion" value={`${stats?.conversion ?? 0}%`} icon={TrendingUp} hint="Apps ÷ views" />
      </div>

      <div className="mt-6">
        <Link to="/admin/quick-jobs" className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <Zap className="w-4 h-4" /> Manage Quick Jobs
          {stats?.pendingQuickJobs ? (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-background">
              {stats.pendingQuickJobs}
            </span>
          ) : null}
        </Link>
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-3">Per-job performance</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground text-xs uppercase">
            <tr>
              <th className="text-left p-3">Job</th>
              <th className="text-right p-3">Views</th>
              <th className="text-right p-3">Applications</th>
              <th className="text-right p-3">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {perJob.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No data yet.</td></tr>
            )}
            {perJob.map((r) => (
              <tr key={r.title} className="border-t border-border">
                <td className="p-3 font-medium truncate max-w-xs">{r.title}</td>
                <td className="p-3 text-right">{r.views}</td>
                <td className="p-3 text-right">{r.apps}</td>
                <td className="p-3 text-right">{r.conv}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
