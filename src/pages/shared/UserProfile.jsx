// FILE: src/pages/shared/UserProfile.jsx
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import {
  FaUserShield,
  FaEnvelope,
  FaCalendarAlt,
  FaIdBadge,
  FaGlobe,
  FaShieldAlt,
  FaCamera,
  FaSpinner,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function UserProfile() {
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role") || "USER";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";

  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userAvatar, setUserAvatar] = useState(
    localStorage.getItem("userAvatar") ||
      localStorage.getItem("profile_image") ||
      localStorage.getItem("profileImage") ||
      ""
  );

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const res = await api.get(`/users/${userId}`);
        const data = res.data?.data || res.data;
        setUserData(data);
        const fetchedAvatar = data?.avatarUrl || data?.profileImage || data?.profile_image || data?.user?.avatarUrl;
        if (fetchedAvatar) {
          setUserAvatar(fetchedAvatar);
          localStorage.setItem("userAvatar", fetchedAvatar);
          localStorage.setItem("profile_image", fetchedAvatar);
          localStorage.setItem("profileImage", fetchedAvatar);
        }
      } catch (err) {
        console.error("Failed to load user intelligence:", err);
      } finally {
        setLoading(false);
      }
    }
    if (userId) fetchUserData();
  }, [userId]);

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
      if (userId) formData.append("userId", userId);

      const res = await api.post("/patient/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.avatarUrl) {
        const newUrl = res.data.avatarUrl;
        setUserAvatar(newUrl);
        localStorage.setItem("userAvatar", newUrl);
        localStorage.setItem("profile_image", newUrl);
        localStorage.setItem("profileImage", newUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
        toast.success("Profile picture uploaded successfully!");
      } else {
        toast.error("Failed to upload profile picture");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.response?.data?.error || "Error uploading profile picture");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const InfoCard = ({ icon: Icon, label, value, color = "var(--brand-blue)" }) => (
    <div className="card glass flex items-center gap-6 group hover:translate-x-1 transition-all">
      <div
        className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}
        style={{ backgroundColor: color }}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
          {label}
        </p>
        <p className="text-sm font-black text-[var(--text-main)]">{value || "DATA_NOT_SYNCED"}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout role={role} user={{ name: userName }}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-[var(--brand-green)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--brand-green)] animate-pulse">
              Initializing Intelligence Link...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="max-w-5xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div
            className="relative group cursor-pointer"
            onClick={() => !uploading && fileInputRef.current?.click()}
            title="Click to upload profile picture"
          >
            <div className="h-32 w-32 rounded-[3rem] bg-gradient-to-tr from-[var(--brand-green)] to-[var(--brand-blue)] flex items-center justify-center text-[var(--text-main)] font-black text-5xl shadow-2xl relative z-10 overflow-hidden border-2 border-[var(--brand-green)]/30">
              {userAvatar ? (
                <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}

              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {uploading ? (
                  <FaSpinner className="animate-spin text-2xl" />
                ) : (
                  <>
                    <FaCamera className="text-2xl mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                  </>
                )}
              </div>
            </div>

            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[var(--brand-green)] text-white flex items-center justify-center shadow-lg border-2 border-white z-30 hover:scale-110 transition-transform">
              {uploading ? <FaSpinner className="text-sm animate-spin" /> : <FaCamera className="text-sm" />}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            <div className="absolute -inset-4 bg-[var(--brand-green)]/10 blur-2xl rounded-full"></div>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.4em] mb-2">
              Subject Credentials
            </h2>
            <h1 className="text-5xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-4">
              {userName}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 rounded-full bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/20 text-[var(--brand-blue)] text-[10px] font-black uppercase tracking-widest">
                {role} CLEARANCE
              </span>
              <span className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest">
                SYSTEM_ACTIVE
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard icon={FaIdBadge} label="Identity ID" value={userId} color="var(--brand-blue)" />
          <InfoCard
            icon={FaEnvelope}
            label="Communication Hub"
            value={userData?.email || "syncing..."}
            color="var(--brand-green)"
          />
          <InfoCard
            icon={FaShieldAlt}
            label="Authorization Status"
            value="Verified Protocol"
            color="var(--brand-orange)"
          />
          <InfoCard
            icon={FaCalendarAlt}
            label="Registry Date"
            value={
              userData?.createdAt
                ? new Date(userData.createdAt).toLocaleDateString()
                : "PREHISTORIC"
            }
            color="var(--brand-blue)"
          />
        </div>

        <div className="card glass relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <FaGlobe size={150} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] mb-6 flex items-center gap-3">
            <FaIdBadge /> Access Log & Telemetry
          </h3>
          <div className="space-y-4 text-xs font-bold text-[var(--text-soft)]">
            <p className="flex justify-between items-center border-b border-[var(--border)] pb-4">
              <span className="uppercase tracking-widest opacity-60">Neural Link Status</span>
              <span className="text-[var(--brand-green)]">ESTABLISHED_SECURE</span>
            </p>
            <p className="flex justify-between items-center border-b border-[var(--border)] pb-4">
              <span className="uppercase tracking-widest opacity-60">Encryption Standard</span>
              <span className="text-[var(--text-main)]">AES-256 GCM PROTOCOL</span>
            </p>
            <p className="flex justify-between items-center pb-4">
              <span className="uppercase tracking-widest opacity-60">Global Authorization</span>
              <span className="text-[var(--text-main)] underline">VIEW_CERTIFICATES</span>
            </p>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
