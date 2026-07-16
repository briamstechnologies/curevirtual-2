import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { FaCheck, FaTimes, FaEye, FaFileMedical } from "react-icons/fa";
import { toast } from "react-toastify";

export default function LabReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/doctor/lab-reports");
      setReports(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load lab reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReviewSubmit = async (action) => {
    if (action === "REJECT" && !reviewNotes.trim()) {
      toast.error("Please provide notes for returning the report to the laboratory.");
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      await api.patch(`/doctor/lab-reports/${reviewModal.id}/review`, {
        action,
        notes: reviewNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(action === "APPROVE" ? "Report forwarded to patient!" : "Report returned to laboratory.");
      setReviewModal(null);
      setReviewNotes("");
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="DOCTOR">
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.3em] mb-1">
            Diagnostics
          </h2>
          <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase flex items-center gap-3">
            <FaFileMedical className="text-[var(--brand-green)]" /> Laboratory Reports
          </h1>
        </div>

        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Patient</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Laboratory</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Test</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-[var(--text-soft)] animate-pulse">
                      Loading reports...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-[var(--text-soft)] uppercase tracking-widest">
                      No reports available.
                    </td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr key={report.id} className="hover:bg-[var(--bg-main)]/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-black text-[var(--text-main)]">
                        {report.patient?.user ? `${report.patient.user.firstName} ${report.patient.user.lastName}` : "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[var(--text-soft)]">
                        {report.laboratory?.user ? `${report.laboratory.user.firstName} ${report.laboratory.user.lastName}` : "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[var(--text-main)]">
                        {report.testName}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          report.status === "COMPLETED" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                          report.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                          report.status === "CANCELLED" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}>
                          {report.status === "PENDING" ? "Needs Review" : report.status === "COMPLETED" ? "Approved" : report.status === "CANCELLED" ? "Returned" : report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <a
                          href={report.resultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                          title="View Report"
                        >
                          <FaEye size={14} />
                        </a>
                        {report.status !== "COMPLETED" && (
                          <button
                            onClick={() => setReviewModal(report)}
                            className="px-3 py-2 rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-white transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
                          >
                            Review & Forward
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* REVIEW MODAL */}
        {reviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-300">
              <button
                onClick={() => setReviewModal(null)}
                className="absolute right-6 top-6 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-2"
              >
                <FaTimes />
              </button>

              <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight uppercase mb-2">
                Review Lab Report
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                Verify the laboratory findings before delivering to the patient or sending back for revision.
              </p>

              {/* Test & Report Overview Card */}
              <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Test Name</p>
                    <p className="text-base font-black text-[var(--text-main)]">{reviewModal.testName}</p>
                  </div>
                  <a
                    href={reviewModal.resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <FaEye /> View Report PDF
                  </a>
                </div>

                <div className="border-t border-[var(--border)] pt-3 flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)]">Patient: </span>
                    <strong className="text-[var(--text-main)]">
                      {reviewModal.patient?.user
                        ? `${reviewModal.patient.user.firstName} ${reviewModal.patient.user.lastName}`
                        : "Patient"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Laboratory: </span>
                    <strong className="text-[var(--text-main)]">
                      {reviewModal.laboratory?.user
                        ? `${reviewModal.laboratory.user.firstName} ${reviewModal.laboratory.user.lastName}`
                        : "Lab"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Patient Delivery Section */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 mb-6">
                <h4 className="text-xs font-black text-green-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FaCheck /> Patient Delivery Destination
                </h4>
                <p className="text-xs text-[var(--text-main)] mb-3">
                  If approved, this report will immediately be delivered to{" "}
                  <strong>
                    {reviewModal.patient?.user
                      ? `${reviewModal.patient.user.firstName} ${reviewModal.patient.user.lastName}`
                      : "the selected patient"}
                  </strong>
                  's dashboard and Health History.
                </p>
                <button
                  disabled={submitting}
                  onClick={() => handleReviewSubmit("APPROVE")}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                >
                  <FaCheck /> Approve & Send to Patient (
                  {reviewModal.patient?.user
                    ? `${reviewModal.patient.user.firstName} ${reviewModal.patient.user.lastName}`
                    : "Patient"}
                  )
                </button>
              </div>

              {/* Return to Lab Section */}
              <div className="border-t border-[var(--border)] pt-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Need Revision? Send Back to Laboratory with Notes:
                </label>
                <textarea
                  placeholder="e.g. Please re-check RBC count or provide complete lipid profile..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs text-[var(--text-main)] outline-none mb-3 focus:border-red-500 transition-all"
                  rows="2"
                />
                <button
                  disabled={submitting}
                  onClick={() => handleReviewSubmit("REJECT")}
                  className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs border border-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <FaTimes /> Return to Laboratory for Revision
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
