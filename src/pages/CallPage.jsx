import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../Lib/api";
import ZegoVideoCall from "../components/ZegoVideoCall";
import LoadingSpinner from "../components/LoadingSpinner";

/**
 * CallPage — The main video call interface for appointments.
 * Route: /call/:appointmentId
 */
const CallPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/appointments/${appointmentId}`);
        const data = res.data;

        const callStatus = (data.callStatus || "idle").toLowerCase();
        if (callStatus === "idle") {
          setError("The doctor has not started this call yet. Please wait.");
          return;
        }
        if (callStatus === "ended") {
          setError("This call session has already ended.");
          return;
        }

        setAppointment(data);
      } catch (err) {
        console.error("❌ Failed to fetch appointment:", err);
        setError(err.response?.data?.error || "Failed to load appointment details");
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) fetchAppointment();
  }, [appointmentId]);

  const handleClose = async () => {
    try {
      await api.post(`/appointments/${appointmentId}/end-call`);
    } catch (err) {
      console.error("Failed to end call:", err);
    }
    
    const role = localStorage.getItem("role") || localStorage.getItem("userRole");
    navigate((role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT") ? "/doctor/appointments" : "/patient/my-appointments");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white">
        <LoadingSpinner />
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="font-headline text-xl font-bold tracking-tight">Initializing SecuLink™</p>
          <p className="text-white/40 text-sm font-medium uppercase tracking-[0.3em]">End-to-End Encrypted</p>
        </div>
      </div>
    );
  }

  if (error || !appointment?.roomName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 text-center">
        <div className="card-premium !bg-surface-container-highest/20 !border-error/30 max-w-md w-full !p-12 space-y-6">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-error text-4xl">warning</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface uppercase tracking-tight">Access Restricted</h1>
            <p className="text-on-surface-variant font-medium mt-2 leading-relaxed opacity-70">
              {error || "This appointment is not configured for video calling."}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 bg-on-surface text-surface-container-lowest rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  const role = localStorage.getItem("role") || localStorage.getItem("userRole");
  const displayName = (role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT") 
    ? appointment.doctorName || (role === "PHYSICIAN_ASSISTANT" ? "Physician Assistant" : "Doctor") 
    : appointment.patientName || "Patient";
  const userId = localStorage.getItem("userId") || `user-${Date.now()}`;

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {/* Premium HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[100] pointer-events-none flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="glass-panel px-4 py-2 border-white/10 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Clinical Session</span>
          </div>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] ml-2">ID: {appointmentId}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="glass-panel px-4 py-2 border-white/10 flex items-center gap-3">
             <span className="material-symbols-outlined text-primary text-sm">lock</span>
             <span className="text-[10px] font-black text-white uppercase tracking-widest">SecuLink™ Active</span>
          </div>
        </div>
      </div>

      <ZegoVideoCall
        roomName={appointment.roomName}
        userName={displayName}
        userId={userId}
        onClose={handleClose}
      />
    </div>
  );
};

export default CallPage;
