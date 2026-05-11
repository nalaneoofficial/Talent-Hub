import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AtsBreakdown } from "@/lib/atsScore";
import { toast } from "sonner";

const PASS = 80;

const CVScore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(true);
  const [result, setResult] = useState<AtsBreakdown | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("cv_path,cv_filename,cv_extracted_skills,cv_summary,skills,current_job_title,cv_extracted_qualification,highest_education")
          .eq("id", user.id).maybeSingle();

        if (!profile?.cv_path) {
          toast.error("No CV found — upload one first");
          navigate("/upload-cv");
          return;
        }

        let cvText = profile.cv_summary ?? "";

        if (cvText.length < 50) {
          toast.info("Reading your CV, please wait a moment…");
          // Wait up to 25s for parse-cv; otherwise proceed with whatever we have
          await Promise.race([
            supabase.functions.invoke("parse-cv"),
            new Promise((resolve) => setTimeout(resolve, 25000)),
          ]);
          const { data: updated } = await supabase
            .from("profiles")
            .select("cv_extracted_skills,cv_summary,skills,current_job_title")
            .eq("id", user.id).maybeSingle();
          cvText = updated?.cv_summary ?? "";
          if (cvText.length < 50) {
            toast.warning("We couldn't fully read your CV. Score is approximate — try uploading a PDF with selectable text.");
            cvText = [
              ...(updated?.skills ?? []),
              ...(updated?.cv_extracted_skills ?? []),
              updated?.current_job_title ?? "",
            ].filter(Boolean).join(" ") || "cv";
          }
        }

        const targetKeywords = [
          ...(profile.skills ?? []),
          ...(profile.cv_extracted_skills ?? []),
          profile.current_job_title ?? "",
          profile.highest_education ?? "",
          profile.cv_extracted_qualification ?? "",
        ].filter(Boolean);

        const { data: scored, error: scoreErr } = await supabase.functions.invoke("score-cv", {
          body: { cvText, target_keywords: targetKeywords },
        });
        if (scoreErr || !scored || scored.error) {
          throw new Error(scored?.error ?? scoreErr?.message ?? "Failed to score CV");
        }
        const r = scored as AtsBreakdown;
        setResult(r);

        const { data: existing } = await supabase
          .from("cv_analyses")
          .select("id")
          .eq("user_id", user.id)
          .eq("cv_filename", profile.cv_filename ?? "")
          .maybeSingle();

        if (!existing) {
          await supabase.from("cv_analyses").insert({
            user_id: user.id,
            score: r.score,
            keyword_score: r.keyword_score,
            structure_score: r.structure_score,
            readability_score: r.readability_score,
            formatting_score: r.formatting_score,
            feedback: r.feedback.join("\n"),
            cv_filename: profile.cv_filename ?? null,
          });
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Could not analyze CV");
      } finally { setBusy(false); }
    })();
  }, [user, navigate]);

  if (busy || !result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
        <p className="mt-4 text-sm">Analyzing your CV…</p>
      </div>
    );
  }

  const passed = result.score >= PASS;
  const ringColor = passed ? "text-success" : result.score >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">Your ATS Score</h1>
      </div>

      <div className="px-6 py-2 flex flex-col items-center text-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round"
              className={ringColor}
              stroke="currentColor"
              strokeDasharray={`${(result.score / 100) * 276.46} 276.46`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{result.score}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ATS Score</span>
          </div>
        </div>
        <p className={`mt-4 text-sm font-semibold flex items-center gap-2 ${passed ? "text-success" : "text-warning"}`}>
          {passed ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {passed ? "Your CV is ATS-ready" : "Your CV may not pass ATS systems"}
        </p>
      </div>

      <div className="px-5 mt-4 space-y-3">
        <Bar label="Keyword match" value={result.keyword_score} />
        <Bar label="Structure" value={result.structure_score} />
        <Bar label="Readability" value={result.readability_score} />
        <Bar label="Formatting" value={result.formatting_score} />
      </div>

      <div className="px-5 mt-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Feedback</p>
        <ul className="bg-card rounded-2xl p-4 border border-border space-y-2 text-sm">
          {result.feedback.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-foreground/85">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-5 mt-auto space-y-2">
        {(() => {
          const proceed = async (path: string) => {
            if (user) await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);
            navigate(path);
          };
          return passed ? (
            <Button onClick={() => proceed("/processing")} className="w-full h-12 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
              Continue to jobs <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate("/cv-revamp")} className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold">
                Revamp My CV (recommended)
              </Button>
              <Button variant="outline" onClick={() => proceed("/processing")} className="w-full h-12 rounded-xl">
                Continue anyway
              </Button>
            </>
          );
        })()}
      </div>
    </div>
  );
};

const Bar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}%</span>
    </div>
    <Progress value={value} className="h-2" />
  </div>
);

export default CVScore;
