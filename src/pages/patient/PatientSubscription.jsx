import { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../../components/CheckoutForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const PLACEHOLDER_LOGO = "/images/logo/Asset3.png";

const fmtUSD = (n) => (typeof n === "number" && !Number.isNaN(n) ? `$${n.toFixed(2)}` : "—");

export default function PatientSubscription() {
  const role = "PATIENT";
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";

  const [prices, setPrices] = useState({ monthlyUsd: null, yearlyUsd: null });
  const [status, setStatus] = useState({
    status: "NONE",
    startDate: null,
    endDate: null,
    plan: null,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState("MONTHLY");
  const [clientSecret, setClientSecret] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, sRes, hRes] = await Promise.all([
        api.get("/subscription/prices"),
        api.get("/subscription/status", { params: { userId } }),
        api.get("/subscription", { params: { userId } }),
      ]);
      const pr = pRes.data?.data || {};
      setPrices({
        monthlyUsd: pr.patientMonthlyUsd ?? null,
        yearlyUsd: pr.patientYearlyUsd ?? null,
      });
      setStatus(sRes.data?.data || { status: "NONE" });
      setHistory(hRes.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubscribe = async () => {
    try {
      if (!userId) {
        toast.error("No user id found.");
        return;
      }

      setProcessing(true);
      const res = await api.post("/subscription/create", {
        userId,
        plan, // "MONTHLY" | "YEARLY"
      });

      const data = res?.data || {};

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else if (data.mockSuccess) {
        toast.success("Subscription updated successfully!");
        load(); 
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to start checkout");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribeFallback = async () => {
    try {
      if (!userId) {
        toast.error("No user id found.");
        return;
      }
      if (plan === "MONTHLY" && !prices.monthlyUsd) {
        toast.error("Monthly price is not configured.");
        return;
      }
      if (plan === "YEARLY" && !prices.yearlyUsd) {
        toast.error("Yearly price is not configured.");
        return;
      }

      setProcessing(true);
      const res = await api.post("/subscription/stripe/checkout", {
        userId,
        plan, // "MONTHLY" | "YEARLY"
      });

      const data = res?.data || {};
      const url = data.url;

      if (data.mockSuccess) {
        toast.success("Subscription updated successfully!");
        load(); // Refresh data in place
        return;
      }

      if (!url) throw new Error("Checkout URL not returned from server");

      window.location.href = url; // Stripe Checkout
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.message || "Failed to start checkout";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const statusColor =
    status.status === "ACTIVE"
      ? "text-green-400"
      : status.status === "EXPIRED"
        ? "text-yellow-400"
        : status.status === "DEACTIVATED"
          ? "text-red-400"
          : "text-gray-300";

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]/90 text-[var(--text-main)]">
      <Sidebar role={role} />
      <div className="flex-1 min-h-screen">
        <Topbar userName={userName} />

        <div className="p-6 space-y-6">
          <img
            src="/images/logo/Asset3.png"
            alt="CureVirtual"
            style={{ width: 120, height: "auto" }}
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_LOGO;
            }}
          />
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Patient Subscription</h1>

          {/* Status card */}
          <div className="bg-[var(--bg-glass)] backdrop-blur-md rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between flex-col md:flex-row gap-4">
              <div className="w-full">
                <div className="text-sm text-[var(--text-soft)]">Current Status</div>
                <div className={`text-2xl font-semibold ${statusColor}`}>{status.status}</div>
                {status.startDate && (
                  <div className="text-[var(--text-muted)] text-sm mt-1">
                    {status.plan} • {new Date(status.startDate).toLocaleDateString()} →{" "}
                    {new Date(status.endDate).toLocaleDateString()}
                  </div>
                )}
              </div>

            <div className="mt-8 bg-white rounded-xl overflow-hidden min-h-[400px] p-6 shadow-md border border-[var(--border)]">
              {clientSecret ? (
                <div className="w-full max-w-md mx-auto">
                  <h3 className="text-xl font-bold mb-4">Complete Payment</h3>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm 
                      clientSecret={clientSecret} 
                      onSuccess={() => { setClientSecret(null); load(); }} 
                      onCancel={() => setClientSecret(null)} 
                    />
                  </Elements>
                </div>
              ) : (
                <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center p-8 bg-[var(--bg-glass)] border border-[var(--border)] rounded-2xl shadow-lg">
                  <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Subscribe</h2>
                  <p className="text-[var(--text-soft)] text-center text-sm mb-6">Choose a plan to get unlimited access.</p>
                  
                  <div className="flex bg-[var(--bg-main)] p-1 rounded-full w-full mb-6 relative">
                    <button 
                      className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${plan === 'MONTHLY' ? 'bg-[var(--brand-blue)] text-white shadow-md' : 'text-[var(--text-soft)]'}`}
                      onClick={() => setPlan('MONTHLY')}
                    >
                      Monthly
                    </button>
                    <button 
                      className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${plan === 'YEARLY' ? 'bg-[var(--brand-blue)] text-white shadow-md' : 'text-[var(--text-soft)]'}`}
                      onClick={() => setPlan('YEARLY')}
                    >
                      Yearly
                    </button>
                  </div>
                  
                  <div className="text-4xl font-extrabold mb-8 text-[var(--text-main)]">
                    {plan === 'MONTHLY' ? fmtUSD(prices.monthlyUsd || 10) : fmtUSD(prices.yearlyUsd || 100)}
                    <span className="text-sm font-normal text-[var(--text-muted)]">/{plan === "MONTHLY" ? "mo" : "yr"}</span>
                  </div>

                  <button 
                    disabled={processing || status.status === "ACTIVE"} 
                    onClick={handleSubscribe} 
                    className="w-full py-3 bg-[var(--brand-blue)] text-white hover:bg-blue-600 rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center"
                  >
                    {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : status.status === "ACTIVE" ? "Current Plan" : "Subscribe Now"}
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-[var(--bg-glass)] backdrop-blur-md rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">History</h2>
            {loading ? (
              <p className="text-[var(--text-soft)]">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-[var(--text-muted)]">No subscriptions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-soft)] uppercase text-sm">
                      <th className="p-3">Reference</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((s) => {
                      const comp = s.computedStatus || s.status;
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-[var(--border)] hover:bg-[var(--bg-glass)] transition"
                        >
                          <td className="p-3">{s.reference || "—"}</td>
                          <td className="p-3">{s.plan}</td>
                          <td className="p-3">
                            {s.amount ? `$${(s.amount / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="p-3">
                            {comp === "ACTIVE" ? (
                              <span className="flex items-center gap-2 text-green-400">
                                <FaCheckCircle /> Active
                              </span>
                            ) : comp === "PENDING" ? (
                              <span className="text-yellow-400">Pending</span>
                            ) : comp === "DEACTIVATED" ? (
                              <span className="flex items-center gap-2 text-red-400">
                                <FaTimesCircle /> Deactivated
                              </span>
                            ) : comp === "EXPIRED" ? (
                              <span className="text-[var(--text-soft)]">Expired</span>
                            ) : (
                              <span className="text-[var(--text-soft)]">{comp}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {s.startDate && s.endDate
                              ? `${new Date(s.startDate).toLocaleDateString()} → ${new Date(
                                  s.endDate
                                ).toLocaleDateString()}`
                              : "—"}
                          </td>
                          <td className="p-3">{new Date(s.createdAt).toLocaleString()}</td>
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

      <ToastContainer position="top-right" autoClose={2200} />
    </div>
  );
}
