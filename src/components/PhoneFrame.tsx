import { ReactNode } from "react";

/**
 * Phone-shaped frame so the mobile UI feels like a real device on desktop,
 * and fills the screen on actual mobile.
 */
export const PhoneFrame = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-forest flex items-center justify-center p-0 sm:p-6">
      <div className="relative w-full sm:w-[400px] sm:h-[840px] h-screen bg-background sm:rounded-[2.5rem] overflow-hidden sm:shadow-glow sm:border-8 sm:border-forest flex flex-col">
        {children}
      </div>
    </div>
  );
};
