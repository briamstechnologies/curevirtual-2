import { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaCheckCircle, 
  FaHeartbeat, 
  FaShieldAlt, 
  FaUsers, 
  FaPercent, 
  FaCalendarAlt, 
  FaMagic,
  FaCheck,
  FaTimes,
  FaTag,
  FaBuilding
} from "react-icons/fa";

export default function PatientSubscription() {
  const role = "PATIENT";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";

  const [paystackUrl, setPaystackUrl] = useState(null);
  const [paystackRef, setPaystackRef] = useState(null);
  const [activePlans, setActivePlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [corporateEligibility, setCorporateEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [cancellingId, setCancellingId] = useState(null);

  // Consult Savings Calculator State
  const [monthlyConsults, setMonthlyConsults] = useState(2);
  const [avgConsultPrice, setAvgConsultPrice] = useState(100);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, myRes, eligRes] = await Promise.allSettled([
        api.get("/subscriptions/plans?module=patient"),
        api.get("/subscriptions/me"),
        api.get("/subscriptions/eligibility")
      ]);
      if (plansRes.status === "fulfilled") setActivePlans(plansRes.value.data?.plans || []);
      if (myRes.status === "fulfilled") setMySubscriptions(myRes.value.data?.subscriptions || []);
      if (eligRes.status === "fulfilled") {
        const eligData = eligRes.value.data?.eligibility || eligRes.value.data;
        if (eligData?.source === "corporate") {
          setCorporateEligibility(eligData);
        }
      }
    } catch (err) {
      console.error("Subscription load error:", err);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubscribePlan = useCallback(async (planId) => {
    if (activeSub && activeSub.status === "active") {
      toast.warn("You already have an active Family Health Plan subscription.");
      return;
    }

    // Open blank window to bypass browser popup blockers
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
    if (!window.confirm("Are you sure you want to cancel auto-renew for this subscription?")) return;
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

  // Savings Calculator Math
  const totalConsultCostPAYG = monthlyConsults * avgConsultPrice;
  const consultDiscountAmount = totalConsultCostPAYG * 0.20; // 20% discount
  const familyPlanMonthlyFee = billingCycle === "monthly" ? 40 : (400 / 12);
  const netMonthlySavings = consultDiscountAmount - familyPlanMonthlyFee;

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
                <span className="bg-sky-500/10 text-sky-500 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FaHeartbeat className="text-sky-500" /> Patient Health Care
                </span>
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Ghana MoMo & Cards
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-main)]">
                Family Health Plan
              </h1>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Zero-commitment entry — Upgrade anytime to save 20% on consultations & protect your family.
              </p>
            </div>

            {/* Active Corporate Benefit Badge */}
            {corporateEligibility && (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md flex-shrink-0">
                  <FaBuilding />
                </div>
                <div>
                  <div className="text-xs text-emerald-800 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <FaCheckCircle className="text-emerald-600" /> Corporate Health Coverage Active
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    Provided by {corporateEligibility.companyName || "Employer Partner"}
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mt-0.5">
                    20% Consultation Discount Automatically Applied
                  </div>
                </div>
              </div>
            )}

            {/* Active Subscription / Corporate Status Pill */}
            {activeSub ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-lg">
                  <FaCheckCircle />
                </div>
                <div>
                  <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Active Subscription</div>
                  <div className="text-sm font-bold text-[var(--text-main)]">{activeSub.plan?.name || "Family Health Plan"}</div>
                  <div className="text-[11px] text-[var(--text-soft)]">
                    Expires: {activeSub.expiresAt ? new Date(activeSub.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Active"}
                  </div>
                </div>
              </div>
            ) : corporateEligibility ? (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md flex-shrink-0">
                  <FaBuilding />
                </div>
                <div>
                  <div className="text-xs text-emerald-800 font-black uppercase tracking-wider">
                    Current Tier
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    Corporate Coverage (20% Discount)
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mt-0.5">
                    Provided by {corporateEligibility.companyName || "Employer Partner"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center text-slate-400 font-bold">
                  PAYG
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Tier</div>
                  <div className="text-sm font-bold text-[var(--text-main)]">Pay-As-You-Go (Free Default)</div>
                </div>
              </div>
            )}
          </div>

          {/* Hybrid Model Explainer Banner */}
          <div className="bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-purple-500/10 border border-[var(--border)] rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-sky-500 tracking-widest bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                <FaShieldAlt /> Core Principle: Zero Gatekeeping
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)]">
                {corporateEligibility ? "Corporate Health Plan Protection" : "Hybrid Monetization — PAYG by Default"}
              </h2>
              <p className="text-sm text-[var(--text-soft)] leading-relaxed">
                {corporateEligibility ? (
                  <>Your company <strong>{corporateEligibility.companyName}</strong> has activated a corporate health seat for you. You receive a <strong>20% discount</strong> on all doctor consultations with zero out-of-pocket subscription fees.</>
                ) : (
                  <>Every patient account starts with <strong>zero commitment</strong>. You pay per consultation only when you book. Subscriptions are completely opt-in upgrades designed to reduce your cost per consultation by <strong>20%</strong> and cover up to 4 family members under one account.</>
                )}
              </p>
            </div>
          </div>

          {/* If Corporate Eligibility Active -> Show Corporate Coverage Overview Card */}
          {corporateEligibility ? (
            <div className="bg-gradient-to-br from-white via-emerald-50/40 to-sky-50/40 border-2 border-emerald-500/30 rounded-3xl p-6 md:p-10 shadow-xl space-y-6 relative overflow-hidden text-slate-900">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest px-6 py-2 rounded-bl-2xl shadow-md flex items-center gap-2">
                <FaCheckCircle className="text-white text-sm" /> 100% Employer Covered
              </div>

              <div className="space-y-3 max-w-2xl">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                  <FaBuilding /> Corporate Health Plan Active
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                  Your Coverage Is Active
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                  You already enjoy full Family Health Plan equivalent benefits provided by <strong className="text-emerald-700 font-black">{corporateEligibility.companyName || "Corporate Employer"}</strong>. No additional personal payment or subscription upgrade is required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-emerald-500/20">
                <div className="p-4 bg-white/90 rounded-2xl border border-emerald-500/20 shadow-sm space-y-1">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Consultation Discount</div>
                  <div className="text-2xl font-black text-emerald-600">20% OFF</div>
                  <div className="text-[11px] text-slate-500 font-medium">Auto-applied on all doctor bookings</div>
                </div>

                <div className="p-4 bg-white/90 rounded-2xl border border-emerald-500/20 shadow-sm space-y-1">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Family Members</div>
                  <div className="text-2xl font-black text-sky-600">Up to 4 Included</div>
                  <div className="text-[11px] text-slate-500 font-medium">Cover family under corporate tier</div>
                </div>

                <div className="p-4 bg-white/90 rounded-2xl border border-emerald-500/20 shadow-sm space-y-1">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Support</div>
                  <div className="text-2xl font-black text-amber-600">Priority 24/7</div>
                  <div className="text-[11px] text-slate-500 font-medium">Dedicated support channel</div>
                </div>

                <div className="p-4 bg-white/90 rounded-2xl border border-emerald-500/20 shadow-sm space-y-1">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Monthly Personal Cost</div>
                  <div className="text-2xl font-black text-emerald-600">GHS 0.00</div>
                  <div className="text-[11px] text-slate-500 font-medium">Fully paid by employer</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled
                  className="w-full py-4 px-6 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500 shadow-xl flex items-center justify-center gap-2.5 cursor-not-allowed text-center"
                >
                  <FaCheckCircle className="text-white text-lg flex-shrink-0" />
                  <span>Full Corporate Coverage Active — Provided by {corporateEligibility.companyName || "Employer"} (No Extra Payment Required)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Billing Cycle Switcher */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-4 gap-4 shadow-md">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">Select Billing Plan</h3>
                  <p className="text-xs text-[var(--text-soft)]">Choose monthly flexibility or annual savings</p>
                </div>

                <div className="flex items-center bg-[var(--bg-main)] p-1.5 rounded-2xl border border-[var(--border)]">
                  <button 
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                      billingCycle === "monthly" 
                        ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-md" 
                        : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    Monthly (GHS 40/mo)
                  </button>
                  <button 
                    onClick={() => setBillingCycle("annual")}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                      billingCycle === "annual" 
                        ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-md" 
                        : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <span>Annual (GHS 400/yr)</span>
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow">
                      Save GHS 80
                    </span>
                  </button>
                </div>
              </div>

              {/* Pricing & Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Standard PAYG Option (Free) */}
                <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-lg flex flex-col justify-between relative">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-500/10 px-3 py-1 rounded-full">
                          Free Default
                        </span>
                        <h3 className="text-2xl font-black text-[var(--text-main)] mt-2">Standard PAYG</h3>
                        <p className="text-xs text-[var(--text-soft)]">Pay only when you book a consult</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl md:text-4xl font-black text-[var(--text-main)]">GHS 0</span>
                        <span className="text-xs text-[var(--text-soft)] block">/month</span>
                      </div>
                    </div>

                    <div className="border-t border-b border-[var(--border)] py-6 space-y-4 mb-6">
                      <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaCheck />
                        </div>
                        <span>Zero monthly recurring fee</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaCheck />
                        </div>
                        <span>Full access to Doctor & Specialist directory</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaCheck />
                        </div>
                        <span>Full Lab test & Pharmacy order facility</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-soft)] opacity-60">
                        <div className="w-6 h-6 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaTimes />
                        </div>
                        <span className="line-through">20% discount on doctor consultation fees</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-soft)] opacity-60">
                        <div className="w-6 h-6 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaTimes />
                        </div>
                        <span className="line-through">Family coverage benefits</span>
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

                {/* Family Health Plan (Upgrade Option) */}
                <div className="bg-gradient-to-b from-sky-500/5 via-[var(--bg-glass)] to-[var(--bg-glass)] backdrop-blur-xl border-2 border-sky-500/40 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Highlight Badge */}
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-500 to-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-bl-2xl shadow-md flex items-center gap-1.5">
                    <FaMagic /> Recommended Upgrade
                  </div>

                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                          Family Protection Plan
                        </span>
                        <h3 className="text-2xl font-black text-[var(--text-main)] mt-2">Family Health Plan</h3>
                        <p className="text-xs text-[var(--text-soft)]">For families & frequent patient consultations</p>
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
                                  <FaTag /> GHS 400/yr vs GHS 480/yr (Save GHS 80 / ~17% OFF vs Monthly x 12)
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-sky-500 font-semibold">
                                  Equivalent to ~GHS 1.3 per day for family care
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Benefits List */}
                    <div className="border-t border-b border-[var(--border)] py-6 space-y-4 mb-6">
                      <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaPercent />
                        </div>
                        <span><strong className="text-emerald-500">20% Discount</strong> on all Doctor consultation fees</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaUsers />
                        </div>
                        <span>Cover up to <strong className="text-sky-500">4 family members</strong> under one account</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center flex-shrink-0 text-xs">
                          <FaShieldAlt />
                        </div>
                        <span>Priority Emergency Support Line</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                        <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center flex-shrink-0 text-xs">
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
                            : "bg-gradient-to-r from-sky-500 via-emerald-500 to-sky-500 hover:opacity-95 text-white disabled:opacity-50"
                        }`}
                      >
                        {activeSub ? (
                          <>
                            <FaCheckCircle className="text-emerald-400 text-base" /> Active Family Health Plan
                          </>
                        ) : (
                          <>
                            <FaHeartbeat className="text-white text-base animate-pulse" /> Upgrade to Family Health Plan
                          </>
                        )}
                      </button>
                    ))}
                </div>

              </div>
            </>
          )}

          {/* Interactive Savings Calculator Widget */}
          <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-500 tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Calculator Widget
              </span>
              <h3 className="text-xl font-black text-[var(--text-main)] mt-2">See How Much You Save</h3>
              <p className="text-xs text-[var(--text-soft)]">Adjust your average family consultation frequency to see instant financial savings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <label className="text-xs font-bold text-[var(--text-soft)] uppercase block mb-2">
                  Monthly Consultations: <span className="text-sky-500 font-black text-sm">{monthlyConsults}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={monthlyConsults}
                  onChange={(e) => setMonthlyConsults(parseInt(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-200 dark:bg-slate-700 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-soft)] uppercase block mb-2">
                  Avg Doctor Fee (GHS): <span className="text-sky-500 font-black text-sm">{avgConsultPrice}</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="300" 
                  step="10"
                  value={avgConsultPrice}
                  onChange={(e) => setAvgConsultPrice(parseInt(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-200 dark:bg-slate-700 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold uppercase text-emerald-600">Net Monthly Savings</div>
                <div className="text-2xl md:text-3xl font-black text-emerald-500 mt-1">
                  {netMonthlySavings >= 0 ? `+GHS ${netMonthlySavings.toFixed(0)} / mo` : `Covered in 2 consults`}
                </div>
                <div className="text-[11px] text-[var(--text-soft)] mt-1">
                  Save GHS {consultDiscountAmount.toFixed(0)}/mo on consult fees (- GHS {familyPlanMonthlyFee.toFixed(0)} plan fee)
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
                No active or past subscription purchases found.
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
                      <tr key={sub.id} className="border-b border-[var(--border)] hover:bg-sky-500/5 transition-all text-xs">
                        <td className="p-3 font-bold text-[var(--text-main)]">{sub.plan?.name || "Family Health Plan"}</td>
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
            <div className="w-16 h-16 mx-auto rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 text-2xl font-bold">
              <FaHeartbeat className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[var(--text-main)]">Paystack Gateway Opened</h3>
              <p className="text-xs text-[var(--text-soft)] leading-relaxed">
                We have launched the secure Paystack Ghana portal in a new tab for your MoMo or card payment. Complete payment there and click verify below.
              </p>
            </div>

            <button 
              onClick={() => window.open(paystackUrl, "_blank")}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-lg"
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
