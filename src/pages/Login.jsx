// FILE: src/pages/Login.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../Lib/api";
import { supabase } from "../Lib/supabase";
import { AuthApiError } from "@supabase/supabase-js";

import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowLeft, FiSmartphone } from "react-icons/fi";

import { FaArrowRight } from "react-icons/fa";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [loginMode, setLoginMode] = useState("password");
  const [otpSent, setOtpSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Handle Success
  const handleAuthSuccess = (responseData, fallbackEmail) => {
    const token = responseData.token;
    const user = responseData.user || responseData;

    // ✅ Save user data
    localStorage.setItem("token", token);
    localStorage.setItem("userId", user.id);
    localStorage.setItem(
      "name",
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || ""
    );
    localStorage.setItem(
      "userName",
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || ""
    );
    localStorage.setItem("role", user.role || "");
    localStorage.setItem("email", user.email || fallbackEmail || "");
    localStorage.setItem("type", user.type || "USER");
    localStorage.setItem("approvalStatus", user.approvalStatus || "NOT_REQUIRED");

    toast.success("Login successful!");

    // ✅ Pending Approval Flow
    if (
      ["DOCTOR", "PHARMACY", "LABORATORY"].includes(user.role) &&
      user.approvalStatus === "PENDING"
    ) {
      navigate("/pending-approval");
      return;
    }

    // ✅ Rejected Flow
    if (
      ["DOCTOR", "PHARMACY", "LABORATORY"].includes(user.role) &&
      user.approvalStatus === "REJECTED"
    ) {
      navigate(`/registration-rejected?reason=${encodeURIComponent(user.rejectionReason || "")}`);
      return;
    }

    // ✅ Dashboard Redirects
    setTimeout(() => {
      switch (user.role) {
        case "SUPERADMIN":
          navigate("/superadmin/dashboard");
          break;

        case "ADMIN":
          navigate("/admin/dashboard");
          break;

        case "SUPPORT":
          navigate("/support/dashboard");
          break;

        case "DOCTOR":
          navigate("/doctor/dashboard");
          break;

        case "PATIENT":
          navigate("/patient/dashboard");
          break;

        case "PHARMACY":
          navigate("/pharmacy/dashboard");
          break;

        // ✅ LABORATORY ADDED
        case "LABORATORY":
          navigate("/laboratory/dashboard");
          break;

        default:
          navigate("/");
      }
    }, 1000);
  };

  // ✅ Main Login
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      // =========================================================
      // PASSWORD LOGIN
      // =========================================================
      if (loginMode === "password") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (authError) {
          throw authError;
        }

        // ✅ Email verification check
        if (!data?.user?.email_confirmed_at) {
          throw new Error("Please verify your email before logging in.");
        }

        // ✅ Backend Sync
        const res = await api.post("/auth/login-sync", {
          email: email.trim().toLowerCase(),
          supabaseId: data.user.id,
          supabaseAccessToken: data.session.access_token,
        });

        handleAuthSuccess(res.data, email);
      }

      // =========================================================
      // OTP LOGIN
      // =========================================================
      else {
        // Send OTP
        if (!otpSent) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: {
              shouldCreateUser: false,
            },
          });

          if (otpError) {
            throw otpError;
          }

          toast.success("OTP sent successfully!");
          setOtpSent(true);
        }

        // Verify OTP
        else {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: otp,
            type: "email",
          });

          if (verifyError) {
            throw verifyError;
          }

          if (!data?.user) {
            throw new Error("Invalid OTP");
          }

          // ✅ Backend Sync
          const res = await api.post("/auth/login-sync", {
            email: email.trim().toLowerCase(),
            supabaseId: data.user.id,
            supabaseAccessToken: data.session.access_token,
          });

          handleAuthSuccess(res.data, email);
        }
      }
    } catch (err) {
      // console.error("❌ Login Error:", err);

      // Handle Supabase AuthApiError for invalid credentials
      if (err instanceof AuthApiError) {
        const friendlyMsg = "Invalid email or password. Please try again.";
        setError(friendlyMsg);
        toast.error(friendlyMsg);
        setIsLoading(false);
        return;
      }

      const serverError = err?.response?.data;

      // ✅ Approval Handling
      if (err?.response?.status === 403) {
        if (serverError?.approvalStatus === "PENDING") {
          toast.info("Your account is under review.");
          localStorage.setItem("approvalStatus", "PENDING");
          navigate("/pending-approval");
          return;
        }

        if (serverError?.approvalStatus === "REJECTED") {
          localStorage.setItem("approvalStatus", "REJECTED");
          navigate(
            `/registration-rejected?reason=${encodeURIComponent(
              serverError?.rejectionReason || ""
            )}`
          );
          return;
        }
      }

      const message = serverError?.error || err.message || "Login failed";

      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-transparent)]">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-[var(--brand-green)] opacity-[0.07] blur-[120px] rounded-full animate-pulse"></div>

        <div
          className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] bg-[var(--brand-blue)] opacity-[0.07] blur-[120px] rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        <div
          className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[var(--brand-orange)] opacity-[0.05] blur-[120px] rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="w-full max-w-[1000px] flex flex-col md:flex-row glass overflow-hidden shadow-2xl rounded-[3rem] border border-[var(--border)]">
        {/* LEFT */}
        <div className="hidden md:flex flex-col justify-between w-2/5 p-12 bg-gradient-to-br from-[#bcd6ff] to-[#dee6f7]">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mb-12 text-[var(--brand-green)] font-black text-[10px] uppercase tracking-[0.2em]"
            >
              <FiArrowLeft />
              Home
            </Link>

            <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl mb-6">
              <img src="/images/logo/Asset3.png" alt="Logo" className="w-10 h-10" />

              <span className="text-xl font-black uppercase">
                CURE
                <span className="text-[var(--brand-blue)]">VIRTUAL</span>
              </span>
            </div>

            <h2 className="text-4xl font-black uppercase text-[var(--brand-green)] leading-none">
              Welcome
              <br />
              Back
            </h2>

            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-[var(--brand-green)]">
              Secure login portal
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-full md:w-3/5 bg-[var(--bg-card)] p-6 md:p-14">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--brand-green)]/20 bg-[var(--brand-green)]/5 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--brand-green)] mb-4">
              <FiLock />
              Secure Login
            </div>

            <h1 className="text-4xl font-black uppercase tracking-tighter">Login</h1>

            <p className="text-sm opacity-70 mt-2">
              {loginMode === "password" ? "Login using email and password" : "Login using OTP"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* EMAIL */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em]">Email</label>

              <div className="relative mt-2">
                <FiMail className="absolute left-5 top-1/2 -translate-y-1/2" />

                <input
                  type="email"
                  required
                  disabled={otpSent}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-main)] py-4 pl-14 pr-5"
                  placeholder="operator@curevirtual.io"
                />
              </div>
            </div>

            {/* PASSWORD */}
            {loginMode === "password" ? (
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em]">
                  Password
                </label>

                <div className="relative mt-2">
                  <FiLock className="absolute left-5 top-1/2 -translate-y-1/2" />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-main)] py-4 pl-14 pr-14"
                    placeholder="••••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            ) : (
              otpSent && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em]">OTP</label>

                  <div className="relative mt-2">
                    <FiSmartphone className="absolute left-5 top-1/2 -translate-y-1/2" />

                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-main)] py-4 pl-14 pr-5"
                      placeholder="123456"
                    />
                  </div>
                </div>
              )
            )}

            {/* ERROR */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                <p className="text-red-500 text-xs font-bold">{error}</p>
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {loginMode === "otp" && !otpSent ? "Send OTP" : "Login"}

                  <FaArrowRight />
                </>
              )}
            </button>

            {/* TOGGLE */}
            <button
              type="button"
              onClick={() => {
                setLoginMode(loginMode === "password" ? "otp" : "password");

                setOtpSent(false);
                setOtp("");
                setError("");
              }}
              className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[var(--brand-blue)]"
            >
              {loginMode === "password"
                ? "Login with OTP instead?"
                : "Login with password instead?"}
            </button>
          </form>

          {/* REGISTER */}
          <div className="mt-10 text-center border-t border-[var(--border)] pt-8">
            <p className="text-xs font-bold uppercase tracking-widest">
              Don’t have an account?
              <Link to="/register" className="ml-2 text-[var(--brand-blue)] font-black">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
