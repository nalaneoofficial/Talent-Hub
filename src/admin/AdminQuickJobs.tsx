import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminQuickJobs = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(false);

  const refresh = async () => {
    const [{ data: rows }, { data: flag }] = await Promise.all([
      supabase.from("quick_jobs" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("feature_flags").select("enabled").eq("key", "quick_jobs").maybeSingle(),
    ]);
    setPosts((rows as any[]) ?? []);
    setEnabled(Boolean((flag as any)?.enabled));
  };

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { navigate("/profile"); return; }
    refresh();
  }, [isAdmin, loading, navigate]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("quick_jobs" as any).update({
      status, is_active: status === "approved",
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Approved" : "Rejected");
    refresh();
  };

  const toggleFlag = async () => {
    const { error } = await supabase.from("feature_flags").upsert({ key: "quick_jobs", enabled: !enabled });
    if (error) { toast.error(error.message); return; }
    setEnabled(!enabled);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold flex-1">Admin: Quick Jobs</h1>
        <button onClick={toggleFlag} className="flex items-center gap-1 text-xs font-semibold">
          {enabled ? <ToggleRight className="w-6 h-6 text-success" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
          {enabled ? "Live" : "Locked"}
        </button>
      </div>

      <div className="p-5 space-y-3">
        {posts.length === 0 && <p className="text-sm text-muted-foreground">No quick jobs yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="bg-card rounded-2xl p-4 shadow-soft space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.category} · {p.location}</p>
              </div>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                p.status === "approved" ? "bg-success/15 text-success" :
                p.status === "rejected" ? "bg-destructive/15 text-destructive" :
                "bg-warning/15 text-warning"
              }`}>{p.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">{p.description}</p>
            <p className="text-[11px]">BWP {p.pay_amount} · {p.pay_type} · {p.duration}</p>
            <p className="text-[11px] text-muted-foreground">By {p.poster_name ?? "user"} · {p.contact_number}</p>
            {p.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setStatus(p.id, "approved")} className="flex-1 h-9 bg-success hover:bg-success/90 rounded-xl text-xs">
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")} className="flex-1 h-9 rounded-xl text-xs">
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminQuickJobs;
