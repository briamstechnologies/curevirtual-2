// FILE: src/pages/admin/RegistrationRequests.jsx
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  FiCheck,
  FiX,
  FiEye,
  FiRefreshCw,
  FiDownload,
  FiSearch,
  FiFilter,
  FiShield,
  FiFileText,
  FiCalendar,
  FiUser,
  FiArrowRight,
} from "react-icons/fi";
import { FaUserMd, FaClinicMedical } from "react-icons/fa";
import { useSocket } from "../../context/useSocket";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function RegistrationRequests() {
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, totalRejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "PENDING", role: "", page: 1 });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const userName = localStorage.getItem("userName") || "Admin";
  const role = localStorage.getItem("role") || "ADMIN";

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 10 };
      if (filters.status) params.status = filters.status;
      if (filters.role) params.role = filters.role;
      const { data } = await api.get("/registration-requests", { params });
      setRequests(data.data);
      setMeta(data.meta);
    } catch {
      toast.error("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/registration-requests/stats");
      setStats(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [fetchRequests, fetchStats]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ role, name }) => {
      toast.info(`📋 New ${role} registration: ${name}`);
      fetchRequests();
      fetchStats();
    };
    socket.emit("join_admin_room", { userId: localStorage.getItem("userId") });
    socket.on("new_registration_request", handler);
    return () => socket.off("new_registration_request", handler);
  }, [socket, fetchRequests, fetchStats]);

  const openDetail = async (req) => {
    try {
      const { data } = await api.get(`/registration-requests/${req.id}`);
      setSelected(data);
      setRejecting(false);
      setRejectionReason("");
    } catch {
      toast.error("Failed to load details.");
    }
  };

  const submitReview = async (action) => {
    if (action === "REJECTED" && !rejectionReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/registration-requests/${selected.id}/review`, {
        action,
        rejectionReason: action === "REJECTED" ? rejectionReason.trim() : undefined,
      });
      toast.success(`Request ${action.toLowerCase()} successfully.`);
      setSelected(null);
      fetchRequests();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const submittedData = selected?.submittedData || {};
  const isPdf =
    selected?.licenseImageUrl?.includes(".pdf") || selected?.licenseFilePath?.endsWith(".pdf");

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.4em] mb-3">
              Credential Verification System
            </h2>
            <h1 className="text-4xl lg:text-5xl font-black text-[var(--text-main)] tracking-tighter leading-none">
              Approval <span className="text-[var(--brand-blue)]">Queue</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchRequests();
                fetchStats();
              }}
              className="btn btn-glass !py-3 !px-6 text-[10px] text-[var(--text-main)] flex items-center gap-2"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Sync Requests
            </button>
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon={<FiFileText />}
            color="var(--brand-orange)"
          />
          <StatCard
            label="Approved Today"
            value={stats.approvedToday}
            icon={<FiCheck />}
            color="var(--brand-green)"
          />
          <StatCard
            label="Total Rejected"
            value={stats.totalRejected}
            icon={<FiX />}
            color="var(--brand-red, #ef4444)"
          />
          <StatCard
            label="Live Providers"
            value={
              stats.totalDoctors ? `${stats.totalDoctors + (stats.totalPharmacies || 0)}` : "—"
            }
            icon={<FiUser />}
            color="var(--brand-blue)"
          />
        </div>

        {/* Filtering and Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              ["PENDING", "Pending"],
              ["APPROVED", "Approved"],
              ["REJECTED", "Rejected"],
              ["", "History"],
            ].map(([val, label]) => (
              <button
                key={label}
                onClick={() => setFilters((f) => ({ ...f, status: val, page: 1 }))}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filters.status === val ? "bg-[var(--brand-blue)] text-white shadow-lg" : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--brand-blue)]/50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] outline-none focus:border-[var(--brand-blue)] transition-all"
            >
              <option value="">All Roles</option>
              <option value="DOCTOR">Doctors</option>
              <option value="PHARMACY">Pharmacies</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="card !p-0 overflow-hidden border-t-4 border-[var(--brand-blue)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
                  {["Provider", "Role", "Submission Date", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="h-8 w-8 border-2 border-[var(--brand-blue)] border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]"
                    >
                      No verification requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-[var(--bg-main)]/30 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--brand-blue)] border border-[var(--border)] font-black uppercase">
                            {req.user?.firstName?.[0]}
                            {req.user?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[var(--text-main)]">
                              {req.user?.firstName} {req.user?.lastName}
                            </p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)]">
                              {req.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase ${req.role === "DOCTOR" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}
                        >
                          {req.role}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-[var(--text-soft)]">
                          <FiCalendar className="text-[10px]" />
                          <span className="text-xs font-bold">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${req.status === "PENDING" ? "bg-amber-400 animate-pulse" : req.status === "APPROVED" ? "bg-emerald-400" : "bg-red-400"}`}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
                            {req.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => openDetail(req)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--brand-blue)] bg-[var(--brand-blue)]/5 border border-[var(--brand-blue)]/20 hover:bg-[var(--brand-blue)] hover:text-white transition-all"
                        >
                          <FiEye /> Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-6 py-4 bg-[var(--bg-main)]/30 flex items-center justify-between">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                Showing {requests.length} of {meta.total} applications
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 hover:bg-[var(--bg-card)]"
                >
                  <FiArrowRight className="rotate-180" />
                </button>
                <span className="text-[10px] font-black text-[var(--text-main)] px-4">
                  PAGE {filters.page}
                </span>
                <button
                  disabled={filters.page >= meta.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 hover:bg-[var(--bg-card)]"
                >
                  <FiArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-3xl card !p-0 overflow-hidden shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-main)]">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/20">
                  {selected.role === "DOCTOR" ? <FaUserMd /> : <FaClinicMedical />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter">
                    {selected.user?.firstName} {selected.user?.lastName}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)] animate-pulse" />
                    <p className="text-[10px] font-black text-[var(--brand-blue)] uppercase tracking-[0.3em]">
                      {selected.role} VERIFICATION
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="h-10 w-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-all"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 bg-slate-50">
              {/* Submission Data */}
              <div className="p-8 space-y-6 border-r border-[var(--border)] bg-slate-50">
                <SectionLabel label="Identity Information" />
                <div className="grid grid-cols-2 gap-y-4">
                  <DataPoint
                    label="Full Name"
                    value={`${selected.user?.firstName} ${selected.user?.lastName}`}
                  />
                  <DataPoint label="Email Address" value={selected.user?.email} />
                  {Object.entries(submittedData)
                    .filter(
                      ([k]) =>
                        !["password", "confirmPassword", "firstName", "lastName", "email"].includes(
                          k
                        )
                    )
                    .map(
                      ([key, val]) =>
                        val && (
                          <DataPoint
                            key={key}
                            label={key.replace(/([A-Z])/g, " $1")}
                            value={String(val)}
                          />
                        )
                    )}
                </div>
              </div>

              {/* Document Viewer */}
              <div className="p-8 space-y-6 bg-[var(--bg-main)]/30">
                <SectionLabel label="License / Credential Document" />
                {selected.licenseImageUrl ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-white/20 group relative">
                      {isPdf ? (
                        <div className="h-48 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
                          <FiShield className="text-4xl text-[var(--brand-blue)]" />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            PDF Documentation
                          </p>
                        </div>
                      ) : (
                        <img
                          src={selected.licenseImageUrl}
                          alt="License"
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )}
                      <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={selected.licenseImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary !py-2 !px-4 text-[9px]"
                        >
                          <FiDownload /> View Full Size
                        </a>
                      </div>
                    </div>
                    <a
                      href={selected.licenseImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full btn btn-glass !py-3 text-[10px] text-[var(--text-main)]"
                    >
                      <FiEye /> Inspect Original Document
                    </a>
                  </div>
                ) : (
                  <div className="h-48 rounded-2xl border border-dashed border-[var(--border)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    No document attached
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-8 bg-[var(--bg-main)]/50 border-t border-[var(--border)]">
              {selected.status === "PENDING" ? (
                !rejecting ? (
                  <div className="grid grid-cols-2 gap-6">
                    <button
                      onClick={() => submitReview("APPROVED")}
                      disabled={actionLoading}
                      className="btn btn-primary !py-5 shadow-emerald-500/10"
                    >
                      {actionLoading ? (
                        <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <FiCheck className="text-lg" /> Approve Provider
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setRejecting(true)}
                      className="btn btn-glass !py-5 border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <FiX className="text-lg" /> Reject Application
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-400">
                      Specify Rejection Reason
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      placeholder="e.g., Image too blurry, expired license, name mismatch..."
                      className="w-full bg-[var(--bg-main)] border border-red-500/30 rounded-2xl p-4 text-sm font-bold text-[var(--text-main)] outline-none focus:border-red-500 transition-all shadow-inner"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setRejecting(false)}
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitReview("REJECTED")}
                        disabled={actionLoading || !rejectionReason.trim()}
                        className="btn btn-primary !bg-red-500 !py-3 !px-8 text-[10px] uppercase tracking-widest shadow-red-500/20"
                      >
                        {actionLoading ? "..." : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    This request was {selected.status.toLowerCase()} by{" "}
                    {selected.reviewedBy || "system"} on{" "}
                    {new Date(selected.reviewedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card !p-5 bg-[var(--bg-card)] border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex justify-between items-center">
        <div
          className="h-10 w-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-lg text-[var(--text-muted)]"
          style={{ color: `${color}cc` }}
        >
          {icon}
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[var(--text-main)] tracking-tighter">
            {value ?? 0}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-1 w-4 bg-[var(--brand-blue)] rounded-full" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

function DataPoint({ label, value }) {
  return (
    <div className="space-y-1 overflow-hidden">
      <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-[11px] font-bold text-[var(--text-main)] truncate">{value || "—"}</p>
    </div>
  );
}
