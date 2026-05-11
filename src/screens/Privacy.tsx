import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </div>
      <div className="p-5 space-y-5 text-sm leading-relaxed">
        <div className="flex items-center gap-3 bg-primary/5 rounded-2xl p-4">
          <Shield className="w-5 h-5 text-primary" />
          <p className="text-xs">Your data is encrypted in transit (TLS) and at rest. We follow Botswana's Data Protection Act, 2018.</p>
        </div>

        <Section title="What we collect">
          Profile information you provide (name, contact details, address, education, experience, skills) and the CV you upload. We also store your job swipes and applications so we can show you matches.
        </Section>

        <Section title="How we use it">
          • Match you to relevant jobs.<br />
          • Generate personalized cover letters using AI (only if you give consent in Settings).<br />
          • Send you alerts about new matches and deadlines.<br />
          • Help admins improve listings via aggregated, anonymous analytics.
        </Section>

        <Section title="AI processing">
          When you enable AI processing, your CV text and profile are sent to Lovable AI Gateway (Google Gemini) to extract skills and generate cover letters. The data is processed transiently and is not used to train models. You can disable this anytime in Settings.
        </Section>

        <Section title="Storage & encryption">
          Files (CV, supporting documents) are stored in private buckets — only you can read your own files. All traffic uses HTTPS/TLS. Database row-level security ensures users only see their own data.
        </Section>

        <Section title="Sharing">
          We never share your information with employers automatically. Your application is only sent when you tap "Send Application" — you choose what goes out, attached, and to whom.
        </Section>

        <Section title="Your rights">
          You can edit your profile, delete uploaded documents, withdraw AI consent, or delete all your data at any time from Settings.
        </Section>

        <Section title="Contact">
          Questions? Email support@talenthub.bw.
        </Section>

        <p className="text-[11px] text-muted-foreground pt-4">Last updated: 1 May 2026</p>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="text-sm font-semibold mb-1.5">{title}</h2>
    <p className="text-xs text-muted-foreground">{children}</p>
  </div>
);

export default Privacy;
