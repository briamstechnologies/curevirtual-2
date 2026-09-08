// FILE: src/pages/doctor/Prescriptions.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaFileMedical,
  FaPrescriptionBottleAlt,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaPills,
  FaCheckCircle
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState(() => {
    const cached = localStorage.getItem("cached_doctor_prescriptions");
    return cached ? JSON.parse(cached) : [];
  });
  const [patients, setPatients] = useState([]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("Active");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Loaders
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State (Exact Schema columns match)
  const [form, setForm] = useState({
    patientId: "",
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    notes: "",
    refills: 0,
    isControlled: false,
    deaNumber: "",
  });

  const doctorUserId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await api.get(`/doctor/prescriptions`, {
        params: { doctorId: doctorUserId },
      });
      if (res.data) {
        setPrescriptions(res.data);
        localStorage.setItem("cached_doctor_prescriptions", JSON.stringify(res.data));
      } else {
        setPrescriptions([]);
      }
    } catch (err) {
      console.error("Error loading prescriptions:", err);
      toast.error("Failed to load clinical prescriptions.");
    }
  }, [doctorUserId]);

  const fetchMyPatients = useCallback(async () => {
    try {
      const res = await api.get("/doctor/my-patients", {
        params: { doctorId: doctorUserId },
      });
      const uniquePatients = res.data?.data || res.data || [];
      uniquePatients.sort((a, b) => {
        const nameA = [a.user?.firstName, a.user?.lastName].filter(Boolean).join(" ");
        const nameB = [b.user?.firstName, b.user?.lastName].filter(Boolean).join(" ");
        return nameA.localeCompare(nameB);
      });
      setPatients(uniquePatients);
    } catch (err) {
      console.error("Error loading patient registry:", err);
    }
  }, [doctorUserId]);

  useEffect(() => {
    fetchPrescriptions();
    fetchMyPatients();
  }, [fetchPrescriptions, fetchMyPatients]);

  // Filtered Logic
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      const patientName = `${p.patient?.user?.firstName || ""} ${p.patient?.user?.lastName || ""}`.toLowerCase();
      const medName = (p.medication || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = patientName.includes(query) || medName.includes(query);
      const isPast = p.dispatchStatus === "DISPENSED" || p.dispatchStatus === "REJECTED" || p.status === "COMPLETED";
      const matchesTab = statusTab === "Active" ? !isPast : isPast;

      return matchesSearch && matchesTab;
    });
  }, [prescriptions, searchQuery, statusTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.medication || !form.dosage) {
      toast.error("Please fill in patient, medication, and dosage.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/doctor/prescriptions", {
        patientId: form.patientId,
        medication: form.medication,
        dosage: form.dosage,
        frequency: form.frequency,
        duration: form.duration,
        notes: form.notes,
        refills: Number(form.refills || 0),
        isControlled: Boolean(form.isControlled),
        deaNumber: form.deaNumber || null,
        doctorId: doctorUserId,
      });

      toast.success("Prescription generated successfully!");
      setModalOpen(false);
      setForm({
        patientId: "",
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        notes: "",
        refills: 0,
        isControlled: false,
        deaNumber: "",
      });
      fetchPrescriptions();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create prescription.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/doctor/prescriptions/${selectedPrescription.id}`, {
        patientId: form.patientId,
        medication: form.medication,
        dosage: form.dosage,
        frequency: form.frequency,
        duration: form.duration,
        notes: form.notes,
        refills: Number(form.refills || 0),
        isControlled: Boolean(form.isControlled),
        deaNumber: form.deaNumber || null,
      });
      toast.success("Prescription updated.");
      setEditModal(false);
      fetchPrescriptions();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update prescription.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setConfirmLoading(true);
      await api.delete(`/doctor/prescriptions/${pendingDeleteId}`);
      toast.success("Prescription deleted.");
      setConfirmOpen(false);
      fetchPrescriptions();
    } catch (err) {
      toast.error("Failed to delete record.");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <DashboardLayout role="DOCTOR" user={{ name: userName }}>
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto font-sans text-slate-800">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Prescriptions
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Active medical prescriptions and patient treatment logs
            </p>
          </div>
          
          <button
            onClick={() => setModalOpen(true)}
            disabled={patients.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-700/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <FaPlus /> New Prescription
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="bg-white border border-slate-100 p-4 md:p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex gap-8 border-b border-slate-100 text-sm font-bold">
            {["Active", "Past"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`pb-3 transition-all ${
                  statusTab === tab
                    ? "border-b-2 border-teal-700 text-teal-800 font-black"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <FaSearch className="absolute left-4 top-3.5 text-slate-400 text-xs" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium focus:bg-white focus:border-teal-700 outline-none transition-all placeholder:text-slate-400"
              placeholder="Search prescriptions by medicine or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filteredPrescriptions.length === 0 ? (
            <div className="p-16 bg-white border border-slate-100 rounded-3xl text-center text-slate-400 font-bold text-xs">
              No {statusTab.toLowerCase()} prescriptions found in database.
            </div>
          ) : (
            filteredPrescriptions.map((p) => {
              const patientName = [p.patient?.user?.firstName, p.patient?.user?.lastName]
                .filter(Boolean)
                .join(" ") || p.patient?.name || "Patient Record";

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-100 hover:border-slate-200 p-6 rounded-3xl shadow-xs transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-teal-700 flex items-center justify-center text-xl shadow-xs">
                        <FaPills />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {p.medication} {p.dosage}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                            <FaCheckCircle className="text-[9px]" /> {p.dispatchStatus || "Active"}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {p.frequency} {p.duration ? `• for ${p.duration}` : ""} {p.notes && p.notes !== "EMPTY" ? `(${p.notes})` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedPrescription(p);
                          setViewModal(true);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-teal-700 hover:bg-slate-50 transition"
                        title="View Details"
                      >
                        <FaEye size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPrescription(p);
                          setForm({
                            patientId: p.patientId || p.patient?.id || "",
                            medication: p.medication || "",
                            dosage: p.dosage || "",
                            frequency: p.frequency || "",
                            duration: p.duration || "",
                            notes: p.notes === "EMPTY" ? "" : p.notes || "",
                            refills: p.refills || 0,
                            isControlled: p.isControlled || false,
                            deaNumber: p.deaNumber || "",
                          });
                          setEditModal(true);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition"
                        title="Edit Prescription"
                      >
                        <FaEdit size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setPendingDeleteId(p.id);
                          setConfirmOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition"
                        title="Delete Prescription"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 border-y border-slate-50 text-xs font-semibold text-slate-600">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient</span>
                      <span className="font-bold text-slate-800">{patientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Prescribed on</span>
                      <span className="text-slate-700">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Attending Doctor</span>
                      <span className="text-slate-700">Dr. {userName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Refills</span>
                      <span className="text-slate-700">{p.refills || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => {
                        setSelectedPrescription(p);
                        setViewModal(true);
                      }}
                      className="py-2.5 px-6 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition text-center shadow-xs"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-3xl flex items-center gap-3 text-xs text-teal-900 font-semibold">
          <FaShieldAlt className="text-teal-700 text-base shrink-0" />
          <span>Take medicines only as directed by the clinician. Do not alter doses without approval.</span>
        </div>
      </div>

      {/* New Prescription Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <FaTimes size={16} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FaPrescriptionBottleAlt className="text-teal-700" /> Issue Prescription
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Enter medical orders for patient record.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Select Patient</label>
                <Select
                  options={patients.map((p) => ({
                    value: p.id,
                    label: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(" ") || p.name || "Unknown Patient",
                  }))}
                  onChange={(selected) => setForm({ ...form, patientId: selected?.value || "" })}
                  placeholder="-- Search & Choose Patient --"
                  isSearchable
                  required
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: "1rem",
                      borderColor: state.isFocused ? "#0f766e" : "#e2e8f0",
                      padding: "2px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Medication</label>
                  <input
                    type="text"
                    placeholder="e.g. Panadol"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                    value={form.medication}
                    onChange={(e) => setForm({ ...form, medication: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                    value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Frequency</label>
                  <input
                    type="text"
                    placeholder="e.g. Every 8 hours"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 days"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Refills</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                  value={form.refills}
                  onChange={(e) => setForm({ ...form, refills: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Take with food."
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-lg shadow-teal-700/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Prescribing..." : "Save Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {viewModal && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
            <button
              onClick={() => setViewModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <FaTimes size={16} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FaFileMedical className="text-teal-700" /> Prescription Summary
              </h2>
              <span className="text-xs font-mono font-bold text-slate-400">ID: {selectedPrescription.id}</span>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient</span>
                  <p className="font-bold text-slate-900">
                    {[selectedPrescription.patient?.user?.firstName, selectedPrescription.patient?.user?.lastName].filter(Boolean).join(" ") || "Patient Record"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Authorized Date</span>
                  <p className="font-bold text-slate-900">{new Date(selectedPrescription.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Medication & Dose</span>
                  <p className="font-black text-slate-900 text-sm">{selectedPrescription.medication} {selectedPrescription.dosage}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Schedule</span>
                  <p className="text-slate-700 font-bold">{selectedPrescription.frequency} ({selectedPrescription.duration})</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Clinical Instructions</span>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700">
                  {selectedPrescription.notes && selectedPrescription.notes !== "EMPTY" ? selectedPrescription.notes : "No special instructions entered."}
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewModal(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Edit Prescription Modal */}
      {editModal && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
            <button
              onClick={() => setEditModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <FaTimes size={16} />
            </button>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Edit Prescription Order</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Medication</label>
                <input
                  type="text"
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                  value={form.medication}
                  onChange={(e) => setForm({ ...form, medication: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Dosage</label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                    value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Duration</label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Frequency</label>
                <input
                  type="text"
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-700 outline-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 text-center">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Prescription?</h3>
            <p className="text-xs font-bold text-slate-500">
              Are you sure you want to permanently remove this medication record?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={confirmLoading}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
              >
                {confirmLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}