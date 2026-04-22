import React from "react";
import { Link } from "react-router-dom";

export default function PremiumTopAppBar({ userName, userAvatar, role }) {
  return (
    <header className="fixed top-0 w-full z-50 glass-panel h-16 flex justify-between items-center px-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 decoration-none">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-primary tracking-tighter font-headline leading-none">CureVirtual</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{role || "Verified Provider"}</span>
              <span className="material-symbols-outlined text-[12px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-all relative">
          <span className="material-symbols-outlined text-outline">notifications</span>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface font-headline">{userName || "Guest"}</p>
            <p className="text-[10px] text-outline font-medium uppercase tracking-wider">{role || "Member"}</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/10 shadow-sm">
            <img 
              src={userAvatar || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=100"} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
