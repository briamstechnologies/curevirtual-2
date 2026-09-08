import { useState, useEffect } from "react";
import {
  FiActivity,
  FiUsers,
  FiFileText,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiPercent,
  FiArrowRight,
  FiShield
} from "react-icons/fi";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";

export default function LaboratoryDashboard() {
  const labName = localStorage.getItem("userName") || "CureVirtual Lab";
  const [profileData, setProfileData] = useState(null);
  const [volumeTier, setVolumeTier] = useState({
    tierName: "Tier 1 (0–49 Orders)",
    commissionPct: 15,
    isSubscribed: false,
    nextTierMin: 50,
    ordersToNextTier: 50,
    progressPct: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [financials, setFinancials] = useState({
    grossEarningsGHS: 0,
    platformFeesGHS: 0,
    netEarningsGHS: 0
  });

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
      label: "30-Day Orders",
      value: "0",
      icon: <FiTrendingUp />,
      color: "text-[var(--brand-purple)]",
      bg: "bg-[var(--brand-purple)]/10",
    },
    {
      label: "Net Earnings",
      value: "GHS 0.00",
      icon: <FiDollarSign />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ]);

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
              label: "30-Day Orders",
              value: String(d.trailing30Orders ?? 0),
              icon: <FiTrendingUp />,
              color: "text-[var(--brand-purple)]",
              bg: "bg-[var(--brand-purple)]/10",
            },
            {
              label: "Net Earnings",
              value: d.earnings || `GHS ${(d.netEarningsGHS || 0).toFixed(2)}`,
              icon: <FiDollarSign />,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
          ]);

          if (d.volumeTier) setVolumeTier(d.volumeTier);
          if (d.recentOrders) setRecentOrders(d.recentOrders);
          setFinancials({
            grossEarningsGHS: d.grossEarningsGHS || 0,
            platformFeesGHS: d.platformFeesGHS || 0,
            netEarningsGHS: d.netEarningsGHS || 0
          });
        })
        .catch(() => {});
    }
  }, []);

  return (
    <DashboardLayout role="LABORATORY" user={{ name: labName }}>
      <div className="animate-in fade-in duration-700 space-y-8 font-body">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-transparent p-6 rounded-3xl border border-[var(--border)]">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter">
              Welcome,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)]">
                {profileData?.laboratoryName || profileData?.displayName || labName}
              </span>
            </h1>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1 mb-2">
              Laboratory Command Center & Volume Tier Manager
            </p>
            {profileData && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                  ID: {profileData.referenceId || "CV-LB-GH-2026-0001"}
                </span>
                <span className="px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Status: {profileData.verificationStatus === "VERIFIED" ? "Verified" : "Active Partner"}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link
              to="/laboratory/subscription"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-90 transition flex items-center gap-2"
            >
              <FiShield /> Lab Partner Plan (8% Rate)
            </Link>
            <Link
              to="/laboratory/tests"
              className="px-5 py-2.5 rounded-2xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-main)] font-black text-xs uppercase tracking-wider hover:bg-[var(--bg-main)] transition flex items-center gap-2"
            >
              <FiActivity /> Manage Tests
            </Link>
          </div>
        </div>

        {/* Spec Section 5: Laboratory Volume Commission Tier Widget */}
        <div className="bg-gradient-to-r from-purple-500/15 via-sky-500/10 to-emerald-500/10 border border-purple-500/30 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <FiPercent /> Spec Section 5 Tier Engine
                </span>
                {volumeTier.isSubscribed ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Pro Subscribed (8% Flat Rate)
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Standard Volume Tier
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                Current Commission Rate: <span className="text-purple-400">{volumeTier.commissionPct}%</span> ({volumeTier.tierName})
              </h2>
            </div>

            {!volumeTier.isSubscribed && (
              <Link
                to="/laboratory/subscription"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-sky-500 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition flex items-center gap-2"
              >
                Upgrade to 8% Flat Rate <FiArrowRight />
              </Link>
            )}
          </div>

          {/* Trailing 30-Day Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[var(--text-soft)]">Trailing 30-Day Lab Orders: <strong className="text-[var(--text-main)]">{stats[2]?.value || 0} orders</strong></span>
              {volumeTier.isSubscribed ? (
                <span className="text-emerald-400 font-black">Unlimited Orders @ 8% Flat Rate</span>
              ) : volumeTier.ordersToNextTier > 0 ? (
                <span className="text-purple-400 font-black">{volumeTier.ordersToNextTier} more orders to unlock next tier rate</span>
              ) : (
                <span className="text-emerald-400 font-black">Top Tier Reached (10%)</span>
              )}
            </div>

            <div className="w-full bg-[var(--bg-main)] rounded-full h-3.5 p-0.5 border border-[var(--border)] overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-md"
                style={{ width: `${volumeTier.progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] pt-1 text-center">
              <div className="text-left">Tier 1: 0–49 Orders (15%)</div>
              <div>Tier 2: 50–199 Orders (12%)</div>
              <div className="text-right">Tier 3: 200+ Orders (10%)</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Lab Earnings & Order History Table */}
        <div className="glass-panel p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                <FiFileText className="text-[var(--brand-purple)]" /> Recent Lab Orders & Tier Commission Payouts
              </h2>
              <p className="text-xs text-[var(--text-soft)] mt-0.5">
                Financial breakdown showing gross order revenue, applied commission %, platform fee, and net lab payout.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              Net Earnings: GHS {financials.netEarningsGHS.toFixed(2)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Patient / Test
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Date
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Gross Amount
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Applied Tier %
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Platform Fee
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">
                    Net Lab Payout
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50 text-xs font-medium">
                {recentOrders.length > 0 ? (
                  recentOrders.map((ord, i) => (
                    <tr
                      key={ord.id || i}
                      className="hover:bg-[var(--bg-main)]/30 transition-colors"
                    >
                      <td className="py-4">
                        <div className="font-bold text-[var(--text-main)]">{ord.patientName}</div>
                        <div className="text-[10px] text-purple-400">{ord.testName}</div>
                      </td>
                      <td className="py-4 text-[var(--text-soft)]">
                        {new Date(ord.orderedAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-bold text-[var(--text-main)]">
                        GHS {ord.amountGHS.toFixed(2)}
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md font-black text-[10px]">
                          {ord.commissionPct}%
                        </span>
                      </td>
                      <td className="py-4 text-rose-400 font-bold">
                        -GHS {ord.platformFeeGHS.toFixed(2)}
                      </td>
                      <td className="py-4 text-right font-black text-emerald-400">
                        GHS {ord.netPayoutGHS.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-[var(--text-muted)] text-sm">
                      No lab orders recorded yet. As orders are completed, financial tier payouts will display here.
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

