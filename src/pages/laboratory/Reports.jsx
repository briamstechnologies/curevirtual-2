// FILE: src/pages/laboratory/LaboratoryReports.jsx

import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiFileText,
  FiEye,
  FiFilter,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function LaboratoryReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const res = await api.get("/laboratory/reports", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // DEBUG: Yeh line console mein dekho ke data kaisa aa raha hai
        console.log("Full API Response:", res.data);

        // FIX: Agar res.data ek object hai, toh uska 'data' property pick karo
        // Agar seedha array hai, toh wo use karo
        const reportsData = Array.isArray(res.data) ? res.data : res.data?.data || []; // Yahan 'data' property target ki hai

        setReports(reportsData);
      } catch (error) {
        console.error("API Error:", error);
        toast.error("Failed to load reports.");
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // =========================================
  // FILTER REPORTS
  // =========================================
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.patientName?.toLowerCase().includes(search.toLowerCase()) ||
        report.testName?.toLowerCase().includes(search.toLowerCase()) ||
        report.doctorName?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  const handleDownload = (url) => {
    if (!url || url === "#") {
      toast.info("No report file available");
      return;
    }
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout role="LABORATORY">
      <div className="animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--brand-purple)] mb-2">
            Laboratory
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--text-main)]">
            Reports Management
          </h1>
          <p className="text-sm text-[var(--text-soft)] mt-2">
            View and manage uploaded laboratory reports.
          </p>
        </div>

        {/* FILTERS */}
        <div className="glass-panel p-5 rounded-[2rem] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
              />
            </div>
            <div className="relative">
              <FiFilter className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none appearance-none"
              >
                <option value="ALL">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                Total Reports:{" "}
                <span className="ml-2 text-[var(--brand-purple)]">{filteredReports.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="glass-panel p-6 rounded-[2rem] overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <FiFileText className="text-2xl text-[var(--brand-purple)]" />
            <h2 className="text-xl font-black uppercase tracking-tight text-[var(--text-main)]">
              Laboratory Reports
            </h2>
          </div>

          {loading ? (
            <div className="py-20 text-center font-bold text-[var(--text-muted)]">
              Loading reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-20 text-center text-sm text-[var(--text-muted)] font-bold uppercase tracking-widest">
              No reports found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Report ID
                    </th>
                    <th className="text-left py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Patient
                    </th>
                    <th className="text-left py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Test
                    </th>
                    <th className="text-left py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Doctor
                    </th>
                    <th className="text-left py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Date
                    </th>
                    <th className="text-left py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Status
                    </th>
                    <th className="text-right py-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-[var(--border)]/40 hover:bg-[var(--bg-card)] transition-all"
                    >
                      <td className="py-5 text-sm font-black text-[var(--text-main)]">
                        {report.id}
                      </td>
                      <td className="py-5 text-sm font-bold text-[var(--text-main)]">
                        {report.patientName}
                      </td>
                      <td className="py-5 text-sm text-[var(--text-soft)] font-bold">
                        {report.testName}
                      </td>
                      <td className="py-5 text-sm text-[var(--text-soft)] font-bold">
                        {report.doctorName}
                      </td>
                      <td className="py-5 text-sm text-[var(--text-soft)] font-bold">
                        {report.createdAt}
                      </td>
                      <td className="py-5">
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === "COMPLETED" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}
                        >
                          {report.status === "COMPLETED" ? <FiCheckCircle /> : <FiClock />}
                          {report.status}
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button className="h-11 w-11 rounded-2xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] flex items-center justify-center hover:scale-105 transition-all">
                            <FiEye />
                          </button>
                          <button
                            onClick={() => handleDownload(report.reportUrl)}
                            className="h-11 w-11 rounded-2xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] flex items-center justify-center hover:scale-105 transition-all"
                          >
                            <FiDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
