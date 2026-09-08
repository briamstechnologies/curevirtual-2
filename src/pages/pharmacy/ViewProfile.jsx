import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCamera, FaSpinner, FaEdit } from "react-icons/fa";

const PLACEHOLDER_LOGO = "/images/logo/Asset3.png";

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
  if (!name) return "P";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[1]?.[0] || "";
  return (first + last).toUpperCase() || "P";
}

export default function PharmacyViewProfile() {
  const role = "PHARMACY";
  const userId = localStorage.getItem("userId") || "";
  const fallbackName =
    localStorage.getItem("userName") || localStorage.getItem("name") || "Pharmacy";

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await api.get("/pharmacy/profile", { params: { userId } });
      const data = res?.data?.data ?? res?.data ?? null;
      if (!data) {
        toast.error("Profile not found. Please update your profile.");
      }
      setProfile(data);
      const imgUrl = data?.avatarUrl || data?.user?.avatarUrl;
      if (imgUrl) {
        localStorage.setItem("userAvatar", imgUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
      }
    } catch (err) {
      console.error("Failed to load pharmacy profile:", err);
      toast.error(err?.response?.data?.error || "Failed to load profile.");
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

      const res = await api.post("/pharmacy/avatar", formData, {
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
        toast.success("Pharmacy logo/photo updated successfully!");
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
    <DashboardLayout role={role} user={{ id: userId, name: displayName }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.4em] mb-1">
              Store Identity
            </h2>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              Pharmacy Profile
            </h1>
          </div>
          <Link
            to="/pharmacy/profile"
            className="btn btn-primary flex items-center gap-2 px-6 py-4 shadow-lg shadow-emerald-500/20 font-black uppercase text-xs tracking-wider"
          >
            <FaEdit /> Update Profile
          </Link>
        </div>

        {/* Visible card wrapper */}
        <div className="bg-[var(--bg-glass)] backdrop-blur-md rounded-2xl p-6 shadow-lg">
          {loading ? (
            <p className="text-[var(--text-soft)]">Loading...</p>
          ) : !profile ? (
            <p className="text-[var(--text-soft)]">
              No profile found. Click <strong className="text-color-white">Edit Profile</strong> to
              set up your pharmacy details.
            </p>
          ) : (
            <>
              {/* Header strip */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-[var(--border)] pb-6">
                <div className="flex items-center gap-4">
                  {/* Interactive Avatar Container */}
                  <div
                    className="relative w-20 h-20 group cursor-pointer shrink-0"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    title="Click to upload/change pharmacy photo"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg border-2 border-emerald-500/30">
                      {currentAvatar ? (
                        <img src={currentAvatar} alt="Pharmacy Logo" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border border-white">
                      {uploading ? <FaSpinner className="text-[10px] animate-spin" /> : <FaCamera className="text-[10px]" />}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div>
                    <div className="text-xl font-semibold">{displayName}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                        Pharmacy ID: {profile.referenceId || profile.reference_id || "CV-PH-GH-2026-0001"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        Status: {profile.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--text-soft)]">
                      License: {profile.licenseNumber || "—"} • Email: {email}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[var(--text-muted)]">Created</div>
                    <div>{formatDate(profile.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Last Updated</div>
                    <div>{formatDate(profile.updatedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Details (high-contrast sections) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Organization & Contact */}
                <section
                  className="rounded-xl p-5 border border-[var(--border)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-lg font-semibold mb-3">Organization & Contact</h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Pharmacy ID</dt>
                      <dd className="text-right font-bold text-blue-400">
                        {profile.referenceId || profile.reference_id || "CV-PH-GH-2026-0001"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Verification Status</dt>
                      <dd className="text-right font-bold text-amber-400">
                        {profile.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Display Name</dt>
                      <dd className="text-right max-w-[60%]">{displayName || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Phone</dt>
                      <dd className="text-right max-w-[60%]">{profile.phone || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Email</dt>
                      <dd className="text-right max-w-[60%]">{email}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Address</dt>
                      <dd className="text-right max-w-[60%]">{addressLine || "—"}</dd>
                    </div>
                  </dl>
                </section>

                {/* Location */}
                <section
                  className="rounded-xl p-5 border border-[var(--border)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-lg font-semibold mb-3">Location</h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Latitude</dt>
                      <dd>{profile.latitude ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-soft)]">Longitude</dt>
                      <dd>{profile.longitude ?? "—"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <div className="text-[var(--text-soft)] mb-1 text-sm">Map</div>
                    {profile.latitude != null && profile.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-[#d50303]"
                      >
                        View on Google Maps
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </div>
                </section>

                {/* Opening Hours */}
                <section
                  className="md:col-span-2 rounded-xl p-5 border border-[var(--border)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-lg font-semibold mb-3">Opening Hours</h2>
                  <p className="text-sm text-[var(--text-soft)] whitespace-pre-wrap">
                    {profile.openingHours?.trim() || "—"}
                  </p>
                </section>

                {/* Services */}
                <section
                  className="md:col-span-2 rounded-xl p-5 border border-[var(--border)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <h2 className="text-lg font-semibold mb-3">Services</h2>
                  <p className="text-sm text-[var(--text-soft)] whitespace-pre-wrap">
                    {profile.services?.trim() || "—"}
                  </p>
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
