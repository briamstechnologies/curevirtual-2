import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { toast } from "react-toastify";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    totalPrescriptions: 0,
    totalMessages: 0,
    activePatients: 0,
    urgentFlags: {
      urgentLabs: 0,
      unsignedNotes: 0,
      lateAppointments: 0,
    },
  });

  const [waitingPatients, setWaitingPatients] = useState([]);
  const [pendingConsultations, setPendingConsultations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [myPAs, setMyPAs] = useState([]);

  const doctorId = localStorage.getItem("userId");
  const role = localStorage.getItem("role") || "DOCTOR";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const [paStatus, setPaStatus] = useState(null);
  const [loadingPA, setLoadingPA] = useState(role === "PHYSICIAN_ASSISTANT");

  const fetchPendingConsultations = async () => {
    if (role === "PHYSICIAN_ASSISTANT") return;
    try {
      const res = await api.get("/doctor/consultations/pending");
      setPendingConsultations(res.data || []);
    } catch (err) {
      console.error("Error fetching pending consultations:", err);
    }
  };

  useEffect(() => {
    const checkPAStatus = async () => {
      if (role !== "PHYSICIAN_ASSISTANT") return;
      try {
        const res = await api.get("/doctor/pa-status", { params: { userId: doctorId } });
        setPaStatus(res.data);
        setLoadingPA(false);
      } catch (err) {
        console.error("Error checking PA status:", err);
        setLoadingPA(false);
      }
    };
    checkPAStatus();
  }, [role, doctorId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          api.get(`/doctor/stats`, { params: { doctorId } }),
          api.get(`/doctor/waiting-patients`, { params: { doctorId } }),
          api.get(`/doctor/profile`, { params: { userId: doctorId } }).catch(() => null),
        ];

        if (role !== "PHYSICIAN_ASSISTANT") {
          promises.push(api.get("/doctor/my-pas").catch(() => null));
        }

        const results = await Promise.all(promises);
        const statsRes = results[0];
        const waitingRes = results[1];
        const profileRes = results[2];
        const pasRes = results[3];

        if (statsRes?.data) setStats(statsRes.data);
        if (waitingRes?.data) setWaitingPatients(waitingRes.data);
        if (profileRes?.data?.data || profileRes?.data) {
          const p = profileRes.data.data || profileRes.data;
          setProfile(p);
          setIsOnline(p.isOnline || false);
        }
        if (pasRes?.data) {
          setMyPAs(pasRes.data);
        }
        await fetchPendingConsultations();
      } catch (err) {
        console.error("Error fetching Dashboard data:", err);
      }
    };

    if (role === "PHYSICIAN_ASSISTANT") {
      if (paStatus && paStatus.hasAssignedDoctor && !paStatus.doctorOnline) {
        fetchData();
      }
    } else {
      if (doctorId) fetchData();
    }
  }, [doctorId, role, paStatus]);

  if (loadingPA) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (role === "PHYSICIAN_ASSISTANT" && paStatus) {
    if (!paStatus.hasAssignedDoctor) {
      return (
        <DashboardLayout role={role}>
          <div className="card-premium p-12 text-center max-w-2xl mx-auto mt-20 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-warning/10 text-warning rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl">warning</span>
            </div>
            <h2 className="font-headline text-3xl font-black text-on-surface">
              No Assigned Physician
            </h2>
            <p className="text-on-surface-variant text-base max-w-md leading-relaxed opacity-80">
              Your Physician Assistant account has not been linked to a supervising doctor yet.
            </p>
            <p className="text-outline text-sm font-semibold uppercase tracking-widest">
              Please contact your Administrator
            </p>
            <button
              onClick={() => {
                setLoadingPA(true);
                api
                  .get("/doctor/pa-status", { params: { userId: doctorId } })
                  .then((res) => {
                    setPaStatus(res.data);
                    setLoadingPA(false);
                  })
                  .catch(() => setLoadingPA(false));
              }}
              className="btn-premium bg-surface-container-high px-6 py-2.5 rounded-xl text-xs hover:bg-surface-container-highest"
            >
              Retry Connection
            </button>
          </div>
        </DashboardLayout>
      );
    }

    if (paStatus.doctorOnline) {
      return (
        <DashboardLayout role={role}>
          <div className="card-premium p-12 text-center max-w-2xl mx-auto mt-20 flex flex-col items-center gap-6 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent animate-fade-in">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center relative">
              <span className="material-symbols-outlined text-6xl">account_circle</span>
              <span className="absolute -top-1 -right-1 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-success"></span>
              </span>
            </div>
            <h2 className="font-headline text-3xl font-black text-on-surface">
              Supervising Physician is Active
            </h2>
            <p className="text-on-surface-variant text-base max-w-md leading-relaxed opacity-80">
              Dr. {paStatus.doctorName} is currently online and active. The assistant portal is
              paused to prevent conflict of care.
            </p>
            <div className="flex items-center gap-3 bg-success/10 text-success font-semibold px-6 py-2.5 rounded-full text-sm">
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                fiber_manual_record
              </span>
              Dr. {paStatus.doctorName} is Online
            </div>
            <button
              onClick={() => {
                setLoadingPA(true);
                api
                  .get("/doctor/pa-status", { params: { userId: doctorId } })
                  .then((res) => {
                    setPaStatus(res.data);
                    setLoadingPA(false);
                  })
                  .catch(() => setLoadingPA(false));
              }}
              className="btn-premium bg-primary text-white px-6 py-2.5 rounded-xl text-xs hover:brightness-110"
            >
              Refresh Status
            </button>
          </div>
        </DashboardLayout>
      );
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-12">
        {/* Urgent Alerts Header */}
        <section className="bg-error-container/20 border border-error/10 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6 animate-pulse-soft">
          <div className="w-14 h-14 bg-error text-white rounded-2xl flex items-center justify-center shadow-lg shadow-error/20">
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
          <div className="flex-grow text-center md:text-left">
            <h2 className="font-headline text-xl font-extrabold text-error">
              Urgent Clinical Action Required
            </h2>
            <p className="text-on-error-container text-sm font-medium opacity-80">
              You have {stats.urgentFlags?.urgentLabs || 0} critical lab results and{" "}
              {stats.urgentFlags?.unsignedNotes || 0} unsigned clinical notes pending.
            </p>
          </div>
          <button
            onClick={() => navigate("/doctor/appointments")}
            className="btn-premium bg-error text-white px-8 py-3 rounded-2xl shadow-lg shadow-error/10 hover:brightness-110"
          >
            Review Now
          </button>
        </section>

        {/* Hero & Quick Volume Analytics */}
        <section className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tighter">
              Good morning,{" "}
              {role === "PHYSICIAN_ASSISTANT" ? userName : `Dr. ${userName.split(" ")[0]}`}
            </h1>
            <p className="text-on-surface-variant text-lg font-medium opacity-80 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              Your practice is fully synchronized.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">badge</span>
                Doctor ID: {profile?.referenceId || profile?.reference_id || `CV-DR-GH-2026-0001`}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Status: {profile?.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
              </span>
              {role !== "PHYSICIAN_ASSISTANT" && (
                <span
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-black tracking-wide flex items-center gap-1.5 transition-all ${
                    isOnline
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                      : "bg-surface-container border-outline/30 text-on-surface-variant"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-on-surface-variant/50"}`}></span>
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                Today's Volume
              </p>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-2xl font-black text-on-surface">
                  +{stats.totalAppointments}
                </span>
                <span
                  className="material-symbols-outlined text-primary text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  trending_up
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Core KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            icon="event_available"
            label="Appointments"
            value={stats.totalAppointments}
            sub={`${stats.pendingAppointments} Reminders`}
            color="primary"
          />
          <KPICard
            icon="prescriptions"
            label="Prescriptions"
            value={stats.totalPrescriptions}
            sub="Ready to sign"
            color="secondary"
          />
          <KPICard
            icon="mail"
            label="Inquiries"
            value={stats.totalMessages}
            sub="3 Urgent"
            color="tertiary"
          />
          <KPICard
            icon="group"
            label="Total Patients"
            value={stats.activePatients}
            sub="12 New this week"
            color="secondary"
          />
        </section>

        {/* Assigned PAs Section */}
        {role !== "PHYSICIAN_ASSISTANT" && myPAs.length > 0 && (
          <section className="bg-surface-container/50 border border-outline/10 rounded-[24px] p-6 mb-8 mt-8">
            <h2 className="font-headline text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">supervisor_account</span>
              My Physician Assistants
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPAs.map((pa) => (
                <div key={pa.id} className="bg-surface p-4 rounded-2xl border border-outline/10 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">{pa.firstName} {pa.lastName}</h3>
                    <p className="text-xs text-on-surface-variant opacity-80">{pa.licenseNumber}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newStatus = !pa.isAllowedByDoctor;
                      setMyPAs(myPAs.map(p => p.id === pa.id ? { ...p, isAllowedByDoctor: newStatus } : p));
                      try {
                        await api.patch(`/doctor/pa/${pa.id}/permission`, { isAllowed: newStatus });
                        toast.success(`Access ${newStatus ? 'granted' : 'revoked'} for ${pa.firstName}`);
                      } catch (e) {
                        setMyPAs(myPAs.map(p => p.id === pa.id ? { ...p, isAllowedByDoctor: !newStatus } : p));
                        toast.error("Failed to update PA permission");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      pa.isAllowedByDoctor
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface border border-outline/20 hover:border-outline/40"
                    }`}
                  >
                    {pa.isAllowedByDoctor ? "Access Allowed" : "Access Revoked"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Waiting Room & Lobby */}
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-3">
                Virtual Waiting Room
                <span className="bg-primary-container text-primary text-xs px-3 py-1 rounded-full">
                  {waitingPatients.length} Active
                </span>
              </h2>
            </div>

            <div className="space-y-4">
              {waitingPatients.length > 0 ? (
                waitingPatients.map((apt) => (
                  <PatientQueueItem
                    key={apt.id}
                    name={`${apt.patient?.user?.firstName} ${apt.patient?.user?.lastName}`}
                    reason={apt.reason || "General Consultation"}
                    time={new Date(apt.appointmentDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    waitTime="8 Mins"
                    onClick={() => navigate(`/doctor/video-consultation?appointmentId=${apt.id}`)}
                  />
                ))
              ) : (
                <div className="card-premium p-12 text-center opacity-40">
                  <span className="material-symbols-outlined text-6xl mb-4">person_search</span>
                  <p className="font-bold text-lg">No patients in lobby</p>
                </div>
              )}
            </div>

            {/* Physician Assistant Reviews */}
            {role === "DOCTOR" && (
              <div className="flex flex-col gap-6 mt-10">
                <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-3">
                  Pending Assistant Reviews
                  {pendingConsultations.length > 0 && (
                    <span className="bg-amber-500/10 text-amber-500 text-xs px-3 py-1 rounded-full border border-amber-500/30">
                      {pendingConsultations.length} Action Needed
                    </span>
                  )}
                </h2>
                <div className="space-y-4">
                  {pendingConsultations.length > 0 ? (
                    pendingConsultations.map((log) => (
                      <PendingReviewItem
                        key={log.id}
                        log={log}
                        onActionSuccess={fetchPendingConsultations}
                      />
                    ))
                  ) : (
                    <div className="card-premium p-12 text-center opacity-40">
                      <span className="material-symbols-outlined text-6xl mb-4">clinical_notes</span>
                      <p className="font-bold text-lg">No pending assistant reviews</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="card-premium flex flex-col justify-between bg-surface-container-high border-none shadow-xl">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/20">
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    videocam
                  </span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">
                    Telehealth Bridge
                  </h3>
                  <p className="text-on-surface-variant font-medium text-sm leading-relaxed mt-2">
                    Start a direct video consultation or join the multi-provider nursing lobby.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/doctor/video-consultation")}
                className="btn-premium-primary w-full py-4 rounded-2xl mt-8"
              >
                Join Lobby
              </button>
            </div>

            {/* Physician Assistants Card */}
            {role === "DOCTOR" && (
              <div className="card-premium bg-surface-container-high border-none shadow-xl p-6 space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      support_agent
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-on-surface">
                      Physician Assistants
                    </h3>
                    <p className="text-on-surface-variant text-xs opacity-75">
                      Linked clinical support staff
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {stats.assignedPAs && stats.assignedPAs.length > 0 ? (
                    stats.assignedPAs.map((pa) => (
                      <div
                        key={pa.id}
                        className="flex items-center justify-between p-3 bg-surface-container-highest rounded-2xl border border-outline/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                            {pa.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface leading-none mb-0.5">
                              {pa.name}
                            </p>
                            <p className="text-[10px] text-on-surface-variant opacity-70">
                              {pa.email}
                            </p>
                          </div>
                        </div>
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 border border-dashed border-outline/20 rounded-2xl opacity-60">
                      <span className="material-symbols-outlined text-3xl mb-1 text-outline">
                        group
                      </span>
                      <p className="text-xs font-semibold">No PAs linked to your profile</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KPICard({ icon, label, value, sub, color }) {
  const colorMap = {
    primary: "text-primary bg-primary-container/10",
    secondary: "text-secondary bg-secondary-container/10",
    tertiary: "text-tertiary bg-tertiary-fixed/30",
  };

  return (
    <div className="card-premium flex flex-col justify-between hover:scale-[1.02] cursor-pointer">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${colorMap[color]}`}
      >
        <span
          className="material-symbols-outlined text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-bold text-outline tracking-widest uppercase mb-1">{label}</p>
        <p className="text-4xl font-extrabold text-on-surface tracking-tighter">{value}</p>
        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mt-4 opacity-60">
          {sub}
        </p>
      </div>
    </div>
  );
}

function PatientQueueItem({ name, reason, waitTime, onClick }) {
  return (
    <div className="group card-premium !p-5 flex items-center justify-between hover:bg-surface-container-low transition-all border border-transparent hover:border-primary/10">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-surface-container-highest text-primary rounded-2xl flex items-center justify-center font-black text-xl">
          {name[0]}
        </div>
        <div>
          <h4 className="font-bold text-on-surface text-lg leading-none mb-1">{name}</h4>
          <p className="text-on-surface-variant text-sm font-medium opacity-70 truncate max-w-[200px]">
            {reason}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-center hidden sm:block">
          <p className="text-xs font-bold text-on-surface lowercase opacity-60 italic mb-0.5">
            Wait Time
          </p>
          <p className="font-headline font-bold text-error">{waitTime}</p>
        </div>
        <button
          onClick={onClick}
          className="btn-premium bg-primary/10 text-primary hover:bg-primary hover:text-white px-5 py-2.5 rounded-xl text-xs"
        >
          Begin
        </button>
      </div>
    </div>
  );
}

function PendingReviewItem({ log, onActionSuccess }) {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.post(`/doctor/consultations/${log.id}/approve`, { action: "APPROVE" });
      toast.success("Consultation approved successfully!");
      onActionSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to approve consultation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!correctionNotes.trim()) {
      toast.error("Please provide correction instructions.");
      return;
    }
    try {
      setActionLoading(true);
      await api.post(`/doctor/consultations/${log.id}/approve`, {
        action: "RETURN",
        correctionNotes,
      });
      toast.warning("Consultation returned for correction.");
      onActionSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to return consultation");
    } finally {
      setActionLoading(false);
    }
  };

  const isEscalated = log.status === "ESCALATED";

  return (
    <div className={`card-premium !p-5 border transition-all ${
      isEscalated ? "border-error/30 bg-error/5" : "border-outline/10"
    }`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            isEscalated ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
          }`}>
            <span className="material-symbols-outlined">
              {isEscalated ? "warning" : "support_agent"}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-on-surface text-base">
              Patient: {log.patient?.user?.firstName} {log.patient?.user?.lastName}
            </h4>
            <p className="text-xs text-on-surface-variant font-medium opacity-80">
              Assistant: PA {log.pa?.user?.firstName} {log.pa?.user?.lastName} | Type: {log.consultationType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
            isEscalated 
              ? "bg-error/10 text-error border-error/20" 
              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
          }`}>
            {log.status}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-on-surface-variant hover:text-on-surface flex items-center justify-center p-1 rounded-lg hover:bg-outline/5"
          >
            <span className="material-symbols-outlined transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 pt-4 border-t border-outline/10 space-y-4 text-xs animate-fade-in">
          <div>
            <span className="font-bold uppercase text-outline block mb-1">PA Notes Logged</span>
            <div className="bg-surface-container p-4 rounded-xl text-on-surface whitespace-pre-wrap border border-outline/5">
              {log.consultationNotes || "No notes logged yet."}
            </div>
          </div>

          {isEscalated && log.escalationReason && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-xs">
              <strong className="block mb-1">Escalation Reason:</strong>
              {log.escalationReason}
            </div>
          )}

          {!showCorrectionInput ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn-premium bg-primary text-white font-bold px-4 py-2 rounded-xl hover:brightness-110 flex items-center gap-1.5"
              >
                {actionLoading ? "Processing..." : (
                  <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Approve Notes
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCorrectionInput(true)}
                disabled={actionLoading}
                className="btn-premium bg-surface-container-highest text-on-surface font-bold px-4 py-2 rounded-xl hover:bg-outline/15 flex items-center gap-1.5 border border-outline/10"
              >
                <span className="material-symbols-outlined text-sm">edit_note</span>
                Request Correction
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-outline/5">
              <textarea
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Explain what needs to be added, corrected, or updated..."
                rows="3"
                className="w-full bg-surface-container-highest border border-outline/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface placeholder-on-surface-variant/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReturn}
                  disabled={actionLoading}
                  className="btn-premium bg-amber-500 text-white font-bold px-4 py-2 rounded-xl hover:brightness-110"
                >
                  Send Return Request
                </button>
                <button
                  onClick={() => setShowCorrectionInput(false)}
                  className="btn-premium bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
