import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "../../Lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaBuilding,
  FaUsers,
  FaUserPlus,
  FaTrash,
  FaShieldAlt,
  FaCalculator,
  FaTag,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync,
  FaTimes
} from "react-icons/fa";

export default function CorporateAccounts() {
  const role = localStorage.getItem("role") || "ADMIN";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Admin";

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [maxSeats, setMaxSeats] = useState(10); // Minimum 5 enforced
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'annual'

  // Modal State for Roster Management
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [addingSeat, setAddingSeat] = useState(false);
  const [revokingSeatId, setRevokingSeatId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null); // { seatId, email }
  const [deleteAccountTarget, setDeleteAccountTarget] = useState(null); // { id, name }
  const [deletingAccount, setDeletingAccount] = useState(false);

  const performDeleteAccount = async () => {
    if (!deleteAccountTarget) return;
    const { id, name } = deleteAccountTarget;

    try {
      setDeletingAccount(true);
      const res = await api.delete(`/corporate/accounts/${id}`);
      if (res.data?.success) {
        toast.success(`Corporate account '${name}' deleted successfully!`);
        fetchAccounts();
      }
    } catch (err) {
      console.error("Delete account error:", err);
      toast.error(err.response?.data?.message || "Failed to delete corporate account");
    } finally {
      setDeletingAccount(false);
      setDeleteAccountTarget(null);
    }
  };

  // Calculate Tier and Pricing based on Spec Section 6
  const calculateTierInfo = (seats, cycle) => {
    let tier = "small";
    let basePrice = 20.0; // Small: GHS 15-25 (recommend 20)

    if (seats >= 200) {
      tier = "large";
      basePrice = 12.0; // Large: GHS 8-15 (recommend 12)
    } else if (seats >= 50) {
      tier = "mid";
      basePrice = 14.0; // Mid: GHS 10-18 (recommend 14)
    } else {
      tier = "small";
      basePrice = 20.0;
    }

    const pricePerSeat = cycle === "annual" ? basePrice * 0.85 : basePrice;
    const monthlyTotal = seats * pricePerSeat;
    const annualTotal = monthlyTotal * 12;
    const annualSavings = cycle === "annual" ? (seats * basePrice * 12) - annualTotal : 0;

    return {
      tier,
      basePrice,
      pricePerSeat,
      monthlyTotal,
      annualTotal,
      annualSavings
    };
  };

  const currentTierInfo = calculateTierInfo(maxSeats, billingCycle);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/corporate/accounts");
      const list = Array.isArray(res.data?.accounts) ? res.data.accounts : [];
      setAccounts(list);
    } catch (err) {
      console.error("Failed to load corporate accounts:", err);
      toast.error("Failed to load corporate accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    if (!companyName.trim() || !contactEmail.trim()) {
      toast.error("Please enter both Company Name and Contact Email");
      return;
    }

    if (maxSeats < 5) {
      toast.error("Minimum 5 seats required for corporate accounts");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        maxSeats: Number(maxSeats),
        billingCycle
      };

      const res = await api.post("/corporate/accounts", payload);
      if (res.data?.success) {
        toast.success(`Corporate account '${companyName}' created successfully!`);
        setCompanyName("");
        setContactEmail("");
        setMaxSeats(10);
        setBillingCycle("monthly");
        fetchAccounts();
      }
    } catch (err) {
      console.error("Create corporate account error:", err);
      toast.error(err.response?.data?.message || "Failed to create corporate account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAccountModal = async (accountId) => {
    try {
      const res = await api.get(`/corporate/accounts/${accountId}`);
      if (res.data?.account) {
        setSelectedAccount(res.data.account);
      }
    } catch (err) {
      toast.error("Failed to load account roster details");
    }
  };

  const handleAddEmployeeSeat = async (e) => {
    e.preventDefault();
    if (!newEmployeeEmail.trim() || !selectedAccount) return;

    try {
      setAddingSeat(true);
      const res = await api.post(`/corporate/accounts/${selectedAccount.id}/seats`, {
        employeeEmail: newEmployeeEmail.trim().toLowerCase()
      });

      if (res.data?.success) {
        toast.success(`Employee ${newEmployeeEmail} assigned to seat successfully!`);
        setNewEmployeeEmail("");
        // Refresh modal account details and main list
        handleOpenAccountModal(selectedAccount.id);
        fetchAccounts();
      }
    } catch (err) {
      console.error("Add seat error:", err);
      toast.error(err.response?.data?.message || "Failed to assign employee seat");
    } finally {
      setAddingSeat(false);
    }
  };

  const performRevokeSeat = async () => {
    if (!revokeTarget || !selectedAccount) return;
    const { seatId, email } = revokeTarget;

    try {
      setRevokingSeatId(seatId);
      const res = await api.delete(`/corporate/accounts/${selectedAccount.id}/seats/${seatId}`);
      if (res.data?.success) {
        toast.success(`Seat revoked for ${email}`);
        handleOpenAccountModal(selectedAccount.id);
        fetchAccounts();
      }
    } catch (err) {
      console.error("Revoke seat error:", err);
      toast.error(err.response?.data?.message || "Failed to revoke seat");
    } finally {
      setRevokingSeatId(null);
      setRevokeTarget(null);
    }
  };

  return (
    <div className="flex bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen">
      <Sidebar role={role} />
      <div className="flex-1 min-h-screen">
        <Topbar userName={userName} />
        <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-500">

          {/* Page Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-sky-950 p-8 rounded-3xl text-white shadow-2xl border border-sky-500/30">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 px-4 py-1 text-xs font-black uppercase tracking-widest backdrop-blur-md">
                <FaBuilding /> Section 6 — B2B Corporate Accounts
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Corporate Seat-Based Accounts
              </h1>
              <p className="text-sm text-slate-300">
                Provision employer health packages, manage contracted employee seats, and monitor tiered B2B subscription contracts.
              </p>
            </div>

            <button
              onClick={fetchAccounts}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition border border-white/20 flex items-center justify-center gap-2 self-start md:self-auto"
            >
              <FaSync className={loading ? "animate-spin" : ""} /> Refresh Accounts
            </button>
          </div>

          {/* Onboarding Form & Tier Calculator Grid */}
          <div className="grid lg:grid-cols-12 gap-8">
            
            {/* Form Section */}
            <div className="lg:col-span-6 bg-[var(--bg-glass)] border border-[var(--border)] p-8 rounded-3xl shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center text-lg">
                  <FaBuilding />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                    B2B Onboarding
                  </span>
                  <h2 className="text-xl font-black text-[var(--text-main)]">
                    Create Corporate Account
                  </h2>
                </div>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Ghana Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] mb-2">
                    HR / Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="hr@acme.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                  />
                </div>

                {/* Contracted Seats Input & Slider */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-[var(--text-soft)]">Contracted Employee Seats:</span>
                    <span className="text-lg font-black text-sky-400 font-mono">
                      {maxSeats} Seats {maxSeats < 5 && <span className="text-rose-400 text-xs">(Min 5 required)</span>}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="500"
                    step="5"
                    value={maxSeats}
                    onChange={(e) => setMaxSeats(Number(e.target.value))}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--bg-main)] border border-[var(--border)]"
                  />

                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-bold">
                    <span>5 Seats (Min)</span>
                    <span>50 Seats (Mid)</span>
                    <span>200+ Seats (Large)</span>
                  </div>
                </div>

                {/* Billing Cycle Switcher */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Billing Cycle
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("monthly")}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        billingCycle === "monthly"
                          ? "bg-sky-500 text-white shadow-md"
                          : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("annual")}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        billingCycle === "annual"
                          ? "bg-sky-500 text-white shadow-md"
                          : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      Annual Billing
                      <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                        -15%
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || maxSeats < 5}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Provisioning Account..." : "Provision Corporate Account"}
                </button>
              </form>
            </div>

            {/* Widget Section: Seat Pricing Tier Preview */}
            <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-sky-500/30 p-8 rounded-3xl text-white shadow-xl space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg">
                      <FaCalculator />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                        Section 6 Tier Calculator
                      </span>
                      <h3 className="text-xl font-black text-white">Pricing & Contract Preview</h3>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                    currentTierInfo.tier === "large"
                      ? "bg-purple-500/20 text-purple-300 border-purple-400/30"
                      : currentTierInfo.tier === "mid"
                        ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                        : "bg-sky-500/20 text-sky-300 border-sky-400/30"
                  }`}>
                    {currentTierInfo.tier.toUpperCase()} TIER
                  </span>
                </div>

                {/* Tier Breakdown Cards (Interactive Tier Selector Buttons) */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setMaxSeats(10)}
                    title="Jump slider to Small Tier (5–49 seats)"
                    className={`p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      currentTierInfo.tier === "small"
                        ? "bg-sky-500/20 border-sky-400 text-white font-bold ring-2 ring-sky-500/40 shadow-lg"
                        : "bg-white/5 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-black">Small Tier</span>
                    <span className="text-xs">5–49 Seats</span>
                    <span className="block font-mono text-sky-300 font-bold mt-1">GHS 20.00/st</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaxSeats(50)}
                    title="Jump slider to Mid Tier (50–199 seats)"
                    className={`p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      currentTierInfo.tier === "mid"
                        ? "bg-amber-500/20 border-amber-400 text-white font-bold ring-2 ring-amber-500/40 shadow-lg"
                        : "bg-white/5 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-black">Mid Tier</span>
                    <span className="text-xs">50–199 Seats</span>
                    <span className="block font-mono text-amber-300 font-bold mt-1">GHS 14.00/st</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaxSeats(200)}
                    title="Jump slider to Large Tier (200+ seats)"
                    className={`p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      currentTierInfo.tier === "large"
                        ? "bg-purple-500/20 border-purple-400 text-white font-bold ring-2 ring-purple-500/40 shadow-lg"
                        : "bg-white/5 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-black">Large Tier</span>
                    <span className="text-xs">200+ Seats</span>
                    <span className="block font-mono text-purple-300 font-bold mt-1">GHS 12.00/st</span>
                  </button>
                </div>

                {/* Financial Summary Box */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 font-mono">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Rate per Seat:</span>
                    <span className="text-white font-bold">
                      GHS {currentTierInfo.pricePerSeat.toFixed(2)} / seat / month
                      {billingCycle === "annual" && <span className="text-amber-300 text-[10px] ml-1">(-15% Disc)</span>}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Contracted Seats:</span>
                    <span className="text-white font-bold">{maxSeats} Employees</span>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex justify-between items-center text-sm font-black">
                    <span className="text-sky-300">Monthly Contract Value:</span>
                    <span className="text-emerald-400 text-lg">
                      GHS {currentTierInfo.monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Annual Contract Value:</span>
                    <span className="text-white">
                      GHS {currentTierInfo.annualTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {billingCycle === "annual" && currentTierInfo.annualSavings > 0 && (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 p-2.5 rounded-xl text-emerald-300 text-[11px] text-center font-sans font-bold">
                      🎉 Annual Billing Discount Saves Employer GHS {currentTierInfo.annualSavings.toFixed(2)} / year!
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <FaCheckCircle /> Employees automatically receive Family-Health-Plan benefits (20% Consult Discount).
                </div>
              </div>
            </div>

          </div>

          {/* Roster List of Existing Corporate Accounts */}
          <div className="bg-[var(--bg-glass)] border border-[var(--border)] p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                  Provisioned Accounts
                </span>
                <h3 className="text-xl font-black text-[var(--text-main)]">
                  Active Corporate Employers
                </h3>
              </div>

              <span className="text-xs font-bold text-[var(--text-soft)] bg-[var(--bg-main)] px-4 py-2 rounded-xl border border-[var(--border)]">
                Total Accounts: {accounts.length}
              </span>
            </div>

            {loading ? (
              <p className="text-center py-10 text-[var(--text-soft)]">Loading corporate accounts...</p>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-2xl text-[var(--text-soft)] space-y-2">
                <FaBuilding className="mx-auto text-3xl opacity-40 text-sky-400" />
                <p className="text-sm font-bold">No Corporate Accounts Provisioned Yet</p>
                <p className="text-xs">Use the form above to onboard an employer with contracted employee seats.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      <th className="pb-3">Company</th>
                      <th className="pb-3">Contact Email</th>
                      <th className="pb-3">Seat Utilization</th>
                      <th className="pb-3">Tier</th>
                      <th className="pb-3">Cycle</th>
                      <th className="pb-3">Price / Seat</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]/50 text-xs font-medium">
                    {accounts.map((acc) => {
                      const activeCount = acc.activeEmployees ?? (Array.isArray(acc.seats) ? acc.seats.length : 0);
                      const isFull = activeCount >= acc.maxSeats;

                      return (
                        <tr key={acc.id} className="hover:bg-[var(--bg-main)]/50 transition">
                          <td className="py-4 font-black text-[var(--text-main)] text-sm">{acc.companyName}</td>
                          <td className="py-4 text-[var(--text-soft)]">{acc.contactEmail}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${isFull ? "text-rose-400" : "text-emerald-400"}`}>
                                {activeCount} / {acc.maxSeats}
                              </span>
                              <div className="w-16 h-2 rounded-full bg-[var(--bg-main)] overflow-hidden border border-[var(--border)]">
                                <div
                                  className={`h-full ${isFull ? "bg-rose-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(100, (activeCount / acc.maxSeats) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg text-[10px] font-black uppercase">
                              {acc.seatTier || "small"}
                            </span>
                          </td>
                          <td className="py-4 uppercase text-[10px] font-bold text-[var(--text-soft)]">
                            {acc.billingCycle || "monthly"}
                          </td>
                          <td className="py-4 font-mono font-bold text-emerald-400">
                            GHS {Number(acc.pricePerSeatGHS || 20).toFixed(2)}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleOpenAccountModal(acc.id)}
                                className="px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <FaUsers /> Manage Seats
                              </button>
                              <button
                                onClick={() => setDeleteAccountTarget({ id: acc.id, name: acc.companyName })}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                title="Delete Corporate Account"
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Roster Modal for Employee Seat Assign & Revoke */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                  Employee Seat Allocation
                </span>
                <h3 className="text-2xl font-black text-[var(--text-main)]">
                  {selectedAccount.companyName}
                </h3>
                <p className="text-xs text-[var(--text-soft)] mt-0.5">
                  Contact: {selectedAccount.contactEmail} • Max Capacity: {selectedAccount.maxSeats} Seats
                </p>
              </div>

              <button
                onClick={() => setSelectedAccount(null)}
                className="w-9 h-9 rounded-full bg-[var(--bg-main)] hover:bg-rose-500/20 text-[var(--text-soft)] hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Capacity Bar */}
            <div className="bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-soft)]">
                Assigned Employees:
              </span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {selectedAccount.seats?.length || 0} / {selectedAccount.maxSeats} Seats Occupied
              </span>
            </div>

            {/* Assign Seat Form */}
            <form onSubmit={handleAddEmployeeSeat} className="flex gap-3">
              <input
                type="email"
                required
                placeholder="Enter employee email (e.g. john@acme.com)..."
                value={newEmployeeEmail}
                onChange={(e) => setNewEmployeeEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] text-xs font-semibold outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={addingSeat || (selectedAccount.seats?.length || 0) >= selectedAccount.maxSeats}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <FaUserPlus /> {addingSeat ? "Assigning..." : "Assign Seat"}
              </button>
            </form>

            {/* Roster Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Assigned Employee Roster
              </h4>

              {!Array.isArray(selectedAccount.seats) || selectedAccount.seats.length === 0 ? (
                <p className="text-center py-6 text-xs text-[var(--text-soft)] italic bg-[var(--bg-main)] rounded-2xl border border-[var(--border)]">
                  No employee seats assigned yet. Enter an employee email above to grant 20% consultation coverage.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        <th className="pb-2">Employee Email</th>
                        <th className="pb-2">Account Link</th>
                        <th className="pb-2 text-right">Revoke</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40 text-xs font-medium">
                      {selectedAccount.seats.map((st) => (
                        <tr key={st.id}>
                          <td className="py-2.5 font-bold text-[var(--text-main)]">{st.employeeEmail}</td>
                          <td className="py-2.5">
                            {st.employeeUser ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-black">
                                Linked Patient User
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-black">
                                Pending User Signup
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              disabled={revokingSeatId === st.id}
                              onClick={() => setRevokeTarget({ seatId: st.id, email: st.employeeEmail })}
                              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                            >
                              <FaTrash className="inline mr-1" /> Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedAccount(null)}
                className="px-6 py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text-main)] text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close Roster
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Revoke Seat Custom Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/80 z-[10000] backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-rose-500/30 rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl font-bold">
              <FaTrash className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[var(--text-main)]">Revoke Employee Seat?</h3>
              <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                Are you sure you want to revoke the seat for <strong className="text-rose-400 font-mono">{revokeTarget.email}</strong>? They will lose active corporate health coverage and 20% consultation discounts.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRevokeTarget(null)}
                className="flex-1 py-3 bg-[var(--bg-main)] hover:bg-surface-container-high border border-[var(--border)] text-[var(--text-main)] rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!!revokingSeatId}
                onClick={performRevokeSeat}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-rose-500/25 disabled:opacity-50 cursor-pointer"
              >
                {revokingSeatId ? "Revoking..." : "Yes, Revoke Seat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Corporate Account Custom Confirmation Modal */}
      {deleteAccountTarget && (
        <div className="fixed inset-0 bg-black/80 z-[10000] backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-rose-500/30 rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl font-bold">
              <FaTrash className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[var(--text-main)]">Delete Corporate Account?</h3>
              <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                Are you sure you want to permanently delete corporate account <strong className="text-rose-400 font-bold">{deleteAccountTarget.name}</strong>? All assigned employee seats will also be deleted.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteAccountTarget(null)}
                className="flex-1 py-3 bg-[var(--bg-main)] hover:bg-surface-container-high border border-[var(--border)] text-[var(--text-main)] rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deletingAccount}
                onClick={performDeleteAccount}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-rose-500/25 disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
