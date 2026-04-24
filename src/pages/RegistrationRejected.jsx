// FILE: src/pages/RegistrationRejected.jsx
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiXCircle, FiLogOut, FiRefreshCw } from "react-icons/fi";

export default function RegistrationRejected() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get("reason") || "";
  const userName = localStorage.getItem("userName") || "User";

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-main)]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-[var(--brand-red)] animate-pulse-soft" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-[var(--brand-purple)] animate-pulse-soft" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-lg">
        <div className="glass-panel p-8 md:p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "var(--brand-red)", opacity: 0.1, border: "2px solid var(--brand-red)" }}>
              <FiXCircle className="text-4xl text-[var(--brand-red)]" />
            </div>
            {/* Overlay the real icon since the one above is low opacity */}
            <div className="absolute w-24 h-24 flex items-center justify-center">
              <FiXCircle className="text-4xl text-[var(--brand-red)]" />
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/images/logo/Asset3.png" alt="Logo" className="w-10 h-10" />
            <span className="text-xl font-black tracking-tighter text-[var(--text-main)] uppercase">
              CURE<span className="text-[var(--brand-green)]">VIRTUAL</span>
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-red)] to-[var(--brand-purple)] tracking-tighter mb-4 uppercase">
            Application Review
          </h1>
          <p className="text-[var(--text-soft)] text-sm leading-relaxed mb-8">
            Hello <strong className="text-[var(--text-main)]">{userName}</strong>, after reviewing your credentials, we were unable to approve your account at this time.
          </p>

          {reason && (
            <div className="card !p-6 mb-8 text-left border-l-4 border-[var(--brand-red)] bg-[var(--brand-red)]/5">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--brand-red)] mb-2">Rejection Rationale</p>
              <p className="text-sm text-[var(--text-main)] font-bold leading-relaxed">{reason}</p>
            </div>
          )}

          <p className="text-[var(--text-muted)] text-[10px] mb-10 font-black uppercase tracking-widest leading-relaxed">
            You may update your details and re-apply for review.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => navigate("/register")}
              className="btn btn-primary !py-4 shadow-blue-500/10">
              <FiRefreshCw /> Re-apply
            </button>
            <button onClick={handleLogout}
              className="btn btn-glass !py-4 border-red-500/20 text-red-400 hover:bg-red-500/10">
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
