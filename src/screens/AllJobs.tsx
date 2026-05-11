import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ChevronRight, Search, Calendar } from "lucide-react";
import { useApp, computeMatch, Profile } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const formatDeadline = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Closes today";
  if (days <= 7) return `${days}d left`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const AllJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { jobs } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("skills,cv_extracted_skills,years_experience,cv_extracted_experience_years,highest_education,cv_extracted_qualification").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data as Profile));
  }, [user]);

  const filtered = jobs.filter((j) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return j.title.toLowerCase().includes(t) || j.company.toLowerCase().includes(t) || j.industry.toLowerCase().includes(t);
  });

  const sorted = [...filtered]
    .map((j) => ({ job: j, match: computeMatch(j, profile) }))
    .sort((a, b) => b.match - a.match);

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto">
      <h1 className="text-2xl font-bold">All Available Roles</h1>
      <p className="text-xs text-muted-foreground">Sorted by match strength</p>

      <div className="relative mt-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, company, industry" className="pl-9 h-11 rounded-xl bg-card" />
      </div>

      <div className="mt-4 space-y-2">
        {sorted.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">No roles match your search.</p>
        ) : (
          sorted.map(({ job, match }) => {
            const deadline = formatDeadline(job.application_deadline);
            return (
              <button
                key={job.id}
                onClick={() => navigate(`/review/${job.id}`)}
                className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-soft hover:shadow-card transition-shadow text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate flex-1">{job.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      match >= 75 ? "bg-success/15 text-success" : match >= 50 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                    }`}>{match}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{job.company} · {job.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-primary font-medium">{job.employment_type || job.job_type}</span>
                    {deadline && (
                      <span className="text-[10px] text-warning flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" /> {deadline}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AllJobs;
