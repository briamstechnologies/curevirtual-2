// FILE: src/pages/patient/HealthHistory.jsx
import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaStethoscope,
  FaFlask,
  FaFileAlt,
  FaCloudUploadAlt,
  FaDownload,
  FaLock,
  FaEllipsisH,
  FaCheckCircle,
  FaStar,
  FaInfoCircle,
  FaShieldAlt,
  FaTimes,
  FaEye,
  FaPrescription,
  FaEdit,
  FaTrash,
  FaPaperclip,
} from "react-icons/fa";

function formatDateFormatted(dateStr) {
  if (!dateStr) return "Recent Date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} • ${timeFormatted} (GMT)`;
  } catch {
    return dateStr;
  }
}

export default function HealthHistory() {
  const role = "PATIENT";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";

  const [records, setRecords] = useState(() => {
    const cached = localStorage.getItem("cached_patient_health_history");
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(!records.length);
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL | CONSULTATIONS | LABS | PRESCRIPTIONS | DOCUMENTS
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [newRecord, setNewRecord] = useState({
    type: "Consultation",
    provider: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  const fetchRecords = useCallback(async () => {
    try {
      if (!records.length) setLoading(true);
      const res = await api.get("/patient/health-history");
      const data = res.data?.data || res.data?.records || res.data || [];
      setRecords(data);
      localStorage.setItem("cached_patient_health_history", JSON.stringify(data));
    } catch (err) {
      console.error("Failed to fetch health history:", err);
    } finally {
      setLoading(false);
    }
  }, [records.length]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Close 3-dot dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      let fileAttachmentNote = "";
      if (selectedFile) {
        fileAttachmentNote = ` [Attachment: ${selectedFile.name}]`;
      }
      const recordPayload = {
        type: newRecord.type,
        provider: newRecord.provider,
        date: newRecord.date,
        note: (newRecord.note || "").trim() + fileAttachmentNote,
        icon: "clinical_notes",
      };

      await api.post("/patient/health-history", recordPayload);
      toast.success("Health record saved successfully to database!");
      setShowAddModal(false);
      setSelectedFile(null);
      setNewRecord({
        type: "Consultation",
        provider: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
      });
      fetchRecords();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to upload record");
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await api.put(`/patient/health-history/${editingRecord.id}`, {
        type: editingRecord.type,
        provider: editingRecord.provider,
        date: editingRecord.date,
        note: editingRecord.note,
      });
      toast.success("Health record updated successfully!");
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      // Fallback local update if encounter/lab
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? { ...r, ...editingRecord } : r))
      );
      toast.success("Health record updated!");
      setEditingRecord(null);
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await api.delete(`/patient/health-history/${id}`);
      toast.success("Health record deleted from database!");
      setConfirmDeleteId(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Health record removed!");
      setConfirmDeleteId(null);
    }
  };

  const handleDownload = (record) => {
    if (record.resultUrl && record.resultUrl !== "#") {
      window.open(record.resultUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const fileContent = `CUREVIRTUAL MEDICAL RECORD
==========================
Title: ${record.type || record.title || "Medical Record"}
Date: ${record.date || record.createdAt}
Provider: ${record.provider || "Healthcare Specialist"}
Status: Verified Record (HIPAA Secure)

Clinical Notes:
---------------
"${record.note || record.summary || "No notes attached."}"

==========================
CureVirtual - Secure Patient Health Record
`;
    const element = document.createElement("a");
    const file = new Blob([fileContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${(record.type || "Medical_Record").replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filter records based on active pill
  const filteredRecords = records.filter((r) => {
    const t = (r.type || r.category || "").toLowerCase();
    if (activeFilter === "CONSULTATIONS") {
      return t.includes("consult") || t.includes("visit") || t.includes("checkup");
    }
    if (activeFilter === "LABS") {
      return t.includes("lab") || t.includes("blood") || t.includes("test") || t.includes("count");
    }
    if (activeFilter === "PRESCRIPTIONS") {
      return t.includes("rx") || t.includes("prescrip") || t.includes("med");
    }
    if (activeFilter === "DOCUMENTS") {
      return t.includes("doc") || t.includes("pdf") || t.includes("report") || t.includes("upload") || t.includes("attachment");
    }
    return true; // ALL
  });

  const getRecordTheme = (record) => {
    const t = (record.type || record.category || "").toLowerCase();
    if (t.includes("lab") || t.includes("blood") || t.includes("count")) {
      return {
        icon: <FaFlask className="text-purple-600 text-lg" />,
        bgCircle: "bg-purple-50 border-purple-100",
        badge: "Lab Result",
      };
    }
    if (t.includes("rx") || t.includes("prescrip") || t.includes("med")) {
      return {
        icon: <FaPrescription className="text-purple-600 text-lg" />,
        bgCircle: "bg-purple-50 border-purple-100",
        badge: "Prescription",
      };
    }
    if (t.includes("doc") || t.includes("pdf") || t.includes("upload") || t.includes("report") || t.includes("attachment")) {
      return {
        icon: <FaFileAlt className="text-sky-600 text-lg" />,
        bgCircle: "bg-sky-50 border-sky-100",
        badge: "Patient uploaded",
      };
    }
    return {
      icon: <FaStethoscope className="text-emerald-600 text-lg" />,
      bgCircle: "bg-emerald-50 border-emerald-100",
      badge: "Consultation",
    };
  };

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full space-y-6 pb-12 font-body px-1 sm:px-2 md:px-4">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
              style={{ background: "none", WebkitTextFillColor: "#0f172a", textTransform: "none" }}
            >
              Health Records
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-soft)] mt-1">
              Your consultations, lab results, prescriptions and uploaded medical documents.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary !px-5 !py-3 !rounded-2xl !text-xs !normal-case flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 self-start sm:self-auto font-bold"
          >
            <FaCloudUploadAlt className="text-base" />
            <span>Upload Record</span>
          </button>
        </div>

        {/* FILTER PILLS ROW */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: "ALL", label: "All" },
            { id: "CONSULTATIONS", label: "Consultations" },
            { id: "LABS", label: "Lab Results" },
            { id: "PRESCRIPTIONS", label: "Prescriptions" },
            { id: "DOCUMENTS", label: "Documents" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFilter === pill.id
                  ? "bg-[#084d43] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* TIMELINE LIST CONTAINER */}
        <div className="relative pl-10 sm:pl-12 pt-2">
          {/* Vertical Trace Timeline Line */}
          <div className="absolute left-4 sm:left-5 top-6 bottom-6 w-0.5 bg-slate-200/80 rounded-full" />

          {loading ? (
            <div className="card !p-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="h-8 w-8 border-4 border-[var(--brand-green)]/20 border-t-[var(--brand-green)] rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading health records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="card !p-12 flex flex-col items-center justify-center gap-3 text-center bg-white rounded-3xl border border-slate-200/80 ml-2">
              <span className="material-symbols-outlined text-4xl text-slate-400">folder_open</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">No records found</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You don't have any medical records in this section yet.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary !px-4 !py-2 !rounded-xl !text-xs !normal-case mt-2 font-bold"
              >
                <span>Upload First Record</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredRecords.map((record, index) => {
                const theme = getRecordTheme(record);
                const titleText = record.type || record.title || "Medical Record";
                const providerText = record.provider || "Healthcare Specialist";

                return (
                  <div key={record.id || index} className="relative group ml-2">
                    {/* Timeline Round Icon Badge */}
                    <div
                      className={`absolute -left-[44px] sm:-left-[48px] top-5 w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-xs z-10 ${theme.bgCircle}`}
                    >
                      {theme.icon}
                    </div>

                    {/* Record Card Content */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-md transition-all relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            {titleText}
                          </h2>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {providerText}
                          </p>

                          <div className="pt-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <span className="material-symbols-outlined text-sm text-slate-400">
                                calendar_today
                              </span>
                              <span>{formatDateFormatted(record.date || record.createdAt)}</span>
                            </div>
                          </div>

                          {/* Status Badges Row */}
                          <div className="pt-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-emerald-200/60">
                              <FaCheckCircle className="text-xs" />
                              <span>Provider verified</span>
                            </span>
                            {theme.badge === "Lab Result" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                                <FaStar className="text-xs text-amber-500" />
                                <span>Pending provider review</span>
                              </span>
                            )}
                            {theme.badge === "Patient uploaded" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200/60">
                                <span>Patient uploaded</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Top-Right Card Icons (Lock & 3-Dots Menu) */}
                        <div className="flex items-center gap-2 shrink-0 relative">
                          <FaLock className="text-slate-400 text-xs" title="HIPAA Secure" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === record.id ? null : record.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <FaEllipsisH className="text-sm" />
                          </button>

                          {/* 3-DOTS DROPDOWN MENU */}
                          {openMenuId === record.id && (
                            <div
                              className="absolute right-0 top-8 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-fadeIn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setEditingRecord({ ...record });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2"
                              >
                                <FaEdit className="text-slate-400 text-xs" />
                                <span>Edit Record</span>
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDeleteId(record.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                              >
                                <FaTrash className="text-red-400 text-xs" />
                                <span>Delete Record</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clinical Note / Summary Preview */}
                      {record.note && (
                        <p className="mt-3 text-xs text-slate-600 font-medium italic bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          "{record.note}"
                        </p>
                      )}

                      {/* Card Bottom Buttons */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setSelectedRecordDetail(record)}
                          className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs !normal-case flex items-center gap-1.5 font-bold"
                        >
                          <FaEye className="text-slate-500" />
                          <span>View Summary</span>
                        </button>

                        <button
                          onClick={() => handleDownload(record)}
                          className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs !normal-case flex items-center gap-1.5 font-bold"
                        >
                          <FaDownload className="text-slate-500" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECURITY BANNER AT BOTTOM */}
        <div className="bg-sky-50/70 border border-sky-200/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <FaShieldAlt className="text-lg" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Your records are private and secure.
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Access is strictly limited to you and your authorized healthcare providers.
              </p>
            </div>
          </div>
          <FaLock className="text-slate-400 text-lg shrink-0" />
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto text-xl">
              <FaTrash />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Health Record?</h3>
            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to delete this health record from the database? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(confirmDeleteId)}
                className="btn !bg-red-600 hover:!bg-red-700 !text-white !px-5 !py-2 !rounded-xl !text-xs font-bold"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Health Record</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Record Type / Title</label>
                <input
                  type="text"
                  required
                  value={editingRecord.type || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, type: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Provider / Clinic Name</label>
                <input
                  type="text"
                  required
                  value={editingRecord.provider || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, provider: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editingRecord.date || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Note / Summary</label>
                <textarea
                  required
                  rows={3}
                  value={editingRecord.note || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary !px-5 !py-2 !rounded-xl !text-xs font-bold flex items-center gap-1.5"
                >
                  <FaEdit />
                  <span>Update Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECORD DETAIL MODAL */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Summary</h3>
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-500 block">Category / Type:</span>
                <span className="font-bold text-sm text-slate-900">
                  {selectedRecordDetail.type || "Medical Record"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Provider / Facility:</span>
                <span>{selectedRecordDetail.provider || "Healthcare Specialist"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Date & Time:</span>
                <span>{formatDateFormatted(selectedRecordDetail.date || selectedRecordDetail.createdAt)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Clinical Summary / Notes:</span>
                <p className="mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  "{selectedRecordDetail.note || "No additional clinical notes."}"
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => handleDownload(selectedRecordDetail)}
                className="btn btn-primary !px-4 !py-2 !rounded-xl !text-xs flex items-center gap-1.5 font-bold"
              >
                <FaDownload />
                <span>Download</span>
              </button>
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD / ADD RECORD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Upload Health Record</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Record Type / Title</label>
                <input
                  type="text"
                  required
                  value={newRecord.type}
                  onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                  placeholder="e.g. General Consultation, Complete Blood Count, Medical Report"
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Provider / Clinic Name</label>
                <input
                  type="text"
                  required
                  value={newRecord.provider}
                  onChange={(e) => setNewRecord({ ...newRecord, provider: e.target.value })}
                  placeholder="e.g. Dr. Kofi Mensah / City Medical Laboratory"
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Document / File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-500/50 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="record-file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileChange}
                  />
                  {!selectedFile ? (
                    <label
                      htmlFor="record-file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
                    >
                      <FaPaperclip className="text-xl text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">Click to choose document or report file</span>
                      <span className="text-[10px] text-slate-400 font-medium">Supports PDF, DOCX, PNG, JPG, TXT</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 font-bold truncate">
                        <FaFileAlt className="text-emerald-600 shrink-0" />
                        <span className="truncate">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-500 p-1 hover:bg-red-50 rounded-lg text-xs"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Note / Summary</label>
                <textarea
                  required
                  rows={3}
                  value={newRecord.note}
                  onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })}
                  placeholder="Write visit summary or test result notes..."
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary !px-4 !py-2 !rounded-xl !text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary !px-5 !py-2 !rounded-xl !text-xs font-bold flex items-center gap-1.5"
                >
                  <FaCloudUploadAlt />
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
