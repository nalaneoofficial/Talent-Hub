import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INDUSTRIES = [
  "Administration", "Finance & Accounting", "Procurement & Supply Chain",
  "Human Resources", "Information Technology", "Marketing & Communications",
  "Engineering", "Healthcare", "Education & Training", "Legal",
  "Sales & Business Development", "Construction & Property",
  "Agriculture", "Customer Service", "Transport & Logistics", "NGO & Development",
];

export const FIELDS_OF_STUDY: Record<string, string[]> = {
  "Finance & Accounting": ["Accounting", "Finance", "Economics"],
  "Human Resources": ["Human Resources", "Psychology", "Business Administration"],
  "Information Technology": ["Computer Science", "Information Technology", "Software Engineering"],
  "Marketing & Communications": ["Marketing", "Communications", "Public Relations", "Journalism"],
  "Engineering": ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering"],
  "Healthcare": ["Nursing", "Medicine", "Pharmacy", "Public Health"],
  "Education & Training": ["Education", "Teaching"],
  "Legal": ["Law"],
  "Procurement & Supply Chain": ["Supply Chain", "Logistics", "Procurement"],
  "Agriculture": ["Agriculture", "Environmental Science"],
  "Construction & Property": ["Architecture", "Quantity Surveying", "Construction Management"],
  "NGO & Development": ["Development Studies", "Social Work", "International Relations"],
  "Sales & Business Development": ["Marketing", "Business Administration", "Commerce"],
  "Transport & Logistics": ["Logistics", "Transport Management"],
  "Administration": ["Business Administration", "Office Management", "Public Administration"],
  "Customer Service": ["Business Administration", "Communications"],
};

export const fieldsForIndustries = (inds: string[]): string[] => {
  if (inds.length === 0) return Array.from(new Set(Object.values(FIELDS_OF_STUDY).flat())).sort();
  const set = new Set<string>();
  inds.forEach((i) => (FIELDS_OF_STUDY[i] ?? []).forEach((f) => set.add(f)));
  return Array.from(set).sort();
};

const step1Schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(20),
  current_location: z.string().trim().min(2).max(120),
  residential_address: z.string().trim().min(2).max(300),
  postal_address: z.string().trim().max(300).optional(),
});
const step2Schema = z.object({
  highest_education: z.string().trim().min(2).max(120),
  field_of_study: z.string().trim().max(120).optional(),
  institution: z.string().trim().max(160).optional(),
  graduation_year: z.union([z.coerce.number().int().min(1950).max(2100), z.literal("")]).optional(),
});

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", current_location: "", residential_address: "",
    postal_address: "", highest_education: "", field_of_study: "",
    institution: "", graduation_year: "",
    years_experience: "", current_job_title: "", skills: "", career_summary: "",
  });
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm((f) => ({
          ...f,
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          current_location: data.current_location ?? "",
          residential_address: data.residential_address ?? "",
          postal_address: data.postal_address ?? "",
          highest_education: data.highest_education ?? "",
          field_of_study: data.field_of_study ?? "",
          institution: (data as any).institution ?? "",
          graduation_year: (data as any).graduation_year != null ? String((data as any).graduation_year) : "",
          years_experience: data.years_experience?.toString() ?? "",
          current_job_title: data.current_job_title ?? "",
          career_summary: (data as any).career_summary ?? "",
          skills: (data.skills ?? []).join(", "),
        }));
        setIndustries(((data as any).preferred_industries ?? []) as string[]);
      }
    });
  }, [user, loading, navigate]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const next1 = () => {
    const r = step1Schema.safeParse(form);
    if (!r.success) { toast.error(Object.values(r.error.flatten().fieldErrors).flat()[0] ?? "Check your inputs"); return; }
    setStep(2);
  };
  const next2 = () => {
    const r = step2Schema.safeParse(form);
    if (!r.success) { toast.error(Object.values(r.error.flatten().fieldErrors).flat()[0] ?? "Check your inputs"); return; }
    setStep(3);
  };

  const toggleIndustry = (ind: string) =>
    setIndustries((p) => p.includes(ind) ? p.filter((x) => x !== ind) : [...p, ind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (industries.length === 0) { toast.error("Select at least one industry of interest"); return; }
    setBusy(true);
    const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const payload: any = {
      full_name: form.full_name,
      phone: form.phone,
      current_location: form.current_location,
      residential_address: form.residential_address,
      postal_address: form.postal_address || null,
      highest_education: form.highest_education,
      field_of_study: form.field_of_study || null,
      institution: form.institution || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      current_job_title: form.current_job_title || null,
      career_summary: form.career_summary || null,
      skills,
      preferred_industries: industries,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    navigate("/upload-cv");
  };

  return (
    <div className="flex-1 flex flex-col bg-background p-6 overflow-y-auto">
      <button
        onClick={() => step === 1 ? navigate(-1) : setStep((s) => (s - 1) as 1 | 2 | 3)}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center self-start"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="mt-4">
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        <h1 className="text-2xl font-bold">
          {step === 1 ? "Personal Information" : step === 2 ? "Academic Background" : "Professional Background"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Step {step} of 3</p>
      </div>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <Field label="Full Name *" value={form.full_name} onChange={(v) => update("full_name", v)} />
          <Field label="Phone *" value={form.phone} onChange={(v) => update("phone", v)} placeholder="+267 7 123 4567" />
          <Field label="Current Location *" value={form.current_location} onChange={(v) => update("current_location", v)} placeholder="Gaborone, Botswana" />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Residential Address *</Label>
            <Textarea value={form.residential_address} onChange={(e) => update("residential_address", e.target.value)} className="rounded-xl bg-card min-h-[60px]" />
          </div>
          <Field label="Postal Address" value={form.postal_address} onChange={(v) => update("postal_address", v)} placeholder="P.O. Box 1234, Gaborone" />
          <Button onClick={next1} className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4">
          <Field label="Highest Education *" value={form.highest_education} onChange={(v) => update("highest_education", v)} placeholder="Bachelor's Degree" />
          <Field label="Name of Institution" value={form.institution} onChange={(v) => update("institution", v)} placeholder="University of Botswana" />
          <Field label="Graduation Year" type="number" value={form.graduation_year} onChange={(v) => update("graduation_year", v)} placeholder="2019" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">Back</Button>
            <Button onClick={next2} className="flex-1 h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 pb-12">
          <Field label="Current Job Title" value={form.current_job_title} onChange={(v) => update("current_job_title", v)} placeholder="Marketing Coordinator" />
          <Field label="Years of Experience" type="number" value={form.years_experience} onChange={(v) => update("years_experience", v)} placeholder="3" />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Career Summary</Label>
            <Textarea value={form.career_summary} onChange={(e) => update("career_summary", e.target.value)} placeholder="A brief summary of your professional background and goals..." className="rounded-xl bg-card min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Industries / Departments of Interest *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {INDUSTRIES.map((ind) => {
                const sel = industries.includes(ind);
                return (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => toggleIndustry(ind)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      sel ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                    }`}
                  >
                    {ind}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Field of Study</Label>
            <Select value={form.field_of_study} onValueChange={(v) => update("field_of_study", v)}>
              <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {fieldsForIndustries(industries).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Skills (comma-separated)</Label>
            <Textarea value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="SEO, Content Strategy, Analytics" className="rounded-xl bg-card min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">Back</Button>
            <Button type="submit" disabled={busy} className="flex-1 h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
              {busy ? "Saving…" : "Continue"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 rounded-xl bg-card" />
  </div>
);

export default ProfileSetup;
