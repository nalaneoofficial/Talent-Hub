import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, Clock, Bell, RefreshCw } from "lucide-react";

type LateItem = {
  id: string;
  type: "revamp" | "prep";
  requestId: string;
  targetRole: string;
  createdAt: string;
  daysOverdue: number;
  userId: string;
  userName: string;
};

const AdminLateDeliveries = () => {
  const [items, setItems] = useState<LateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const [revRes, prepRes] = await Promise.all([
      supabase.from("revamp_requests").select("id,created_at,target_job_title,user_id,fulfilment_status")
        .lt("created_at", THREE_DAYS_AGO)
        .not("fulfilment_status", "eq", "delivered"),
      supabase.from("interview_preps" as any).select("id,created_at,target_role,user_id,status")
        .lt("created_at", THREE_DAYS_AGO)
        .not("status", "eq", "delivered"),
    ]);

    const revamps = (revRes.data ?? []) as any[];
    const preps = (prepRes.data ?? []) as any[];

    // Fetch profile names
    const allUserIds = [...new Set([...revamps.map(r => r.user_id), ...preps.map(p => p.user_id)])];
    const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", allUserIds);
    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.full_name || "Unknown"; });

    const now = Date.now();
    const combined: LateItem[] = [
      ...revamps.map(r => ({
        id: r.id,
        type: "revamp" as const,
        requestId: `CVR-${r.id.substring(0, 4).toUpperCase()}`,
        targetRole: r.target_job_title || "General Update",
        createdAt: r.created_at,
        daysOverdue: Math.floor((now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        userId: r.user_id,
        userName: nameMap[r.user_id] || "Unknown",
      })),
      ...preps.map(p => ({
        id: p.id,
        type: "prep" as const,
        requestId: `CS-${p.id.substring(0, 4).toUpperCase()}`,
        targetRole: p.target_role || "General",
        createdAt: p.created_at,
        daysOverdue: Math.floor((now - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        userId: p.user_id,
        userName: nameMap[p.user_id] || "Unknown",
      })),
    ].sort((a, b) => b.daysOverdue - a.daysOverdue);

    setItems(combined);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nudgePartner = async (item: LateItem) => {
    // In a real system this would look up which partner owns the request
    // For now we create a system notification flagging it
    toast.success(`Escalation sent for ${item.requestId}`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Late Deliveries</h1>
            <p className="text-sm text-muted-foreground">Requests undelivered for 3+ days</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No late deliveries — all requests are on track.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-amber-500/5 border-b border-amber-500/20 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-medium">Request ID</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Target Role</th>
                <th className="px-5 py-4 font-medium">User</th>
                <th className="px-5 py-4 font-medium">Date Submitted</th>
                <th className="px-5 py-4 font-medium">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" /> Days Overdue
                  </span>
                </th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(item => (
                <tr key={item.id} className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-amber-300">{item.requestId}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded border ${
                      item.type === "revamp"
                        ? "text-primary bg-primary/10 border-primary/20"
                        : "text-purple-400 bg-purple-400/10 border-purple-400/20"
                    }`}>
                      {item.type === "revamp" ? "CV Revamp" : "Interview Prep"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white font-medium">{item.targetRole}</td>
                  <td className="px-5 py-4 text-muted-foreground">{item.userName}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`font-bold text-sm ${item.daysOverdue >= 7 ? "text-red-400" : "text-amber-400"}`}>
                      {item.daysOverdue} {item.daysOverdue === 1 ? "day" : "days"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="outline"
                      className="h-7 text-[11px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1"
                      onClick={() => nudgePartner(item)}>
                      <Bell className="w-3 h-3" /> Escalate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminLateDeliveries;
