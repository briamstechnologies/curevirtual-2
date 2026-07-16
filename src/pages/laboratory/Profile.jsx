import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEdit2, FiSave, FiMapPin, FiPhone, FiMail, FiAward, FiClock, FiSettings } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function LaboratoryProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    licenseNumber: "",
    openingHours: "",
    services: "",
  });

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        const res = await api.get(`/laboratory/profile?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data && res.data.success) {
          const raw = res.data.data;
          setProfile({
            name: raw.displayName || `${raw.user?.firstName || ""} ${raw.user?.lastName || ""}`.trim() || "",
            firstName: raw.user?.firstName || "",
            lastName: raw.user?.lastName || "",
            email: raw.user?.email || "",
            phone: raw.phone || raw.user?.phone || "",
            address: raw.address || "",
            city: raw.city || "",
            state: raw.state || "",
            country: raw.country || "",
            postalCode: raw.postalCode || "",
            licenseNumber: raw.licenseNumber || "",
            openingHours: raw.openingHours || "",
            services: raw.services || "",
            referenceId: raw.referenceId || "CV-LB-GH-2026-0001",
            verificationStatus: raw.verificationStatus || "PENDING",
          });
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
  const handleSave = async (e) => {
    e.preventDefault();
    if (profile.openingHours) {
      const lower = profile.openingHours.toLowerCase();
      if (!lower.includes("am") || !lower.includes("pm")) {
        return toast.error("Please enter Opening Hours in AM/PM format (e.g. 09:00 AM - 08:00 PM)");
      }
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      const payload = {
        userId,
        displayName: profile.name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postalCode,
        licenseNumber: profile.licenseNumber,
        openingHours: profile.openingHours,
        services: profile.services,
      };

      const res = await api.put("/laboratory/profile", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data.success) {
        localStorage.setItem("userName", profile.name);
        toast.success("Profile updated successfully!");
        setTimeout(() => {
          navigate("/laboratory/view-profile");
        }, 1500);
      } else {
        toast.error(res.data.error || "Failed to update profile");
      }
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
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--brand-purple)] mb-2">
              Laboratory
            </p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--text-main)]">
              Profile Settings
            </h1>
            <p className="text-sm text-[var(--text-soft)] mt-2 mb-3">
              Manage your laboratory profile information.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">badge</span>
                Laboratory ID: {profile.referenceId || "CV-LB-GH-2026-0001"}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Status: {profile.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/laboratory/view-profile")}
            className="btn btn-secondary rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest"
          >
            Back to Profile
          </button>
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
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LABORATORY DISPLAY NAME */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Laboratory Display Name *
                </label>
                <div className="relative mt-2">
                  <FiEdit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    required
                    name="name"
                    value={profile.name}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="e.g. CureVirtual Central Lab"
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
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="+92 XXX XXXXXXX"
                  />
                </div>
              </div>

              {/* FIRST NAME */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Contact Person First Name
                </label>
                <div className="relative mt-2">
                  <FiEdit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="First Name"
                  />
                </div>
              </div>

              {/* LAST NAME */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Contact Person Last Name
                </label>
                <div className="relative mt-2">
                  <FiEdit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="Last Name"
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
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="Laboratory Address"
                  />
                </div>
              </div>

              {/* CITY */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  City
                </label>
                <div className="relative mt-2">
                  <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="city"
                    value={profile.city}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="City"
                  />
                </div>
              </div>

              {/* STATE */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  State
                </label>
                <div className="relative mt-2">
                  <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="state"
                    value={profile.state}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="State"
                  />
                </div>
              </div>

              {/* POSTAL CODE */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Postal Code
                </label>
                <div className="relative mt-2">
                  <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="postalCode"
                    value={profile.postalCode}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="Postal Code"
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
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="Enter License Number"
                  />
                </div>
              </div>

              {/* OPENING HOURS */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Opening Hours
                </label>
                <div className="relative mt-2">
                  <FiClock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="openingHours"
                    value={profile.openingHours}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="e.g. 09:00 AM - 08:00 PM"
                  />
                </div>
              </div>
            </div>

            {/* SERVICES OFFERED */}
            <div className="mt-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Services Offered / Tests Available
              </label>
              <textarea
                name="services"
                value={profile.services}
                onChange={handleChange}
                rows={5}
                className="w-full mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 outline-none resize-none text-sm text-[var(--text-main)]"
                placeholder="List services/tests (e.g. PCR, Blood Test, X-Ray)..."
              />
            </div>

            {/* BUTTON */}
            <div className="mt-10 flex justify-end">
              <button
                type="submit"
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
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
