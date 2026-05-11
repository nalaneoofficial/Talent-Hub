import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Paperclip, X, CheckCircle2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const UploadDocuments = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestId = params.get("requestId") || "";
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [request, setRequest] = useState<any>(null);
  const [attachments, setAttachments] = useState<Array<{ file: File }>>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!requestId || !user) return;
    supabase.from("revamp_requests").select("*").eq("id", requestId).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) { setRequest(data); setExisting(data.attachment_paths || []); }
      });
  }, [requestId, user]);

  const downloadExisting = async (path: string) => {
    const { data } = await supabase.storage.from("app-docs").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleSend = async () => {
    if (!user || !request) return;
    setSubmitting(true);
    try {
      const newPaths: string[] = [];
      for (const a of attachments) {
        const ext = a.file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/revamp/extra/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("app-docs").upload(path, a.file);
        if (!error) newPaths.push(path);
      }
      const allPaths = [...existing, ...newPaths];
      await supabase.from("revamp_requests").update({ attachment_paths: allPaths }).eq("id", requestId);

      // Notify partner
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Documents uploaded",
        body: `Documents uploaded for request CVR-${requestId.substring(0, 4).toUpperCase()}`,
        type: "docs_uploaded"
      });

      // Mark any related notification resolved by marking as read
      await supabase.from("notifications").update({ read: true })
        .eq("user_id", user.id).eq("type", "docs_requested");

      setSubmitted(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Documents sent!</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Your coach has been notified and will review your documents shortly.
        </p>
        <Button onClick={() => navigate(-1)} className="mt-8 bg-forest hover:bg-forest/90 rounded-xl">Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Upload Documents</h1>
          {requestId && <p className="text-xs text-muted-foreground">Request ID: CVR-{requestId.substring(0, 4).toUpperCase()}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {request?.notes && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-400 mb-1">Your coach is asking for:</p>
            <p className="text-sm text-white/80 whitespace-pre-wrap">{request.notes}</p>
          </div>
        )}

        {existing.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Already uploaded</p>
            <div className="space-y-2">
              {existing.map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="flex-1 text-xs truncate text-muted-foreground">{p.split("/").pop()}</p>
                  <button onClick={() => downloadExisting(p)} className="text-primary">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add new documents</p>
          <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (!e.target.files) return;
              setAttachments(p => [...p, ...Array.from(e.target.files!).map(f => ({ file: f }))]);
              e.target.value = "";
            }} />
          {attachments.map((a, i) => (
            <div key={i} className="mb-2 flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="flex-1 text-xs truncate text-muted-foreground">{a.file.name}</p>
              <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()}
            className="w-full text-xs text-primary border border-dashed border-border rounded-xl py-3 flex items-center justify-center gap-2">
            <Paperclip className="w-3.5 h-3.5" /> Attach documents
          </button>
        </div>
      </div>

      <div className="p-5 border-t border-border bg-card">
        <Button onClick={handleSend} disabled={submitting || attachments.length === 0}
          className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Documents"}
        </Button>
      </div>
    </div>
  );
};

export default UploadDocuments;
