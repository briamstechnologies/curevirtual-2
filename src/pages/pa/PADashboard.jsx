// FILE: src/pages/pa/PADashboard.jsx
import React, { useState, useEffect } from "react";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { toast } from "react-toastify";

export default function PADashboard() {
  const [logs, setLogs] = useState([]);
  const [myDoctors, setMyDoctors] = useState([]);
  const [paProfile, setPaProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const role = localStorage.getItem("role") || "PHYSICIAN_ASSISTANT";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Physician Assistant";

  const fetchMyConsultations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/consultations/pa/my-consultations");
      setLogs(res.data || []);
    } catch (err) {
      console.error("Error fetching PA consultations:", err);
      toast.error("Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyDoctors = async () => {
    try {
      const res = await api.get("/consultations/pa/my-doctors");
      setMyDoctors(res.data || []);
    } catch (err) {
      console.error("Error fetching PA doctors:", err);
    }
  };

  const fetchPaProfile = async () => {
    try {
      const res = await api.get("/consultations/pa/profile");
      setPaProfile(res.data?.data || null);
    } catch (err) {
      console.error("Error fetching PA profile:", err);
    }
  };

  useEffect(() => {
    fetchMyConsultations();
    fetchMyDoctors();
    fetchPaProfile();
  }, []);

  const handleSubmitNotes = async (logId) => {
    if (!notesText.trim()) {
      toast.error("Please enter consultation notes before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/consultations/pa/submit", {
        consultationId: logId,
        consultationNotes: notesText,
      });
      toast.success("Consultation notes submitted to doctor for review.");
      setNotesText("");
      setSelectedLog(null);
      fetchMyConsultations();
    } catch (err) {
      console.error("Error submitting notes:", err);
      toast.error(err.response?.data?.error || "Failed to submit notes");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) {
      toast.error("Please enter a reason for escalation.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/consultations/pa/escalate", {
        consultationId: selectedLog.id,
        escalationReason: escalateReason,
      });
      toast.warning("Consultation escalated to supervising doctor.");
      setEscalateReason("");
      setShowEscalateModal(false);
      setSelectedLog(null);
      fetchMyConsultations();
    } catch (err) {
      console.error("Error escalating case:", err);
      toast.error(err.response?.data?.error || "Failed to escalate case");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING_REVIEW":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Approved by Doctor":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Returned for Correction":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "ESCALATED":
        return "bg-red-600/10 text-red-400 border-red-600/30";
      case "CLOSED":
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const isAccessLocked = paProfile?.doctorIsOnline && !paProfile?.isAllowedByDoctor;

  return (
    <DashboardLayout role={role}>
      <div className="space-y-8 min-h-screen text-on-surface">
        {isAccessLocked && (
          <div className="bg-error-container/20 border border-error/20 p-4 rounded-xl flex items-start gap-4 animate-fade-in">
            <span className="material-symbols-outlined text-error text-3xl">lock</span>
            <div>
              <h2 className="text-error font-bold text-lg">Action Required: Access Locked</h2>
              <p className="text-on-error-container text-sm mt-1">Your supervising doctor is currently online but has not granted you access. Most tools and functions are disabled.</p>
            </div>
          </div>
        )}
        {/* Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-[24px] border border-primary/10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Physician Assistant Portal
            </h1>
            <p className="text-on-surface-variant font-medium text-sm mt-1 opacity-80">
              Welcome back, {userName}. Review assigned cases, log clinical notes, and manage supervisions.
            </p>
            
            {/* PA ID & Supervising Doctor Section */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {paProfile?.referenceId && (
                <span className="text-xs font-black bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/40 px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                  PA ID: {paProfile.referenceId}
                </span>
              )}
              {paProfile?.supervisingDoctorId && (
                <span className="text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                  Supervising Doctor: {paProfile.supervisingDoctorId}
                </span>
              )}
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-2">Assigned to:</span>
              {myDoctors.length > 0 ? (
                myDoctors.map(doc => (
                  <span key={doc.id} className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded-full whitespace-nowrap shadow-sm">
                    {doc.name}
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-1 rounded-full whitespace-nowrap">
                  Unassigned
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => { fetchMyConsultations(); fetchMyDoctors(); }}
            className="btn-premium bg-surface-container-high hover:bg-surface-container-highest px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 border border-outline/10"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </section>

        {/* Dashboard Grid */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Panel: Consultation Log List */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">clinical_notes</span>
              Assigned Consultations ({logs.length})
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="card-premium p-12 text-center opacity-50 border border-dashed border-outline/20">
                <span className="material-symbols-outlined text-5xl mb-3 text-outline">assignment_ind</span>
                <p className="font-bold text-base">No active consultations assigned</p>
                <p className="text-xs text-on-surface-variant mt-1">New low/medium severity routed logs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setNotesText(log.consultationNotes || "");
                    }}
                    className={`card-premium !p-5 cursor-pointer border transition-all ${
                      selectedLog?.id === log.id 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                        : "border-outline/10 hover:border-primary/30 hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-base leading-none">
                          Patient: {log.patient?.user?.firstName} {log.patient?.user?.lastName}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-semibold mt-1 opacity-70">
                          Supervising Doctor: Dr. {log.doctor?.user?.firstName} {log.doctor?.user?.lastName}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(log.status)}`}>
                        {log.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="bg-surface-container-highest px-3 py-1 rounded-lg opacity-85">
                        Type: <strong>{log.consultationType}</strong>
                      </span>
                      <span className="bg-surface-container-highest px-3 py-1 rounded-lg opacity-85">
                        Severity: <strong>{log.severityLevel}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Notes Logging / Review Box */}
          <div className="lg:col-span-6">
            {selectedLog ? (
              <div className="card-premium space-y-6 animate-fade-in border-primary/20 bg-surface-container-low">
                <div className="flex justify-between items-center pb-4 border-b border-outline/10">
                  <div>
                    <h2 className="text-lg font-bold text-on-surface leading-none">
                      Consultation Details
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Log details for {selectedLog.patient?.user?.firstName} {selectedLog.patient?.user?.lastName}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Consultation Info Grid */}
                <div className="grid grid-cols-2 gap-4 bg-surface-container px-4 py-3 rounded-2xl border border-outline/5 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-outline">Type</p>
                    <p className="font-bold text-on-surface mt-0.5">{selectedLog.consultationType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-outline">Severity</p>
                    <p className="font-bold text-on-surface mt-0.5">{selectedLog.severityLevel}</p>
                  </div>
                </div>

                {/* Clinical Notes Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-outline">
                    Clinical Consultation Notes
                  </label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows="8"
                    disabled={selectedLog.status === "Approved by Doctor" || selectedLog.status === "CLOSED" || isAccessLocked}
                    placeholder={isAccessLocked ? "Access is locked by supervising doctor." : "Enter subjective notes, objective findings, assessment, and care plan here..."}
                    className="w-full bg-surface-container-highest border border-outline/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface placeholder-on-surface-variant/50"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {selectedLog.status !== "Approved by Doctor" && selectedLog.status !== "CLOSED" ? (
                    <>
                      <button
                        onClick={() => handleSubmitNotes(selectedLog.id)}
                        disabled={submitting || isAccessLocked}
                        className={`btn-premium font-bold py-3 px-6 rounded-2xl text-xs flex-1 flex justify-center items-center gap-2 ${
                          isAccessLocked ? "bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-50" : "bg-primary text-white hover:brightness-110"
                        }`}
                      >
                        {submitting ? "Submitting..." : "Submit to Doctor"}
                      </button>
                      <button
                        onClick={() => setShowEscalateModal(true)}
                        disabled={submitting || isAccessLocked}
                        className={`btn-premium font-bold py-3 px-6 rounded-2xl text-xs flex-1 flex justify-center items-center gap-2 ${
                          isAccessLocked ? "bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-50" : "bg-error/10 hover:bg-error hover:text-white border border-error/20 text-error"
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Escalate Case
                      </button>
                    </>
                  ) : (
                    <div className="bg-success/10 border border-success/20 text-success p-4 rounded-2xl text-xs font-semibold w-full flex items-center gap-2 justify-center">
                      <span className="material-symbols-outlined text-lg">verified</span>
                      This consultation log has been finalized and approved by the doctor.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-premium h-[300px] flex flex-col items-center justify-center text-center opacity-40 border border-dashed border-outline/25">
                <span className="material-symbols-outlined text-6xl mb-4 text-outline">edit_note</span>
                <p className="font-bold text-lg">No consultation selected</p>
                <p className="text-xs text-on-surface-variant mt-1">Select a consultation log from the list to view details and log clinical notes.</p>
              </div>
            )}
          </div>
        </div>

        {/* Escalation Modal */}
        {showEscalateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-surface-container-high rounded-[28px] border border-outline/10 p-6 max-w-md w-full space-y-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-error">
                  <span className="material-symbols-outlined">warning</span>
                  Escalate Consultation
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Escalating will flag this case as high-risk and transfer care authority directly to Dr. {selectedLog?.doctor?.user?.firstName} {selectedLog?.doctor?.user?.lastName}.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-outline">
                  Reason for Escalation
                </label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  rows="4"
                  placeholder="Describe critical findings, emergency symptoms, or complexity requiring immediate doctor attention..."
                  className="w-full bg-surface-container-highest border border-outline/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface placeholder-on-surface-variant/50"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowEscalateModal(false)}
                  className="btn-premium bg-surface-container-highest hover:bg-outline/10 text-on-surface px-5 py-3 rounded-2xl text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEscalate}
                  disabled={submitting}
                  className="btn-premium bg-error text-white font-bold px-5 py-3 rounded-2xl text-xs flex-1"
                >
                  {submitting ? "Escalating..." : "Confirm Escalation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
