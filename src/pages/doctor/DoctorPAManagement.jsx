import React, { useState, useEffect, useCallback } from "react";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaExclamationTriangle, FaClock, FaSync, FaUserMd, FaNotesMedical } from "react-icons/fa";
import PAPermissionsPanel from "../../components/doctor/PAPermissionsPanel";

export default function DoctorPAManagement() {
  const [activeTab, setActiveTab] = useState("reviews"); // 'reviews' | 'permissions'
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [doctorComments, setDoctorComments] = useState("");
  const [consultNotes, setConsultNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'pending_review' | 'co_signed' | 'flagged_for_followup'

  const role = localStorage.getItem("role") || "DOCTOR";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/pa-reviews");
      if (res.data?.reviews) {
        setReviews(res.data.reviews);
      } else if (Array.isArray(res.data)) {
        setReviews(res.data);
      }
    } catch (err) {
      console.error("Error fetching PA consult reviews:", err);
      toast.error("Failed to load PA consult reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchReviews();
    }
  }, [activeTab, fetchReviews]);

  // Handle Co-Sign or Flag for Follow-up Action
  const handleUpdateReviewStatus = async (newStatus) => {
    if (!selectedReview) return;
    try {
      setSubmitting(true);
      const updateData = {
        reviewStatus: newStatus, // 'co_signed' or 'flagged_for_followup'
        doctorComments,
        consultNotes: consultNotes || selectedReview.consultNotes
      };

      const res = await api.put(`/pa-reviews/${selectedReview.id}`, updateData);
      
      if (res.data?.success) {
        toast.success(
          newStatus === "co_signed" 
            ? "✅ Consult Co-Signed successfully!" 
            : "⚠️ Consult Flagged for Follow-up!"
        );
        setSelectedReview(null);
        setDoctorComments("");
        setConsultNotes("");
        fetchReviews();
      } else {
        throw new Error(res.data?.message || "Failed to update review");
      }
    } catch (err) {
      console.error("Error updating review:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to update review status");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending_review":
        return (
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <FaClock className="text-amber-500 animate-pulse" /> Pending Review
          </span>
        );
      case "co_signed":
        return (
          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <FaCheckCircle className="text-emerald-500" /> Co-Signed
          </span>
        );
      case "flagged_for_followup":
        return (
          <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <FaExclamationTriangle className="text-rose-500" /> Flagged for Follow-up
          </span>
        );
      default:
        return (
          <span className="bg-slate-500/10 text-slate-400 border border-slate-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.reviewStatus === statusFilter;
  });

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-8 min-h-screen text-[var(--text-main)] font-body">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-transparent p-6 rounded-3xl border border-[var(--border)] shadow-md">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FaUserMd /> PA Supervision Suite
              </span>
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Section 7 Co-Sign Flow
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)]">
              PA Consult Review Queue
            </h1>
            <p className="text-xs text-[var(--text-soft)] mt-1">
              Review clinical notes from your Physician Assistants, co-sign consults, or flag for follow-up within 24-hour SLA.
            </p>
          </div>
          
          <div className="flex bg-[var(--bg-main)] p-1.5 rounded-2xl border border-[var(--border)]">
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "reviews" 
                  ? "bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-md" 
                  : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
              }`}
            >
              Co-Sign Reviews Queue
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "permissions" 
                  ? "bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-md" 
                  : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
              }`}
            >
              PA Assignments
            </button>
          </div>
        </section>

        {activeTab === "reviews" ? (
          <div className="space-y-6">
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-glass)] p-3 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-2">
                {["ALL", "pending_review", "co_signed", "flagged_for_followup"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                      statusFilter === st 
                        ? "bg-purple-500 text-white shadow-md" 
                        : "text-[var(--text-soft)] hover:bg-[var(--bg-main)]"
                    }`}
                  >
                    {st === "ALL" ? "All Reviews" : st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <button 
                onClick={fetchReviews}
                className="px-4 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-[var(--text-main)] rounded-xl text-xs font-bold flex items-center gap-2 border border-[var(--border)] transition"
              >
                <FaSync className={loading ? "animate-spin" : ""} /> Refresh Queue
              </button>
            </div>

            {/* Queue & Details Split Grid */}
            <div className="grid lg:grid-cols-12 gap-8">
              
              {/* Left Column: Reviews List */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-soft)]">
                  Consultation Queue ({filteredReviews.length})
                </h3>
                
                {loading ? (
                  <div className="text-center py-12 text-xs text-[var(--text-soft)] border border-dashed border-[var(--border)] rounded-3xl">
                    Loading PA consult reviews...
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-3xl bg-[var(--bg-glass)]">
                    No consult reviews match the selected filter.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                    {filteredReviews.map((rev) => {
                      const patientUser = rev.transaction?.appointment?.patient?.user;
                      const patientName = patientUser ? `${patientUser.firstName} ${patientUser.lastName}`.trim() : "Patient";
                      
                      return (
                        <div
                          key={rev.id}
                          onClick={() => {
                            setSelectedReview(rev);
                            setDoctorComments(rev.doctorComments || "");
                            setConsultNotes(rev.consultNotes || "");
                          }}
                          className={`bg-[var(--bg-glass)] backdrop-blur-xl p-5 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                            selectedReview?.id === rev.id 
                              ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/5 shadow-md" 
                              : "border-[var(--border)] hover:border-purple-500/40"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-black text-base text-[var(--text-main)]">{patientName}</h4>
                              <p className="text-xs font-semibold text-purple-500 mt-0.5">
                                Physician Assistant Consult
                              </p>
                            </div>
                            {getStatusBadge(rev.reviewStatus)}
                          </div>

                          <div className="text-xs text-[var(--text-soft)] flex justify-between items-center pt-2 border-t border-[var(--border)]">
                            <span>Amount: GHS {rev.transaction?.amountGHS || rev.transaction?.amount || 150}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {new Date(rev.createdAt).toLocaleDateString()} {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Review Details & Co-Sign Actions */}
              <div className="lg:col-span-7">
                {selectedReview ? (
                  <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                    
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">
                          Transaction ID: {selectedReview.transactionId?.slice(0, 13)}...
                        </span>
                        <h3 className="text-xl font-black text-[var(--text-main)] mt-1">
                          Review Clinical Notes
                        </h3>
                      </div>
                      {getStatusBadge(selectedReview.reviewStatus)}
                    </div>

                    {/* Patient & PA Info Box */}
                    <div className="bg-[var(--bg-main)]/60 p-4 rounded-2xl border border-[var(--border)] grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[var(--text-muted)] block text-[10px] font-bold uppercase">Patient</span>
                        <span className="font-black text-sm text-[var(--text-main)]">
                          {selectedReview.transaction?.appointment?.patient?.user?.firstName || "Patient"} {selectedReview.transaction?.appointment?.patient?.user?.lastName || ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[10px] font-bold uppercase">Role</span>
                        <span className="font-black text-sm text-purple-500">
                          Physician Assistant
                        </span>
                      </div>
                    </div>

                    {/* Clinical Notes Input/View */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] flex items-center gap-1.5">
                        <FaNotesMedical className="text-purple-500" /> Clinical Consult Notes
                      </label>
                      <textarea
                        value={consultNotes}
                        onChange={(e) => setConsultNotes(e.target.value)}
                        placeholder="PA clinical notes summary..."
                        className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl p-4 text-xs leading-relaxed text-[var(--text-main)] focus:ring-2 focus:ring-purple-500 outline-none"
                        rows="4"
                      />
                    </div>

                    {/* Doctor Supervision Comments */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
                        Doctor Supervision Feedback / Co-Sign Comments
                      </label>
                      <textarea
                        value={doctorComments}
                        onChange={(e) => setDoctorComments(e.target.value)}
                        placeholder="Add co-sign notes or follow-up instructions..."
                        className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl p-4 text-xs leading-relaxed text-[var(--text-main)] focus:ring-2 focus:ring-purple-500 outline-none"
                        rows="3"
                      />
                    </div>

                    {/* Spec Section 7 Action Buttons: Co-Sign vs Flag for Follow-up */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        disabled={submitting}
                        onClick={() => handleUpdateReviewStatus("co_signed")}
                        className="py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <FaCheckCircle className="text-base" /> Co-Sign Consult
                      </button>

                      <button
                        disabled={submitting}
                        onClick={() => handleUpdateReviewStatus("flagged_for_followup")}
                        className="py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:opacity-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <FaExclamationTriangle className="text-base" /> Flag for Follow-Up
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-[var(--bg-glass)] border border-dashed border-[var(--border)] rounded-3xl p-12 text-center text-[var(--text-muted)] space-y-3">
                    <FaUserMd className="text-4xl mx-auto opacity-40 text-purple-500" />
                    <p className="font-bold text-sm text-[var(--text-main)]">Select a PA consult from the queue to review</p>
                    <p className="text-xs">You can co-sign clinical notes or flag them for follow-up.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <PAPermissionsPanel />
        )}
        
        <ToastContainer position="top-right" autoClose={2500} />
      </div>
    </DashboardLayout>
  );
}

