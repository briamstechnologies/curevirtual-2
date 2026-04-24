// FILE: src/pages/Register.jsx
import { useState, useEffect } from "react";
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowLeft, FiShield, FiUpload, FiX, FiCheckCircle } from "react-icons/fi";
import { FaArrowRight, FaStethoscope } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../Lib/supabase";
import api from "../Lib/api";

const ROLES_REQUIRING_APPROVAL = ["DOCTOR", "PHARMACY"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", email: "",
    password: "", confirmPassword: "", role: "PATIENT",
    specialization: "", customProfession: "",
    gender: "PREFER_NOT_TO_SAY", dateOfBirth: "", maritalStatus: "SINGLE",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const { theme } = useTheme();

  const isResubmitting = localStorage.getItem("approvalStatus") === "REJECTED";
  const existingUserId = localStorage.getItem("userId");

  // Timer logic for Resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }

    // If resubmitting, prefill email if possible
    if (isResubmitting && existingUserId) {
      const storedEmail = localStorage.getItem("email") || localStorage.getItem("userEmail");
      if (storedEmail && !form.email) {
        setForm(f => ({ ...f, email: storedEmail }));
      }
    }

    return () => clearInterval(interval);
  }, [resendTimer, isResubmitting, existingUserId, form.email]);

  // If already PENDING, don't allow registration
  useEffect(() => {
    if (localStorage.getItem("approvalStatus") === "PENDING") {
      navigate("/pending-approval");
    }
  }, [navigate]);

  // License file state (Doctor/Pharmacy only)
  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const toTitleCase = (str) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (["firstName", "middleName", "lastName"].includes(name)) {
      value = value.replace(/[0-9]/g, "");
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleLicenseUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, PNG, WEBP, or PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    setLicenseFile(file);
    if (file.type.startsWith("image/")) {
      setLicensePreview(URL.createObjectURL(file));
    } else {
      setLicensePreview(null);
    }
  };

  const needsApproval = ROLES_REQUIRING_APPROVAL.includes(form.role);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) { toast.error("Please enter a valid email address."); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters long."); return; }
    if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) {
      toast.error("Date of Birth cannot be in the future."); return;
    }
    if (needsApproval && !licenseFile) {
      toast.error("Please upload your license or degree certificate."); return;
    }

    setSubmitting(true);
    try {
      if (isResubmitting) {
        // Skip Supabase signup, go straight to request submission
        await submitRegistrationRequest(existingUserId);
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            data: {
              firstName: toTitleCase(form.firstName.trim()),
              middleName: form.middleName ? toTitleCase(form.middleName.trim()) : null,
              lastName: toTitleCase(form.lastName.trim()),
              role: form.role, dateOfBirth: form.dateOfBirth,
              gender: form.gender, maritalStatus: form.maritalStatus,
              specialization: form.specialization === "Other" ? form.customProfession : form.specialization,
            },
          },
        });
        if (error) throw error;
        setShowOtp(true);
        toast.success("OTP sent! Please check your email.");
      }
    } catch (err) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegistrationRequest = async (userId) => {
    setIsUploading(true);
    toast.info("Submitting your application...");

    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("role", form.role);
      formData.append("submittedData", JSON.stringify({
        firstName: toTitleCase(form.firstName.trim()),
        middleName: form.middleName ? toTitleCase(form.middleName.trim()) : null,
        lastName: toTitleCase(form.lastName.trim()),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        specialization: form.specialization === "Other" ? form.customProfession : form.specialization,
      }));
      formData.append("licenseFile", licenseFile);

      await api.post("/registration-requests/submit", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Application submitted! Pending admin review.");
      setTimeout(() => navigate("/pending-approval"), 1500);
    } catch (err) {
      console.error("❌ Registration Request Submit Error:", err);
      const errorMsg = err.response?.data?.details 
        ? `${err.response.data.error}: ${err.response.data.details}`
        : (err.response?.data?.error || err.message || "Failed to submit request");
      
      throw new Error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setIsUploading(false);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: form.email.trim().toLowerCase(),
        token: otp, type: "signup",
      });
      if (error) throw error;

      // Sync user to backend
      const syncRes = await api.post("/auth/register-success", {
        supabaseId: data.user.id,
        email: form.email.trim().toLowerCase(),
        firstName: toTitleCase(form.firstName.trim()),
        middleName: form.middleName ? toTitleCase(form.middleName.trim()) : null,
        lastName: toTitleCase(form.lastName.trim()),
        role: form.role, dateOfBirth: form.dateOfBirth,
        gender: form.gender, maritalStatus: form.maritalStatus,
        specialization: form.specialization === "Other" ? form.customProfession : form.specialization,
      });

      const dbUser = syncRes.data.user || syncRes.data;

        // For DOCTOR/PHARMACY: submit approval request
        if (needsApproval && licenseFile) {
          await submitRegistrationRequest(dbUser.id);
        } else {
          toast.success("Verification successful! Redirecting to login...");
          setTimeout(() => { window.location.href = "/login"; }, 2000);
        }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Verification failed.");
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || submitting) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: form.email.trim().toLowerCase(),
      });
      if (error) throw error;
      toast.success("Verification code resent! Please check your inbox.");
      setResendTimer(60); // 60s cooldown
    } catch (err) {
      toast.error(err.message || "Failed to resend verification code.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-main)]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-[var(--brand-blue)] animate-pulse-soft" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-[var(--brand-green)] animate-pulse-soft" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-10 bg-[var(--brand-purple)] animate-pulse-soft" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-[1100px] flex flex-col md:flex-row glass-panel !p-0 overflow-hidden shadow-premium animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        {/* Left Panel */}
        <div className="hidden md:flex flex-col justify-between w-2/5 p-12 text-white relative overflow-hidden bg-gradient-to-tr from-[var(--brand-blue)] via-[var(--brand-purple)] to-[var(--brand-blue)] bg-[length:200%_200%] animate-gradient">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.4),transparent)]"></div>
            <div className="absolute bottom-10 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.2),transparent)]"></div>
          </div>
          <div className="z-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-12 text-white/80 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.3em] group">
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Home
            </Link>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-3xl mb-8 border border-white/20 shadow-2xl">
              <img src="/images/logo/Asset3.png" alt="Logo" className="w-10 h-10 brightness-0 invert" />
              <span className="text-xl font-black tracking-tighter text-white uppercase">CURE<span className="text-white/70">VIRTUAL</span></span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tighter mb-6 leading-[0.85] uppercase">
              Join the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Revolution</span>
            </h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-xs font-bold uppercase tracking-widest italic">
              Empowering healthcare through digital excellence.
            </p>
          </div>
          <div className="z-10 space-y-4">
            <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                <FiShield className="text-2xl" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Medical Shield</p>
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">End-to-end encrypted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-3/5 bg-[var(--bg-card)] p-8 md:p-14 flex flex-col overflow-y-auto max-h-[90vh]">
          <div className="mb-10">
            <div className="md:hidden flex items-center justify-center gap-2 mb-8">
              <img src="/images/logo/Asset3.png" alt="Logo" className="w-8 h-8" />
              <span className="text-lg font-black tracking-tighter text-[var(--text-main)] uppercase">CURE<span className="text-[var(--brand-blue)]">VIRTUAL</span></span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-3 leading-none">
              {isResubmitting ? "Resubmit" : "Join"}{" "}
              <span className="text-[var(--brand-green)]">Platform</span>
            </h1>
            <p className="text-[var(--text-soft)] text-xs font-black uppercase tracking-[0.3em] opacity-60">
              {isResubmitting ? "Update your credentials for review" : "The future of virtual healthcare"}
            </p>
          </div>

          {showOtp ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {/* OTP Step */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--brand-green)] ml-1">Identity Verification</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all text-xl"><FiShield /></div>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-[2rem] py-5 pl-16 pr-6 text-sm font-black tracking-[0.5em] focus:border-[var(--brand-green)] outline-none transition-all shadow-inner text-center"
                    placeholder="••••••" required />
                </div>
                <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest text-center">Code sent to: {form.email}</p>
              </div>

              <button type="button" onClick={handleVerifyOtp} disabled={submitting || !otp || (needsApproval && !licenseFile)}
                className="btn btn-primary w-full !rounded-[2rem] !py-5 text-[10px] shadow-premium">
                {submitting ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isUploading ? "UPLOADING DOCS..." : "VERIFYING..."}</span></>
                ) : (
                  <>VERIFY & COMPLETE <FaArrowRight /></>
                )}
              </button>
              
              <div className="flex flex-col gap-4">
                <button type="button" onClick={() => setShowOtp(false)}
                  className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] transition-all">
                  Go Back
                </button>
                <div className="text-center p-4 rounded-2xl bg-[var(--bg-main)]/50 border border-[var(--border)]">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Didn't receive code?</p>
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || submitting}
                    className={`text-[10px] font-black uppercase tracking-widest transition-all ${resendTimer > 0 ? "text-[var(--text-muted)] opacity-50 cursor-not-allowed" : "text-[var(--brand-orange)] hover:scale-105 active:scale-95"}`}
                  >
                    {resendTimer > 0 ? `RESEND IN ${resendTimer}s` : "RESEND NEW CODE"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[["firstName", "First Name"], ["middleName", "Middle"], ["lastName", "Last Name"]].map(([name, ph]) => (
                  <div key={name} className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">{ph}</label>
                    <input name={name} value={form[name]} onChange={handleChange} placeholder={ph} required={name !== "middleName"}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-6 text-xs font-black focus:border-[var(--brand-blue)] outline-none transition-all shadow-inner" />
                  </div>
                ))}
              </div>

              {/* DOB + Gender + Marital */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} max={new Date().toISOString().split("T")[0]} required
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-6 text-xs font-black focus:border-[var(--brand-green)] outline-none transition-all shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[["gender", ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], ["Male", "Female", "Other", "Prefer Not To Say"]],
                    ["maritalStatus", ["SINGLE", "MARRIED"], ["Single", "Married"]]].map(([field, vals, labels]) => (
                    <div key={field} className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">{field === "gender" ? "Gender" : "Marital"}</label>
                      <select name={field} value={form[field]} onChange={handleChange}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-xs font-black focus:border-[var(--brand-green)] outline-none transition-all shadow-inner appearance-none">
                        {vals.map((v, i) => <option key={v} value={v}>{labels[i]}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">Email Identity</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all text-lg"><FiMail /></div>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" required disabled={isResubmitting}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-6 text-xs font-black focus:border-[var(--brand-green)] outline-none transition-all shadow-inner disabled:opacity-60" />
                </div>
              </div>

              {/* Passwords */}
              {!isResubmitting && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[["password", "Security Code"], ["confirmPassword", "Confirm Code"]].map(([field, ph]) => (
                    <div key={field} className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">{ph}</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all text-lg"><FiLock /></div>
                        <input type={showPassword ? "text" : "password"} name={field} value={form[field]} onChange={handleChange} placeholder="••••••••" required minLength={8}
                          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-14 text-xs font-black focus:border-[var(--brand-green)] outline-none transition-all shadow-inner" />
                        {field === "confirmPassword" && (
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Role selector */}
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] ml-1">Define Your Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[{ id: "PATIENT", label: "Patient", color: "var(--brand-orange)" },
                    { id: "DOCTOR", label: "Doctor", color: "var(--brand-green)" },
                    { id: "PHARMACY", label: "Pharmacist", color: "var(--brand-blue)" }].map((role) => (
                    <button key={role.id} type="button" onClick={() => !isResubmitting && setForm((f) => ({ ...f, role: role.id }))}
                      className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${form.role === role.id ? "bg-[var(--bg-main)] text-[var(--text-main)] shadow-lg" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-soft)]"} ${isResubmitting && form.role !== role.id ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                      style={form.role === role.id ? { borderColor: role.color } : {}}>
                      {role.label}
                      {form.role === role.id && <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor specialization */}
              {form.role === "DOCTOR" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">Expertise Field</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--brand-green)] text-xl"><FaStethoscope /></div>
                    <select name="specialization" value={form.specialization} onChange={handleChange} required
                      className="w-full bg-[var(--bg-main)] border border-[var(--brand-green)]/30 rounded-2xl py-4 pl-16 pr-6 text-xs font-black focus:border-[var(--brand-green)] outline-none transition-all shadow-inner appearance-none">
                      <option value="">Select Specialization</option>
                      {["General Medicine","Cardiology","Dermatology","Neurology","Pediatrics","Psychiatry","Orthopedics","Gynecology","Ophthalmology","Dentistry","ENT","Urology","Oncology","Other"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {form.specialization === "Other" && (
                    <div className="relative group mt-3 animate-in fade-in slide-in-from-top-1">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--brand-green)] text-xl"><FaStethoscope /></div>
                      <input name="customProfession" value={form.customProfession || ""} onChange={handleChange} placeholder="Specify Field" required
                        className="w-full bg-[var(--bg-main)] border border-[var(--brand-green)]/30 rounded-2xl py-4 pl-16 pr-6 text-xs font-black focus:border-[var(--brand-green)] outline-none transition-all shadow-inner" />
                    </div>
                  )}
                </div>
              )}

              {/* License upload */}
              {needsApproval && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 p-6 rounded-3xl border-2 border-dashed border-[var(--brand-blue)]/20 bg-[var(--brand-blue)]/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--brand-blue)]">
                      Credential Certificate
                    </label>
                    <FiShield className="text-[var(--brand-blue)] text-xl" />
                  </div>
                  <label className="flex flex-col items-center gap-4 cursor-pointer p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--brand-blue)] transition-all group shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[var(--brand-blue)]/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                      <FiUpload className="text-[var(--brand-blue)] text-xl" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--brand-blue)] transition-all">
                      {licenseFile ? licenseFile.name : "Choose License Image or PDF"}
                    </span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleLicenseUpload} className="hidden" />
                  </label>
                  {licensePreview && (
                    <div className="relative group mt-2 rounded-2xl overflow-hidden border border-[var(--border)] shadow-lg max-h-40">
                      <img src={licensePreview} alt="License preview" className="w-full object-contain bg-black/5" />
                      <button type="button" onClick={() => { setLicenseFile(null); setLicensePreview(null); }} className="absolute top-2 right-2 bg-red-500/80 backdrop-blur-md text-white p-2 rounded-full shadow-lg hover:bg-red-500 transition-all">
                        <FiX className="text-xs" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notice */}
              {needsApproval && (
                <div className="p-4 rounded-2xl border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/5 flex gap-4">
                  <div className="mt-1"><FiClock className="text-[var(--brand-orange)] text-lg" /></div>
                  <p className="text-[9px] font-black text-[var(--brand-orange)] uppercase tracking-widest leading-relaxed">
                    Account Verification: Your credentials will be reviewed by our medical board. Approval typically takes 24 hours.
                  </p>
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="btn btn-primary w-full !rounded-[2rem] !py-5 text-[10px] shadow-premium">
                {submitting ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isUploading ? "UPLOADING..." : "PROCESSING..."}</span></>
                ) : (
                  <> {isResubmitting ? "RESUBMIT FOR REVIEW" : "COMPLETE REGISTRATION"} <FaArrowRight /></>
                )}
              </button>
            </form>
          )}

          <footer className="mt-12 text-center border-t border-[var(--border)] pt-8">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              Already a member?{" "}
              <Link to="/login" className="text-[var(--brand-orange)] hover:text-[var(--brand-red)] transition-all ml-1">Access Account</Link>
            </p>
          </footer>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={2500} theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}
