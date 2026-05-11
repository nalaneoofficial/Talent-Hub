import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TabLayout } from "@/components/TabLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Outlet } from "react-router-dom";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Welcome from "./screens/Welcome";
import Auth from "./screens/Auth";
import ProfileSetup from "./screens/ProfileSetup";
import UploadCV from "./screens/UploadCV";
import Processing from "./screens/Processing";
import CVScore from "./screens/CVScore";
import CVDocuments from "./screens/CVDocuments";
import CVRevamp from "./screens/CVRevamp";
import Swipe from "./screens/Swipe";
import Matches from "./screens/Matches";
import Applications from "./screens/Applications";
import Profile from "./screens/Profile";
import Review from "./screens/Review";
import AdminJobs from "./screens/AdminJobs";
import Notifications from "./screens/Notifications";
import AllJobs from "./screens/AllJobs";
import Settings from "./screens/Settings";
import Privacy from "./screens/Privacy";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminNotificationsBroadcast from "./admin/AdminNotificationsBroadcast";
import AdminFeatureFlags from "./admin/AdminFeatureFlags";
import AdminRevampQueue from "./admin/AdminRevampQueue";
import PartnerDashboard from "./screens/PartnerDashboard";
import QuickJobs from "./screens/QuickJobs";
import QuickJobNew from "./screens/QuickJobNew";
import AdminQuickJobs from "./admin/AdminQuickJobs";
import Subscribe from "./screens/Subscribe";
import EmployerDashboard from "./screens/EmployerDashboard";
import EmployerLanding from "./pages/EmployerLanding";
import PartnerLanding from "./pages/PartnerLanding";
import InterviewPrep from "./screens/InterviewPrep";
import DeliveredDocs from "./screens/DeliveredDocs";
import EmployerPostJob from "./screens/EmployerPostJob";
import UploadDocuments from "./screens/UploadDocuments";
import AdminLateDeliveries from "./admin/AdminLateDeliveries";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              {/* Full-width admin web app — no PhoneFrame */}
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="notifications" element={<AdminNotificationsBroadcast />} />
                <Route path="revamp" element={<AdminRevampQueue />} />
                <Route path="flags" element={<AdminFeatureFlags />} />
                <Route path="quick-jobs" element={<AdminQuickJobs />} />
                <Route path="late-deliveries" element={<AdminLateDeliveries />} />
              </Route>

              {/* Shared partner console */}
              <Route path="/partner">
                <Route index element={<PartnerDashboard />} />
                <Route path="landing" element={<PartnerLanding />} />
              </Route>

              {/* Employer portal */}
              <Route path="/employer">
                <Route index element={<EmployerDashboard />} />
                <Route path="landing" element={<EmployerLanding />} />
                <Route path="post-job" element={<EmployerPostJob />} />
              </Route>

              {/* B2B Auth (Full screen, no PhoneFrame) */}
              <Route path="/b2b-auth" element={<Auth />} />

              {/* Mobile candidate app - Wrapped in PhoneFrame */}
              <Route element={<PhoneFrame><Outlet /></PhoneFrame>}>
                <Route path="/" element={<Index />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
                <Route path="/upload-cv" element={<ProtectedRoute><UploadCV /></ProtectedRoute>} />
                <Route path="/processing" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
                <Route path="/cv-score" element={<ProtectedRoute><CVScore /></ProtectedRoute>} />
                <Route path="/cv-documents" element={<ProtectedRoute><CVDocuments /></ProtectedRoute>} />
                <Route path="/cv-revamp" element={<ProtectedRoute><CVRevamp /></ProtectedRoute>} />
                <Route path="/interview-prep" element={<ProtectedRoute><InterviewPrep /></ProtectedRoute>} />
                <Route path="/delivered-services" element={<ProtectedRoute><DeliveredDocs /></ProtectedRoute>} />
                <Route path="/review/:id" element={<ProtectedRoute><Review /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/subscribe" element={<Subscribe />} />
                <Route path="/quick-jobs/new" element={<ProtectedRoute><QuickJobNew /></ProtectedRoute>} />
                <Route path="/upload-documents" element={<ProtectedRoute><UploadDocuments /></ProtectedRoute>} />
                
                <Route element={<ProtectedRoute><TabLayout /></ProtectedRoute>}>
                  <Route path="/swipe" element={<Swipe />} />
                  <Route path="/all-jobs" element={<AllJobs />} />
                  <Route path="/quick-jobs" element={<QuickJobs />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Catch-all for mobile app routes */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
