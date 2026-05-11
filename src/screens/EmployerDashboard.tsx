import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Loader2, LogOut, Users, BarChart3, Plus, Search, Bell, MessageSquare, LayoutDashboard, Calendar, Video, FileText, Settings, Activity, Building2, ChevronRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [isEmployer, setIsEmployer] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Your Company");
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const loadJobsAndCandidates = async () => {
    if (!user) return;
    const { data: jData } = await supabase.from("jobs").select("*").eq("posted_by", user.id).order("created_at", { ascending: false });
    if (jData) setJobs(jData);

    // Head Hunt: active subscribers who are regular job-seekers (not B2B accounts)
    const { data: cData, error: cErr } = await supabase
      .from("profiles")
      .select("id, full_name, current_job_title, years_experience, highest_education, career_summary, subscription_status, account_type")
      .eq("subscription_status", "active")
      .not("account_type", "in", '("employer","quick_jobs")')
      .neq("id", user.id)
      .order("full_name", { ascending: true });
    if (cErr) console.error("Head Hunt query error:", cErr.message);
    if (cData) setCandidates(cData);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/employer/landing", { replace: true }); return; }
    
    Promise.all([
      supabase.from("profiles").select("account_type, full_name").eq("id", user.id).maybeSingle()
    ]).then(([profRes]) => {
      setAccountType(profRes.data?.account_type || null);
      setIsEmployer(profRes.data?.account_type === 'employer' || profRes.data?.account_type === 'job_poster');
      if (profRes.data?.full_name) setCompanyName(profRes.data.full_name);
    });
    
    loadJobsAndCandidates();
  }, [authLoading, user, navigate]);

  if (authLoading || isEmployer === null) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground bg-[#0a0c10]">Checking access…</div>;
  }
  if (!isEmployer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#0a0c10]">
        <p className="text-sm text-muted-foreground">This account does not have employer access.</p>
        <Button onClick={() => { signOut(); navigate("/employer/landing"); }} variant="outline" className="mt-4">Sign out</Button>
      </div>
    );
  }

  const isJobPoster = accountType === "job_poster";

  return (
    <div className="min-h-screen flex bg-[#0a0c10] text-[#e5e7eb] font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0d1117] flex flex-col shrink-0 hidden lg:flex">
        <div className="h-20 px-6 flex items-center border-b border-white/5">
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> TalentHub
            </span>
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold mt-0.5">Employer Portal</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
          <SidebarItem icon={<Briefcase />} label="Jobs" active={activeTab === "Jobs"} onClick={() => setActiveTab("Jobs")} />
          <SidebarItem icon={<Users />} label="Candidates" active={activeTab === "Candidates"} onClick={() => setActiveTab("Candidates")} />
          {!isJobPoster && <SidebarItem icon={<Activity />} label="Head Hunt" active={activeTab === "Head Hunt"} onClick={() => setActiveTab("Head Hunt")} />}
          <SidebarItem icon={<Calendar />} label="Interviews" active={activeTab === "Interviews"} onClick={() => setActiveTab("Interviews")} />
          <SidebarItem icon={<Video />} label="Coaching" active={activeTab === "Coaching"} onClick={() => setActiveTab("Coaching")} />
          <SidebarItem icon={<BarChart3 />} label="Analytics" active={activeTab === "Analytics"} onClick={() => setActiveTab("Analytics")} />
          <SidebarItem icon={<Building2 />} label="Company Profile" active={activeTab === "Company Profile"} onClick={() => setActiveTab("Company Profile")} />
          <SidebarItem icon={<Users />} label="Team" active={activeTab === "Team"} onClick={() => setActiveTab("Team")} />
          <SidebarItem icon={<Settings />} label="Settings" active={activeTab === "Settings"} onClick={() => setActiveTab("Settings")} />
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-4 relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 blur-2xl rounded-full" />
            <p className="font-semibold text-white mb-2 leading-tight">Great talent builds<br/>great companies.</p>
            <p className="text-[11px] text-muted-foreground">We're here to help you hire, grow and lead.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search candidates, jobs, skills..." className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-12 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground">⌘K</span>
            </div>
          </div>
          <div className="flex items-center gap-6 ml-4">
            <div className="flex items-center gap-4 text-muted-foreground">
              <button className="relative hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-[#0d1117] text-[8px] flex items-center justify-center text-white font-bold">3</span>
              </button>
              <button className="hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-white/5 cursor-pointer group" onClick={() => { signOut(); navigate("/employer/landing"); }}>
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {companyName.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{companyName}</p>
                <p className="text-[11px] text-primary">{isJobPoster ? "Job Poster" : "Employer"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto">
            
            {/* Left Column (Primary) */}
            <div className="flex-1 space-y-8 min-w-0">
              
              {/* Welcome Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                <div>
                  <p className="text-muted-foreground text-lg mb-1">Welcome back,</p>
                  <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{companyName}<span className="text-primary">.</span></h1>
                  <p className="text-muted-foreground mt-2">Here's what's happening with your hiring today.</p>
                </div>
                <div className="hidden sm:flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-xl p-4 pr-6 max-w-sm">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Expert CV revamp & career coaching</h3>
                    <p className="text-[11px] text-muted-foreground mt-1">In partnership with Ace-IT to help you attract and develop top talent.</p>
                    <a href="#" className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-1 hover:underline">Learn more <ChevronRight className="w-3 h-3" /></a>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {["Dashboard", "Analytics"].includes(activeTab) && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <MetricCard icon={<Briefcase />} label="Active Jobs" value={jobs.length.toString()} trend="+20% vs last month" chartColor="text-primary" />
                  <MetricCard icon={<Users />} label="Total Applicants" value="248" trend="+18% vs last month" chartColor="text-orange-500" />
                  <MetricCard icon={<Activity />} label="Shortlisted" value="36" trend="+12% vs last month" chartColor="text-yellow-500" />
                  <MetricCard icon={<Calendar />} label="Interviews This Week" value="8" trend="+14% vs last month" chartColor="text-blue-500" />
                  <MetricCard icon={<Users />} label="Hired This Month" value="5" trend="+25% vs last month" chartColor="text-success" />
                </div>
              )}

              {/* Hiring Pipeline Kanban */}
              {["Dashboard", "Candidates"].includes(activeTab) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Candidates</h2>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-white/10 bg-[#0d1117] hover:bg-white/5 text-white">View all</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <KanbanColumn title="Applied" count="82" active={false}>
                    <CandidateCard name="Maria Johnson" role="UI/UX Designer" time="Applied 1d ago" initial="M" />
                    <CandidateCard name="David Smith" role="Frontend Developer" time="Applied 2d ago" initial="D" />
                    <CandidateCard name="Priya Patel" role="Product Manager" time="Applied 2d ago" initial="P" />
                    <div className="text-center mt-2"><span className="text-xs text-muted-foreground">+ 79 more</span></div>
                  </KanbanColumn>
                  <KanbanColumn title="Reviewing" count="67" active={true}>
                    <CandidateCard name="James Lee" role="Backend Developer" time="Applied 3d ago" initial="J" />
                    <CandidateCard name="Fatima Khan" role="Marketing Specialist" time="Applied 3d ago" initial="F" />
                    <CandidateCard name="Alex Brown" role="DevOps Engineer" time="Applied 4d ago" initial="A" />
                    <div className="text-center mt-2"><span className="text-xs text-muted-foreground">+ 64 more</span></div>
                  </KanbanColumn>
                  <KanbanColumn title="Shortlisted" count="36" active={false}>
                    <CandidateCard name="Daniel Williams" role="Full Stack Developer" time="Shortlisted 1d ago" initial="D" />
                    <CandidateCard name="Sophie Moore" role="Product Manager" time="Shortlisted 2d ago" initial="S" />
                    <CandidateCard name="Ethan Davis" role="UI/UX Designer" time="Shortlisted 2d ago" initial="E" />
                    <div className="text-center mt-2"><span className="text-xs text-muted-foreground">+ 33 more</span></div>
                  </KanbanColumn>
                  <KanbanColumn title="Interview" count="15" active={false}>
                    <CandidateCard name="Olivia Wilson" role="Data Analyst" time="Interviewing" initial="O" />
                    <CandidateCard name="Liam Taylor" role="QA Engineer" time="Interviewing" initial="L" />
                    <CandidateCard name="Ava Martinez" role="HR Specialist" time="Interviewing" initial="A" />
                    <div className="text-center mt-2"><span className="text-xs text-muted-foreground">+ 12 more</span></div>
                  </KanbanColumn>
                  <KanbanColumn title="Hired" count="5" active={false}>
                    <CandidateCard name="Noah Anderson" role="Frontend Developer" time="Hired" initial="N" />
                    <CandidateCard name="Mia Thomas" role="Product Designer" time="Hired" initial="M" />
                    <div className="text-center mt-2"><span className="text-xs text-muted-foreground">+ 3 more</span></div>
                  </KanbanColumn>
                </div>
              </div>
              )}

              {/* Head Hunt View */}
              {activeTab === "Head Hunt" && !isJobPoster && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Head Hunt</h2>
                    <div className="flex gap-2">
                      <select className="h-8 text-xs bg-[#0d1117] border border-white/10 rounded-md px-2 text-white outline-none">
                        <option>Filter Experience</option>
                        <option>0-2 years</option>
                        <option>3-5 years</option>
                        <option>5+ years</option>
                      </select>
                      <select className="h-8 text-xs bg-[#0d1117] border border-white/10 rounded-md px-2 text-white outline-none">
                        <option>Filter Qualification</option>
                        <option>Bachelor's</option>
                        <option>Master's</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {candidates.length === 0 ? (
                      <div className="col-span-2 p-8 text-center bg-[#0d1117] border border-white/5 rounded-2xl text-muted-foreground">
                        No active candidates found.
                      </div>
                    ) : candidates.map(c => {
                      // Format name to "John D."
                      const parts = (c.full_name || "Unknown Candidate").split(" ");
                      const firstName = parts[0];
                      const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : "";
                      const displayName = `${firstName} ${lastInitial}`;

                      return (
                        <div key={c.id} className="bg-[#0d1117] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base font-bold text-white">{displayName}</h3>
                              <p className="text-xs text-primary font-medium">{c.current_job_title || "Professional"}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-muted-foreground font-medium">
                              {c.years_experience ? `${c.years_experience} yrs exp` : "Exp not set"}
                            </div>
                          </div>
                          
                          <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
                            {c.career_summary || "No career summary provided."}
                          </p>

                          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{c.highest_education || "Qualification not set"}</span>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="h-7 text-[11px] border-white/10 bg-transparent hover:bg-white/5" onClick={() => toast.success("Candidate highlighted")}>Highlight</Button>
                              <Button size="sm" className="h-7 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => toast.success("CV Requested from candidate")}>Request CV</Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Active Jobs List */}
              {["Dashboard", "Jobs"].includes(activeTab) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Active Jobs</h2>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-white/10 bg-[#0d1117] hover:bg-white/5 text-white">View all jobs</Button>
                </div>
                <div className="space-y-3">
                  {jobs.length === 0 ? (
                     <div className="p-8 text-center bg-[#0d1117] border border-white/5 rounded-2xl text-muted-foreground">
                        No jobs posted yet.
                     </div>
                  ) : jobs.slice(0, 3).map((j) => (
                    <div key={j.id} className="bg-[#0d1117] border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{j.title}</p>
                          <p className="text-xs text-primary">{j.industry || "General"}</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-around text-sm text-muted-foreground">
                        <p>{Math.floor(Math.random() * 50) + 10} Applicants</p>
                        <p>{Math.floor(Math.random() * 10) + 1} Shortlisted</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-md">Open</span>
                        <button className="text-muted-foreground hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
              
              {/* Placeholders for other tabs */}
              {["Interviews", "Coaching", "Company Profile", "Team", "Settings"].includes(activeTab) && (
                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-12 text-center shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    {activeTab === "Interviews" ? <Calendar className="w-8 h-8 text-primary" /> : 
                     activeTab === "Coaching" ? <Video className="w-8 h-8 text-primary" /> : 
                     activeTab === "Company Profile" ? <Building2 className="w-8 h-8 text-primary" /> : 
                     activeTab === "Team" ? <Users className="w-8 h-8 text-primary" /> : 
                     <Settings className="w-8 h-8 text-primary" />}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">{activeTab}</h2>
                  <p className="text-muted-foreground max-w-md">This module is currently under construction. Check back soon for updates to your {activeTab.toLowerCase()}.</p>
                </div>
              )}

            </div>

            {/* Right Column (Secondary) */}
            <div className="w-full xl:w-[340px] space-y-6 shrink-0">
              
              {/* Recent Activity */}
              <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                  <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
                </div>
                <div className="space-y-5">
                  <ActivityItem icon={<Briefcase />} title="New application for UI/UX Designer" subtitle="Maria Johnson applied" time="10m ago" />
                  <ActivityItem icon={<Calendar />} title="Interview scheduled" subtitle="James Lee — Backend Developer" time="1h ago" />
                  <ActivityItem icon={<FileText />} title="Candidate shortlisted" subtitle="Daniel Williams" time="2h ago" />
                  <ActivityItem icon={<Briefcase />} title="New job published" subtitle="Product Designer" time="4h ago" />
                  <ActivityItem icon={<Users />} title="New team member added" subtitle="Sarah Wilson joined your team" time="5h ago" />
                </div>
              </div>

              {/* Coaching & Development Banner */}
              <div className="bg-gradient-to-br from-[#0d1117] to-primary/5 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-base font-semibold text-white mb-2">Coaching & Development</h3>
                  <p className="text-sm text-muted-foreground mb-4">Help your team grow with expert-led sessions and career coaching.</p>
                  <Button className="bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/20 h-9 text-xs">Explore Coaching</Button>
                </div>
                <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                   {/* Decorative icon to simulate illustration */}
                   <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                </div>
              </div>

              {/* Post a New Job CTA */}
              <div className="bg-gradient-to-br from-[#0d1117] to-orange-500/10 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-orange-500/30 transition-colors cursor-pointer" onClick={() => navigate("/employer/post-job")}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                    <Briefcase className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-orange-500 transition-colors">Post a New Job</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Reach the right talent faster.</p>
                  </div>
                </div>
                <div className="w-full bg-orange-500 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-between px-4 group-hover:bg-orange-600 transition-colors">
                  <span>Create Job Posting</span>
                  <Plus className="w-4 h-4" />
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const MetricCard = ({ icon, label, value, trend, chartColor }: { icon: React.ReactNode, label: string, value: string, trend: string, chartColor: string }) => (
  <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-4 shadow-xl">
    <div className="flex justify-between items-start mb-3">
      <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${chartColor}`}>
        {icon}
      </div>
      {/* Mock sparkline */}
      <svg width="40" height="20" viewBox="0 0 40 20" className={`stroke-current ${chartColor}`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="0,15 10,10 20,18 30,5 40,8" />
      </svg>
    </div>
    <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
    <h3 className="text-2xl font-bold text-white leading-none mb-2">{value}</h3>
    <p className="text-[10px] text-primary flex items-center gap-1 font-medium">
      <Activity className="w-3 h-3" /> {trend}
    </p>
  </div>
);

const KanbanColumn = ({ title, count, active, children }: { title: string, count: string, active: boolean, children: React.ReactNode }) => (
  <div className={`bg-[#0d1117] rounded-xl border p-3 flex flex-col ${active ? 'border-primary/30 shadow-[0_0_15px_rgba(100,130,93,0.1)]' : 'border-white/5'}`}>
    <div className="flex items-center justify-between mb-4 px-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-primary text-white' : 'bg-white/10 text-muted-foreground'}`}>{count}</span>
    </div>
    <div className="space-y-2 flex-1">
      {children}
    </div>
  </div>
);

const CandidateCard = ({ name, role, time, initial }: { name: string, role: string, time: string, initial: string }) => (
  <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 flex gap-3 hover:bg-white/10 transition-colors cursor-pointer">
    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
      {initial}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-white truncate">{name}</p>
      <p className="text-[10px] text-muted-foreground truncate">{role}</p>
      <p className="text-[9px] text-muted-foreground/70 mt-1">{time}</p>
    </div>
  </div>
);

const ActivityItem = ({ icon, title, subtitle, time }: { icon: React.ReactNode, title: string, subtitle: string, time: string }) => (
  <div className="flex gap-3 items-start">
    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
      {icon}
    </div>
    <div>
      <p className="text-sm text-white/90 font-medium leading-snug">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
    <div className="ml-auto text-[10px] text-muted-foreground/70">
      {time}
    </div>
  </div>
);

export default EmployerDashboard;
