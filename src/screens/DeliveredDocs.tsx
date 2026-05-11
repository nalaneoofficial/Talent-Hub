import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Download, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DeliveredDocs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [revamps, setRevamps] = useState<any[]>([]);
  const [preps, setPreps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [r, p] = await Promise.all([
        supabase.from("revamp_requests").select("*").eq("user_id", user.id).eq("fulfilment_status", "delivered"),
        supabase.from("interview_preps" as any).select("*").eq("user_id", user.id).eq("status", "delivered")
      ]);
      setRevamps(r.data ?? []);
      setPreps(p.data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const downloadFile = async (path: string, bucket: string = "cvs") => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not download file");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="p-6 pb-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold">Delivered Services</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (revamps.length === 0 && preps.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-2xl border border-border">
            You don't have any delivered services yet.
          </div>
        ) : (
          <div className="space-y-6">
            {revamps.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">CV Revamps</h2>
                <div className="space-y-3">
                  {revamps.map(r => (
                    <div key={r.id} className="bg-card rounded-2xl p-4 border border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold">{r.target_job_title || "Target Role"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Delivered on {new Date(r.delivered_at || r.updated_at).toLocaleDateString()}</p>
                        </div>
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="mt-4 flex gap-2">
                        {r.revamped_cv_path && (
                          <Button size="sm" variant="outline" className="w-full text-xs h-9" onClick={() => downloadFile(r.revamped_cv_path, "cvs")}>
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Download CV
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preps.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Interview Prep</h2>
                <div className="space-y-3">
                  {preps.map(p => (
                    <div key={p.id} className="bg-card rounded-2xl p-4 border border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold">{p.target_role || "Interview Prep"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Delivered on {new Date(p.delivered_at || p.updated_at).toLocaleDateString()}</p>
                          <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">{p.type}</span>
                        </div>
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        {p.script_path && (
                          <Button size="sm" variant="outline" className="w-full text-xs h-9" onClick={() => downloadFile(p.script_path, "app-docs")}>
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Download Script
                          </Button>
                        )}
                        {p.type === "coaching" && p.meeting_link && (
                          <Button size="sm" className="w-full text-xs h-9 bg-forest hover:bg-forest/90 text-white" onClick={() => window.open(p.meeting_link, "_blank")}>
                            <Video className="w-3.5 h-3.5 mr-1.5" /> Join Coaching Call
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveredDocs;
