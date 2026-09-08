import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../Lib/api";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null); // 'success' | 'failed'
  const [paymentData, setPaymentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setStatus("failed");
      setErrorMsg("No payment reference found in URL query parameters.");
      return;
    }

    const verifyPayment = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/payments/v2/${reference}/status`);
        
        if (res.data?.status === true && (res.data?.data?.status === "success" || res.data?.data?.status === "SUCCESS")) {
          setStatus("success");
          setPaymentData(res.data?.data);
        } else {
          setStatus("failed");
          setErrorMsg(res.data?.data?.gateway_response || res.data?.message || "Payment verification failed");
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        setStatus("failed");
        setErrorMsg(err.response?.data?.message || err.message || "Failed to verify transaction with server");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]/90 text-[var(--text-main)]">
      <Sidebar role="PATIENT" />
      <div className="flex-1 min-h-screen">
        <Topbar title="Payment Status" />
        
        <div className="p-6 md:p-10 max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center shadow-2xl">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <FaSpinner className="animate-spin text-5xl text-blue-500" />
                <h2 className="text-xl font-bold">Verifying Payment Status...</h2>
                <p className="text-sm opacity-75">Please wait while we confirm your transaction with Paystack.</p>
              </div>
            ) : status === "success" ? (
              <div className="py-8 flex flex-col items-center space-y-4">
                <FaCheckCircle className="text-6xl text-green-400 animate-bounce" />
                <h2 className="text-2xl font-bold text-green-400">Payment Successful!</h2>
                <p className="text-sm opacity-90 max-w-md">
                  Thank you! Your payment of <strong>GHS {(paymentData?.amount / 100)?.toFixed(2)}</strong> has been verified successfully.
                </p>
                <div className="bg-white/5 rounded-xl p-4 w-full text-left text-xs space-y-2 border border-white/10">
                  <div className="flex justify-between">
                    <span className="opacity-60">Reference:</span>
                    <span className="font-mono font-bold">{paymentData?.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Channel:</span>
                    <span className="uppercase">{paymentData?.channel || "Mobile Money / Card"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Status:</span>
                    <span className="text-green-400 font-bold">SUCCESS</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
                  <button
                    onClick={() => navigate("/patient/appointments")}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
                  >
                    View My Appointments
                  </button>
                  <button
                    onClick={() => navigate("/patient/subscription")}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold transition"
                  >
                    View Subscriptions
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center space-y-4">
                <FaTimesCircle className="text-6xl text-red-500" />
                <h2 className="text-2xl font-bold text-red-400">Payment Failed or Pending</h2>
                <p className="text-sm opacity-80 max-w-md">
                  {errorMsg || "We could not verify your payment. If money was deducted, it will be automatically processed via webhook."}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
                  <button
                    onClick={() => navigate("/patient/appointments")}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
                  >
                    Go to My Appointments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
