import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, ChevronRight } from "lucide-react";

const Applications = () => {
  const { jobs, swipes, applications } = useApp();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  if (isAdmin) return <Navigate to="/admin" replace />;

  const likedIds = new Set(swipes.filter((s) => s.action === "like").map((s) => s.job_id));
  const liked = jobs.filter((j) => likedIds.has(j.id));
  const submittedIds = new Set(applications.filter((a) => a.status === "submitted").map((a) => a.job_id));

  const submitted = liked.filter((j) => submittedIds.has(j.id));
  const pending = liked.filter((j) => !submittedIds.has(j.id));

  return (
    <div className="flex-1 flex flex-col p-5">
      <h1 className="text-2xl font-bold">Applications</h1>

      {pending.length > 0 && (
        <div className="mt-4 bg-warning/10 border border-warning/30 rounded-2xl p-3 flex items-start gap-3">
          <span className="text-xl">📬</span>
          <div className="text-xs">
            <p className="font-semibold text-foreground">{pending.length} application{pending.length > 1 ? "s" : ""} not yet completed</p>
            <p className="text-muted-foreground">Review and send them before it's too late.</p>
          </div>
        </div>
      )}

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">In Progress</p>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">All caught up.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((j) => (
              <button key={j.id} onClick={() => navigate(`/review/${j.id}`)} className="w-full bg-card rounded-2xl p-3 flex items-center gap-3 shadow-soft text-left">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Briefcase className="w-4 h-4 text-warning" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{j.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.company}</p>
                </div>
                <span className="text-[10px] bg-warning/15 text-warning px-2 py-1 rounded-full font-semibold">In Progress</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Submitted</p>
        {submitted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">None yet.</p>
        ) : (
          <div className="space-y-2">
            {submitted.map((j) => (
              <div key={j.id} className="bg-card rounded-2xl p-3 flex items-center gap-3 shadow-soft">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Briefcase className="w-4 h-4 text-success" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{j.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.company}</p>
                </div>
                <span className="text-[10px] bg-success/15 text-success px-2 py-1 rounded-full font-semibold">Submitted</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Applications;
