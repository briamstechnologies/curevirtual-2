// FILE: src/pages/patient/ViewProfile.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import EditProfileModal from "./EditProfileModal";
import "react-toastify/dist/ReactToastify.css";
import { FaCamera, FaSpinner } from "react-icons/fa";

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

function humanBlood(b) {
  if (!b) return "—";
  return b.replace("_POS", "+").replace("_NEG", "-");
}

function humanGender(g) {
  if (!g) return "—";
  const map = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };
  return map[g] || g;
}

function humanMaritalStatus(m) {
  if (!m) return "—";
  const map = { SINGLE: "Single", MARRIED: "Married" };
  return map[m] || m;
}

function getInitials(name) {
  if (!name) return "P";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[1]?.[0] || "";
  return (first + last).toUpperCase() || "P";
}

export default function PatientViewProfile() {
  const role = "PATIENT";
  const userId = localStorage.getItem("userId") || "";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";

  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("userAvatar") || null);
  const [profile, setProfile] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Derive reactive display name
  const displayName =
    profile?.user?.name ||
    (profile?.user?.firstName
      ? `${profile.user.firstName} ${profile.user.lastName || ""}`.trim()
      : null) ||
    userName;

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/patient/profile", { params: { userId } });
      const data = res.data?.data || null;
      setProfile(data);
      if (data?.avatarUrl || data?.user?.avatarUrl) {
        const url = data.avatarUrl || data.user.avatarUrl;
        setAvatarUrl(url);
        localStorage.setItem("userAvatar", url);
        window.dispatchEvent(new Event("avatarUpdated"));
      }
    } catch {
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadProfile();
  }, [loadProfile, userId]);

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("userId", userId);

      const res = await api.post("/patient/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.avatarUrl) {
        const newUrl = res.data.avatarUrl;
        setAvatarUrl(newUrl);
        localStorage.setItem("userAvatar", newUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
        toast.success("Profile photo updated successfully!");
      } else {
        toast.error("Failed to update profile photo");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error uploading image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout role={role} user={{ name: displayName, id: userId }}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.3em] mb-1">
              Medical Identity
            </h2>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              View Profile
            </h1>
          </div>
          <button onClick={() => setIsEditModalOpen(true)} className="btn btn-primary">
            Update Profile
          </button>
        </div>

        <div className="card !p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 border-4 border-[var(--brand-green)]/20 border-t-[var(--brand-green)] rounded-full animate-spin"></div>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">
                Decrypting Records...
              </p>
            </div>
          ) : !profile ? (
            <p className="text-[var(--text-soft)]">No profile found.</p>
          ) : (
            <>
              {/* Header strip with avatar + basic info */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-[var(--border)] pb-8 mb-8">
                <div className="flex items-center gap-6">
                  {/* Avatar with Upload Capability */}
                  <div
                    className="relative group cursor-pointer flex-shrink-0"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    title="Click to upload/change photo"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-24 h-24 rounded-[2rem] object-cover shadow-xl border-2 border-[var(--brand-green)]"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-[var(--brand-green)] to-[var(--brand-blue)] flex items-center justify-center text-3xl font-black text-[var(--text-main)] shadow-xl">
                        {getInitials(displayName)}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 rounded-[2rem] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploading ? (
                        <FaSpinner className="text-white text-xl animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center text-white text-[10px] font-bold">
                          <FaCamera className="text-lg mb-0.5" />
                          <span>Change</span>
                        </div>
                      )}
                    </div>

                    {/* Floating badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--brand-green)] text-white flex items-center justify-center shadow-lg border-2 border-white">
                      {uploading ? (
                        <FaSpinner className="text-xs animate-spin" />
                      ) : (
                        <FaCamera className="text-xs" />
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div>
                    <div className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                      {displayName}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-blue)] mt-1 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"} inline-block`}
                      ></span>
                      MRN Protocol:{" "}
                      {profile.referenceId ||
                        profile.medicalRecordNumber ||
                        `PAK-PT-${String(profile.id || "")
                          .slice(0, 6)
                          .toUpperCase()}`}{" "}
                      • {isOnline ? "ONLINE (ACTIVE)" : "OFFLINE (DISCONNECTED)"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Created
                    </div>
                    <div className="text-sm font-bold text-[var(--text-main)]">
                      {formatDate(profile.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Last Sync
                    </div>
                    <div className="text-sm font-bold text-[var(--text-main)]">
                      {formatDate(profile.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-green)] ml-1">
                    Personal Specification
                  </h2>
                  <div className="bg-[var(--bg-main)]/50 border border-[var(--border)] rounded-3xl p-6 space-y-4">
                    {[
                      {
                        label: "Date of Birth",
                        value: formatDate(profile.user?.dateOfBirth || profile.dateOfBirth),
                      },
                      {
                        label: "Gender",
                        value: humanGender(profile.user?.gender || profile.gender),
                      },
                      {
                        label: "Phone",
                        value: profile.user?.phone || profile.phone || "—",
                      },
                      {
                        label: "Marital Status",
                        value: humanMaritalStatus(profile.user?.maritalStatus),
                      },
                      {
                        label: "Blood Group",
                        value: humanBlood(profile.bloodGroup),
                      },
                      {
                        label: "Height",
                        value: profile.height ? `${profile.height} cm` : "—",
                      },
                      {
                        label: "Weight",
                        value: profile.weight ? `${profile.weight} kg` : "—",
                      },
                      { label: "Address", value: profile.address || "—" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4">
                        <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">
                          {item.label}
                        </dt>
                        <dd className="text-sm font-bold text-[var(--text-main)] text-right">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] ml-1">
                    System Identifiers
                  </h2>
                  <div className="bg-[var(--bg-main)]/50 border border-[var(--border)] rounded-3xl p-6 space-y-4">
                    {[
                      {
                        label: "Medical Record Number",
                        value:
                          profile.referenceId ||
                          profile.medicalRecordNumber ||
                          `PAK-PT-${String(profile.id || "")
                            .slice(0, 6)
                            .toUpperCase()}`,
                      },
                      {
                        label: "Insurance Provider",
                        value: profile.insuranceProvider || "—",
                      },
                      {
                        label: "Member ID",
                        value: profile.insuranceMemberId || "—",
                      },
                      {
                        label: "Emergency Phone",
                        value: profile.emergencyContact || "—",
                      },
                      {
                        label: "Emergency Name",
                        value: profile.emergencyContactName || "—",
                      },
                      {
                        label: "Emergency Email",
                        value: profile.emergencyContactEmail || "—",
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4">
                        <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">
                          {item.label}
                        </dt>
                        <dd className="text-sm font-bold text-[var(--text-main)] text-right">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
