export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  match: number;
  skills: string[];
  description: string;
  email?: string;
  industry: string;
  salary?: string;
};

export const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Digital Marketing Specialist",
    company: "Letshego Holdings",
    location: "Gaborone, Botswana",
    type: "Full-time",
    match: 85,
    skills: ["Marketing", "SEO", "Content Strategy"],
    description: "Lead digital campaigns across SADC markets. Own paid social, SEO and content for our consumer finance brand.",
    email: "careers@letshego.com",
    industry: "Finance",
    salary: "BWP 18,000 – 25,000",
  },
  {
    id: "2",
    title: "Product Designer",
    company: "FNB Botswana",
    location: "Gaborone, Botswana",
    type: "Full-time",
    match: 80,
    skills: ["UI/UX", "Figma", "Prototyping"],
    description: "Design mobile banking experiences used by 200k+ Batswana. Work directly with engineering and product.",
    email: "talent@fnbbotswana.co.bw",
    industry: "Finance",
    salary: "BWP 22,000 – 30,000",
  },
  {
    id: "3",
    title: "Sales Executive",
    company: "Mascom Wireless",
    location: "Francistown, Botswana",
    type: "Full-time",
    match: 78,
    skills: ["Sales", "B2B", "Negotiation"],
    description: "Grow enterprise accounts in northern Botswana. Quota-driven role with strong commission structure.",
    email: "hr@mascom.bw",
    industry: "Telecom",
    salary: "BWP 12,000 + comm.",
  },
  {
    id: "4",
    title: "Data Analyst",
    company: "Ministry of Health",
    location: "Gaborone, Botswana",
    type: "Contract",
    match: 74,
    skills: ["SQL", "Python", "Tableau"],
    description: "Support national health surveillance reporting. Public sector role on a 12-month renewable contract.",
    email: "recruitment@moh.gov.bw",
    industry: "Government",
    salary: "BWP 16,000",
  },
  {
    id: "5",
    title: "HR Officer",
    company: "Botswana Oil",
    location: "Gaborone, Botswana",
    type: "Full-time",
    match: 70,
    skills: ["Recruitment", "Employee Relations", "Payroll"],
    description: "Generalist HR role supporting 120 staff across head office and depots.",
    email: "careers@botswanaoil.co.bw",
    industry: "Energy",
    salary: "BWP 15,000 – 19,000",
  },
  {
    id: "6",
    title: "Mining Engineer",
    company: "Debswana",
    location: "Jwaneng, Botswana",
    type: "Full-time",
    match: 68,
    skills: ["Mine Planning", "Safety", "AutoCAD"],
    description: "Open-pit mine planning at the world's richest diamond mine. Roster-based with on-site accommodation.",
    email: "recruitment@debswana.bw",
    industry: "Mining",
    salary: "BWP 35,000+",
  },
  {
    id: "7",
    title: "Junior Software Developer",
    company: "Stanbic Bank",
    location: "Gaborone, Botswana",
    type: "Full-time",
    match: 82,
    skills: ["JavaScript", "React", "Node.js"],
    description: "Build internal tools for our digital banking team. Ideal for graduates with 1-2 years experience.",
    email: "graduates@stanbic.com",
    industry: "Finance",
    salary: "BWP 14,000 – 18,000",
  },
  {
    id: "8",
    title: "Logistics Coordinator",
    company: "Choppies Distribution",
    location: "Lobatse, Botswana",
    type: "Full-time",
    match: 65,
    skills: ["Supply Chain", "Excel", "Fleet Mgmt"],
    description: "Coordinate fleet movements across 80 stores nationwide.",
    email: "hr@choppies.co.bw",
    industry: "Retail",
    salary: "BWP 11,000",
  },
];
