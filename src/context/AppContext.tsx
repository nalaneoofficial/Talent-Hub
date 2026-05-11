import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  industry: string;
  salary_range: string | null;
  description: string;
  skills: string[];
  application_email: string | null;
  hiring_contact_name?: string | null;
  hiring_contact_title?: string | null;
  application_deadline?: string | null;
  employment_type?: string | null;
  required_years_experience?: number | null;
  required_qualification?: string | null;
  required_field_of_study?: string[] | null;
};

export type Profile = {
  skills?: string[] | null;
  cv_extracted_skills?: string[] | null;
  years_experience?: number | null;
  cv_extracted_experience_years?: number | null;
  highest_education?: string | null;
  cv_extracted_qualification?: string | null;
  preferred_industries?: string[] | null;
  field_of_study?: string | null;
};

export type Swipe = { job_id: string; action: "like" | "save" | "pass" };
export type Application = { job_id: string; status: "draft" | "submitted"; cover_letter: string | null };

type Ctx = {
  jobs: Job[];           // unfiltered (all active)
  swipeJobs: Job[];      // filtered for swipe deck
  profile: Profile | null;
  swipes: Swipe[];
  applications: Application[];
  loading: boolean;
  swipe: (job: Job, action: Swipe["action"]) => Promise<void>;
  undo: () => Promise<void>;
  refresh: () => Promise<void>;
  upsertApplication: (jobId: string, coverLetter: string, status: Application["status"]) => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

// Qualification ranking
const QUAL_LEVELS: Record<string, number> = {
  "secondary school": 1, "certificate": 2, "diploma": 3,
  "bachelor's degree": 4, "bachelors degree": 4, "honours": 5,
  "master's degree": 6, "masters degree": 6, "phd": 7, "doctorate": 7,
};
const qualLevel = (q: string | null | undefined) => QUAL_LEVELS[(q ?? "").toLowerCase().trim()] ?? 0;

const qualifies = (job: Job, profile: Profile | null): boolean => {
  if (!profile) return true;

  // Industry — match preferred industries OR current job title
  const prefs = (profile.preferred_industries ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  if (prefs.length > 0) {
    const jobIndustry = (job.industry ?? "").toLowerCase().trim();
    const industryMatch = prefs.some((p) =>
      jobIndustry === p ||
      jobIndustry.includes(p) ||
      p.includes(jobIndustry)
    );
    if (!industryMatch) return false;
  }

  // Experience — user needs at least 70% of required years
  const userYears = profile.years_experience ?? profile.cv_extracted_experience_years ?? 0;
  const reqYears = job.required_years_experience ?? 0;
  if (reqYears > 0 && userYears < reqYears * 0.7) return false;

  // Qualification — user can only see jobs at or below their level
  const userQual = qualLevel(profile.highest_education ?? profile.cv_extracted_qualification);
  const reqQual = qualLevel(job.required_qualification);
  if (reqQual > 0 && userQual < reqQual) return false;

  // Field of study — strict filter
  const requiredFields = (job.required_field_of_study ?? []);
  if (requiredFields.length > 0) {
    const userField = (profile.field_of_study ?? "").toLowerCase().trim();
    if (!userField || !requiredFields.map(f => f.toLowerCase()).includes(userField)) return false;
  }

  return true;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [swipeJobs, setSwipeJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setJobs([]); setSwipeJobs([]); setProfile(null); setSwipes([]); setApplications([]); setLoading(false); return; }
    setLoading(true);
    const [jobsRes, swipesRes, appsRes, profRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("swipes").select("job_id,action").eq("user_id", user.id),
      supabase.from("applications").select("job_id,status,cover_letter").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    const allJobs = ((jobsRes.data ?? []) as Job[]).filter((j) =>
      !j.application_deadline || new Date(j.application_deadline) > new Date()
    );
    const prof = (profRes.data ?? null) as Profile | null;
    setProfile(prof);
    setJobs(allJobs);
    setSwipeJobs(allJobs.filter((j) => qualifies(j, prof)));
    setSwipes((swipesRes.data ?? []) as Swipe[]);
    setApplications((appsRes.data ?? []) as Application[]);
    setLoading(false);

    try {
      const likedJobIds = (swipesRes.data ?? []).filter((s: any) => s.action === "like").map((s: any) => s.job_id);
      const submittedJobIds = new Set(
        (appsRes.data ?? []).filter((a: any) => a.status === "submitted").map((a: any) => a.job_id)
      );
      const pending = likedJobIds.filter((id: string) => !submittedJobIds.has(id));
      if (pending.length > 0) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("job_id")
          .eq("user_id", user.id)
          .eq("type", "draft_reminder")
          .in("job_id", pending);
        const have = new Set((existing ?? []).map((n: any) => n.job_id));
        const jobsById = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
        const toInsert = pending
          .filter((id: string) => !have.has(id) && jobsById.has(id))
          .map((id: string) => {
            const j: any = jobsById.get(id);
            return {
              user_id: user.id,
              type: "draft_reminder",
              title: `Finish your application: ${j.title}`,
              body: `${j.company} — review and send before it closes.`,
              job_id: id,
            };
          });
        if (toInsert.length > 0) await supabase.from("notifications").insert(toInsert);
      }
    } catch (e) { console.error("draft-reminder check failed", e); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const swipe = async (job: Job, action: Swipe["action"]) => {
    if (!user) return;
    setSwipes((s) => [...s.filter((x) => x.job_id !== job.id), { job_id: job.id, action }]);
    await supabase.from("swipes").upsert(
      { user_id: user.id, job_id: job.id, action },
      { onConflict: "user_id,job_id" }
    );
  };

  const undo = async () => {
    if (!user || swipes.length === 0) return;
    const last = swipes[swipes.length - 1];
    setSwipes((s) => s.slice(0, -1));
    await supabase.from("swipes").delete().eq("user_id", user.id).eq("job_id", last.job_id);
  };

  const upsertApplication: Ctx["upsertApplication"] = async (jobId, coverLetter, status) => {
    if (!user) return;
    const submitted_at = status === "submitted" ? new Date().toISOString() : null;
    await supabase.from("applications").upsert(
      { user_id: user.id, job_id: jobId, cover_letter: coverLetter, status, submitted_at },
      { onConflict: "user_id,job_id" }
    );
    setApplications((a) => [
      ...a.filter((x) => x.job_id !== jobId),
      { job_id: jobId, status, cover_letter: coverLetter },
    ]);
    if (status === "submitted") {
      await supabase.from("notifications").delete()
        .eq("user_id", user.id).eq("type", "draft_reminder").eq("job_id", jobId);
    }
  };

  return (
    <AppCtx.Provider value={{ jobs, swipeJobs, profile, swipes, applications, loading, swipe, undo, refresh, upsertApplication }}>
      {children}
    </AppCtx.Provider>
  );
};

export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be inside AppProvider");
  return c;
};

// Weighted match: 10% skills, 25% experience, 25% qualification, 20% industry, 20% field of study
export const computeMatch = (job: Job, profile: Profile | null): number => {
  if (!profile) return 50;
  const userSkills = [
    ...(profile.skills ?? []),
    ...(profile.cv_extracted_skills ?? []),
  ].map((s) => s.toLowerCase().trim()).filter(Boolean);
  const userSkillSet = new Set(userSkills);

  const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase().trim());
  const skillsScore = jobSkills.length === 0 ? 1
    : jobSkills.filter((s) => userSkillSet.has(s)).length / jobSkills.length;

  const userYears = profile.years_experience ?? profile.cv_extracted_experience_years ?? 0;
  const reqYears = job.required_years_experience ?? 0;
  const expScore = reqYears === 0 ? 1 : Math.min(1, userYears / reqYears);

  const userQual = qualLevel(profile.highest_education ?? profile.cv_extracted_qualification);
  const reqQual = qualLevel(job.required_qualification);
  const qualScore = reqQual === 0 ? 1 : userQual === 0 ? 0 : userQual >= reqQual ? 1 : 0;

  const prefs = (profile.preferred_industries ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  const jobIndustry = (job.industry ?? "").toLowerCase().trim();
  const industryScore = prefs.length === 0 ? 0.5 : prefs.some((p) =>
    jobIndustry.includes(p) || p.includes(jobIndustry) ||
    jobIndustry.split(/[&,\/]/).map(s => s.trim()).some(part => p.includes(part))
  ) ? 1 : 0;

  const requiredFields = (job.required_field_of_study ?? []).map(f => f.toLowerCase());
  const userField = (profile.field_of_study ?? "").toLowerCase().trim();
  const fieldScore = requiredFields.length === 0 ? 1 : (userField && requiredFields.includes(userField)) ? 1 : 0;

  const total = skillsScore * 0.1 + expScore * 0.25 + qualScore * 0.25 + industryScore * 0.2 + fieldScore * 0.2;
  return Math.round(total * 100);
};
