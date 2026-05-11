import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, FileText, CalendarClock, CreditCard } from "lucide-react";

const PartnerLanding = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-lg tracking-tight">Talenthub <span className="text-orange-500">Partners</span></span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/b2b-auth" state={{ accountType: "partner", mode: "signin" }} className="text-sm font-medium hover:text-orange-500 transition-colors">Log In</Link>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white"><Link to="/b2b-auth" state={{ accountType: "partner", mode: "signup" }}>Join as Partner</Link></Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-orange-500/5 [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Earn money writing CVs
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Monetize your HR & recruiting expertise
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join Talenthub's exclusive network of professional CV writers and career coaches. Help job seekers land their dream roles while earning extra income.
            </p>
            <Button size="lg" className="text-lg px-8 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white" asChild>
              <Link to="/b2b-auth" state={{ accountType: "partner", mode: "signup" }}>Apply to be a Partner</Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">A seamless workflow designed for independent HR professionals.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Receive Requests</h3>
                <p className="text-muted-foreground">Clients request CV revamps or interview coaching through the Talenthub app. You get notified instantly.</p>
              </div>
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
                  <CalendarClock className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Do the Work</h3>
                <p className="text-muted-foreground">Download their current CV, perform your magic, or schedule the coaching call. All managed within your portal.</p>
              </div>
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Get Paid</h3>
                <p className="text-muted-foreground">Upload the final documents and automatically get credited. Payouts are sent directly to your bank account weekly.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} Talenthub Partners. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PartnerLanding;
