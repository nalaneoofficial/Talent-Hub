import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Briefcase, FileText, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  job_id: string | null;
  read: boolean;
  created_at: string;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markRead = async (id: string) => {
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!user) return;
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    toast.success("All marked as read");
  };

  const remove = async (id: string) => {
    setItems((p) => p.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const tap = (n: Notification) => {
    markRead(n.id);
    if (n.type === "new_match" && n.job_id) navigate(`/review/${n.job_id}`);
    else if (n.type === "draft_reminder" && n.job_id) navigate(`/review/${n.job_id}`);
    else navigate("/applications");
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary font-semibold">
            Mark all read
          </button>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1">We'll alert you when new jobs match your skills.</p>
          </div>
        ) : (
          items.map((n) => {
            const Icon = n.type === "new_match" ? Briefcase : FileText;
            return (
              <div
                key={n.id}
                className={`bg-card rounded-2xl p-3 flex items-start gap-3 shadow-soft border ${
                  n.read ? "border-border opacity-70" : "border-primary/30"
                }`}
              >
                <button onClick={() => tap(n)} className="flex-1 flex items-start gap-3 text-left">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === "new_match" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </button>
                <div className="flex flex-col gap-1">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center" title="Mark read">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
