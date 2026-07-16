import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiMail, FiPhone, FiUser, FiAward, FiCheckCircle } from "react-icons/fi";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { toast } from "react-toastify";

function getInitials(name) {
  if (!name) return "P";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[1]?.[0] || "";
  return (first + last).toUpperCase() || "P";
}

export default function PAViewProfile() {
  const role = "PHYSICIAN_ASSISTANT";
  const fallbackName = localStorage.getItem("userName") || localStorage.getItem("name") || "Physician Assistant";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/consultations/pa/profile");
      setProfile(res?.data?.data ?? null);
    } catch (err) {
      console.error("Failed to load PA profile:", err);
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = profile?.user ? `${profile.user.firstName} ${profile.user.lastName}`.trim() : fallbackName;
  const email = profile?.user?.email || localStorage.getItem("email") || "—";
  const phone = profile?.user?.phone || "—";

  return (
    <DashboardLayout role={role} user={{ name: displayName }}>
      <div className="animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
              Physician Assistant Identity
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
              View Your Professional Information
            </p>
          </div>
          <Link
            to="/pa/profile"
            className="btn btn-primary bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] border-none rounded-2xl px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-[1.02] transition-transform"
          >
            Edit Profile
          </Link>
        </div>

        {/* PROFILE CARD */}
        <div className="glass-panel p-8 max-w-5xl">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 border-4 border-[var(--brand-blue)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !profile ? (
            <p className="text-[var(--text-soft)]">
              No profile found. Click <strong className="text-color-white">Edit Profile</strong> to set up your details.
            </p>
          ) : (
            <>
              {/* TOP */}
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
                {/* AVATAR */}
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] flex items-center justify-center text-white text-3xl font-black shadow-xl">
                  {getInitials(displayName)}
                </div>

                {/* INFO */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tight">
                      {displayName}
                    </h2>
                    {profile.referenceId && (
                      <span
                        onClick={() => {
                          navigator.clipboard.writeText(profile.referenceId);
                          toast.success("PA Reference ID copied!");
                        }}
                        className="cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--brand-blue)] bg-[var(--brand-blue)]/15 border border-[var(--brand-blue)]/40 px-3.5 py-1.5 rounded-full hover:bg-[var(--brand-blue)]/25 transition-all shadow-sm"
                        title="Click to copy PA Reference ID"
                      >
                        PA ID: {profile.referenceId}
                      </span>
                    )}
                    {profile.supervisingDoctorId && (
                      <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-1.5 rounded-full shadow-sm">
                        Supervising Dr: {profile.supervisingDoctorId}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--brand-green)] bg-[var(--brand-green)]/10 px-3 py-1 rounded-full">
                      <FiCheckCircle /> {profile.verificationStatus || "VERIFIED"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--brand-blue)] flex items-center gap-2">
                    <FiAward /> {profile.specialty || "General Practice"}
                  </p>
                </div>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact Information */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 border-b border-[var(--border)] pb-2">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-[var(--bg-elevated)] rounded-xl text-[var(--brand-purple)]">
                        <FiMail />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-soft)] font-bold uppercase tracking-wider mb-1">Email</p>
                        <p className="text-sm text-[var(--text-main)] font-medium">{email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-[var(--bg-elevated)] rounded-xl text-[var(--brand-purple)]">
                        <FiPhone />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-soft)] font-bold uppercase tracking-wider mb-1">Phone</p>
                        <p className="text-sm text-[var(--text-main)] font-medium">{phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 border-b border-[var(--border)] pb-2">
                    Professional Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-[var(--bg-elevated)] rounded-xl text-[var(--brand-blue)]">
                        <FiAward />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-soft)] font-bold uppercase tracking-wider mb-1">License Number</p>
                        <p className="text-sm text-[var(--text-main)] font-medium">{profile.licenseNumber || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-[var(--bg-elevated)] rounded-xl text-[var(--brand-blue)]">
                        <FiUser />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-soft)] font-bold uppercase tracking-wider mb-1">Specialty / Focus</p>
                        <p className="text-sm text-[var(--text-main)] font-medium">{profile.specialty || "—"}</p>
                      </div>
                    </div>
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
