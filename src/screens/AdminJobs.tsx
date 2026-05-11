import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Sparkles, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIELDS_OF_STUDY, fieldsForIndustries } from "@/screens/ProfileSetup";
import { toast } from "sonner";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"];
const QUALIFICATIONS = ["Secondary School", "Certificate", "Diploma", "Bachelor's Degree", "Honours", "Master's Degree", "PhD"];
const INDUSTRIES = [
  "Administration", "Finance & Accounting", "Procurement & Supply Chain",
  "Human Resources", "Information Technology", "Marketing & Communications",
  "Engineering", "Healthcare", "Education & Training", "Legal",
  "Sales & Business Development", "Construction & Property",
  "Agriculture", "Customer Service", "Transport & Logistics", "NGO & Development",
];

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(60),
  job_type: z.string().trim().min(2).max(40),
  employment_type: z.string().trim().min(2).max(40),
  salary_range: z.string().trim().max(60).optional(),
  description: z.string().trim().min(10).max(2000),
  skills: z.string().trim().max(500),
  application_email: z.string().trim().email().max(255),
  hiring_contact_name: z.string().trim().max(120).optional(),
  hiring_contact_title: z.string().trim().max(120).optional(),
  required_years_experience: z.coerce.number().int().min(0).max(50).optional(),
  required_qualification: z.string().trim().max(120).optional(),
  application_deadline: z.string().trim().min(1, "Deadline is required").max(40),
});

const AdminJobs = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const { jobs, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [aiBanner, setAiBanner] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", company: "", location: "Gaborone, Botswana", industry: "",
    job_type: "Full-time", employment_type: "Full-time", salary_range: "",
    description: "", skills: "", application_email: "",
    hiring_contact_name: "", hiring_contact_title: "",
    required_years_experience: "", required_qualification: "",
    application_deadline: "",
  });

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      toast.error("Admin access required");
      navigate("/profile");
    }
  }, [isAdmin, loading, navigate]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Check inputs");
      return;
    }
    setBusy(true);
    const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("jobs").insert([{
      ...parsed.data,
      salary_range: parsed.data.salary_range || null,
      hiring_contact_name: parsed.data.hiring_contact_name || null,
      hiring_contact_title: parsed.data.hiring_contact_title || null,
      required_qualification: parsed.data.required_qualification || null,
      required_years_experience: parsed.data.required_years_experience ?? null,
      required_field_of_study: requiredFields.length > 0 ? requiredFields : null,
      application_deadline: new Date(parsed.data.application_deadline).toISOString(),
      skills,
    }] as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job posted");
    setAiBanner(false);
    setRequiredFields([]);
    setForm({ ...form, title: "", company: "", description: "", skills: "", application_email: "", industry: "", salary_range: "", hiring_contact_name: "", hiring_contact_title: "", required_years_experience: "", required_qualification: "", application_deadline: "" });
    refresh();
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      // Calls the existing extract-job edge function (admin must have it deployed)
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("extract-job-from-document", {
        body: fd,
      });
      if (error) throw error;
      const j = (data?.job ?? data) as any;
      if (!j) throw new Error("No data extracted");
      setForm((f) => ({
        ...f,
        title: j.title ?? "",
        company: j.company ?? "",
        location: j.location ?? f.location,
        industry: j.industry ?? "",
        employment_type: j.employment_type || "Full-time",
        job_type: j.employment_type || "Full-time",
        salary_range: j.salary_range ?? "",
        description: j.description ?? "",
        skills: Array.isArray(j.skills) ? j.skills.join(", ") : (j.skills ?? ""),
        application_email: j.application_email ?? "",
        hiring_contact_name: j.hiring_contact_name ?? "",
        required_qualification: j.required_qualification ?? "",
        required_years_experience: j.required_years_experience ? String(j.required_years_experience) : "",
        application_deadline: j.application_deadline ?? "",
      }));
      setAiBanner(true);
      setImportOpen(false);
      toast.success("AI extracted — review before saving");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to extract job from document");
    } finally { setImporting(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Job removed");
    refresh();
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Admin: Jobs</h1>
          <p className="text-[11px] text-muted-foreground">Post and manage listings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> New Job</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)} className="rounded-xl">
            <Upload className="w-3.5 h-3.5 mr-1" /> Import from Document
          </Button>
        </div>
        {aiBanner && (
          <div className="rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 text-xs text-primary flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> AI extracted — please review before saving
          </div>
        )}
        <Field label="Title" v={form.title} on={(v) => update("title", v)} />
        <Field label="Company" v={form.company} on={(v) => update("company", v)} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Location" v={form.location} on={(v) => update("location", v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Industry</Label>
            <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Employment type</Label>
            <Select value={form.employment_type} onValueChange={(v) => { update("employment_type", v); update("job_type", v); }}>
              <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Field label="Salary" v={form.salary_range} on={(v) => update("salary_range", v)} placeholder="BWP 15,000" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Required years exp" v={form.required_years_experience} on={(v) => update("required_years_experience", v)} placeholder="3" />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Required qualification</Label>
            <Select value={form.required_qualification} onValueChange={(v) => update("required_qualification", v)}>
              <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{QUALIFICATIONS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {form.industry && (FIELDS_OF_STUDY[form.industry] ?? []).length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Required field of study (optional — none = open to all)</Label>
            <div className="flex flex-wrap gap-2">
              {fieldsForIndustries([form.industry]).map((f) => {
                const sel = requiredFields.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRequiredFields((p) => sel ? p.filter((x) => x !== f) : [...p, f])}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      sel ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                    }`}
                  >{f}</button>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Application deadline *</Label>
          <Input type="date" value={form.application_deadline} onChange={(e) => update("application_deadline", e.target.value)} className="h-11 rounded-xl bg-card" />
        </div>
        <Field label="Application email" v={form.application_email} on={(v) => update("application_email", v)} placeholder="hr@company.com" />
        <Field label="Hiring contact name (optional)" v={form.hiring_contact_name} on={(v) => update("hiring_contact_name", v)} placeholder="Mr. T. Moeng" />
        <Field label="Hiring contact title (optional)" v={form.hiring_contact_title} on={(v) => update("hiring_contact_title", v)} placeholder="Human Resources Manager" />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Skills (comma-separated)</Label>
          <Input value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="React, SQL, Excel" className="h-11 rounded-xl bg-card" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="rounded-xl bg-card min-h-[80px]" />
        </div>
        <Button type="submit" disabled={busy} className="w-full h-11 bg-forest hover:bg-forest/90 rounded-xl">
          {busy ? "Posting…" : "Post Job"}
        </Button>
      </form>

      <div className="p-5">
        <h2 className="text-sm font-semibold mb-3">Active listings ({jobs.length})</h2>
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="bg-card rounded-2xl p-3 flex items-center gap-3 shadow-soft">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{j.title}</p>
                <p className="text-xs text-muted-foreground truncate">{j.company} · {j.location}</p>
              </div>
              <button onClick={() => handleDelete(j.id)} className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Import job from document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Upload a JPG, PNG or PDF of the job advert. AI will extract the details and pre-fill the form for review.</p>
            <input
              ref={importInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
            />
            <Button onClick={() => importInputRef.current?.click()} disabled={importing} className="w-full h-11 bg-forest hover:bg-forest/90 rounded-xl">
              {importing ? "Extracting…" : "Choose file"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="h-11 rounded-xl bg-card" />
  </div>
);

export default AdminJobs;
