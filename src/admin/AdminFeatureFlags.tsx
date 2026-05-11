import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Loader2, Flag } from "lucide-react";
import { toast } from "sonner";

type Flag = { id: string; key: string; enabled: boolean; description: string | null };

const AdminFeatureFlags = () => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_flags").select("*").order("key");
    setFlags((data ?? []) as Flag[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (f: Flag) => {
    setSaving(f.id);
    const { error } = await supabase.from("feature_flags").update({ enabled: !f.enabled }).eq("id", f.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${f.key} is now ${!f.enabled ? "ON" : "OFF"}`);
    load();
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Flag className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Feature Flags</h1>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-semibold">{f.key}</code>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {f.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
              </div>
              <Switch checked={f.enabled} onCheckedChange={() => toggle(f)} disabled={saving === f.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeatureFlags;
