import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const EXEMPT = new Set([
  "/welcome", "/auth", "/profile-setup", "/upload-cv",
  "/cv-score", "/cv-revamp", "/settings", "/privacy", "/subscribe",
]);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, isPartner } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) { setChecking(false); return; }
    if (isPartner && !isAdmin) {
      if (!location.pathname.startsWith("/partner")) setRedirect("/partner");
      else setRedirect(null);
      setChecking(false);
      return;
    }
    if (isAdmin || location.pathname.startsWith("/admin") || location.pathname.startsWith("/partner")) {
      setChecking(false);
      return;
    }
    if (EXEMPT.has(location.pathname)) { setChecking(false); return; }

    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setChecking(false);
      }
    }, 5000);

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("cv_path,onboarding_complete,account_type,subscription_status,subscription_expires_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      clearTimeout(timeout);

      // Quick-jobs accounts can access a limited set of routes (profile, alerts, subscribe)
      // but are NOT sent to full candidate screens like /swipe, /matches, /applications
      // /quick-jobs and /quick-jobs/new are both allowed via the startsWith check
      if ((data as any)?.account_type === "quick_jobs") {
        const quickJobsAllowed = ["/quick-jobs", "/profile", "/notifications", "/profile-setup", "/subscribe", "/privacy", "/settings"];
        const isAllowed = quickJobsAllowed.some(p => location.pathname === p || location.pathname.startsWith(p));
        if (!isAllowed) setRedirect("/notifications");
        else setRedirect(null);
        setChecking(false);
        return;
      }

      if (!data?.cv_path) { setRedirect("/upload-cv"); setChecking(false); return; }
      if (!data.onboarding_complete) { setRedirect("/cv-score"); setChecking(false); return; }

      const { data: flag } = await supabase
        .from("feature_flags").select("enabled").eq("key", "subscription_required").maybeSingle();
      if ((flag as any)?.enabled) {
        const exp = (data as any)?.subscription_expires_at;
        const isActive = (data as any)?.subscription_status === "active" && exp && new Date(exp) > new Date();
        if (!isActive) { setRedirect("/subscribe"); setChecking(false); return; }
      }

      setRedirect(null);
      setChecking(false);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user, loading, isAdmin, isPartner, location.pathname]);

  if (loading || checking) return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (redirect && redirect !== location.pathname) return <Navigate to={redirect} replace />;
  return <>{children}</>;
};
