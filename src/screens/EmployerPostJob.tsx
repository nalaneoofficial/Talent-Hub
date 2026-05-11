import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, LogOut, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const EmployerPostJob = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [isEmployer, setIsEmployer] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);

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
    if (!user) { navigate("/employer/landing", { replace: true }); return; }
    supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setAccountType(data?.account_type || null);
        setIsEmployer(data?.account_type === "employer" || data?.account_type === "job_poster");
      });
  }, [loading, user, navigate]);

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
      posted_by: user!.id,
      status: "open",
    }] as any);
    setBusy(false);
    
    if (error) { toast.error(error.message); return; }
    
    toast.success("Job successfully posted!");
    navigate("/employer");
  };

  if (loading || isEmployer === null) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Checking access…</div>;
  }
  
  if (!isEmployer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">This account does not have employer access.</p>
        <Button onClick={() => { signOut(); navigate("/employer/landing"); }} variant="outline" className="mt-4">Sign out</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center px-6 gap-4">
        <button onClick={() => navigate("/employer")} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-semibold">Post a New Job</h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2"><CheckCircle className="w-5 h-5 text-primary" /> Basic Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Job Title *" v={form.title} on={(v) => update("title", v)} placeholder="e.g. Senior Software Engineer" />
                <Field label="Company Name *" v={form.company} on={(v) => update("company", v)} placeholder="e.g. Tech Corp" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Location *" v={form.location} on={(v) => update("location", v)} />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Industry *</Label>
                  <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
                    <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Employment type *</Label>
                  <Select value={form.employment_type} onValueChange={(v) => { update("employment_type", v); update("job_type", v); }}>
                    <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Field label="Salary Range (optional)" v={form.salary_range} on={(v) => update("salary_range", v)} placeholder="BWP 15,000 - 20,000" />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2"><CheckCircle className="w-5 h-5 text-primary" /> Requirements</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Required Years of Experience (optional)" v={form.required_years_experience} on={(v) => update("required_years_experience", v)} placeholder="3" />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Required Qualification (optional)</Label>
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
                          key={f} type="button" onClick={() => setRequiredFields((p) => sel ? p.filter((x) => x !== f) : [...p, f])}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"}`}
                        >{f}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Key Skills (comma-separated)</Label>
                <Input value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="React, SQL, Communication" className="h-11 rounded-xl bg-card" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Job Description *</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the role and responsibilities..." className="rounded-xl bg-card min-h-[150px]" />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2"><CheckCircle className="w-5 h-5 text-primary" /> Application Settings</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Application Email *" v={form.application_email} on={(v) => update("application_email", v)} placeholder="hr@company.com" />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Application Deadline *</Label>
                  <Input type="date" value={form.application_deadline} onChange={(e) => update("application_deadline", e.target.value)} className="h-11 rounded-xl bg-card" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Hiring Manager Name (optional)" v={form.hiring_contact_name} on={(v) => update("hiring_contact_name", v)} placeholder="T. Moeng" />
                <Field label="Hiring Manager Title (optional)" v={form.hiring_contact_title} on={(v) => update("hiring_contact_title", v)} placeholder="HR Manager" />
              </div>
            </div>

            <div className="pt-6">
              <Button type="submit" disabled={busy} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-lg font-semibold shadow-glow">
                {busy ? "Publishing Job…" : "Publish Job to Talenthub"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

const Field = ({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) => (
  <div className="space-y-1.5 flex-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="h-11 rounded-xl bg-card" />
  </div>
);

export default EmployerPostJob;
