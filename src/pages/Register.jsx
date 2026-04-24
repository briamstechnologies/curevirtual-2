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
    toast.info("Resubmitting your application...");

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("role", form.role);
    formData.append("submittedData", JSON.stringify({
      firstName: toTitleCase(form.firstName.trim()),
      middleName: form.middleName ? toTitleCase(form.middleName.trim()) : null,
      lastName: toTitleCase(form.lastName.trim()),
      email: form.email.trim().toLowerCase(),
      role: form.role, dateOfBirth: form.dateOfBirth,
      gender: form.gender, maritalStatus: form.maritalStatus,
      specialization: form.specialization === "Other" ? form.customProfession : form.specialization,
    }));
    formData.append("licenseFile", licenseFile);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://curevirtual-2-production-ee33.up.railway.app/api";
    const response = await fetch(`${baseUrl}/registration-requests/submit`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status: ${response.status}`);
    }

    toast.success("Application resubmitted! Pending admin review.");
    setTimeout(() => navigate("/pending-approval"), 1500);
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
      await api.post("/auth/register-success", {
        supabaseId: data.user.id,
        email: form.email.trim().toLowerCase(),
        firstName: toTitleCase(form.firstName.trim()),
        middleName: form.middleName ? toTitleCase(form.middleName.trim()) : null,
        lastName: toTitleCase(form.lastName.trim()),
        role: form.role, dateOfBirth: form.dateOfBirth,
        gender: form.gender, maritalStatus: form.maritalStatus,
        specialization: form.specialization === "Other" ? form.customProfession : form.specialization,
      });

        // For DOCTOR/PHARMACY: submit approval request
        if (needsApproval && licenseFile) {
          await submitRegistrationRequest(data.user.id);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-transparent)]">
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[var(--brand-orange)] opacity-[0.05] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[var(--brand-green)] opacity-[0.05] blur-[150px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-[var(--brand-blue)] opacity-[0.03] blur-[150px] rounded-full"></div>
      </div>

      <div className="w-full max-w-[1100px] flex flex-col md:flex-row glass overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 rounded-[3rem] border border-[var(--border)]">
        {/* Left Panel */}
        <div className="hidden md:flex flex-col justify-between w-2/5 p-12 text-[var(--text-main)] relative overflow-hidden bg-gradient-to-tr from-[#a2beff] to-[#7da0d8]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,var(--brand-blue),transparent)]"></div>
            <div className="absolute bottom-10 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,var(--brand-orange),transparent)]"></div>
          </div>
          <div className="z-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-12 text-emerald-300 hover:text-emerald-200 transition-all font-black text-[10px] uppercase tracking-widest group">
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Home
            </Link>
            <div className="flex items-center gap-3 bg-[var(--bg-glass)] p-3 rounded-2xl mb-8 border border-[var(--border)] shadow-2xl">
              <img src="/images/logo/Asset3.png" alt="Logo" className="w-10 h-10" />
              <span className="text-xl font-black tracking-tighter text-[var(--text-main)] uppercase">CURE<span className="text-[var(--brand-blue)]">VIRTUAL</span></span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6 leading-[0.9] uppercase text-emerald-300">Create <br /><span className="text-emerald-300">Account</span></h2>
            <p className="text-emerald-300 text-sm leading-relaxed max-w-xs font-bold uppercase tracking-widest italic text-justify">Sign up to access virtual care.</p>
          </div>
          <div className="z-10 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-3xl bg-[var(--bg-glass)] border border-[var(--border)] backdrop-blur-xl">
              <div className="h-10 w-10 rounded-2xl bg-[var(--brand-green)]/20 flex items-center justify-center text-[var(--brand-green)]"><FiShield className="text-xl" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Secure Data</p>
                <p className="text-[9px] font-bold text-[var(--text-main)]/40 uppercase tracking-widest">Medical Grade Security</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-3/5 bg-[var(--bg-card)] p-6 md:p-14 flex flex-col overflow-y-auto max-h-[90vh]">
          <div className="mb-6 md:mb-8">
            <div className="md:hidden flex items-center gap-2 mb-6 opacity-80">
              <img src="/images/logo/Asset3.png" alt="Logo" className="w-6 h-6" />
              <span className="text-sm font-black tracking-tighter text-[var(--text-main)] uppercase">CURE<span className="text-[var(--brand-blue)]">VIRTUAL</span></span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-2">
              {isResubmitting ? "Resubmit" : "Create"}{" "}
              <span className="text-[var(--brand-green)]">Account</span>
            </h1>
            <p className="text-[var(--text-soft)] text-sm font-bold opacity-70">
              {isResubmitting ? "Update your details and resubmit for review." : "Fill in your details to get started."}
            </p>
          </div>

          {showOtp ? (
            <div className="space-y-6">
              {/* OTP Step */}
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">Enter OTP sent to {form.email}</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all"><FiShield /></div>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner"
                    placeholder="123456" required />
                </div>
              </div>

              <button type="button" onClick={handleVerifyOtp} disabled={submitting || !otp || (needsApproval && !licenseFile)}
                className="btn btn-secondary w-full !py-4.5 !rounded-2xl text-xs flex items-center justify-center gap-3 shadow-2xl disabled:opacity-70 mt-4 group">
                {submitting ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isUploading ? "Uploading license..." : "Verifying..."}</span></>
                ) : (
                  <>Verify Account <FaArrowRight className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setShowOtp(false)}
                  className="w-full text-[10px] font-black text-[var(--brand-blue)] uppercase tracking-widest hover:underline text-center mt-2">
                  Back to Registration
                </button>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Didn't receive code? </span>
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || submitting}
                    className={`text-[10px] font-black uppercase tracking-widest transition-all ${resendTimer > 0 ? "text-[var(--text-muted)] cursor-not-allowed" : "text-[var(--brand-orange)] hover:underline"}`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend New Code"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
                {[["firstName", "First"], ["middleName", "(Opt)"], ["lastName", "Last"]].map(([name, ph]) => (
                  <div key={name} className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">{name === "middleName" ? "Middle Name" : name === "firstName" ? "First Name" : "Last Name"}</label>
                    <input name={name} value={form[name]} onChange={handleChange} placeholder={ph} required={name !== "middleName"}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs font-bold focus:border-[var(--brand-blue)] outline-none transition-all shadow-inner" />
                  </div>
                ))}
              </div>

              {/* DOB + Gender + Marital */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} max={new Date().toISOString().split("T")[0]} required
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[["gender", ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], ["Male", "Female", "Other", "Prefer not to say"]],
                    ["maritalStatus", ["SINGLE", "MARRIED"], ["Single", "Married"]]].map(([field, vals, labels]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">{field === "gender" ? "Gender" : "Marital"}</label>
                      <select name={field} value={form[field]} onChange={handleChange}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner appearance-none">
                        {vals.map((v, i) => <option key={v} value={v}>{labels[i]}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all"><FiMail /></div>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder=" " required disabled={isResubmitting}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner disabled:opacity-60" />
                </div>
              </div>

              {/* Passwords */}
              {!isResubmitting && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[["password", "••••••••"], ["confirmPassword", "••••••••"]].map(([field, ph]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">{field === "password" ? "Password" : "Confirm Password"}</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all"><FiLock /></div>
                        <input type={showPassword ? "text" : "password"} name={field} value={form[field]} onChange={handleChange} placeholder={ph} required minLength={6}
                          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 pl-12 pr-12 text-xs font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner" />
                        {field === "confirmPassword" && (
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Role selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">I am a...</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[{ id: "PATIENT", label: "PATIENT", color: "var(--brand-orange)" },
                    { id: "DOCTOR", label: "DOCTOR", color: "var(--brand-green)" },
                    { id: "PHARMACY", label: "PHARMACIST", color: "var(--brand-blue)" }].map((role) => (
                    <button key={role.id} type="button" onClick={() => !isResubmitting && setForm((f) => ({ ...f, role: role.id }))}
                      className={`py-3 rounded-2xl border-2 text-[9px] font-black uppercase tracking-widest transition-all ${form.role === role.id ? "bg-white text-black shadow-xl" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-main)]"} ${isResubmitting && form.role !== role.id ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                      style={form.role === role.id ? { borderColor: role.color } : {}}>
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor specialization */}
              {form.role === "DOCTOR" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">Medical Specialization</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-green)]"><FaStethoscope /></div>
                    <select name="specialization" value={form.specialization} onChange={handleChange} required
                      className="w-full bg-[var(--bg-main)] border border-[var(--brand-green)]/30 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner appearance-none">
                      <option value="">Select Specialization</option>
                      {["General Medicine","Cardiology","Dermatology","Neurology","Pediatrics","Psychiatry","Orthopedics","Gynecology","Ophthalmology","Dentistry","ENT","Urology","Oncology","Other"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {form.specialization === "Other" && (
                    <div className="relative group mt-3 animate-in fade-in slide-in-from-top-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-green)]"><FaStethoscope /></div>
                      <input name="customProfession" value={form.customProfession || ""} onChange={handleChange} placeholder="Specify your profession..." required
                        className="w-full bg-[var(--bg-main)] border border-[var(--brand-green)]/30 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none transition-all shadow-inner" />
                    </div>
                  )}
                </div>
              )}

              {/* License upload (Doctor/Pharmacy) - MOVED TO FIRST PAGE */}
              {needsApproval && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 p-4 rounded-2xl border border-[var(--brand-blue)]/30 bg-[var(--brand-blue)]/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)]">
                      License / Degree Certificate *
                    </label>
                    <FiShield className="text-[var(--brand-blue)]" />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Upload a clear photo or scan of your medical/pharmacy license or degree certificate (JPG, PNG, PDF — max 10MB)
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-dashed border-[var(--brand-blue)]/40 hover:border-[var(--brand-blue)] transition-all group bg-[var(--bg-main)] shadow-sm">
                    <FiUpload className="text-[var(--brand-blue)] text-lg group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-[var(--text-soft)] truncate">
                      {licenseFile ? licenseFile.name : "Click to choose file"}
                    </span>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleLicenseUpload} className="hidden" />
                  </label>
                  {licensePreview && (
                    <div className="relative group mt-2">
                      <img src={licensePreview} alt="License preview" className="w-full max-h-40 object-contain rounded-xl border border-[var(--border)] shadow-md" />
                      <button type="button" onClick={() => { setLicenseFile(null); setLicensePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform">
                        <FiX className="text-xs" />
                      </button>
                    </div>
                  )}
                  {licenseFile && !licensePreview && (
                    <p className="text-[10px] text-[var(--brand-green)] font-bold flex items-center gap-1">
                      <FiCheckCircle /> PDF selected: {licenseFile.name}
                    </p>
                  )}
                </div>
              )}

              {/* Approval notice for Doctor/Pharmacy */}
              {needsApproval && (
                <div className="p-3 rounded-xl border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/5">
                  <p className="text-[9px] font-bold text-[var(--brand-orange)] uppercase tracking-widest leading-relaxed">
                    ⚠️ Account Review Required — After submitting, you must verify your email. Your account will then be pending until an admin approves your documentation.
                  </p>
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="btn btn-secondary w-full !py-4.5 !rounded-2xl text-xs flex items-center justify-center gap-3 shadow-2xl disabled:opacity-70 mt-4 group">
                {submitting ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isUploading ? "Uploading docs..." : "Processing..."}</span></>
                ) : (
                  <> {isResubmitting ? "Resubmit Application" : "Submit Registration"} <FaArrowRight className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          )}

          <footer className="mt-8 text-center border-t border-[var(--border)] pt-8">
            <p className="text-xs font-bold text-[var(--text-soft)] uppercase tracking-widest">
              Already have an account?{" "}
              <Link to="/login" className="text-[var(--brand-orange)] font-black hover:underline ml-1">Login</Link>
            </p>
          </footer>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={2500} theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}
