import { useState, useEffect } from "react";
import {
  FiActivity,
  FiUsers,
  FiFileText,
  FiDollarSign,
  FiClock,
  FiUploadCloud,
  FiCheckCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function LaboratoryDashboard() {
  const labName = localStorage.getItem("userName") || "CureVirtual Lab";

  // State for dynamic data
  const [stats, setStats] = useState([
    {
      label: "Pending Tests",
      value: "0",
      icon: <FiClock />,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Reports Uploaded",
      value: "0",
      icon: <FiCheckCircle />,
      color: "text-[var(--brand-green)]",
      bg: "bg-[var(--brand-green)]/10",
    },
    {
      label: "Total Patients",
      value: "0",
      icon: <FiUsers />,
      color: "text-[var(--brand-blue)]",
      bg: "bg-[var(--brand-blue)]/10",
    },
    {
      label: "Earnings",
      value: "$0",
      icon: <FiDollarSign />,
      color: "text-[var(--brand-purple)]",
      bg: "bg-[var(--brand-purple)]/10",
    },
  ]);

  const [pendingRequests, setPendingRequests] = useState([]);

  // Yahan aap API call add karenge useEffect use karke
  useEffect(() => {
    // fetchData();
  }, []);

  return (
    <DashboardLayout role="LABORATORY" user={{ name: labName }}>
      <div className="animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter">
              Welcome,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)]">
                {labName}
              </span>
            </h1>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1">
              Laboratory Command Center
            </p>
          </div>
          <Link
            to="/laboratory/tests"
            className="btn btn-primary bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] border-none shadow-lg shadow-[var(--brand-purple)]/20 text-[10px]"
          >
            <FiActivity className="mr-2 text-sm" /> VIEW ALL TESTS
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="glass-panel p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform cursor-pointer"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stat.bg} ${stat.color} shadow-inner`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">
                  {stat.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Test Requests Table */}
          <div className="lg:col-span-2 glass-panel p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                <FiFileText className="text-[var(--brand-purple)]" /> Pending Test Requests
              </h2>
              <Link
                to="#"
                className="text-[10px] font-black text-[var(--brand-purple)] uppercase tracking-widest hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      Patient
                    </th>
                    <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      Test Type
                    </th>
                    <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      Status
                    </th>
                    <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((req, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card)] transition-colors group"
                      >
                        {/* Table data rows */}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-10 text-center text-[var(--text-muted)] text-sm"
                      >
                        No pending requests at the moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="glass-panel p-8 bg-gradient-to-br from-[var(--brand-purple)]/5 to-transparent border-[var(--brand-purple)]/20">
              <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] hover:border-[var(--brand-purple)] transition-all group">
                  <span className="text-[10px] font-black text-[var(--text-soft)] uppercase tracking-widest group-hover:text-[var(--brand-purple)]">
                    Register Walk-in Patient
                  </span>
                  <FiUsers className="text-[var(--text-muted)] group-hover:text-[var(--brand-purple)]" />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] hover:border-[var(--brand-purple)] transition-all group">
                  <span className="text-[10px] font-black text-[var(--text-soft)] uppercase tracking-widest group-hover:text-[var(--brand-purple)]">
                    Update Test Pricing
                  </span>
                  <FiDollarSign className="text-[var(--text-muted)] group-hover:text-[var(--brand-purple)]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
