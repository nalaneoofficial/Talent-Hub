import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FlagKey = "beta_mode" | "payments_enabled" | "revamp_enabled" | "quick_jobs" | "subscription_required" | "cv_revamp_payments" | "quick_jobs_payments";

let cache: Record<string, boolean> | null = null;
const listeners = new Set<(flags: Record<string, boolean>) => void>();

const fetchFlags = async () => {
  const { data } = await supabase.from("feature_flags").select("key,enabled");
  const map: Record<string, boolean> = {};
  (data ?? []).forEach((r: any) => { map[r.key] = !!r.enabled; });
  cache = map;
  listeners.forEach((l) => l(map));
  return map;
};

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<Record<string, boolean>>(cache ?? {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    if (!cache) fetchFlags().then((m) => { if (mounted) { setFlags(m); setLoading(false); } });
    else { setFlags(cache); setLoading(false); }
    const cb = (m: Record<string, boolean>) => { if (mounted) setFlags(m); };
    listeners.add(cb);
    return () => { mounted = false; listeners.delete(cb); };
  }, []);

  return { flags, loading, refresh: fetchFlags };
};

export const useFlag = (key: FlagKey): boolean => {
  const { flags } = useFeatureFlags();
  return !!flags[key];
};
