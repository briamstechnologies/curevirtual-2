// FILE: src/pages/shared/UserProfile.jsx
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import {
  FaEnvelope,
  FaCalendarAlt,
  FaIdBadge,
  FaGlobe,
  FaShieldAlt,
  FaCamera,
  FaSpinner,
  FaEdit,
  FaPhone,
  FaVenusMars,
  FaHeart,
  FaLock,
  FaTimes,
  FaCheck,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function UserProfile() {
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role") || "USER";
  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || localStorage.getItem("name") || "User"
  );

  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [userAvatar, setUserAvatar] = useState(
    localStorage.getItem("userAvatar") ||
      localStorage.getItem("profile_image") ||
      localStorage.getItem("profileImage") ||
      ""
  );

  // Edit form state
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "OTHER",
    dateOfBirth: "",
    maritalStatus: "SINGLE",
    password: "",
    confirmPassword: "",
  });

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${userId}`);
      const data = res.data?.data || res.data;
      setUserData(data);

      const fullName = [data?.firstName, data?.middleName, data?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) {
        setUserName(fullName);
        localStorage.setItem("userName", fullName);
        localStorage.setItem("name", fullName);
      }

      const fetchedAvatar =
        data?.avatarUrl ||
        data?.profileImage ||
        data?.profile_image ||
        data?.user?.avatarUrl;
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
  };

  useEffect(() => {
    if (userId) fetchUserData();
  }, [userId]);

  const openEditModal = () => {
    let formattedDob = "";
    if (userData?.dateOfBirth) {
      const d = new Date(userData.dateOfBirth);
      if (!isNaN(d.getTime())) {
        formattedDob = d.toISOString().split("T")[0];
      }
    }

    setFormData({
      firstName: userData?.firstName || "",
      middleName: userData?.middleName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      phone: userData?.phone || "",
      gender: userData?.gender || "OTHER",
      dateOfBirth: formattedDob,
      maritalStatus: userData?.maritalStatus || "SINGLE",
      password: "",
      confirmPassword: "",
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error("First Name is required");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        toast.error("New Password must be at least 6 characters long");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || null,
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
        maritalStatus: formData.maritalStatus,
      };

      if (formData.password && formData.password.trim().length >= 6) {
        payload.password = formData.password.trim();
      }

      const res = await api.put(`/users/${userId}`, payload);
      const updatedUser = res.data?.data || res.data;

      setUserData(updatedUser);

      const newFullName = [
        updatedUser.firstName,
        updatedUser.middleName,
        updatedUser.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (newFullName) {
        setUserName(newFullName);
        localStorage.setItem("userName", newFullName);
        localStorage.setItem("name", newFullName);
      }

      if (updatedUser.email) {
        localStorage.setItem("email", updatedUser.email);
      }

      window.dispatchEvent(new Event("profileUpdated"));
      setIsEditModalOpen(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5MB");
      return;
    }

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append("avatar", file);
      if (userId) uploadData.append("userId", userId);

      const res = await api.post("/users/avatar", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.avatarUrl) {
        const newUrl = res.data.avatarUrl;
        setUserAvatar(newUrl);
        setUserData((prev) => ({ ...prev, avatarUrl: newUrl }));
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

  const InfoCard = ({
    icon: Icon,
    label,
    value,
    color = "var(--brand-blue)",
  }) => (
    <div className="card glass flex items-center gap-6 group hover:translate-x-1 transition-all">
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
          {label}
        </p>
        <p className="text-sm font-black text-[var(--text-main)] truncate">
          {value || "DATA_NOT_SYNCED"}
        </p>
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

  const computedDisplayName =
    [userData?.firstName, userData?.middleName, userData?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || userName;

  return (
    <DashboardLayout role={role} user={{ name: computedDisplayName }}>
      <div className="max-w-5xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Profile Header Banner */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[var(--brand-blue)]/10 via-[var(--brand-green)]/5 to-transparent border border-[var(--border)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-8 z-10">
            <div
              className="relative group cursor-pointer"
              onClick={() => !uploading && fileInputRef.current?.click()}
              title="Click to upload profile picture"
            >
              <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-tr from-[var(--brand-green)] to-[var(--brand-blue)] flex items-center justify-center text-white font-black text-5xl shadow-2xl relative z-10 overflow-hidden border-2 border-[var(--brand-green)]/40">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  computedDisplayName.charAt(0).toUpperCase()
                )}

                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  {uploading ? (
                    <FaSpinner className="animate-spin text-2xl" />
                  ) : (
                    <>
                      <FaCamera className="text-2xl mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Upload
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[var(--brand-green)] text-white flex items-center justify-center shadow-lg border-2 border-white z-30 hover:scale-110 transition-transform">
                {uploading ? (
                  <FaSpinner className="text-sm animate-spin" />
                ) : (
                  <FaCamera className="text-sm" />
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
              <div className="absolute -inset-4 bg-[var(--brand-green)]/15 blur-2xl rounded-full"></div>
            </div>

            <div className="text-center md:text-left">
              <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.4em] mb-2">
                Administrator Profile
              </h2>
              <h1 className="text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-3">
                {computedDisplayName}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                <span className="px-4 py-1.5 rounded-full bg-[var(--brand-blue)]/15 border border-[var(--brand-blue)]/30 text-[var(--brand-blue)] text-[11px] font-black uppercase tracking-widest">
                  {role} CLEARANCE
                </span>
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] font-black uppercase tracking-widest">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Action Button */}
          <div className="z-10 w-full md:w-auto flex justify-center md:justify-end">
            <button
              onClick={openEditModal}
              className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-green)] text-white font-bold text-sm tracking-wider uppercase shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <FaEdit className="text-base" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* User Information Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={FaIdBadge}
            label="Identity ID"
            value={userId}
            color="var(--brand-blue)"
          />
          <InfoCard
            icon={FaEnvelope}
            label="Communication Hub"
            value={userData?.email || "syncing..."}
            color="var(--brand-green)"
          />
          <InfoCard
            icon={FaPhone}
            label="Contact Line"
            value={userData?.phone || "NOT_PROVIDED"}
            color="var(--brand-orange)"
          />
          <InfoCard
            icon={FaVenusMars}
            label="Gender"
            value={userData?.gender || "NOT_SET"}
            color="#8b5cf6"
          />
          <InfoCard
            icon={FaCalendarAlt}
            label="Date of Birth"
            value={
              userData?.dateOfBirth
                ? new Date(userData.dateOfBirth).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "NOT_SET"
            }
            color="#ec4899"
          />
          <InfoCard
            icon={FaHeart}
            label="Marital Status"
            value={userData?.maritalStatus || "SINGLE"}
            color="#f59e0b"
          />
          <InfoCard
            icon={FaShieldAlt}
            label="Authorization Status"
            value={`${role} Verified`}
            color="var(--brand-green)"
          />
          <InfoCard
            icon={FaCalendarAlt}
            label="Registry Date"
            value={
              userData?.createdAt
                ? new Date(userData.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "INITIALIZED"
            }
            color="var(--brand-blue)"
          />
        </div>

        {/* Access Log & Security Card */}
        <div className="card glass relative overflow-hidden p-6 md:p-8 rounded-3xl border border-[var(--border)]">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <FaGlobe size={150} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] mb-6 flex items-center gap-3">
            <FaIdBadge /> Access Protocol & Telemetry
          </h3>
          <div className="space-y-4 text-xs font-bold text-[var(--text-soft)]">
            <p className="flex justify-between items-center border-b border-[var(--border)] pb-4">
              <span className="uppercase tracking-widest opacity-60">
                Neural Link Status
              </span>
              <span className="text-[var(--brand-green)]">ESTABLISHED_SECURE</span>
            </p>
            <p className="flex justify-between items-center border-b border-[var(--border)] pb-4">
              <span className="uppercase tracking-widest opacity-60">
                Encryption Standard
              </span>
              <span className="text-[var(--text-main)]">AES-256 GCM PROTOCOL</span>
            </p>
            <p className="flex justify-between items-center border-b border-[var(--border)] pb-4">
              <span className="uppercase tracking-widest opacity-60">
                Role & Clearance
              </span>
              <span className="text-[var(--brand-blue)] font-black">
                {role} AUTHORIZED
              </span>
            </p>
            <p className="flex justify-between items-center pb-2">
              <span className="uppercase tracking-widest opacity-60">
                Account Status
              </span>
              <span className="text-emerald-500 flex items-center gap-1.5">
                <FaCheck /> VERIFIED_ACTIVE
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0054cc]/10 text-[#0054cc] flex items-center justify-center">
                  <FaEdit size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                    Edit Admin Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update your personal information and credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !saving && setIsEditModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-6 bg-white">
              {/* Names Section */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#006c0a] mb-3 flex items-center gap-2">
                  Personal Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. John"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Doe"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#0054cc] mb-3 flex items-center gap-2">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="admin@curevirtual.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                      />
                      <FaEnvelope className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+233 50 123 4567"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                      />
                      <FaPhone className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-2">
                  Demographics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Marital Status
                    </label>
                    <select
                      name="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                    >
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Change (Optional) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-2">
                    <FaLock /> Security / Change Password
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Leave blank to keep current password
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Minimum 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                      />
                      <FaLock className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Re-type new password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#006c0a] focus:ring-2 focus:ring-[#006c0a]/15 transition-all"
                      />
                      <FaLock className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006c0a] hover:bg-[#005508] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" /> Saving...
                    </>
                  ) : (
                    <>
                      <FaCheck /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
