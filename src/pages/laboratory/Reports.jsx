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

  // =========================================
  // FETCH REPORTS
  // =========================================
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

        setReports(res.data || []);
      } catch (error) {
        console.error(error);

        // Dummy fallback data
        setReports([
          {
            id: "REP-1001",
            patientName: "Ali Khan",
            testName: "CBC Test",
            doctorName: "Dr. Ahmed",
            status: "COMPLETED",
            createdAt: "2025-05-12",
            reportUrl: "#",
          },
          {
            id: "REP-1002",
            patientName: "Sara Noor",
            testName: "Blood Sugar",
            doctorName: "Dr. Usman",
            status: "PENDING",
            createdAt: "2025-05-14",
            reportUrl: "#",
          },
          {
            id: "REP-1003",
            patientName: "Hamza Ali",
            testName: "Lipid Profile",
            doctorName: "Dr. Bilal",
            status: "COMPLETED",
            createdAt: "2025-05-16",
            reportUrl: "#",
          },
        ]);
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
        report.patientName
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        report.testName
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        report.doctorName
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  // =========================================
  // DOWNLOAD
  // =========================================
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
          {/* SEARCH */}
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

          {/* FILTER */}
          <div className="relative">
            <FiFilter className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none appearance-none"
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">
                Completed
              </option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* STATS */}
          <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
              Total Reports:
              <span className="ml-2 text-[var(--brand-purple)]">
                {filteredReports.length}
              </span>
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

        {/* LOADING */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="h-10 w-10 border-4 border-[var(--brand-purple)]/20 border-t-[var(--brand-purple)] rounded-full animate-spin"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-widest">
              No reports found
            </p>
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
                    {/* ID */}
                    <td className="py-5">
                      <p className="text-sm font-black text-[var(--text-main)]">
                        {report.id}
                      </p>
                    </td>

                    {/* PATIENT */}
                    <td className="py-5">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {report.patientName}
                      </p>
                    </td>

                    {/* TEST */}
                    <td className="py-5">
                      <p className="text-sm text-[var(--text-soft)] font-bold">
                        {report.testName}
                      </p>
                    </td>

                    {/* DOCTOR */}
                    <td className="py-5">
                      <p className="text-sm text-[var(--text-soft)] font-bold">
                        {report.doctorName}
                      </p>
                    </td>

                    {/* DATE */}
                    <td className="py-5">
                      <p className="text-sm text-[var(--text-soft)] font-bold">
                        {report.createdAt}
                      </p>
                    </td>

                    {/* STATUS */}
                    <td className="py-5">
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          report.status === "COMPLETED"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {report.status === "COMPLETED" ? (
                          <FiCheckCircle />
                        ) : (
                          <FiClock />
                        )}

                        {report.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-5">
                      <div className="flex justify-end gap-3">
                        <button
                          className="h-11 w-11 rounded-2xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] flex items-center justify-center hover:scale-105 transition-all"
                          title="View"
                        >
                          <FiEye />
                        </button>

                        <button
                          onClick={() =>
                            handleDownload(report.reportUrl)
                          }
                          className="h-11 w-11 rounded-2xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] flex items-center justify-center hover:scale-105 transition-all"
                          title="Download"
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