import React, { useState, useEffect } from "react";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { toast } from "react-toastify";
import PAPermissionsPanel from "../../components/doctor/PAPermissionsPanel";

export default function DoctorPAManagement() {
  const [activeTab, setActiveTab] = useState("reviews"); // 'reviews' | 'permissions'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const role = localStorage.getItem("role") || "DOCTOR";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/consultations/pa/doctor-consultations");
      setLogs(res.data || []);
    } catch (err) {
      console.error("Error fetching doctor consultations:", err);
      toast.error("Failed to load PA consultations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchConsultations();
    }
  }, [activeTab]);

  const handleAction = async (actionType) => {
    try {
      setSubmitting(true);
      await api.post(`/consultations/pa/doctors/consultations/${selectedLog.id}/approve`, {
        action: actionType, // 'approve' or 'reject'
        feedback,
      });
      
      toast.success(actionType === 'approve' ? "Consultation approved." : "Consultation returned for correction.");
      setFeedback("");
      setSelectedLog(null);
      fetchConsultations();
    } catch (err) {
      console.error("Error updating consultation:", err);
      toast.error("Failed to update consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending Doctor Review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Approved by Doctor":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Returned for Correction":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "ESCALATED":
        return "bg-red-600/10 text-red-400 border-red-600/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <DashboardLayout role={role}>
      <div className="space-y-8 min-h-screen text-on-surface">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-[24px] border border-primary/10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">PA Management</h1>
            <p className="text-on-surface-variant font-medium text-sm mt-1 opacity-80">
              Manage your Physician Assistants and review their clinical notes.
            </p>
          </div>
          
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline/10">
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "reviews" 
                  ? "bg-primary text-white shadow-md" 
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              Consultation Reviews
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "permissions" 
                  ? "bg-primary text-white shadow-md" 
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              Access Control
            </button>
          </div>
        </section>

        {activeTab === "reviews" ? (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Consultation Queue ({logs.length})</h2>
                <button 
                  onClick={fetchConsultations}
                  className="btn-premium bg-surface-container-high px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-outline/10 hover:bg-surface-container-highest"
                >
                  Refresh
                </button>
              </div>
              
              {loading ? (
                <div className="p-8 text-center animate-pulse">Loading queue...</div>
              ) : logs.length === 0 ? (
                <div className="card-premium p-8 text-center opacity-50 border-dashed">
                  <p>No consultations to review.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`card-premium p-5 cursor-pointer border transition-all ${
                        selectedLog?.id === log.id ? "border-primary bg-primary/5" : "border-outline/10 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">Patient: {log.patient?.user?.firstName}</h3>
                          <p className="text-xs mt-1 text-on-surface-variant">PA: {log.pa?.user?.firstName || 'Unassigned'}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6">
              {selectedLog ? (
                <div className="card-premium space-y-6 bg-surface-container-low p-6 rounded-2xl border border-outline/10 shadow-lg">
                  <div className="flex justify-between items-center border-b border-outline/10 pb-4">
                    <h2 className="text-xl font-bold">Review Notes</h2>
                    <span className="text-xs text-on-surface-variant">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-surface-container p-5 rounded-xl border border-outline/5">
                    <p className="font-bold text-primary text-xs tracking-wider uppercase mb-3">Clinical Notes from PA</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedLog.consultationNotes || "No notes provided."}</p>
                  </div>
                  
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback (optional)..."
                    className="w-full bg-surface-container-highest border border-outline/20 rounded-xl p-4 text-sm focus:border-primary outline-none transition-colors"
                    rows="4"
                  />

                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={submitting || selectedLog.status === 'Approved by Doctor'}
                      className="flex-1 bg-success hover:bg-success/90 text-white py-3.5 rounded-xl font-bold transition-colors shadow-md disabled:opacity-50"
                    >
                      Approve Consultation
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={submitting || selectedLog.status === 'Approved by Doctor'}
                      className="flex-1 bg-error hover:bg-error/90 text-white py-3.5 rounded-xl font-bold transition-colors shadow-md disabled:opacity-50"
                    >
                      Return for Correction
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card-premium h-[300px] flex flex-col items-center justify-center opacity-50 border-dashed border-2 bg-surface-container-lowest">
                  <div className="text-4xl mb-4 opacity-50">📋</div>
                  <p className="font-bold">Select a consultation to review</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <PAPermissionsPanel />
        )}
      </div>
    </DashboardLayout>
  );
}
