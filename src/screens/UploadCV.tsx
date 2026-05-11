import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UploadCloud, FileText, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ALLOWED = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_BYTES = 10 * 1024 * 1024;

const UploadCV = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { toast.error("Please upload PDF, DOC, or DOCX"); return; }
    if (f.size > MAX_BYTES) { toast.error("File must be under 10MB"); return; }
    setFile(f);
  };

  const onUpload = async () => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cv.${ext}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("profiles").update({ cv_path: path, cv_filename: file.name }).eq("id", user.id);
      if (dbErr) throw dbErr;
      toast.success("CV uploaded");
      // Fire-and-forget AI extraction so profile auto-fills in background
      supabase.functions.invoke("parse-cv").catch(() => {});
      navigate("/cv-score");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex-1 flex flex-col bg-background p-6">
      <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="mt-6">
        <h1 className="text-2xl font-bold">Upload your CV</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll use it when generating cover letters and merging applications.</p>
      </div>

      <input
        ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-8 flex-1 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center px-6 text-center bg-card hover:border-primary transition-colors"
      >
        {file ? (
          <>
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-7 h-7 text-success" />
            </div>
            <p className="mt-4 text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> {file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · tap to change</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UploadCloud className="w-7 h-7 text-primary" />
            </div>
            <p className="mt-4 text-sm">Tap to choose your CV</p>
            <p className="text-[11px] text-muted-foreground mt-3">PDF, DOC, DOCX (Max 10MB)</p>
          </>
        )}
      </button>

      <p className="text-[11px] text-center text-muted-foreground mt-4">🔒 Your CV is stored privately. Only you can access it.</p>

      <Button
        onClick={onUpload}
        disabled={!file || busy}
        className="w-full h-12 mt-4 bg-forest hover:bg-forest/90 rounded-xl font-semibold"
      >
        {busy ? "Uploading…" : "Upload & Continue"}
      </Button>

      <button
        onClick={() => navigate("/cv-revamp")}
        className="mt-3 text-xs text-center text-muted-foreground underline underline-offset-2"
      >
        I don't have a CV — help me build one
      </button>
    </div>
  );
};

export default UploadCV;
