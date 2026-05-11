import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Trash2, Plus, Sparkles, RefreshCw, Upload, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
  "Academic Certificate",
  "Professional Certificate",
  "Reference Letter",
  "National ID",
  "Passport",
  "Transcript",
  "Other",
];

type Doc = {
  id: string;
  label: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
};

const CVDocuments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [revamped, setRevamped] = useState<{ path: string; filename: string | null; delivered_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [docLabel, setDocLabel] = useState("Academic Certificate");
  const fileRef = useRef<HTMLInputElement>(null);
  const cvReplaceRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    if (!user) return;
    const [{ data: prof }, { data: scoreRow }, { data: docsRows }, { data: revampRow }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("cv_analyses").select("score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("application_documents").select("id,label,filename,storage_path,mime_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("revamp_requests").select("revamped_cv_path,revamped_cv_filename,delivered_at").eq("user_id", user.id).not("revamped_cv_path", "is", null).order("delivered_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(prof);
    setLatestScore((scoreRow as any)?.score ?? null);
    setDocs((docsRows ?? []) as Doc[]);
    const rr = revampRow as any;
    setRevamped(rr?.revamped_cv_path ? { path: rr.revamped_cv_path, filename: rr.revamped_cv_filename, delivered_at: rr.delivered_at } : null);
    setLoading(false);
    if (!prof?.cv_path) navigate("/upload-cv", { replace: true });
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const replaceCv = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cv.${ext}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      await supabase.from("profiles").update({ cv_path: path, cv_filename: file.name }).eq("id", user.id);
      toast.success("CV updated");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  };

  const addDoc = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("app-docs").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("application_documents").insert({
        user_id: user.id,
        label: docLabel,
        filename: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (insErr) throw insErr;
      toast.success("Document added");
      setAddOpen(false);
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  };

  const removeDoc = async (d: Doc) => {
    if (!user) return;
    await supabase.storage.from("app-docs").remove([d.storage_path]);
    await supabase.from("application_documents").delete().eq("id", d.id).eq("user_id", user.id);
    setDocs((p) => p.filter((x) => x.id !== d.id));
  };

  const downloadRevamped = async () => {
    if (!revamped) return;
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(revamped.path, 60);
    if (error || !data) { toast.error("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const useRevampedAsMain = async () => {
    if (!user || !revamped) return;
    setBusy(true);
    try {
      await supabase.from("profiles").update({
        cv_path: revamped.path,
        cv_filename: revamped.filename ?? "Revamped CV.pdf",
      }).eq("id", user.id);
      toast.success("Revamped CV set as your main CV");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">CV & Documents</h1>
      </div>

      <section className="p-5 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">My CV</p>
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          {profile?.cv_path ? (
            <>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{profile.cv_filename ?? "CV.pdf"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Uploaded {profile.cv_uploaded_at ? new Date(profile.cv_uploaded_at).toLocaleDateString() : "—"}
                  </p>
                  {latestScore != null && (
                    <p className="text-[11px] mt-1">Latest ATS score: <span className="font-bold text-primary">{latestScore}%</span></p>
                  )}
                </div>
              </div>
              <input ref={cvReplaceRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceCv(f); }} />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" disabled={busy} onClick={() => cvReplaceRef.current?.click()} className="rounded-xl h-10 text-xs">
                  <Upload className="w-3.5 h-3.5 mr-1" /> Replace
                </Button>
                <Button onClick={() => navigate("/cv-score")} className="rounded-xl h-10 text-xs bg-primary hover:bg-primary/90">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rescore
                </Button>
                <Button onClick={() => navigate("/cv-revamp")} className="col-span-2 rounded-xl h-10 text-xs bg-forest hover:bg-forest/90">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Go to CV Revamp
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={() => navigate("/upload-cv")} className="w-full h-11 rounded-xl bg-forest hover:bg-forest/90">
              <Upload className="w-4 h-4 mr-2" /> Upload CV
            </Button>
          )}
        </div>
      </section>

      {revamped && (
        <section className="p-5 pt-0 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Revamped CV (NEW)</p>
          <div className="bg-card rounded-2xl p-4 shadow-soft border border-success/40">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-success mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{revamped.filename ?? "Revamped CV.pdf"}</p>
                <p className="text-[11px] text-muted-foreground">
                  Delivered by your coach {revamped.delivered_at ? new Date(revamped.delivered_at).toLocaleDateString() : ""}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-success/15 text-success px-2 py-1 rounded-full">New</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" onClick={downloadRevamped} className="rounded-xl h-10 text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
              <Button onClick={useRevampedAsMain} disabled={busy || profile?.cv_path === revamped.path} className="rounded-xl h-10 text-xs bg-forest hover:bg-forest/90">
                {profile?.cv_path === revamped.path ? "In use" : "Use as main CV"}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="p-5 pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Supporting Documents</p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="rounded-xl h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
        {docs.length === 0 ? (
          <div className="bg-card rounded-2xl p-4 text-sm text-muted-foreground text-center">
            No documents yet. Upload certificates, references and IDs once — they'll auto-attach to applications.
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="bg-card rounded-2xl p-3 flex items-center gap-3 shadow-soft">
                <FileText className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{d.filename}</p>
                  <p className="text-[11px] text-muted-foreground">{d.label}</p>
                </div>
                <button onClick={() => removeDoc(d)} className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Document type</Label>
              <Select value={docLabel} onValueChange={setDocLabel}>
                <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addDoc(f); }} />
            <Button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full h-11 bg-forest hover:bg-forest/90 rounded-xl">
              {busy ? "Uploading…" : "Choose file"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CVDocuments;
