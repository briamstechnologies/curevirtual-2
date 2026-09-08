import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FiMail, FiPhone, FiMapPin, FiUser, FiAward, FiCheckCircle, FiClock, FiActivity } from "react-icons/fi";
import { FaCamera, FaSpinner } from "react-icons/fa";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function getInitials(name) {
  if (!name) return "L";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[1]?.[0] || "";
  return (first + last).toUpperCase() || "L";
}

export default function ViewProfile() {
  const role = "LABORATORY";
  const userId = localStorage.getItem("userId") || "";
  const fallbackName = localStorage.getItem("userName") || localStorage.getItem("name") || "Laboratory";

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get(`/laboratory/profile?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res?.data?.data ?? null;
      setProfile(data);
      const imgUrl = data?.avatarUrl || data?.user?.avatarUrl;
      if (imgUrl) {
        localStorage.setItem("userAvatar", imgUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
      }
    } catch (err) {
      console.error("Failed to load laboratory profile:", err);
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

      const res = await api.post("/laboratory/avatar", formData, {
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
        toast.success("Laboratory logo/photo updated successfully!");
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

  const displayName = profile?.displayName || fallbackName;
  const email = profile?.user?.email || localStorage.getItem("email") || "—";
  const currentAvatar = profile?.avatarUrl || profile?.user?.avatarUrl;
  const addressLine = [
    profile?.address,
    profile?.city,
    profile?.state,
    profile?.postalCode,
    profile?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardLayout role={role} user={{ name: displayName }}>
      <div className="animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
              Laboratory Profile
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
              View Laboratory Information
            </p>
          </div>
          <Link
            to="/laboratory/profile"
            className="btn btn-primary flex items-center gap-2 px-6 py-4 shadow-lg shadow-purple-500/20 font-black uppercase text-xs tracking-wider"
          >
            <FaEdit /> Update Profile
          </Link>
        </div>

        {/* PROFILE CARD */}
        <div className="glass-panel p-8 max-w-5xl">
          {loading ? (
            <p className="text-[var(--text-soft)]">Loading...</p>
          ) : !profile ? (
            <p className="text-[var(--text-soft)]">
              No profile found. Click <strong className="text-color-white">Edit Profile</strong> to set up your laboratory details.
            </p>
          ) : (
            <>
              {/* TOP */}
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
                {/* AVATAR WITH UPLOAD */}
                <div
                  className="relative w-24 h-24 group cursor-pointer shrink-0"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  title="Click to upload/change laboratory photo"
                >
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden border-2 border-purple-500/30">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Lab Logo" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <FaSpinner className="text-white text-xl animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center text-white text-[9px] font-bold">
                        <FaCamera className="text-base mb-0.5" />
                        <span>Change</span>
                      </div>
                    )}
                  </div>
                  {/* Camera Badge */}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md border border-white">
                    {uploading ? <FaSpinner className="text-[10px] animate-spin" /> : <FaCamera className="text-xs" />}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* INFO */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tight">
                      {displayName}
                    </h2>

                    <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">badge</span>
                      Laboratory ID: {profile.referenceId || "CV-LB-GH-2026-0001"}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Status: {profile.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
                    {profile.services || "Professional diagnostic laboratory offering accurate and timely testing services."}
                  </p>
                </div>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EMAIL */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] flex items-center justify-center text-xl">
                    <FiMail />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Email Address
                    </p>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">{email}</h3>
                  </div>
                </div>

                {/* PHONE */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl">
                    <FiPhone />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Phone Number
                    </p>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">
                      {profile.phone || profile.user?.phone || "—"}
                    </h3>
                  </div>
                </div>

                {/* ADDRESS */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl">
                    <FiMapPin />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Address
                    </p>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">
                      {addressLine || "—"}
                    </h3>
                  </div>
                </div>

                {/* LICENSE */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl">
                    <FiAward />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      License Number
                    </p>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">
                      {profile.licenseNumber || "—"}
                    </h3>
                  </div>
                </div>

                {/* OPENING HOURS */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4 md:col-span-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl">
                    <FiClock />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Opening Hours
                    </p>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">
                      {profile.openingHours || "—"}
                    </h3>
                  </div>
                </div>

                {/* SERVICES */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4 md:col-span-2">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center text-xl">
                    <FiActivity />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Services / Tests Available
                    </p>
                    <p className="text-sm text-[var(--text-soft)] whitespace-pre-wrap mt-1">
                      {profile.services || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
