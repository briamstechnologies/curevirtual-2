// FILE: src/pages/doctor/ViewProfile.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaUserMd,
  FaIdBadge,
  FaGraduationCap,
  FaHospital,
  FaClock,
  FaEdit,
  FaLanguage,
  FaStethoscope,
  FaCamera,
  FaSpinner,
} from "react-icons/fa";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getInitials(name) {
  if (!name) return "D";
  const parts = String(name).trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export default function DoctorViewProfile() {
  const role = "DOCTOR";
  const userId = localStorage.getItem("userId") || "";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(() => {
    const cached = localStorage.getItem("cached_doctor_profile");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!profile);

  const loadProfile = useCallback(async () => {
    try {
      if (!profile) setLoading(true);
      const res = await api.get("/doctor/profile", { params: { userId } });
      const fetchedData = res.data?.data || null;
      setProfile(fetchedData);
      if (fetchedData) {
        localStorage.setItem("cached_doctor_profile", JSON.stringify(fetchedData));
        const imgUrl = fetchedData.avatarUrl || fetchedData.user?.avatarUrl;
        if (imgUrl) {
          localStorage.setItem("userAvatar", imgUrl);
          window.dispatchEvent(new Event("avatarUpdated"));
        }
      }
    } catch {
      toast.error("Profile Registry Failure: Data not found.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadProfile();
  }, [loadProfile, userId]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("userId", userId);

      const res = await api.post("/doctor/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.avatarUrl) {
        const newUrl = res.data.avatarUrl;
        setProfile((prev) => ({
          ...prev,
          avatarUrl: newUrl,
          user: { ...prev?.user, avatarUrl: newUrl },
        }));
        localStorage.setItem("userAvatar", newUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
        toast.success("Profile image updated successfully!");
      } else {
        toast.error("Failed to upload image");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.response?.data?.error || "Error uploading image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentAvatar =
    profile?.avatarUrl ||
    profile?.user?.avatarUrl ||
    profile?.profileImage ||
    profile?.profile_image ||
    profile?.user?.profileImage ||
    profile?.user?.profile_image;

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-blue)] uppercase tracking-[0.4em] mb-1">
              Clinician Identity
            </h2>
            <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase flex items-center gap-4">
              <FaUserMd className="text-[var(--brand-blue)]" /> Public Profile
            </h1>
          </div>
          <a
            href="/doctor/profile"
            className="btn btn-primary flex items-center gap-2 px-6 py-4 shadow-lg shadow-blue-500/20"
          >
            <FaEdit /> Update Profile
          </a>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="h-12 w-12 border-4 border-[var(--brand-blue)] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-soft)]">
              Decrypting Profile Data...
            </p>
          </div>
        ) : !profile ? (
          <div className="card glass flex flex-col items-center justify-center py-24 text-center">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
              No verified identity found in registry.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="card glass !p-10 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--brand-blue)] via-[var(--brand-green)] to-[var(--brand-blue)]"></div>
                <div className="relative z-10">
                  {/* Doctor Avatar with Upload Overlay */}
                  <div
                    className="relative w-28 h-28 mx-auto mb-6 group cursor-pointer"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    title="Click to change profile picture"
                  >
                    <div className="h-28 w-28 rounded-[2.5rem] bg-gradient-to-tr from-[var(--brand-blue)] to-[var(--brand-green)] flex items-center justify-center text-[var(--text-main)] text-3xl font-black shadow-2xl group-hover:scale-105 transition-transform duration-500 overflow-hidden border-2 border-emerald-500/30">
                      {currentAvatar ? (
                        <img
                          src={currentAvatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(userName).toUpperCase()
                      )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 rounded-[2.5rem] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploading ? (
                        <FaSpinner className="text-white text-2xl animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center text-white text-[10px] font-bold">
                          <FaCamera className="text-xl mb-0.5" />
                          <span>Change</span>
                        </div>
                      )}
                    </div>

                    {/* Camera Floating Badge */}
                    <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      {uploading ? <FaSpinner className="text-xs animate-spin" /> : <FaCamera className="text-xs" />}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-1">
                    {userName}
                  </h3>
                  <p className="text-[10px] font-black text-[var(--brand-blue)] uppercase tracking-[0.2em] mb-4">
                    {profile.specialization || "General Specialist"}
                  </p>
                  <div className="flex flex-col gap-2 items-center mb-6">
                    <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">badge</span>
                      Doctor ID: {profile.referenceId || profile.reference_id || "CV-DR-GH-2026-0001"}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Status: {profile.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-[var(--border)]">
                    <div>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                        License
                      </p>
                      <p className="text-xs font-black text-[var(--text-soft)]">
                        {profile.licenseNumber || "VOID"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                        Experience
                      </p>
                      <p className="text-xs font-black text-[var(--text-soft)]">
                        {profile.yearsOfExperience ?? "0"} YRS
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
                      Sync Status
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-green)] animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-soft)]">
                        Verified Node
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card !bg-[var(--bg-main)]/50 border border-[var(--border)] !p-6 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 mb-4">
                  <FaClock className="text-[var(--brand-blue)]" /> Matrix Telemetry
                </h4>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-[var(--text-muted)]">INITIALIZED</span>
                  <span className="text-[var(--text-soft)]">{formatDate(profile.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-[var(--text-muted)]">LAST_SYNC</span>
                  <span className="text-[var(--text-soft)]">{formatDate(profile.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="card glass !p-8 space-y-6">
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em] flex items-center gap-3">
                    <FaGraduationCap className="text-[var(--brand-blue)]" /> Qualifications
                  </h3>
                  <p className="text-xs font-bold text-[var(--text-soft)] leading-relaxed">
                    {profile.qualifications || "No academic data available."}
                  </p>
                  <div className="pt-4 border-t border-[var(--border)]">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                      Consultation Fee
                    </p>
                    <p className="text-2xl font-black text-[var(--brand-green)]">
                      ${Number(profile.consultationFee || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="card glass !p-8 space-y-6">
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em] flex items-center gap-3">
                    <FaHospital className="text-[var(--brand-green)]" /> Practice Node
                  </h3>
                  <p className="text-xs font-bold text-[var(--text-soft)] leading-relaxed">
                    {profile.hospitalAffiliation || "Independent Practitioner"}
                  </p>
                  <div className="pt-4 border-t border-[var(--border)]">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                      Availability Window
                    </p>
                    <p className="text-xs font-bold text-[var(--text-main)] whitespace-pre-wrap">
                      {profile.availability || "Synchronized on demand."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card glass !p-8 space-y-6">
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em] flex items-center gap-3">
                  <FaStethoscope className="text-[var(--brand-blue)]" /> Clinical Narrative
                </h3>
                <p className="text-sm font-bold text-[var(--text-soft)] leading-relaxed whitespace-pre-wrap">
                  {profile.bio || "No biographical telemetry encoded."}
                </p>
              </div>

              <div className="card glass !p-8 space-y-6">
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em] flex items-center gap-3">
                  <FaLanguage className="text-[var(--brand-orange)]" /> Communication Protocols
                </h3>
                <p className="text-xs font-bold text-[var(--text-soft)] leading-relaxed uppercase tracking-widest">
                  {profile.languages || "Standard English Interface"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
