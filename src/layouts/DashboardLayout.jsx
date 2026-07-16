import IncomingCallModal from "../components/IncomingCallModal";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import PremiumTopAppBar from "../components/PremiumTopAppBar";
import PremiumBottomNavBar from "../components/PremiumBottomNavBar";
import { useTheme } from "../context/ThemeContext";
import Chatbot from "../components/Chatbot";
import api from "../Lib/api";

export default function DashboardLayout({ children, role: propRole, user }) {
  const { theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userName = user?.name || localStorage.getItem("userName") || "User";
  const userAvatar = user?.avatar_url || localStorage.getItem("userAvatar");

  // Force checking actual role instead of relying solely on propRole which might be hardcoded
  const actualRole = localStorage.getItem("role") || propRole;
  const role = actualRole === "PHYSICIAN_ASSISTANT" ? "PHYSICIAN_ASSISTANT" : propRole;

  const [paBlocked, setPaBlocked] = useState(false);
  const [checkingPa, setCheckingPa] = useState(role === "PHYSICIAN_ASSISTANT");

  useEffect(() => {
    if (role === "PHYSICIAN_ASSISTANT") {
      const checkStatus = () => {
        api.get("/doctor/pa-status")
           .then(res => {
              if (res.data) {
                  setPaBlocked(res.data.doctorOnline);
              }
           })
           .catch(err => console.error("PA status check error", err))
           .finally(() => setCheckingPa(false));
      };

      checkStatus(); // Initial check
      const interval = setInterval(checkStatus, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [role]);

  return (
    <div className={`flex min-h-screen bg-transparent transition-colors duration-500 ${theme}`}>
      {/* Sidebar - Hidden on mobile for Patients but potentially visible for others */}
      <Sidebar
        role={role}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full relative">
        {/* New Premium TopBar */}
        <PremiumTopAppBar 
          userName={userName} 
          userAvatar={userAvatar} 
          role={role === "PHARMACY" ? "Licensed Pharmacist" : role === "PHYSICIAN_ASSISTANT" ? "Physician Assistant" : role === "DOCTOR" ? "Verified Provider" : "Premium Member"}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pt-20 pb-24 md:pb-8 px-4 md:px-8 relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {role === "PHYSICIAN_ASSISTANT" && checkingPa ? (
               <div className="flex justify-center items-center min-h-[60vh]">
                 <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
               </div>
            ) : role === "PHYSICIAN_ASSISTANT" && paBlocked ? (
               <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                  <span className="material-symbols-outlined text-7xl text-error mb-4">block</span>
                  <h1 className="text-3xl font-bold text-on-surface mb-2">Access Temporarily Disabled</h1>
                  <p className="text-on-surface-variant max-w-md">Your supervising doctor is currently online. Physician Assistant access to the portal is disabled while the doctor is actively managing patients.</p>
               </div>
            ) : (
               children
            )}
          </div>
        </main>

        {/* Mobile Navigation for Patients */}
        {role === "PATIENT" && <PremiumBottomNavBar />}

        {/* AI Medical Chatbot (Only for Patients) */}
        {role === "PATIENT" && <Chatbot />}
      </div>
      
      {/* Global Incoming Call Popup */}
      <IncomingCallModal />
    </div>
  );
}

