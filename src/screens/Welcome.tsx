import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import hero from "@/assets/welcome-hero.jpg";
import { Briefcase, ShieldCheck } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-background p-7 overflow-y-auto">
      <div className="flex justify-center mt-2">
        <Logo size={88} />
      </div>

      <h1 className="mt-8 text-[34px] font-bold leading-[1.1] tracking-tight">
        Find jobs <br />
        the <span className="text-primary italic">smart</span> way.
      </h1>
      <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
        Upload your CV. Swipe.<br />Get matched.
      </p>

      <div className="relative mt-6 mx-auto w-full max-w-[280px]">
        <div className="rounded-3xl overflow-hidden shadow-card aspect-[4/5]">
          <img src={hero} alt="Job seeker on TalentHub" className="w-full h-full object-cover" width={768} height={1024} />
        </div>
        <div className="absolute -left-3 top-6 bg-card rounded-2xl shadow-soft p-2.5">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div className="absolute -left-2 top-32 bg-card rounded-2xl shadow-soft p-2.5">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="absolute -right-2 top-10 bg-card rounded-2xl shadow-soft px-3 py-2">
          <p className="text-[10px] text-muted-foreground leading-none">Match</p>
          <p className="text-base font-bold text-primary leading-tight">85%</p>
        </div>
      </div>

      <div className="mt-auto pt-8 space-y-3">
        <Button
          onClick={() => navigate("/auth", { state: { accountType: "premium" } })}
          className="w-full h-12 bg-forest hover:bg-forest/90 text-forest-foreground rounded-xl text-base font-semibold"
        >
          Create Account
        </Button>
        <Button
          onClick={() => navigate("/auth", { state: { mode: "signin" } })}
          variant="outline"
          className="w-full h-12 rounded-xl text-base font-medium border-border"
        >
          I already have an account
        </Button>
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <button
          onClick={() => navigate("/auth", { state: { accountType: "quick_jobs" } })}
          className="w-full h-12 rounded-xl text-base font-medium"
          style={{ backgroundColor: "#e8e4da", color: "#1a1a1a" }}
        >
          Post a Quick Job →
        </button>
      </div>
    </div>
  );
};

export default Welcome;
