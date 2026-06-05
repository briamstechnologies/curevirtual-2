import { useState } from "react";
import Sidebar from "../components/Sidebar";
import PremiumTopAppBar from "../components/PremiumTopAppBar";
import PremiumBottomNavBar from "../components/PremiumBottomNavBar";
import { useTheme } from "../context/ThemeContext";
import Chatbot from "../components/Chatbot";

export default function DashboardLayout({ children, role, user }) {
  const { theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userName = user?.name || localStorage.getItem("userName") || "User";
  const userAvatar = user?.avatar_url || localStorage.getItem("userAvatar");

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
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pt-20 pb-24 md:pb-8 px-4 md:px-8 relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {children}
          </div>
        </main>

        {/* Mobile Navigation for Patients */}
        {role === "PATIENT" && <PremiumBottomNavBar />}

        {/* AI Medical Chatbot (Only for Patients) */}
        {role === "PATIENT" && <Chatbot />}
      </div>
    </div>
  );
}

