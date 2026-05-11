import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => navigate(user ? "/swipe" : "/welcome"), 1200);
    return () => clearTimeout(t);
  }, [navigate, user, loading]);

  return (
    <div className="flex-1 bg-forest flex flex-col items-center justify-center text-forest-foreground relative overflow-hidden">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-background/95 rounded-3xl p-8 shadow-glow"
      >
        <Logo size={96} />
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-10 text-3xl font-bold text-center px-8 leading-tight"
      >
        Swipe into <br />
        <span className="text-primary-foreground/70 italic font-light">your next role.</span>
      </motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-16 flex gap-1.5"
      >
        <span className="h-1 w-8 rounded-full bg-primary" />
        <span className="h-1 w-2 rounded-full bg-primary-foreground/30" />
        <span className="h-1 w-2 rounded-full bg-primary-foreground/30" />
      </motion.div>
    </div>
  );
};

export default Splash;
