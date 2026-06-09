import { useEffect, useState } from "react";
import { FiEdit2, FiSave, FiMapPin, FiPhone, FiMail, FiAward, FiClock } from "react-icons/fi";

import { toast } from "react-toastify";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function LaboratoryProfile() {
  const [loading, setLoading] = useState(false);

  // Initial state empty kar di gayi hai
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    licenseNumber: "",
    openingTime: "",
    closingTime: "",
    description: "",
  });

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await api.get("/laboratory/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data) {
          setProfile(res.data);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // SAVE PROFILE
  // =========================
  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      await api.put("/laboratory/profile", profile, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.setItem("userName", profile.name);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="LABORATORY" user={{ name: profile.name || "Laboratory" }}>
      <div className="animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--brand-purple)] mb-2">
            Laboratory
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--text-main)]">
            Profile Settings
          </h1>
          <p className="text-sm text-[var(--text-soft)] mt-2">
            Manage your laboratory profile information.
          </p>
        </div>

        {/* CARD */}
        <div className="glass-panel p-6 md:p-10 rounded-[2rem]">
          {/* TOP */}
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] flex items-center justify-center text-white text-3xl font-black shadow-xl">
              {profile.name?.charAt(0) || "L"}
            </div>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">
                {profile.name || "Laboratory Name"}
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1 flex items-center gap-2">
                <FiMail />
                {profile.email || "Email address"}
              </p>
            </div>
          </div>

          {/* FORM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NAME */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Laboratory Name
              </label>
              <div className="relative mt-2">
                <FiEdit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
                  placeholder="Laboratory Name"
                />
              </div>
            </div>

            {/* PHONE */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Phone Number
              </label>
              <div className="relative mt-2">
                <FiPhone className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
                  placeholder="+92 XXX XXXXXXX"
                />
              </div>
            </div>

            {/* ADDRESS */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Address
              </label>
              <div className="relative mt-2">
                <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
                  placeholder="Laboratory Address"
                />
              </div>
            </div>

            {/* LICENSE */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                License Number
              </label>
              <div className="relative mt-2">
                <FiAward className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  name="licenseNumber"
                  value={profile.licenseNumber}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
                  placeholder="Enter License Number"
                />
              </div>
            </div>

            {/* OPENING */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Opening Time
              </label>
              <div className="relative mt-2">
                <FiClock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="time"
                  name="openingTime"
                  value={profile.openingTime}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
                />
              </div>
            </div>

            {/* CLOSING */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Closing Time
              </label>
              <div className="relative mt-2">
                <FiClock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="time"
                  name="closingTime"
                  value={profile.closingTime}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mt-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Description
            </label>
            <textarea
              name="description"
              value={profile.description}
              onChange={handleChange}
              rows={5}
              className="w-full mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 outline-none resize-none"
              placeholder="Write laboratory description..."
            />
          </div>

          {/* BUTTON */}
          <div className="mt-10 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-xl hover:scale-[1.02] transition-all"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <FiSave /> Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
