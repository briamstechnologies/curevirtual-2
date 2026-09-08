import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Pediatrics",
  "Psychiatry",
  "Orthopedics",
  "Gynecology",
  "Ophthalmology",
  "ENT",
  "Dental",
  "Other",
];

export default function DoctorProfile() {
  const role = "DOCTOR";
  const userId = localStorage.getItem("userId") || "";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    specialization: "General Medicine",
    customProfession: "",
    qualifications: "",
    licenseNumber: "",
    hospitalAffiliation: "",
    yearsOfExperience: "",
    consultationFee: "",
    availability: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    bio: "",
    languages: "",
    maritalStatus: "SINGLE",
    emergencyContact: "",
    emergencyContactName: "",
    emergencyContactEmail: "",
    profileImage: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/doctor/profile", { params: { userId } });
      const p = res.data?.data;
      if (p) {
        setProfileData(p);
        setForm((prev) => ({
          firstName: p.user?.firstName || "",
          middleName: p.user?.middleName || "",
          lastName: p.user?.lastName || "",
          phone: p.user?.phone || "",
          specialization: p.specialization || "General Medicine",
          customProfession: p.customProfession || "",
          qualifications: p.qualifications || "",
          licenseNumber: p.licenseNumber || "",
          hospitalAffiliation: p.hospitalAffiliation || "",
          yearsOfExperience: p.yearsOfExperience ?? "",
          consultationFee: p.consultationFee ?? "",
          availability: p.availability || "",
          timezone: p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          bio: p.bio || "",
          languages: p.languages || "",
          maritalStatus: p.user?.maritalStatus || "SINGLE",
          emergencyContact: p.emergencyContact || "",
          emergencyContactName: p.emergencyContactName || "",
          emergencyContactEmail: p.emergencyContactEmail || "",
          // If the GET response misses the URL for any reason, do not destroy the existing display URL
          profileImage: p.avatarUrl || p.profileImage || p.profile_image || p.user?.profileImage || p.user?.profile_image || prev.profileImage || "",
        }));
      }
    } catch (err) {
      console.error("Failed to load doctor profile:", err);
      toast.error("Complete your profile configuration.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadProfile();
  }, [loadProfile, userId]);

  const handleChange = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };


  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    try {
      setAvatarUploading(true);
      const doctorUserId = localStorage.getItem("userId") || userId;
      const formDataUpload = new FormData();
      formDataUpload.append("avatar", file);
      if (doctorUserId) formDataUpload.append("userId", doctorUserId);

      const res = await api.post("/doctor/avatar", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.avatarUrl) {
        const newUrl = res.data.avatarUrl;
        setForm((f) => ({ ...f, profileImage: newUrl }));
        localStorage.setItem("userAvatar", newUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
        
        // Update cached profile
        const cached = localStorage.getItem("cached_doctor_profile");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            parsed.avatarUrl = newUrl;
            if (parsed.user) parsed.user.avatarUrl = newUrl;
            localStorage.setItem("cached_doctor_profile", JSON.stringify(parsed));
          } catch {}
        }
        toast.success("Profile photo uploaded and saved successfully!");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.response?.data?.error || "Error uploading profile image.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeProfileImage = async () => {
    setForm((f) => ({ ...f, profileImage: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.qualifications || !form.licenseNumber) {
      toast.error("Please fill in Qualifications and License Number.");
      return;
    }
    if (form.specialization === "Other" && !form.customProfession) {
      toast.error("Please specify your profession.");
      return;
    }
    try {
      const doctorUserId = localStorage.getItem("userId");
      if (!doctorUserId) {
        return toast.error("User ID is missing. Please re-login.");
      }

      setSaving(true);
      const formData = new FormData();
      
      // Explicitly append as string
      formData.append("userId", String(doctorUserId));
      
      // Enforce skipping profileImage before typeof check
      Object.keys(form).forEach(key => {
        if (key === "profileImage") return; // must run before anything else touches this key
        let value = form[key];
        if (value === null || value === undefined || value === "") return;
        
        if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      });
      
      // Immediately after that loop, append the real file explicitly and ONLY here:
      if (fileInputRef.current?.files?.[0]) {
        formData.append("profileImage", fileInputRef.current.files[0]);
        console.log("Appending real File object:", fileInputRef.current.files[0]);
      } else {
        console.log("No new file selected — profileImage field omitted from this save.");
      }

      // Add a hard assertion right before sending the request
      const imgEntry = [...formData.entries()].find(([k]) => k === "profileImage");
      if (imgEntry && !(imgEntry[1] instanceof File)) {
        console.error("BUG: profileImage in FormData is not a File!", imgEntry[1]);
        toast.error("Internal error: image was not attached as a file. Save cancelled.");
        setSaving(false);
        return; // abort the save rather than silently sending broken data
      }

      // ✅ Log FormData contents before sending (Step 1 Request)
      console.log("--- Sending FormData ---");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1]);
      }
      console.log("------------------------");

      // Send the request WITHOUT explicitly setting Content-Type, 
      // allowing Axios to automatically set the correct boundary.
      const res = await api.put("/doctor/profile", formData);
      
      console.log('Save response:', res.data); // STEP 3: Log the backend response
      
      const updatedProfile = res.data?.data;
      const newAvatarUrl = updatedProfile?.avatarUrl || updatedProfile?.user?.profileImage || updatedProfile?.profileImage || updatedProfile?.profile_image;
      
      // STEP 4: Set the URL into the state and clear the file input
      if (newAvatarUrl) {
        localStorage.setItem("userAvatar", newAvatarUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
        setForm(f => ({ ...f, profileImage: newAvatarUrl }));
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      if (updatedProfile) {
        localStorage.setItem("cached_doctor_profile", JSON.stringify(updatedProfile));
      }

      toast.success("Profile updated successfully!");
      
      // Re-fetch to ensure sync, but the local state is already updated above
      await loadProfile();
    } catch (err) {
      console.error("❌ Failed to save doctor profile:", err?.response?.data || err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.3em] mb-1">
              Professional Account
            </h2>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              Doctor Profile
            </h1>
          </div>
          {profileData && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">badge</span>
                Doctor ID: {profileData.referenceId || profileData.reference_id || "CV-DR-GH-2026-0001"}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Status: {profileData.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification"}
              </span>
            </div>
          )}
        </div>

        <div className="card !p-8 max-w-5xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 border-4 border-[var(--brand-green)]/20 border-t-[var(--brand-green)] rounded-full animate-spin"></div>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">
                Loading Profile...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Doctor Profile Image */}
              <div className="md:col-span-2">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-main)]/60 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="relative shrink-0">
                      <div className="h-28 w-28 rounded-3xl overflow-hidden border-2 border-[var(--brand-green)]/20 bg-[var(--bg-main)] flex items-center justify-center shadow-sm">
                        {form.profileImage ? (
                          <img
                            src={form.profileImage}
                            alt="Doctor profile"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              console.error("Profile image failed to load:", e.target.src);
                              toast.error("Image URL is not accessible — check Supabase bucket permissions.");
                            }}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-5xl text-[var(--text-muted)]">
                            account_circle
                          </span>
                        )}
                      </div>

                      {form.profileImage && (
                        <button
                          type="button"
                          onClick={removeProfileImage}
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition"
                          title="Remove image"
                          aria-label="Remove profile image"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-wide">
                        Doctor Profile Photo
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Upload a professional photo. JPG, JPEG, PNG or WEBP up to 5MB.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />

                        <button
                          type="button"
                          disabled={avatarUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#027906] hover:bg-[#045d07] px-5 py-3 text-white font-bold tracking-wide uppercase text-[10px] shadow-md transition active:scale-95 disabled:opacity-50"
                        >
                          <span className={`material-symbols-outlined text-base ${avatarUploading ? "animate-spin" : ""}`}>
                            {avatarUploading ? "progress_activity" : "upload"}
                          </span>
                          {avatarUploading ? "Uploading..." : form.profileImage ? "Change Image" : "Upload Image"}
                        </button>

                        {form.profileImage && (
                          <button
                            type="button"
                            onClick={removeProfileImage}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-5 py-3 text-red-600 font-bold tracking-wide uppercase text-[10px] hover:bg-red-100 transition"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Row */}

              <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.firstName}
                    onChange={handleChange("firstName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.middleName}
                    onChange={handleChange("middleName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.lastName}
                    onChange={handleChange("lastName")}
                  />
                </div>
              </div>

              {/* Phone Row */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.phone}
                  onChange={handleChange("phone")}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Marital Status
                </label>
                <select
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.maritalStatus}
                  onChange={handleChange("maritalStatus")}
                >
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Specialization
                </label>
                <select
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.specialization}
                  onChange={handleChange("specialization")}
                  required
                >
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {form.specialization === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Specify Profession
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.customProfession}
                    onChange={handleChange("customProfession")}
                    placeholder="e.g. Holistic Healer"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Qualifications
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.qualifications}
                  onChange={handleChange("qualifications")}
                  placeholder="e.g. MBBS, MD"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  License Number
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.licenseNumber}
                  onChange={handleChange("licenseNumber")}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Hospital Affiliation
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.hospitalAffiliation}
                  onChange={handleChange("hospitalAffiliation")}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.yearsOfExperience}
                  onChange={handleChange("yearsOfExperience")}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Consultation Fee (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.consultationFee}
                  onChange={handleChange("consultationFee")}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Availability
                </label>
                <textarea
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none h-24"
                  value={form.availability}
                  onChange={handleChange("availability")}
                  placeholder='e.g. {"monday":"9-5","tuesday":"10-4"} or free text'
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Bio
                </label>
                <textarea
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none h-24"
                  value={form.bio}
                  onChange={handleChange("bio")}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Languages
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                  value={form.languages}
                  onChange={handleChange("languages")}
                  placeholder="e.g. English, French"
                />
              </div>

              {/* Emergency Contact */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <h3 className="text-sm font-bold text-[var(--brand-green)] uppercase tracking-wider mb-2 mt-4">
                    Emergency Contact
                  </h3>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.emergencyContactName}
                    onChange={handleChange("emergencyContactName")}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.emergencyContactEmail}
                    onChange={handleChange("emergencyContactEmail")}
                    placeholder="emergency@example.com"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Timezone
                  </label>
                  <select
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.timezone}
                    onChange={handleChange("timezone")}
                    required
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Karachi">Asia/Karachi (GMT+5)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                    {/* Add more as needed, or use a library for a full list */}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                    Additional Details (Relation, Phone, etc.)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                    value={form.emergencyContact}
                    onChange={handleChange("emergencyContact")}
                    placeholder="Mother - +1 555-0123"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex justify-start pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#027906] hover:bg-[#045d07] px-8 py-3 text-white font-bold tracking-wider uppercase text-xs shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}