import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useFlag } from "@/lib/featureFlags";

export const TabLayout = () => {
  const beta = useFlag("beta_mode");
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {beta && (
        <div className="bg-warning/15 text-warning-foreground text-[11px] font-medium text-center py-1 border-b border-warning/30 shrink-0">
          You are using the beta version
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};
