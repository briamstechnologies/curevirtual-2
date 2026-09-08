import { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaCheckCircle, 
  FaStethoscope, 
  FaChartLine, 
  FaPercent, 
  FaStar, 
  FaShieldAlt, 
  FaCalendarAlt, 
  FaMagic,
  FaCheck,
  FaTimes,
  FaTag,
  FaArrowDown
} from "react-icons/fa";

export default function DoctorSubscription() {
  const role = "DOCTOR";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const [paystackUrl, setPaystackUrl] = useState(null);
  const [paystackRef, setPaystackRef] = useState(null);
  const [activePlans, setActivePlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [cancellingId, setCancellingId] = useState(null);

  // Doctor Financial ROI Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState(2500); // GHS revenue per month

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, myRes] = await Promise.all([
        api.get("/subscriptions/plans?module=doctor"),
        api.get("/subscriptions/me"),
      ]);
      setActivePlans(plansRes.data?.plans || []);
      setMySubscriptions(myRes.data?.subscriptions || []);
    } catch (err) {
      console.error("Doctor subscription load error:", err);
      toast.error("Failed to load doctor subscription plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubscribePlan = useCallback(async (planId) => {
    if (activeSub && activeSub.status === "active") {
      toast.warn("You already have an active Doctor Pro subscription.");
      return;
    }

    // Open blank window to bypass modern browser popup blockers
    const paymentWindow = window.open("about:blank", "_blank");
    if (paymentWindow) {
      paymentWindow.document.write("<h3 style='font-family:sans-serif; text-align:center; margin-top:20%; color:#0ea5e9;'>Connecting to secure Paystack gateway... Please wait.</h3>");
      paymentWindow.document.close();
    }

    try {
      setProcessing(true);
      toast.info("Creating subscription...");
      
      const subRes = await api.post("/subscriptions/subscribe", { planId });
      const transactionId = subRes.data?.transaction?.id;

      if (!transactionId) {
        if (paymentWindow) paymentWindow.close();
        throw new Error("Transaction record could not be created.");
      }

      const initRes = await api.post("/payments/v2/initiate", { transactionId });
      if (initRes.data?.authorization_url) {
        setPaystackUrl(initRes.data.authorization_url);
        setPaystackRef(initRes.data.reference);
        toast.info("Opening Paystack payment gateway...");
        
        if (paymentWindow) {
          paymentWindow.location.href = initRes.data.authorization_url;
        }
      } else {
        if (paymentWindow) paymentWindow.close();
        throw new Error("Payment gateway authorization URL missing.");
      }
    } catch (err) {
      if (paymentWindow) paymentWindow.close();
      console.error("Subscribe Error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to start checkout";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleCancelSubscription = async (subscriptionId) => {
    if (!window.confirm("Are you sure you want to cancel auto-renew for your Doctor Pro subscription?")) return;
    try {
      setCancellingId(subscriptionId);
      await api.post("/subscriptions/cancel", { subscriptionId });
      toast.success("Subscription auto-renew cancelled successfully");
      await load();
    } catch (err) {
      console.error("Cancel Error:", err);
      toast.error(err?.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setCancellingId(null);
    }
  };

  const handleClosePaystack = async () => {
    setLoading(true);
    try {
      toast.info("Verifying payment status...");
      await api.get(`/payments/v2/${paystackRef}/status`);
      await load();
      toast.success("Payment verified successfully!");
    } catch (e) {
      console.error(e);
      toast.info("Payment processing. You can check back shortly.");
    } finally {
      setPaystackUrl(null);
      setPaystackRef(null);
      setLoading(false);
    }
  };

  const activeSub = mySubscriptions.find(sub => sub.status === "active");

  // Financial ROI Calculator Math
  const standardCommissionCost = monthlyRevenue * 0.12; // 12%
  const proCommissionCost = monthlyRevenue * 0.08;       // 8%
  const monthlyCommissionSavings = standardCommissionCost - proCommissionCost; // 4% savings
  const proPlanMonthlyFee = billingCycle === "monthly" ? 100 : (1000 / 12);
  const netMonthlyProfitIncrease = monthlyCommissionSavings - proPlanMonthlyFee;

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]/90 text-[var(--text-main)] font-body">
      <Sidebar role={role} />
      <div className="flex-1 min-h-screen overflow-y-auto">
        <Topbar userName={userName} />

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FaStethoscope className="text-purple-500" /> Provider Subscription
                </span>
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Ghana MoMo & Cards
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-main)]">
                Doctor Pro Plan
              </h1>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Lower your platform commission cut from 12% to 8% & boost your patient consultation volume.
              </p>
            </div>

            {/* Active Subscription Status Pill */}
            {activeSub ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-lg">
                  <FaCheckCircle />
                </div>
                <div>
                  <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <FaPercent /> 8% Commission Active
                  </div>
                  <div className="text-sm font-bold text-[var(--text-main)]">{activeSub.plan?.name || "Doctor Pro Plan"}</div>
                  <div className="text-[11px] text-[var(--text-soft)]">
                    Expires: {activeSub.expiresAt ? new Date(activeSub.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Active"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center text-slate-400 font-bold">
                  12%
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Commission</div>
                  <div className="text-sm font-bold text-[var(--text-main)]">Standard PAYG (12% Cut)</div>
                </div>
              </div>
            )}
          </div>

          {/* Core Principle Explainer Banner */}
          <div className="bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-emerald-500/10 border border-[var(--border)] rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-purple-500 tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                <FaShieldAlt /> Supply-Side Onboarding Principle
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)]">Zero-Commitment Onboarding</h2>
              <p className="text-sm text-[var(--text-soft)] leading-relaxed">
                Joining Cure Virtual as a medical practitioner is <strong>100% free with zero monthly commitment</strong>. Standard doctors pay a 12% platform commission per consult. The <strong>Doctor Pro Plan</strong> is an opt-in upgrade that reduces your commission cut to <strong>8%</strong> and features your profile at the top of patient searches.
              </p>
            </div>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-4 gap-4 shadow-md">
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">Select Pro Billing Plan</h3>
              <p className="text-xs text-[var(--text-soft)]">Choose monthly flexibility or annual savings</p>
            </div>

            <div className="flex items-center bg-[var(--bg-main)] p-1.5 rounded-2xl border border-[var(--border)]">
              <button 
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  billingCycle === "monthly" 
                    ? "bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-md" 
                    : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                }`}
              >
                Monthly (GHS 100/mo)
              </button>
              <button 
                onClick={() => setBillingCycle("annual")}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                  billingCycle === "annual" 
                    ? "bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-md" 
                    : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                }`}
              >
                <span>Annual (GHS 1000/yr)</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow">
                  Save GHS 200
                </span>
              </button>
            </div>
          </div>

          {/* Pricing & Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Standard Basic Option (Free) */}
            <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-lg flex flex-col justify-between relative">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-500/10 px-3 py-1 rounded-full">
                      Free Default
                    </span>
                    <h3 className="text-2xl font-black text-[var(--text-main)] mt-2">Standard Basic</h3>
                    <p className="text-xs text-[var(--text-soft)]">Standard consultation delivery</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl md:text-4xl font-black text-[var(--text-main)]">GHS 0</span>
                    <span className="text-xs text-[var(--text-soft)] block">/month</span>
                  </div>
                </div>

                <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4 mb-6">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Platform Commission Rate</div>
                  <div className="text-2xl font-black text-[var(--text-main)] mt-1">12% Per Consultation</div>
                  <div className="text-[11px] text-[var(--text-soft)] mt-0.5">Platform retains GHS 12 on a GHS 100 consult</div>
                </div>

                <div className="border-t border-b border-[var(--border)] py-6 space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaCheck />
                    </div>
                    <span>Zero monthly subscription fee</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaCheck />
                    </div>
                    <span>Full access to video consultations & prescriptions</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaCheck />
                    </div>
                    <span>Standard directory listing</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-soft)] opacity-60">
                    <div className="w-6 h-6 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaTimes />
                    </div>
                    <span className="line-through">Reduced 8% platform commission</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-soft)] opacity-60">
                    <div className="w-6 h-6 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaTimes />
                    </div>
                    <span className="line-through">Featured priority placement in patient search</span>
                  </div>
                </div>
              </div>

              <button 
                disabled 
                className="w-full py-3.5 bg-[var(--border)] text-[var(--text-muted)] rounded-2xl text-xs font-bold uppercase tracking-wider cursor-not-allowed text-center"
              >
                Default Active Access
              </button>
            </div>

            {/* Doctor Pro Plan (Upgrade Option) */}
            <div className="bg-gradient-to-b from-purple-500/5 via-[var(--bg-glass)] to-[var(--bg-glass)] backdrop-blur-xl border-2 border-purple-500/40 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              
              {/* Highlight Badge */}
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-bl-2xl shadow-md flex items-center gap-1.5">
                <FaMagic /> Maximum Practitioner Profit
              </div>

              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                      Doctor Pro Tier
                    </span>
                    <h3 className="text-2xl font-black text-[var(--text-main)] mt-2">Doctor Pro Plan</h3>
                    <p className="text-xs text-[var(--text-soft)]">Priority listing + reduced platform commission</p>
                  </div>
                </div>

                {/* Price Display */}
                {loading ? (
                  <div className="animate-pulse h-16 bg-slate-500/10 rounded-2xl mb-6"></div>
                ) : (
                  <div>
                    {activePlans
                      .filter(p => p.billingCycle.toLowerCase() === billingCycle.toLowerCase())
                      .map(plan => (
                        <div key={plan.id} className="mb-6">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl md:text-5xl font-black text-[var(--text-main)]">
                              GHS {plan.priceGHS}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-soft)]">
                              /{plan.billingCycle === "monthly" ? "month" : "year"}
                            </span>
                          </div>

                          {/* Annual Discount Note */}
                          {plan.billingCycle === "annual" ? (
                            <div className="mt-2 text-xs font-bold text-amber-500 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl w-fit">
                              <FaTag /> GHS 1,000/yr vs GHS 1,200/yr (Save GHS 200 / ~17% OFF vs Monthly x 12)
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-purple-500 font-semibold">
                              Pays for itself with just 2-3 extra consultations a month
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Prominent Commission Drop Highlight Box */}
                <div className="bg-gradient-to-r from-emerald-500/20 via-sky-500/15 to-purple-500/20 border border-emerald-500/40 rounded-2xl p-4 mb-6 relative shadow-inner">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Reduced Platform Cut</div>
                      <div className="text-2xl font-black text-emerald-500 flex items-center gap-2 mt-0.5">
                        <span className="line-through text-slate-400 text-lg">12%</span>
                        <FaArrowDown className="text-emerald-500 text-base" />
                        <span className="text-emerald-500">8% Commission</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow">
                        Keep 92% Revenue
                      </span>
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="border-t border-b border-[var(--border)] py-6 space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaPercent />
                    </div>
                    <span><strong className="text-emerald-500">4% Commission Reduction</strong> (from 12% down to 8%)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaStar />
                    </div>
                    <span><strong className="text-purple-500">Priority Featured Listing</strong> at top of patient search results</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaChartLine />
                    </div>
                    <span>Advanced Practice Analytics & Patient Insights</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0 text-xs">
                      <FaCalendarAlt />
                    </div>
                    <span>Zero commitment — cancel auto-renew anytime</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {activePlans
                .filter(p => p.billingCycle.toLowerCase() === billingCycle.toLowerCase())
                .map(plan => (
                  <button
                    key={plan.id}
                    disabled={processing || !!activeSub}
                    onClick={() => handleSubscribePlan(plan.id)}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeSub
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed opacity-90"
                        : "bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-500 hover:opacity-95 text-white disabled:opacity-50"
                    }`}
                  >
                    {activeSub ? (
                      <>
                        <FaCheckCircle className="text-emerald-400 text-base" /> Active Pro Subscription
                      </>
                    ) : (
                      <>
                        <FaStar className="text-white text-base animate-spin" /> Upgrade to Doctor Pro Plan
                      </>
                    )}
                  </button>
                ))}
            </div>

          </div>

          {/* Financial ROI Calculator Widget */}
          <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase text-purple-500 tracking-wider bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                Doctor ROI Calculator
              </span>
              <h3 className="text-xl font-black text-[var(--text-main)] mt-2">Calculate Your Commission Savings</h3>
              <p className="text-xs text-[var(--text-soft)]">Slide your estimated monthly consultation turnover to see how much money Doctor Pro saves you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <label className="text-xs font-bold text-[var(--text-soft)] uppercase block mb-2">
                  Monthly Consult Revenue: <span className="text-purple-500 font-black text-sm">GHS {monthlyRevenue.toLocaleString()}</span>
                </label>
                <input 
                  type="range" 
                  min="500" 
                  max="10000" 
                  step="250"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(parseInt(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((monthlyRevenue - 500) / (10000 - 500)) * 100}%, rgba(203, 213, 225, 0.3) ${((monthlyRevenue - 500) / (10000 - 500)) * 100}%, rgba(203, 213, 225, 0.3) 100%)`
                  }}
                  className="w-full accent-purple-500 h-2.5 rounded-lg appearance-none cursor-pointer border border-[var(--border)] shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1.5 text-xs text-[var(--text-soft)]">
                <div className="flex justify-between border-b border-[var(--border)] pb-1">
                  <span>Standard 12% Cut:</span>
                  <span className="font-bold text-rose-500">-GHS {standardCommissionCost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-bold text-[var(--text-main)]">
                  <span>Doctor Pro 8% Cut:</span>
                  <span className="text-emerald-500">-GHS {proCommissionCost.toFixed(0)}</span>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold uppercase text-emerald-600">Net Additional Monthly Profit</div>
                <div className="text-2xl md:text-3xl font-black text-emerald-500 mt-1">
                  {netMonthlyProfitIncrease >= 0 ? `+GHS ${netMonthlyProfitIncrease.toFixed(0)} / mo` : `Breakeven @ GHS 2,500`}
                </div>
                <div className="text-[11px] text-[var(--text-soft)] mt-1">
                  Save GHS {monthlyCommissionSavings.toFixed(0)}/mo in commission (- GHS {proPlanMonthlyFee.toFixed(0)} Pro fee)
                </div>
              </div>
            </div>
          </div>

          {/* Subscription History Table */}
          <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
            <h3 className="text-xl font-black text-[var(--text-main)]">Subscription History</h3>
            
            {loading ? (
              <p className="text-xs text-[var(--text-soft)]">Loading history...</p>
            ) : mySubscriptions.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-2xl">
                No active or past Doctor Pro subscription purchases found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-soft)] uppercase text-[10px] tracking-wider font-bold">
                      <th className="p-3">Plan Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Started</th>
                      <th className="p-3">Expires</th>
                      <th className="p-3">Auto Renew</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySubscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-[var(--border)] hover:bg-purple-500/5 transition-all text-xs">
                        <td className="p-3 font-bold text-[var(--text-main)]">{sub.plan?.name || "Doctor Pro Plan"}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            sub.status === "active" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                            sub.status === "pending_payment" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                            "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--text-soft)]">{sub.startedAt ? new Date(sub.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "—"}</td>
                        <td className="p-3 text-[var(--text-soft)]">{sub.expiresAt ? new Date(sub.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "—"}</td>
                        <td className="p-3 font-semibold">{sub.autoRenew ? "Enabled" : "Disabled"}</td>
                        <td className="p-3 text-right">
                          {sub.status === "active" && sub.autoRenew && (
                            <button
                              disabled={cancellingId === sub.id}
                              onClick={() => handleCancelSubscription(sub.id)}
                              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold uppercase transition"
                            >
                              {cancellingId === sub.id ? "Cancelling..." : "Cancel Auto-Renew"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Paystack Payment Modal Prompt */}
      {paystackUrl && (
        <div className="fixed inset-0 bg-black/80 z-[9999] backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 text-2xl font-bold">
              <FaStethoscope className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[var(--text-main)]">Paystack Gateway Opened</h3>
              <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                We have launched the secure Paystack Ghana portal in a new tab for your MoMo or card payment. Complete payment there and click verify below.
              </p>
            </div>

            <button 
              onClick={() => window.open(paystackUrl, "_blank")}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-lg"
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

      <ToastContainer position="top-right" autoClose={2500} />
    </div>
  );
}
