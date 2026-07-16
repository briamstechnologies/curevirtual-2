// FILE: src/pages/patient/PatientDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    totalPrescriptions: 0,
    totalConsultations: 0,
    totalDoctors: 0,
  });

  const patientId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`/patient/stats`, { params: { patientId } });
        const data = res?.data?.data ?? res?.data ?? null;
        if (data) setStats(data);
      } catch (err) {
        console.error("Error fetching patient stats:", err);
      }
    };
    if (patientId) fetchStats();
  }, [patientId]);

  return (
    <DashboardLayout role="PATIENT">
      <div className="space-y-12">
        {/* Hero Section */}
        <section>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tighter">
              Welcome back, {userName.split(" ")[0]}
            </h1>
            {stats.referenceId && (
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full w-fit">
                <span className="material-symbols-outlined text-sm">badge</span>
                <span className="font-bold text-sm tracking-wider">{stats.referenceId}</span>
              </div>
            )}
            <p className="text-on-surface-variant text-lg font-medium opacity-80 mt-2">
              Your sanctuary is ready. Here's your health overview for today.
            </p>
          </div>
        </section>

        {/* Daily Statistics - Horizontal Scroll */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Daily Statistics</h2>
            <button className="text-secondary font-bold text-sm hover:underline">View History</button>
          </div>
          
          <div className="flex overflow-x-auto gap-6 no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <StatsCard 
              icon="calendar_today" 
              value={stats.totalAppointments} 
              label="Visits" 
              sub="Scheduled Visits" 
              color="primary"
            />
            <StatsCard 
              icon="prescriptions" 
              value={stats.totalPrescriptions} 
              label="Scripts" 
              sub="Active Prescriptions" 
              color="secondary"
            />
            <StatsCard 
              icon="videocam" 
              value={stats.totalConsultations} 
              label="Calls" 
              sub="Video Sessions" 
              color="tertiary"
            />
            <StatsCard 
              icon="group" 
              value={stats.totalDoctors} 
              label="Team" 
              sub="Active Doctors" 
              color="primary"
            />
          </div>
        </section>

        {/* Content Split: Consultations & Quick Actions */}
        <div className="grid lg:grid-cols-12 gap-10">
          {/* Main Column: Consultations */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Upcoming Consultations</h2>
              <button 
                onClick={() => navigate("/patient/my-appointments")}
                className="text-secondary font-bold text-sm hover:underline"
              >
                Schedule New
              </button>
            </div>
            
            <div className="space-y-4">
              <ConsultationItem 
                name="Dr. Sarah Jenkins" 
                specialty="General Check-up" 
                type="Virtual Call" 
                time="10:30 AM" 
                status="In 15 Mins"
                avatar="https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=150"
                isPrimary
              />
              <ConsultationItem 
                name="Dr. Marcus Thornton" 
                specialty="Lab Results Review" 
                type="Audio Call" 
                time="01:45 PM" 
                status="Today"
                avatar="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150"
              />
            </div>
          </div>

          {/* Side Column: Quick Actions & Promo */}
          <div className="lg:col-span-4 space-y-8">
            <div className="card-premium h-full flex flex-col justify-between bg-gradient-to-br from-[var(--brand-blue)] via-[var(--brand-purple)] to-[var(--brand-blue)] bg-[length:200%_200%] animate-gradient text-white border-none shadow-2xl shadow-blue-500/20">
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline text-2xl font-bold">Ready to start?</h3>
                  <p className="text-white/80 font-medium text-sm px-4 leading-relaxed">Connect with your health specialist instantly via our secure lobby.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate("/patient/video-consultation")}
                className="w-full bg-white text-primary font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform mt-8"
              >
                Join Waiting Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatsCard({ icon, value, label, sub, color }) {
  const colorMap = {
    primary: "bg-[var(--brand-blue)]/10 text-[var(--brand-blue)]",
    secondary: "bg-[var(--brand-green)]/10 text-[var(--brand-green)]",
    tertiary: "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]",
    error: "bg-red-500/10 text-red-500"
  };

  return (
    <div className="flex-shrink-0 w-48 card-premium flex flex-col justify-between shadow-black/5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${colorMap[color]}`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-4xl font-extrabold text-on-surface leading-none">{value}</span>
          <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-on-surface-variant text-[10px] mt-4 font-bold opacity-60 uppercase tracking-widest leading-none">{sub}</span>
      </div>
    </div>
  );
}

function ConsultationItem({ name, specialty, type, time, status, avatar, isPrimary }) {
  return (
    <div className="group relative flex items-center p-5 rounded-[28px] bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(0,108,10,0.04)] border border-transparent hover:border-primary/10">
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-high mr-5 shadow-sm">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-grow">
        <h3 className="font-bold text-on-surface text-lg leading-none mb-1">{name}</h3>
        <p className="text-on-surface-variant text-sm font-medium opacity-70">{specialty} • {type}</p>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className={`font-bold font-headline text-lg leading-none ${isPrimary ? "text-primary" : "text-on-surface"}`}>{time}</span>
        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">{status}</span>
      </div>
    </div>
  );
}

