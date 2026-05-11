import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, Building2, Users, CheckCircle2 } from "lucide-react";

const EmployerLanding = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">Talenthub <span className="text-primary">Business</span></span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/b2b-auth" state={{ accountType: "employer", mode: "signin" }} className="text-sm font-medium hover:text-primary transition-colors">Log In</Link>
            <Button asChild><Link to="/b2b-auth" state={{ accountType: "employer", mode: "signup" }}>Sign Up</Link></Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Hire the best talent in <span className="text-primary">Botswana</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Post jobs, find candidates instantly through our swipe-to-match ecosystem, and manage your hiring pipeline from one intuitive dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full" asChild>
                <Link to="/b2b-auth" state={{ accountType: "employer", mode: "signup" }}>Post a Job for Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full">
                View Pricing
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Why Employers Choose Talenthub</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Our modern platform connects you to active job seekers faster than traditional job boards.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Instant Matching</h3>
                <p className="text-muted-foreground">Candidates swipe on jobs just like dating apps. Get applicants who are genuinely interested and available.</p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Employer Branding</h3>
                <p className="text-muted-foreground">Showcase your company culture, values, and perks to attract top talent directly from the app.</p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Streamlined Hiring</h3>
                <p className="text-muted-foreground">Manage your job postings and applicants in an easy-to-use dashboard. No more messy email threads.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} Talenthub B2B. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmployerLanding;
