// FILE: src/pages/PendingApproval.jsx
// Shown to DOCTOR/PHARMACY users after OTP verification while awaiting admin review
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiLogOut, FiCheckCircle, FiMail } from "react-icons/fi";
import { useSocket } from "../context/useSocket";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";
  const role = localStorage.getItem("role") || "DOCTOR";
  const email = localStorage.getItem("email") || "";

  // Listen for real-time approval status changes
  useEffect(() => {
    if (!socket) return;
    const handler = ({ status, rejectionReason }) => {
      if (status === "APPROVED") {
        navigate("/login?approved=1");
      } else if (status === "REJECTED") {
        navigate(`/registration-rejected?reason=${encodeURIComponent(rejectionReason || "")}`);
      }
    };
    socket.on("approval_status_changed", handler);
    return () => socket.off("approval_status_changed", handler);
  }, [socket, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const roleLabel = role === "DOCTOR" ? "Doctor" : "Pharmacy";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-main)]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-[var(--brand-blue)]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-[var(--brand-green)]" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-10 bg-[var(--brand-purple)]" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Glassmorphic Card */}
        <div className="glass-panel p-8 md:p-12 text-center animate-in fade-in zoom-in duration-1000">
          
          {/* Animated Status Icon */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse-soft"
                style={{ 
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(139, 92, 246, 0.15))", 
                  border: "2px solid var(--brand-blue)",
                  boxShadow: "0 0 40px rgba(14, 165, 233, 0.2)"
                }}>
                <FiClock className="text-4xl text-[var(--brand-blue)]" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20 border-4 border-[var(--bg-card)]">
                <span className="text-[10px] font-black text-black">!</span>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/images/logo/Asset3.png" alt="Logo" className="w-10 h-10" onError={(e) => { e.target.style.display = "none"; }} />
            <span className="text-xl font-black tracking-tighter text-[var(--text-main)] uppercase">
              CURE<span className="text-[var(--brand-green)]">VIRTUAL</span>
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] tracking-tighter mb-4 uppercase">
            Account Under Review
          </h1>
          <p className="text-[var(--text-soft)] text-sm leading-relaxed mb-10">
            Our admin team is reviewing your credentials. You will receive an email once approved.
            This usually takes <strong className="text-[var(--text-main)]">24–48 hours</strong>.
          </p>

          {/* Submitted Info Summary */}
          <div className="grid grid-cols-1 gap-3 mb-10">
            <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all group text-left">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/20 transition-all duration-300 group-hover:scale-110 shadow-inner">
                <FiCheckCircle className="text-[var(--brand-green)] text-xl" />
              </div>
              <div>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.3em] font-black mb-0.5">Full Name</p>
                <p className="text-sm font-black text-[var(--text-main)] truncate max-w-[200px]">{userName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all group text-left">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--brand-purple)]/10 border border-[var(--brand-purple)]/20 transition-all duration-300 group-hover:scale-110 shadow-inner">
                <FiCheckCircle className="text-[var(--brand-purple)] text-xl" />
              </div>
              <div>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.3em] font-black mb-0.5">Assigned Role</p>
                <p className="text-sm font-black text-[var(--text-main)]">{roleLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all group text-left">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/20 transition-all duration-300 group-hover:scale-110 shadow-inner">
                <FiShield className="text-[var(--brand-blue)] text-xl" />
              </div>
              <div>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.3em] font-black mb-0.5">Credential Status</p>
                <p className="text-sm font-black text-[var(--brand-green)] uppercase tracking-tighter">Verified & Secured</p>
              </div>
            </div>

            {email && (
              <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all group text-left">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-400/10 border border-amber-400/20 transition-all duration-300 group-hover:scale-110 shadow-inner">
                  <FiMail className="text-amber-400 text-xl" />
                </div>
                <div>
                  <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.3em] font-black mb-0.5">Contact Method</p>
                  <p className="text-sm font-black text-[var(--text-main)] truncate max-w-[200px]">{email}</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-[var(--text-muted)] text-[10px] mb-10 leading-relaxed font-black uppercase tracking-[0.3em] opacity-60">
            Awaiting final verification by <span className="text-[var(--brand-blue)]">CureVirtual Admin</span>
          </p>

          <button onClick={handleLogout}
            className="btn btn-glass w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40">
            <FiLogOut /> Logout Securely
          </button>
        </div>
      </div>
    </div>

  );
}
