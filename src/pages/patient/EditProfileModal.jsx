import { useState, useEffect } from "react";
import api from "../../Lib/api";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
];

const BLOOD_GROUP_OPTIONS = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" },
  { value: "UNKNOWN", label: "Unknown" },
];

export default function EditProfileModal({ isOpen, onClose, profile, onProfileUpdate }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        dateOfBirth: profile.user?.dateOfBirth
          ? profile.user.dateOfBirth.split("T")[0]
          : profile.dateOfBirth
            ? profile.dateOfBirth.split("T")[0]
            : "",
        gender: profile.user?.gender || profile.gender || "OTHER",
        firstName: profile.user?.firstName || "",
        lastName: profile.user?.lastName || "",
        phone: profile.user?.phone || profile.phone || "",
        maritalStatus: profile.user?.maritalStatus || "SINGLE",
        bloodGroup: profile.bloodGroup || "UNKNOWN",
        height: profile.height || "",
        weight: profile.weight || "",
        address: profile.address || "",
        medicalRecordNumber: profile.medicalRecordNumber || profile.referenceId || "",
        insuranceProvider: profile.insuranceProvider || "",
        insuranceMemberId: profile.insuranceMemberId || "",
        emergencyContact: profile.emergencyContact || "",
        emergencyContactName: profile.emergencyContactName || "",
        emergencyContactEmail: profile.emergencyContactEmail || "",
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        bloodGroup: formData.bloodGroup,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        address: formData.address,
        medicalRecordNumber: formData.medicalRecordNumber,
        insuranceProvider: formData.insuranceProvider,
        insuranceMemberId: formData.insuranceMemberId,
        emergencyContact: formData.emergencyContact,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactEmail: formData.emergencyContactEmail,
      };

      const res = await api.put("/patient/profile", payload);
      if (res.data?.success) {
        toast.success("Profile updated successfully");
        if (onProfileUpdate) {
          onProfileUpdate(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest text-on-surface w-full max-w-3xl rounded-[32px] shadow-2xl border border-outline-variant/30 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Personal Information
            </span>
            <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight mt-0.5">
              Update Medical Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center transition-all"
            title="Close"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar text-left">
          {/* Section 1: Personal Specifications */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">person</span>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface">
                Personal Specifications
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ""}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName || ""}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ""}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender || "OTHER"}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Marital Status
                </label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus || "SINGLE"}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                >
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup || "UNKNOWN"}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                >
                  {BLOOD_GROUP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height || ""}
                    onChange={handleChange}
                    placeholder="175"
                    className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight || ""}
                    onChange={handleChange}
                    placeholder="70"
                    className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  placeholder="Full Residential Address"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section 2: System & Insurance Identifiers */}
          <section className="space-y-4 pt-4 border-t border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">badge</span>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface">
                System & Insurance Identifiers
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Medical Record Number (MRN)
                </label>
                <input
                  type="text"
                  name="medicalRecordNumber"
                  value={formData.medicalRecordNumber || ""}
                  onChange={handleChange}
                  placeholder="PAK-PT-XXXX"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  name="insuranceProvider"
                  value={formData.insuranceProvider || ""}
                  onChange={handleChange}
                  placeholder="Insurance Company Name"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Insurance Member ID
                </label>
                <input
                  type="text"
                  name="insuranceMemberId"
                  value={formData.insuranceMemberId || ""}
                  onChange={handleChange}
                  placeholder="Policy / Member ID"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Emergency Contact Information */}
          <section className="space-y-4 pt-4 border-t border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-xl">emergency</span>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface">
                Emergency Contact Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Contact Full Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName || ""}
                  onChange={handleChange}
                  placeholder="Emergency Contact Name"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="emergencyContactEmail"
                  value={formData.emergencyContactEmail || ""}
                  onChange={handleChange}
                  placeholder="emergency@example.com"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Phone & Relationship
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact || ""}
                  onChange={handleChange}
                  placeholder="e.g. Brother - +1 555-0199"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-2xl bg-surface-container text-on-surface font-bold border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 rounded-2xl font-bold bg-surface-container text-on-surface hover:bg-outline-variant/30 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-premium bg-primary text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

EditProfileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  profile: PropTypes.object,
  onProfileUpdate: PropTypes.func.isRequired,
};
