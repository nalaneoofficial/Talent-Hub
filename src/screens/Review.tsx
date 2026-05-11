import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Check, Edit3, Sparkles, Paperclip, X, Mail } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp, computeMatch } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Review = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { jobs, applications, upsertApplication } = useApp();
  if (isAdmin) return <Navigate to="/admin" replace />;
  const job = jobs.find((j) => j.id === id);
  const existing = applications.find((a) => a.job_id === id);

  const [profile, setProfile] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState(existing?.cover_letter ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [extras, setExtras] = useState<Array<{ file: File; label: string }>>([]);
  const [savedDocs, setSavedDocs] = useState<Array<{ id: string; label: string; storage_path: string; filename: string; mime_type: string | null }>>([]);
  const [includedSavedIds, setIncludedSavedIds] = useState<Set<string>>(new Set());
  const extrasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase.from("application_documents")
      .select("id,label,storage_path,filename,mime_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const docs = (data ?? []) as any[];
        setSavedDocs(docs);
        // include all by default — they're reusable supporting docs
        setIncludedSavedIds(new Set(docs.map((d) => d.id)));
      });
  }, [user]);

  // Log job view for analytics
  useEffect(() => {
    if (!user || !job) return;
    supabase.from("job_views").insert({ user_id: user.id, job_id: job.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, job?.id]);

  // Auto-generate AI cover letter once profile + job loaded and no existing letter
  useEffect(() => {
    if (!job || !profile || coverLetter || generating) return;
    generateLetter(profile, job);
  }, [job, profile]); // eslint-disable-line

  const generateLetter = async (p: any, j: any) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: { job: j, profile: p },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCoverLetter(data.coverLetter);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate cover letter — using a basic draft");
      const name = p.full_name || "[Your name]";
      setCoverLetter(`Dear Hiring Manager,\n\nI am writing to apply for the ${j.title} position at ${j.company}. ${p.current_job_title ? `As a ${p.current_job_title}, ` : ""}I bring relevant experience and a strong interest in ${j.industry}.\n\nKind regards,\n${name}`);
    } finally { setGenerating(false); }
  };

  if (!job) return <div className="p-6">Job not found</div>;
  const isSubmitted = existing?.status === "submitted";
  const match = computeMatch(job, profile);

  // ---------- PDF helpers ----------
  const wrap = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const out: string[] = [];
    text.split("\n").forEach((para) => {
      if (!para.trim()) { out.push(""); return; }
      const words = para.split(" ");
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
          out.push(line); line = w;
        } else line = test;
      }
      if (line) out.push(line);
    });
    return out;
  };

  // Sentence case helper: "APPLICATION FOR THE POST OF SOFTWARE ENGINEER" -> "Application for the post of Software Engineer"
  const titleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c, i, str) => {
      // capitalise first letter; rest stays lowercase (sentence-style)
      return i === 0 ? c.toUpperCase() : c;
    });

  // Format raw postal address into separate lines.
  // Input examples:
  //   "P O Box 20308 Francistown"
  //   "P.O. Box 20308, Francistown"
  //   "Box 20308 Francistown"
  // Output: ["P O Box 20308", "Francistown"]
  const formatPostal = (raw: string): string[] => {
    const cleaned = raw.replace(/[,\n]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    // Match "(P O Box|P.O Box|PO Box|Box) <number>"
    const m = cleaned.match(/^((?:P\.?\s*O\.?\s*)?Box)\s+(\d+)\s*(.*)$/i);
    if (m) {
      const boxLine = `${m[1].replace(/\./g, "").replace(/\s+/g, " ").toUpperCase().replace("BOX", "Box")} ${m[2]}`.trim();
      const town = m[3].trim();
      return town ? [boxLine, town] : [boxLine];
    }
    // Fallback: split on multiple spaces or just return as a single line
    return cleaned.split(/\s{2,}/);
  };

  const coverLetterPdfBytes = async (): Promise<Uint8Array> => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const size = 11; const lh = 16; const margin = 60;
    let page = pdf.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const maxW = width - margin * 2;
    let y = height - margin;

    const ensureRoom = () => {
      if (y < margin + lh) { page = pdf.addPage([595, 842]); y = height - margin; }
    };
    const draw = (text: string, opts: { bold?: boolean } = {}) => {
      const f = opts.bold ? bold : font;
      for (const line of wrap(text, f, size, maxW)) {
        ensureRoom();
        page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
        y -= lh;
      }
    };
    const drawCentered = (text: string, opts: { bold?: boolean; underline?: boolean } = {}) => {
      const f = opts.bold ? bold : font;
      ensureRoom();
      const tw = f.widthOfTextAtSize(text, size);
      const x = (width - tw) / 2;
      page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      if (opts.underline) {
        page.drawLine({
          start: { x, y: y - 2 }, end: { x: x + tw, y: y - 2 },
          thickness: 0.8, color: rgb(0.1, 0.1, 0.1),
        });
      }
      y -= lh;
    };
    const blank = () => { y -= lh; };

    // 1. Sender postal address (multi-line; NO location line in between)
    const postalLines = formatPostal(profile?.postal_address ?? "");
    postalLines.forEach((l) => draw(l));
    blank();

    // 2. Date
    draw(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    blank();

    // 3. Recipient (hiring contact)
    if (job.hiring_contact_name) {
      draw(job.hiring_contact_name);
      if (job.hiring_contact_title) draw(job.hiring_contact_title);
    }
    draw(job.company);
    draw(job.location);
    blank();

    // 4. Salutation
    const salutation = job.hiring_contact_name ? `Dear ${job.hiring_contact_name},` : "Dear Sir/Madam,";
    draw(salutation);
    blank();

    // 5. RE line — centered, bold, underlined, ALL CAPS
    drawCentered(`RE: APPLICATION FOR THE POST OF ${job.title.toUpperCase()}`, { bold: true, underline: true });
    blank();

    // 6. Body
    coverLetter.split("\n").forEach((para) => {
      if (para.trim()) draw(para);
      else blank();
    });
    blank();

    // 7. Sign-off — name in normal case, not all caps
    draw("Yours faithfully,");
    blank();
    blank();
    draw(profile?.full_name ?? "", { bold: true });

    return await pdf.save();
  };

  const fetchCvPdf = async (): Promise<Uint8Array | null> => {
    if (!profile?.cv_path) return null;
    const { data, error } = await supabase.storage.from("cvs").download(profile.cv_path);
    if (error || !data) return null;
    const ext = profile.cv_path.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      toast.warning("CV must be PDF for merging. Re-upload as PDF for full merge.", { duration: 5000 });
      return null;
    }
    return new Uint8Array(await data.arrayBuffer());
  };

  const fileToPdf = async (file: File): Promise<Uint8Array | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return new Uint8Array(await file.arrayBuffer());
    if (["png", "jpg", "jpeg"].includes(ext ?? "")) {
      const pdf = await PDFDocument.create();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([595, 842]);
      const scale = Math.min((595 - 80) / img.width, (842 - 80) / img.height);
      page.drawImage(img, {
        x: (595 - img.width * scale) / 2,
        y: (842 - img.height * scale) / 2,
        width: img.width * scale, height: img.height * scale,
      });
      return await pdf.save();
    }
    toast.warning(`${file.name} skipped — convert DOC/DOCX to PDF first.`, { duration: 5000 });
    return null;
  };

  const mergePdfs = async (pdfs: Uint8Array[]): Promise<Uint8Array> => {
    const merged = await PDFDocument.create();
    for (const bytes of pdfs) {
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    return await merged.save();
  };

  const fetchSavedDocPdf = async (storage_path: string): Promise<Uint8Array | null> => {
    const { data, error } = await supabase.storage.from("app-docs").download(storage_path);
    if (error || !data) return null;
    const ext = storage_path.split(".").pop()?.toLowerCase();
    const file = new File([data], storage_path.split("/").pop() ?? "doc", { type: data.type || "application/octet-stream" });
    if (ext === "pdf") return new Uint8Array(await file.arrayBuffer());
    return await fileToPdf(file);
  };

  const persistNewExtras = async () => {
    if (!user || extras.length === 0) return;
    for (const e of extras) {
      const ext = e.file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("app-docs").upload(path, e.file, {
        cacheControl: "3600", upsert: false, contentType: e.file.type || undefined,
      });
      if (upErr) { console.warn("save doc upload failed", upErr); continue; }
      const { data: row } = await supabase.from("application_documents").insert({
        user_id: user.id,
        label: e.label || e.file.name.replace(/\.[^.]+$/, ""),
        filename: e.file.name,
        storage_path: path,
        mime_type: e.file.type || null,
        size_bytes: e.file.size,
      }).select("id,label,storage_path,filename,mime_type").maybeSingle();
      if (row) {
        setSavedDocs((p) => [row as any, ...p]);
        setIncludedSavedIds((p) => new Set([...p, (row as any).id]));
      }
    }
  };

  const handleSend = async () => {
    if (!job.application_email) {
      toast.error("This job has no application email set.");
      return;
    }
    setBusy(true);
    try {
      // Persist new extras so the user doesn't re-upload next time
      await persistNewExtras();

      const parts: Uint8Array[] = [];
      parts.push(await coverLetterPdfBytes());
      const cv = await fetchCvPdf();
      if (cv) parts.push(cv);

      // New (in-memory) extras still in this session
      for (const e of extras) {
        const p = await fileToPdf(e.file);
        if (p) parts.push(p);
      }
      // Saved (re-usable) extras the user opted to include
      for (const doc of savedDocs) {
        if (!includedSavedIds.has(doc.id)) continue;
        const p = await fetchSavedDocPdf(doc.storage_path);
        if (p) parts.push(p);
      }

      const merged = await mergePdfs(parts);

      const safeName = (profile?.full_name ?? "Applicant").replace(/[^\w\s-]/g, "");
      const safeJob = job.title.replace(/[^\w\s-]/g, "");
      const filename = `Application for the post of ${safeJob}_${safeName}.pdf`;

      // Trigger download of merged PDF
      const blob = new Blob([merged as BlobPart], { type: "application/pdf" });
      const gn = (window as any).gonative_file_writer_sharer;

    

      if (gn && gn.postMessage) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            const chunkSize = 700 * 1024;
            const id = Math.random().toString(36).substring(2);
            const nameWithoutExt = filename.replace(/\.pdf$/i, "");

          

            gn.postMessage(JSON.stringify({
  event: "fileStart",
  id,
  size: blob.size,
  type: "application/pdf",
  name: nameWithoutExt,
}));

let offset = 0;
const sendChunk = () => {
              if (offset >= base64.length) {
               
                gn.postMessage(JSON.stringify({ event: "fileEnd", id }));
                resolve();
                return;
              }
              const chunk = base64.slice(offset, offset + chunkSize);
              gn.postMessage(JSON.stringify({
                event: "fileChunk",
                id,
                data: "data:application/pdf;base64," + chunk,
              }));
              offset += chunkSize;
              setTimeout(sendChunk, 0);
            };
            setTimeout(sendChunk, 1500);
          };
          reader.readAsDataURL(blob);
        });
        // Wait 3s after chunks sent before navigating away
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Desktop browser fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const totalExtras = extras.length + Array.from(includedSavedIds).length;
      const subject = `Application for the post of ${job.title} — ${profile?.full_name ?? ""}`.trim();
      const body = `Dear Hiring Manager,\n\nPlease find attached my application for the ${job.title} position at ${job.company}. The attached document includes my cover letter, CV${totalExtras ? ", and supporting documents" : ""}.\n\nKind regards,\n${profile?.full_name ?? ""}\n${profile?.phone ?? ""}\n${profile?.email ?? ""}`;
      const mailto = `mailto:${encodeURIComponent(job.application_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      await upsertApplication(job.id, coverLetter, "submitted");
      window.location.href = mailto;
      toast.success("Document downloaded — attach it in your email app", { duration: 6000 });
      setTimeout(() => navigate("/applications"), 1200);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not prepare application");
    } finally { setBusy(false); }
  };

  const handleSaveDraft = async () => {
    setBusy(true);
    await upsertApplication(job.id, coverLetter, "draft");
    setBusy(false);
    toast.success("Draft saved");
  };

  const onPickExtras = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({ file: f, label: f.name.replace(/\.[^.]+$/, "") }));
    setExtras((p) => [...p, ...arr]);
  };

  const removeSavedDoc = async (id: string, storage_path: string) => {
    if (!user) return;
    await supabase.storage.from("app-docs").remove([storage_path]);
    await supabase.from("application_documents").delete().eq("id", id).eq("user_id", user.id);
    setSavedDocs((p) => p.filter((d) => d.id !== id));
    setIncludedSavedIds((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">Review & Apply</h1>
      </div>

      <div className="p-5 space-y-5">
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <p className="font-bold">{job.title}</p>
          <p className="text-sm text-muted-foreground">{job.company}</p>
          <p className="text-xs text-muted-foreground mt-1">{job.location}</p>
          <span className="inline-block mt-2 text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">{match}% Match</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Cover Letter
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => profile && generateLetter(profile, job)}
                disabled={generating || !profile}
                className="text-xs text-primary disabled:opacity-50"
              >
                {generating ? "Generating…" : "Regenerate"}
              </button>
              <button onClick={() => setEditing((e) => !e)} className="text-xs text-primary flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> {editing ? "Done" : "Edit"}
              </button>
            </div>
          </div>
          {editing ? (
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="rounded-2xl bg-card min-h-[260px] text-xs"
            />
          ) : (
            <div className="bg-card rounded-2xl p-4 text-xs whitespace-pre-line leading-relaxed text-muted-foreground border border-border max-h-64 overflow-y-auto">
              {generating ? "✨ Crafting your personalized letter…" : (coverLetter || "Tap Regenerate to create one")}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Attachments</p>
          <div className="bg-card rounded-2xl p-3 flex items-center gap-3 border border-border">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <p className="flex-1 text-sm truncate">{profile?.cv_filename ?? "No CV uploaded"}</p>
            {profile?.cv_path && <Check className="w-4 h-4 text-success" />}
          </div>

          {savedDocs.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Saved documents · re-use</p>
              {savedDocs.map((d) => {
                const included = includedSavedIds.has(d.id);
                return (
                  <div key={d.id} className="mt-2 bg-card rounded-2xl p-3 flex items-center gap-3 border border-border">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => setIncludedSavedIds((p) => {
                        const n = new Set(p);
                        if (n.has(d.id)) n.delete(d.id); else n.add(d.id);
                        return n;
                      })}
                      className="w-4 h-4 accent-primary"
                    />
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <p className="flex-1 text-xs truncate">{d.label}</p>
                    <button onClick={() => removeSavedDoc(d.id, d.storage_path)} className="text-muted-foreground" title="Remove from library">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {extras.map((e, i) => (
            <div key={i} className="mt-2 bg-card rounded-2xl p-3 border border-border space-y-2">
              <div className="flex items-center gap-3">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-xs truncate text-muted-foreground">{e.file.name}</p>
                <button onClick={() => setExtras((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                value={e.label}
                onChange={(ev) => setExtras((p) => p.map((x, j) => j === i ? { ...x, label: ev.target.value } : x))}
                placeholder="Document name e.g. Degree Certificate"
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border outline-none"
              />
            </div>
          ))}

          <input
            ref={extrasRef} type="file" multiple className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => { onPickExtras(e.target.files); e.target.value = ""; }}
          />
          <button
            onClick={() => extrasRef.current?.click()}
            className="mt-2 w-full text-xs text-primary border border-dashed border-border rounded-xl py-2.5 flex items-center justify-center gap-2"
          >
            <Paperclip className="w-3.5 h-3.5" /> Add supporting document (PDF or image)
          </button>
        </div>

        <div className="flex gap-2 pb-4">
          <Button variant="outline" onClick={handleSaveDraft} disabled={busy} className="flex-1 h-12 rounded-xl">
            Save draft
          </Button>
          <Button
            disabled={busy || !coverLetter}
            onClick={handleSend}
            className="flex-1 h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold flex items-center justify-center gap-1.5"
          >
            <Mail className="w-4 h-4" />
            {busy ? "Preparing…" : isSubmitted ? "Resend" : "Send Application"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Review;
