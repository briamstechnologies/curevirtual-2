import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEdit2, FiSave, FiPhone, FiAward } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useUser } from "../../context/UserContext";

export default function PAProfile() {
  const navigate = useNavigate();
  const { updateUser } = useUser();
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    licenseNumber: "",
    specialty: "",
  });

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/consultations/pa/profile`);
        if (res.data && res.data.data) {
          const raw = res.data.data;
          setProfile({
            firstName: raw.user?.firstName || "",
            lastName: raw.user?.lastName || "",
            phone: raw.user?.phone || "",
            licenseNumber: raw.licenseNumber || "",
            specialty: raw.specialty || "",
            referenceId: raw.referenceId || "",
            supervisingDoctorId: raw.supervisingDoctorId || "",
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
    try {
      setLoading(true);

      const payload = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        licenseNumber: profile.licenseNumber,
        specialty: profile.specialty,
      };

      const res = await api.put(`/consultations/pa/profile`, payload);
      if (res.data && res.data.success) {
        toast.success("Profile updated successfully!");
        
        const newName = `${profile.firstName} ${profile.lastName}`.trim();
        updateUser({ name: newName });
        localStorage.setItem("name", newName);
        localStorage.setItem("userName", newName);

        setTimeout(() => {
          navigate("/pa/view-profile");
        }, 1500);
      } else {
        toast.error(res.data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="PHYSICIAN_ASSISTANT" user={{ name: `${profile.firstName} ${profile.lastName}`.trim() || "PA" }}>
      <div className="animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--brand-purple)] mb-2">
              Physician Assistant
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--text-main)]">
                Profile Settings
              </h1>
              {profile.referenceId && (
                <span
                  onClick={() => {
                    navigator.clipboard.writeText(profile.referenceId);
                    toast.success("PA Reference ID copied!");
                  }}
                  className="cursor-pointer text-xs font-black uppercase tracking-wider text-[var(--brand-blue)] bg-[var(--brand-blue)]/15 border border-[var(--brand-blue)]/40 px-3.5 py-1.5 rounded-full shadow-sm hover:bg-[var(--brand-blue)]/25"
                >
                  PA ID: {profile.referenceId}
                </span>
              )}
              {profile.supervisingDoctorId && (
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-1.5 rounded-full shadow-sm">
                  Supervising Dr: {profile.supervisingDoctorId}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-bold mt-1 max-w-2xl">
              Update your personal and professional details.
            </p>
          </div>
        </div>

        {/* FORM CARD */}
        <div className="glass-panel p-8 max-w-5xl">
          <form onSubmit={handleSave}>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-main)] border-b border-[var(--border)] pb-3 mb-6">
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FIRST NAME */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  First Name
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
                  Last Name
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
                    placeholder="Phone Number"
                  />
                </div>
              </div>
            </div>

            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-main)] border-b border-[var(--border)] pb-3 mt-10 mb-6">
              Professional Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* SPECIALTY */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Specialty / Focus
                </label>
                <div className="relative mt-2">
                  <FiEdit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="specialty"
                    value={profile.specialty}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none text-sm text-[var(--text-main)]"
                    placeholder="e.g. General Practice"
                  />
                </div>
              </div>
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
