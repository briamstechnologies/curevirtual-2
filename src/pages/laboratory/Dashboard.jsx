import { useState, useEffect } from "react";
import {
  FiActivity,
  FiUsers,
  FiFileText,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";

export default function LaboratoryDashboard() {
  const labName = localStorage.getItem("userName") || "CureVirtual Lab";
  const [profileData, setProfileData] = useState(null);

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

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      api.get("/laboratory/profile", { params: { userId } })
        .then((res) => {
          if (res.data?.data) {
            setProfileData(res.data.data);
          }
        })
        .catch(() => {});

      api.get("/laboratory/stats", { params: { userId } })
        .then((res) => {
          const d = res.data?.data || res.data || {};
          setStats([
            {
              label: "Pending Tests",
              value: String(d.pendingTests ?? d.pendingOrders ?? 0),
              icon: <FiClock />,
              color: "text-amber-500",
              bg: "bg-amber-500/10",
            },
            {
              label: "Reports Uploaded",
              value: String(d.reportsUploaded ?? d.completedOrders ?? 0),
              icon: <FiCheckCircle />,
              color: "text-[var(--brand-green)]",
              bg: "bg-[var(--brand-green)]/10",
            },
            {
              label: "Total Patients",
              value: String(d.totalPatients ?? 0),
              icon: <FiUsers />,
              color: "text-[var(--brand-blue)]",
              bg: "bg-[var(--brand-blue)]/10",
            },
            {
              label: "Earnings",
              value: String(d.earnings ?? "$0"),
              icon: <FiDollarSign />,
              color: "text-[var(--brand-purple)]",
              bg: "bg-[var(--brand-purple)]/10",
            },
          ]);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <DashboardLayout role="LABORATORY" user={{ name: labName }}>
      <div className="animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter">
              Welcome,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)]">
                {profileData?.laboratoryName || profileData?.displayName || labName}
              </span>
            </h1>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1 mb-3">
              Laboratory Command Center
            </p>
            {profileData && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Laboratory ID: {profileData.referenceId || "CV-LB-GH-2026-0001"}
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Status: {profileData.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
                </span>
              </div>
            )}
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

        {/* Pending Test Requests */}
        <div className="glass-panel p-8">
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
                    ></tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-[var(--text-muted)] text-sm">
                      No pending requests at the moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
