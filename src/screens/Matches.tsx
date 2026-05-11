import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, ChevronRight } from "lucide-react";

const tabs = ["Interested", "Saved", "Passed"] as const;

const Matches = () => {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Interested");
  const { jobs, swipes } = useApp();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  if (isAdmin) return <Navigate to="/admin" replace />;

  const wanted = tab === "Interested" ? "like" : tab === "Saved" ? "save" : "pass";
  const ids = new Set(swipes.filter((s) => s.action === wanted).map((s) => s.job_id));
  const list = jobs.filter((j) => ids.has(j.id));

  return (
    <div className="flex-1 flex flex-col p-5">
      <h1 className="text-2xl font-bold">Matches</h1>

      <div className="flex gap-2 mt-4 bg-secondary p-1 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === t ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nothing here yet — keep swiping.
          </div>
        ) : (
          list.map((job) => (
            <button
              key={job.id}
              onClick={() => navigate(`/review/${job.id}`)}
              className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-soft hover:shadow-card transition-shadow text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{job.title}</p>
                <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                <p className="text-[11px] text-primary font-medium mt-0.5">{job.industry}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Matches;
