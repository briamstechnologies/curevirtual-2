import React, { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaCheckCircle, 
  FaPercent, 
  FaShieldAlt, 
  FaCalendarAlt, 
  FaMagic, 
  FaCheck, 
  FaTimes, 
  FaTag,
  FaPills,
  FaChartLine,
  FaCreditCard
} from "react-icons/fa";

export default function PharmacySubscription() {
  const role = "PHARMACY";
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Pharmacy Partner";

  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'annual'
  const [plans, setPlans] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [subHistory, setSubHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [paystackUrl, setPaystackUrl] = useState(null);
  const [paystackRef, setPaystackRef] = useState(null);

  // Interactive ROI Calculator State
  const [monthlyOrderRevenue, setMonthlyOrderRevenue] = useState(5000); // GHS 5,000 default

  useEffect(() => {
    fetchPlansAndSubscription();
  }, []);

  const fetchPlansAndSubscription = async () => {
    try {
      setLoading(true);
      
      const [plansRes, mySubRes] = await Promise.allSettled([
        api.get("/subscriptions/plans?module=pharmacy"),
        api.get("/subscriptions/me")
      ]);

      if (plansRes.status === "fulfilled" && plansRes.value?.data?.plans) {
        setPlans(plansRes.value.data.plans);
      } else {
        // Fallback default plans if db seed is empty
        setPlans([
          {
            id: "pharmacy-monthly-default",
            module: "pharmacy",
            name: "Pharmacy Partner Plan (Monthly)",
            billingCycle: "monthly",
            priceGHS: 150,
            commissionRateOverride: 8,
            perks: ["8% Flat Commission Rate (saves 7%)", "Unlimited Monthly Medicine Order Volume", "Featured Search Placement", "24/7 Priority Partner Support"]
          },
          {
            id: "pharmacy-annual-default",
            module: "pharmacy",
            name: "Pharmacy Partner Plan (Annual)",
            billingCycle: "annual",
            priceGHS: 1500,
            commissionRateOverride: 8,
            perks: ["Save GHS 300 vs Monthly Plan", "8% Flat Commission Rate (saves 7%)", "Unlimited Monthly Medicine Order Volume", "Featured Search Placement", "24/7 Priority Partner Support"]
          }
        ]);
      }

      if (mySubRes.status === "fulfilled" && mySubRes.value?.data?.subscriptions) {
        const allSubs = mySubRes.value.data.subscriptions || [];
        const rxSubs = allSubs.filter((s) => s.plan?.module === "pharmacy");
        const activeRxSub = rxSubs.find((s) => s.status === "active");
        setMySubscription(activeRxSub || null);
        setSubHistory(rxSubs);
      }
    } catch (err) {
      console.error("Error fetching pharmacy subscription data:", err);
      toast.error("Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!plan || !plan.id) {
      toast.error("Please select a valid subscription plan.");
      return;
    }

    // PRE-CHECK GUARD: Prevent duplicate subscription checkout attempts if already active
    if (mySubscription && mySubscription.status === "active") {
      toast.warn("You already have an active subscription for the pharmacy module.");
      return;
    }

    // Open blank window to bypass browser popup blockers
    const paymentWindow = window.open("about:blank", "_blank");
    if (paymentWindow) {
      paymentWindow.document.write(
        "<h3 style='font-family:sans-serif; text-align:center; margin-top:20%; color:#10b981;'>Connecting to secure Paystack gateway... Please wait.</h3>"
      );
      paymentWindow.document.close();
    }

    try {
      setSubmittingId(plan.id);
      toast.info("Creating subscription transaction...");
      
      // Step 1: Create local subscription transaction (Status: pending_payment)
      const subRes = await api.post("/subscriptions/subscribe", { planId: plan.id });
      const transactionId = subRes.data?.transaction?.id;
      
      if (!transactionId) {
        if (paymentWindow) paymentWindow.close();
        throw new Error("Transaction record could not be created.");
      }

      // Step 2: Trigger Paystack Gateway
      const payRes = await api.post("/payments/v2/initiate", { transactionId });
      
      if (payRes.data?.authorization_url) {
        setPaystackUrl(payRes.data.authorization_url);
        setPaystackRef(payRes.data.reference);
        toast.info("Opening Paystack payment gateway...");

        if (paymentWindow) {
          paymentWindow.location.href = payRes.data.authorization_url;
        }
      } else {
        if (paymentWindow) paymentWindow.close();
        throw new Error("Payment gateway authorization URL missing.");
      }
    } catch (err) {
      if (paymentWindow) paymentWindow.close();
      console.error("Subscription error:", err);
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to process subscription");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleClosePaystack = async () => {
    setLoading(true);
    try {
      toast.info("Verifying payment status...");
      if (paystackRef) {
        await api.get(`/payments/v2/${paystackRef}/status`);
      }
      await fetchPlansAndSubscription();
      toast.success("Payment verified successfully! Subscription activated.");
    } catch (e) {
      console.error(e);
      toast.info("Payment processing. You can check back shortly.");
    } finally {
      setPaystackUrl(null);
      setPaystackRef(null);
      setLoading(false);
    }
  };

  const handleCancelAutoRenew = async (subscriptionId) => {
    try {
      await api.post("/subscriptions/cancel", { subscriptionId });
      toast.info("Auto-renewal cancelled for this subscription.");
      fetchPlansAndSubscription();
    } catch (err) {
      toast.error("Failed to cancel auto-renewal.");
    }
  };

  // ROI Calculator Calculations
  const standardTierCut = monthlyOrderRevenue * 0.15; // 15% Standard Tier 1 Rate
  const proSubscribedCut = monthlyOrderRevenue * 0.08; // 8% Flat Subscribed Rate
  const grossCommissionSaved = standardTierCut - proSubscribedCut;
  const netMonthlyProfit = grossCommissionSaved - 150; // minus GHS 150 monthly subscription fee

  const activePlan = plans.find((p) => p.billingCycle === billingCycle) || plans[0];

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-10 font-body min-h-screen text-[var(--text-main)] animate-in fade-in duration-700">
        
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-8 md:p-12 text-white shadow-2xl border border-emerald-500/30">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none text-emerald-400">
            <FaPills size={320} />
          </div>
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-4 py-1.5 text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <FaShieldAlt /> Pharmacy Partner Monetization & Subscriptions
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-200 to-yellow-300 underline decoration-emerald-400">Pharmacy Partner Plan</span>
            </h1>
            
            <p className="text-sm md:text-base text-slate-200 leading-relaxed font-medium">
              Reduce your platform commission from 15% down to a flat <strong className="text-amber-300 font-black">8% rate</strong>. Keep 92% of all your prescription & medicine revenue and enjoy priority placement.
            </p>
          </div>
        </section>

        {/* Current Active Subscription Pill (if active) */}
        {mySubscription && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                <FaCheckCircle />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Active Subscription
                </span>
                <h3 className="text-lg font-black text-[var(--text-main)]">
                  {mySubscription.plan?.name || "Pharmacy Partner Plan"}
                </h3>
                <p className="text-xs text-[var(--text-soft)]">
                  Expires on: {mySubscription.expiresAt ? new Date(mySubscription.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Never"}
                </p>
              </div>
            </div>

            {mySubscription.autoRenew && (
              <button
                onClick={() => handleCancelAutoRenew(mySubscription.id)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
              >
                Cancel Auto-Renew
              </button>
            )}
          </div>
        )}

        {/* Interactive Pharmacy ROI Calculator Widget */}
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg">
              <FaChartLine />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Pharmacy Financial ROI Calculator
              </span>
              <h2 className="text-xl font-black text-[var(--text-main)]">
                Calculate Your Commission Savings
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-[var(--text-soft)]">Monthly Medicine Revenue:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  GHS {monthlyOrderRevenue.toLocaleString()}
                </span>
              </div>

              <input
                type="range"
                min="1000"
                max="30000"
                step="500"
                value={monthlyOrderRevenue}
                onChange={(e) => setMonthlyOrderRevenue(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((monthlyOrderRevenue - 1000) / (30000 - 1000)) * 100}%, rgba(203, 213, 225, 0.3) ${((monthlyOrderRevenue - 1000) / (30000 - 1000)) * 100}%, rgba(203, 213, 225, 0.3) 100%)`
                }}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-[var(--border)] shadow-inner transition-all"
              />

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-[10px] font-bold">Standard 15% Cut</span>
                  <span className="text-rose-400 font-black text-sm">-GHS {standardTierCut.toFixed(0)}</span>
                </div>
                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-[10px] font-bold">Pharmacy Partner 8% Cut</span>
                  <span className="text-emerald-400 font-black text-sm">-GHS {proSubscribedCut.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-transparent p-6 rounded-2xl border border-emerald-500/30 text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Net Additional Monthly Profit
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                +{netMonthlyProfit > 0 ? `GHS ${netMonthlyProfit.toFixed(0)}` : "GHS 0"} / mo
              </div>
              <p className="text-[11px] text-[var(--text-soft)]">
                Save GHS {grossCommissionSaved.toFixed(0)}/mo in platform commission (- GHS 150 Plan fee)
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Switcher (Monthly vs Annual) */}
        <div className="flex justify-center">
          <div className="bg-[var(--bg-glass)] p-1.5 rounded-2xl border border-[var(--border)] flex items-center gap-2">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                billingCycle === "monthly"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
              }`}
            >
              Monthly Billing (GHS 150)
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
              }`}
            >
              Annual Billing (GHS 1,500)
              <span className="bg-amber-400 text-slate-950 text-[9px] px-2 py-0.5 rounded-full font-black">
                SAVE GHS 300
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Comparison */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Card 1: Standard Free Tier */}
          <div className="bg-[var(--bg-glass)] border border-[var(--border)] rounded-3xl p-8 space-y-6 flex flex-col justify-between hover:border-emerald-500/30 transition">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Default Option
              </span>
              <h3 className="text-2xl font-black text-[var(--text-main)]">Standard Tier Partner</h3>
              <div className="text-3xl font-black text-[var(--text-main)]">
                GHS 0 <span className="text-xs text-[var(--text-soft)] font-normal">/ month</span>
              </div>
              <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                Standard volume tier model with 15% base platform commission.
              </p>

              <div className="space-y-3 pt-4 border-t border-[var(--border)] text-xs font-medium">
                <div className="flex items-center gap-2 text-[var(--text-soft)]">
                  <FaCheck className="text-emerald-400" /> Tier 1 Commission: 15% (0–49 orders)
                </div>
                <div className="flex items-center gap-2 text-[var(--text-soft)]">
                  <FaCheck className="text-emerald-400" /> Tier 2 Commission: 12% (50–199 orders)
                </div>
                <div className="flex items-center gap-2 text-[var(--text-soft)]">
                  <FaCheck className="text-emerald-400" /> Tier 3 Commission: 10% (200+ orders)
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)] opacity-60">
                  <FaTimes /> No Priority Search Placement
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full py-4 rounded-2xl bg-[var(--bg-main)] text-[var(--text-muted)] text-xs font-black uppercase tracking-widest border border-[var(--border)] cursor-not-allowed"
            >
              Current Base Plan
            </button>
          </div>

          {/* Card 2: Pharmacy Partner Pro Plan */}
          <div className="relative bg-gradient-to-b from-emerald-500/10 via-[var(--bg-glass)] to-[var(--bg-glass)] border-2 border-emerald-500 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-2xl">
            
            <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-sky-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-bl-2xl shadow-md flex items-center gap-1.5">
              <FaMagic /> Recommended Upgrade
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Maximum Pharmacy Profits
              </span>
              <h3 className="text-2xl font-black text-[var(--text-main)]">Pharmacy Partner Plan</h3>
              <div className="text-4xl font-black text-emerald-400 font-mono">
                {billingCycle === "annual" ? "GHS 1,500" : "GHS 150"}{" "}
                <span className="text-xs text-[var(--text-soft)] font-normal">
                  / {billingCycle === "annual" ? "year (GHS 125/mo)" : "month"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                Unlock <strong className="text-emerald-400">8% flat platform commission</strong> on every medicine order regardless of volume.
              </p>

              <div className="space-y-3 pt-4 border-t border-[var(--border)] text-xs font-medium">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <FaCheckCircle /> 8% Flat Commission Rate (saves 7%)
                </div>
                <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
                  <FaCheckCircle className="text-emerald-400" /> Unlimited Monthly Medicine Order Volume
                </div>
                <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
                  <FaCheckCircle className="text-emerald-400" /> Featured Search Placement for Patients
                </div>
                <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
                  <FaCheckCircle className="text-emerald-400" /> Paystack Ghana MoMo & Card Gateway
                </div>
              </div>
            </div>

            <button
              disabled={loading || submittingId === activePlan?.id || !!mySubscription}
              onClick={() => handleSubscribe(activePlan)}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${
                mySubscription
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed opacity-90"
                  : "bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-95 text-white disabled:opacity-50"
              }`}
            >
              {mySubscription ? (
                <>
                  <FaCheckCircle className="text-emerald-400 text-sm" /> Currently Active Subscription
                </>
              ) : (
                <>
                  <FaCreditCard /> Subscribe Now via Paystack
                </>
              )}
            </button>
          </div>

        </div>

        {/* Subscription History Table */}
        {Array.isArray(subHistory) && subHistory.length > 0 && (
          <div className="bg-[var(--bg-glass)] border border-[var(--border)] p-8 rounded-3xl space-y-4">
            <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">
              Subscription Payment History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Started</th>
                    <th className="pb-3">Expires</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/50 text-xs font-medium">
                  {subHistory.map((h, i) => (
                    <tr key={h.id || i}>
                      <td className="py-3 font-bold text-[var(--text-main)]">{h.plan?.name || "Pharmacy Partner Plan"}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-black text-[10px]">
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">
                        {h.startedAt ? new Date(h.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : (h.createdAt ? new Date(h.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A")}
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{h.expiresAt ? new Date(h.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"}</td>
                      <td className="py-3 text-right">
                        {h.status === "active" && h.autoRenew && (
                          <button
                            onClick={() => handleCancelAutoRenew(h.id)}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold"
                          >
                            Cancel Auto-Renew
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paystack Payment Modal Prompt */}
        {paystackUrl && (
          <div className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-bold">
                <FaPills className="animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-[var(--text-main)]">Paystack Gateway Opened</h3>
                <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                  We have launched the secure Paystack Ghana portal in a new tab for your MoMo or card payment. Complete payment there and click verify below.
                </p>
              </div>

              <button 
                onClick={() => window.open(paystackUrl, "_blank")}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-90 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-lg"
              >
                Re-Open Paystack Tab
              </button>

              <div className="flex gap-3 border-t border-[var(--border)] pt-4">
                <button 
                  onClick={() => { setPaystackUrl(null); setPaystackRef(null); }}
                  className="flex-1 py-3 bg-slate-500/10 hover:bg-slate-500/20 text-[var(--text-soft)] rounded-xl text-xs font-bold uppercase"
                >
                  Close
                </button>
                <button 
                  onClick={handleClosePaystack}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase shadow-md"
                >
                  Verify & Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </DashboardLayout>
  );
}

