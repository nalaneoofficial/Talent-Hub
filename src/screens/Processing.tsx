import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const steps = ["Extracting information", "Matching skills", "Finding best jobs"];

const Processing = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate("/swipe"), 500);
          return 100;
        }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [navigate]);

  const completed = Math.floor((progress / 100) * steps.length);

  return (
    <div className="flex-1 bg-forest text-forest-foreground flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold text-center mb-12">Analyzing<br />your CV...</h1>

      <div className="relative w-48 h-48">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="hsl(var(--forest-foreground) / 0.15)" strokeWidth="6" fill="none" />
          <circle
            cx="50" cy="50" r="45"
            stroke="hsl(var(--primary-glow))"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(progress / 100) * 282.7} 282.7`}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold">{progress}%</span>
        </div>
      </div>

      <div className="mt-12 space-y-3 w-full max-w-xs">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 text-sm">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i < completed ? "bg-primary" : "border border-forest-foreground/30"}`}>
              {i < completed && <Check className="w-3 h-3" />}
            </div>
            <span className={i < completed ? "" : "opacity-60"}>{s}</span>
          </div>
        ))}
      </div>

      <p className="mt-12 text-xs opacity-70">This will just take a few seconds.</p>
    </div>
  );
};

export default Processing;
