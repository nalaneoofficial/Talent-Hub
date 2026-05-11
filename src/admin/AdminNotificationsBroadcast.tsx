import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send } from "lucide-react";

const AdminNotificationsBroadcast = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSent, setLastSent] = useState<number | null>(null);

  const send = async () => {
    if (!user) return;
    if (title.trim().length < 2) { toast.error("Title is too short"); return; }
    setBusy(true);
    try {
      // Fetch all user IDs (paginate to avoid 1000-row limit)
      const ids: string[] = [];
      let from = 0; const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("profiles").select("id").range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as Array<{ id: string }>;
        ids.push(...batch.map((r) => r.id));
        if (batch.length < PAGE) break;
        from += PAGE;
      }
      if (ids.length === 0) { toast.warning("No users yet"); return; }

      // Insert notifications in chunks of 500
      const chunk = 500;
      for (let i = 0; i < ids.length; i += chunk) {
        const slice = ids.slice(i, i + chunk).map((uid) => ({
          user_id: uid, type: "broadcast",
          title: title.trim(), body: body.trim() || null,
        }));
        const { error } = await supabase.from("notifications").insert(slice);
        if (error) throw error;
      }
      setLastSent(ids.length);
      setTitle(""); setBody("");
      toast.success(`Sent to ${ids.length} users`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to broadcast");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Send notification</h1>
      <p className="text-sm text-muted-foreground">Broadcast a message to every registered user.</p>

      <div className="mt-6 bg-card rounded-2xl border border-border p-5 space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="New jobs added this week" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={4} placeholder="Optional details…" />
          <p className="text-[11px] text-muted-foreground mt-1">{body.length}/500</p>
        </div>
        <Button disabled={busy || !title.trim()} onClick={send} className="rounded-xl">
          <Send className="w-4 h-4 mr-2" /> {busy ? "Sending…" : "Send to all users"}
        </Button>
        {lastSent !== null && (
          <p className="text-xs text-success">Last broadcast reached {lastSent} users.</p>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsBroadcast;
