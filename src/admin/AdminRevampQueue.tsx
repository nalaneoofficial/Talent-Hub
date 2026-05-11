import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Download, Upload, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Req = {
  id: string;
  user_id: string;
  current_job_title: string | null;
  target_job_title: string | null;
  notes: string | null;
  cv_path: string | null;
  attachment_paths: string[] | null;
  payment_status: string;
  fulfilment_status: string;
  partner_notes: string | null;
  revamped_cv_path: string | null;
  revamped_cv_filename: string | null;
  delivered_at: string | null;
  created_at: string;
};

const STATUSES = ["new", "in_progress", "delivered", "cancelled"];

const AdminRevampQueue = () => {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadRevamped = async (r: Req, file: File) => {
    setUploadingId(r.id);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${r.user_id}/revamped/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("revamp_requests").update({
        revamped_cv_path: path, revamped_cv_filename: file.name, fulfilment_status: "delivered",
      }).eq("id", r.id);
      if (updErr) throw updErr;
      toast.success("Revamped CV sent to user");
      load();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploadingId(null); }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("revamp_requests").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Req[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("revamp_requests").update({ fulfilment_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("revamp_requests").update({ partner_notes: drafts[id] ?? "" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
    load();
  };

  const downloadCV = async (path: string) => {
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate download link");
    window.open(data.signedUrl, "_blank");
  };

  const downloadAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("app-docs").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate download link");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">CV Revamp Queue</h1>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No revamp requests yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  <p className="font-semibold">{r.target_job_title || "Target role not specified"}</p>
                  {r.current_job_title && <p className="text-xs text-muted-foreground">Currently: {r.current_job_title}</p>}
                  <p className="text-[11px] mt-1">
                    Payment: <span className="font-mono">{r.payment_status}</span>
                  </p>
                </div>
                <Select value={r.fulfilment_status} onValueChange={(v) => updateStatus(r.id, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {r.notes && (
                <div className="mt-3 p-3 bg-secondary rounded-lg text-sm">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">User notes</p>
                  {r.notes}
                </div>
              )}

              {r.cv_path && (
                <Button variant="outline" size="sm" className="mt-3 mr-2" onClick={() => downloadCV(r.cv_path!)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download CV
                </Button>
              )}
              {(r.attachment_paths ?? []).map((p, i) => (
                <Button key={p} variant="outline" size="sm" className="mt-3 mr-2" onClick={() => downloadAttachment(p)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Attachment {i + 1}
                </Button>
              ))}

              <div className="mt-3">
                <Textarea
                  placeholder="Partner notes (internal)…"
                  defaultValue={r.partner_notes ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  rows={2}
                />
                <Button size="sm" className="mt-2" onClick={() => saveNotes(r.id)}>Save notes</Button>
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Deliver revamped CV</p>
                {r.revamped_cv_path ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sent {r.delivered_at ? new Date(r.delivered_at).toLocaleDateString() : ""}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => downloadCV(r.revamped_cv_path!)}>
                      <Download className="w-3.5 h-3.5 mr-1.5" /> {r.revamped_cv_filename ?? "Revamped CV"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => fileRefs.current[r.id]?.click()} disabled={uploadingId === r.id}>Replace</Button>
                  </div>
                ) : (
                  <Button size="sm" disabled={uploadingId === r.id} onClick={() => fileRefs.current[r.id]?.click()}>
                    {uploadingId === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                    Upload revamped CV & send
                  </Button>
                )}
                <input
                  ref={(el) => { fileRefs.current[r.id] = el; }}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRevamped(r, f); e.target.value = ""; }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRevampQueue;
