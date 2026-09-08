// FILE: src/pages/doctor/MyPatientList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { toast } from "react-toastify";
import { 
  FaEye, 
  FaTimes, 
  FaPhoneAlt, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaHeartbeat, 
  FaPills, 
  FaNotesMedical, 
  FaMapMarkerAlt, 
  FaUserMd, 
  FaPaperPlane, 
  FaWeight, 
  FaRulerVertical,
  FaSearch,
  FaUserInjured,
  FaEnvelope,
  FaFileAlt
} from "react-icons/fa";

export default function MyPatientList() {
  const role = "DOCTOR";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";
  const doctorUserId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(() => {
    const cached = localStorage.getItem("cached_doctor_patients");
    return cached ? JSON.parse(cached) : [];
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search State
  const [localSearch, setLocalSearch] = useState("");
  const [search, setSearch] = useState("");

  // Modal / EHR State
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");

  // Health Records for Selected Patient
  const [patientRecords, setPatientRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Send Note State
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearch(localSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [localSearch]);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/doctor/patients", {
        params: {
          doctorUserId,
          page,
          limit: 10,
          search: search || undefined,
        },
      });

      const responseData = res.data?.data || res.data || [];
      const total = res.data?.totalPages || 1;

      setRows(Array.isArray(responseData) ? responseData : []);
      setTotalPages(total);

      if (page === 1 && Array.isArray(responseData)) {
        localStorage.setItem("cached_doctor_patients", JSON.stringify(responseData));
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [doctorUserId, search, page]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Fetch Patient Health History when a patient chart modal is opened
  useEffect(() => {
    if (!selectedPatient) {
      setPatientRecords([]);
      return;
    }
    const fetchHealthRecords = async () => {
      setLoadingRecords(true);
      try {
        const pId = selectedPatient.id || selectedPatient.userId;
        const res = await api.get(`/doctor/patient-health-history/${pId}`);
        const data = res.data?.data || res.data || [];
        setPatientRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load patient health records:", err);
      } finally {
        setLoadingRecords(false);
      }
    };
    fetchHealthRecords();
  }, [selectedPatient]);

  const ageFromDob = (dob) => {
    if (!dob) return "—";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "—";
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const displayRows = useMemo(() => {
    return rows.filter((p) => {
      const patientUser = p.user || {};
      const fullName = `${patientUser.firstName || ""} ${patientUser.lastName || ""}`.trim().toLowerCase();
      const mrn = (p.medicalRecordNumber || p.referenceId || "").toLowerCase();
      const addr = (p.address || "").toLowerCase();
      const searchKey = search.trim().toLowerCase();

      if (searchKey && !fullName.includes(searchKey) && !mrn.includes(searchKey) && !addr.includes(searchKey)) {
        return false;
      }
      return true;
    });
  }, [rows, search]);

  const handleSendNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Please enter a note or clinical instruction.");
      return;
    }
    try {
      setSendingNote(true);
      const finalContent = appointmentTime 
        ? `📅 Appointment: ${new Date(appointmentTime).toLocaleString()}\n\n📝 Clinical Note: ${noteContent}`
        : noteContent;

      const recipientId = selectedPatient?.user?.id || selectedPatient?.userId;

      if (!recipientId) {
        toast.error("Invalid patient ID.");
        return;
      }

      await api.post("/messages/send", {
        recipient: recipientId,
        content: finalContent
      });
      toast.success("Clinical note dispatched to patient.");
      setNoteContent("");
      setAppointmentTime("");
      setShowNoteBox(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to send message.");
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
        
        {/* Clean Integrated Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <FaUserInjured className="text-emerald-600" /> Patient Registry
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-semibold mt-1">
              Active patient profiles, biometrics, and electronic medical records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Live Search Bar */}
            <div className="relative min-w-[260px]">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all placeholder:text-slate-400"
                placeholder="Search patient, MRN, address..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            
            <span className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black tracking-wide whitespace-nowrap">
              {displayRows.length} Active Records
            </span>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              Loading patient repository...
            </div>
          ) : displayRows.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold text-xs">
              No matching patient records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-6">Demographics</th>
                    <th className="py-4 px-6">Blood Type</th>
                    <th className="py-4 px-6">Allergies / Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {displayRows.map((p) => {
                    const fullName = p.user ? `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim() : "Patient";
                    const avatarSrc =
                      p.user?.profileImage ||
                      p.user?.avatarUrl ||
                      p.user?.avatar ||
                      p.user?.image ||
                      p.profileImage ||
                      p.profilePicture ||
                      p.avatarUrl;
                    const hasAllergies = Boolean(p.allergies && p.allergies.trim() && p.allergies !== "EMPTY");
                    
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={fullName}
                                className="w-10 h-10 rounded-2xl object-cover border border-emerald-200 shadow-xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-sm flex items-center justify-center shadow-xs">
                                {fullName.charAt(0) || "P"}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {fullName}
                              </div>
                              <div className="text-xs text-slate-500 font-semibold">
                                MRN: <span className="font-mono text-slate-700">{p.medicalRecordNumber || p.referenceId || "—"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="text-xs font-bold text-slate-800 capitalize">
                            {p.user?.gender?.toLowerCase() || "—"} • {ageFromDob(p.user?.dateOfBirth)} yrs
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold truncate max-w-[180px]">
                            {p.address || p.user?.email || "—"}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs">
                            {p.bloodGroup || "UNKNOWN"}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {hasAllergies ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs">
                                <FaExclamationTriangle className="text-[10px] text-rose-600" /> {p.allergies}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                                <FaCheckCircle className="text-[10px]" /> Clean Record
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setActiveTab("Overview");
                              setShowNoteBox(false);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white text-emerald-800 text-xs font-black transition-all shadow-xs cursor-pointer"
                          >
                            <FaEye /> View Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-all font-bold cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-all font-bold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EHR Clinical Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-[32px] shadow-2xl border border-slate-200 p-6 md:p-8 space-y-6">
            
            <button 
              onClick={() => setSelectedPatient(null)} 
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            >
              <FaTimes size={14} />
            </button>

            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6 pr-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(() => {
                    const modalAvatarSrc =
                      selectedPatient.user?.profileImage ||
                      selectedPatient.user?.avatarUrl ||
                      selectedPatient.user?.avatar ||
                      selectedPatient.user?.image ||
                      selectedPatient.profileImage ||
                      selectedPatient.profilePicture ||
                      selectedPatient.avatarUrl;

                    return modalAvatarSrc ? (
                      <img
                        src={modalAvatarSrc}
                        alt="Patient Profile"
                        className="w-18 h-18 rounded-3xl object-cover border-2 border-emerald-300 shadow-inner"
                      />
                    ) : (
                      <div className="w-18 h-18 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 font-black text-2xl flex items-center justify-center shadow-inner">
                        {selectedPatient.user?.firstName?.charAt(0) || "P"}
                      </div>
                    );
                  })()}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center text-white text-[9px] font-black">
                    ✓
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {selectedPatient.user ? `${selectedPatient.user.firstName || ""} ${selectedPatient.user.lastName || ""}`.trim() : "Patient Chart"}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    {ageFromDob(selectedPatient.user?.dateOfBirth)} years • {selectedPatient.user?.gender || "Not specified"} • MRN: <span className="font-mono text-slate-800">{selectedPatient.medicalRecordNumber || selectedPatient.referenceId || "—"}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <FaPhoneAlt className="text-slate-400 text-[10px]" /> {selectedPatient.user?.phoneNumber || "No phone"}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <FaEnvelope className="text-slate-400 text-[10px]" /> {selectedPatient.user?.email || "No email"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowNoteBox(!showNoteBox)}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <FaPaperPlane /> {showNoteBox ? "Hide Note Drawer" : "Send Clinical Note"}
                </button>

                {selectedPatient.allergies && selectedPatient.allergies !== "EMPTY" && (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-3">
                    <FaExclamationTriangle className="text-rose-600 text-lg" />
                    <div>
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Critical Allergy</span>
                      <p className="text-xs font-black text-rose-950">{selectedPatient.allergies}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note Dispatch Drawer */}
            {showNoteBox && (
              <div className="p-5 rounded-3xl bg-slate-50 border border-emerald-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    Send Clinical Note or Appointment Instruction
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">Target: Patient Account</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Appointment Schedule (Optional)</label>
                    <input
                      type="datetime-local"
                      className="w-full p-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-none"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Prescription / Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g., Take medications after meals and track blood pressure..."
                      className="w-full p-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-none"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSendNote}
                    disabled={sendingNote}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingNote ? "Dispatching..." : "Send Note"}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex gap-6 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500">
              {["Overview", "Medications & Rx", "Medical History"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3.5 transition-all cursor-pointer ${
                    activeTab === tab ? "border-b-2 border-emerald-600 text-emerald-700 font-black" : "hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Views */}
            {activeTab === "Overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Columns */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FaNotesMedical className="text-emerald-600" /> Chronic Conditions & History
                      </span>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        {selectedPatient.chronicConditions || selectedPatient.medicalHistory || "No active chronic conditions documented."}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FaPills className="text-teal-600" /> Prescribed Medications
                      </span>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        {selectedPatient.medications || "No ongoing medications recorded."}
                      </p>
                    </div>
                  </div>

                  {/* Biometrics */}
                  <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-4">
                      <FaHeartbeat className="text-rose-600" /> Biometrics & Body Measurements
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
                          <FaRulerVertical />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Height</span>
                          <p className="text-lg font-black text-slate-900">
                            {selectedPatient.height || "—"} <span className="text-xs font-normal text-slate-500">{selectedPatient.heightUnit || "cm"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-lg">
                          <FaWeight />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Weight</span>
                          <p className="text-lg font-black text-slate-900">
                            {selectedPatient.weight || "—"} <span className="text-xs font-normal text-slate-500">{selectedPatient.weightUnit || "kg"}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Uploaded Health Records Overview */}
                  <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FaFileAlt className="text-emerald-600" /> Patient Uploaded Records & Consultations ({patientRecords.length})
                    </span>
                    {loadingRecords ? (
                      <div className="p-4 text-xs font-bold text-slate-400">Loading patient records...</div>
                    ) : patientRecords.length > 0 ? (
                      <div className="space-y-2">
                        {patientRecords.slice(0, 3).map((rec, idx) => (
                          <div key={rec.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900">{rec.type || "Medical Record"}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{rec.provider || "Healthcare Provider"} • {rec.date}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {rec.source || "RECORD"}
                            </span>
                          </div>
                        ))}
                        {patientRecords.length > 3 && (
                          <button
                            onClick={() => setActiveTab("Medical History")}
                            className="text-xs font-bold text-emerald-700 hover:underline pt-1 block"
                          >
                            View all {patientRecords.length} records in Medical History tab →
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-500 italic">No uploaded health records on file.</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 flex items-start gap-3">
                    <FaMapMarkerAlt className="text-slate-400 text-sm mt-1" />
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Registered Address</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedPatient.address || "No address entered in profile"}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50 space-y-4">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">Clinical Summary</span>
                    
                    <div>
                      <span className="text-[11px] font-bold text-slate-500">Blood Group</span>
                      <p className="text-sm font-black text-slate-900">{selectedPatient.bloodGroup || "UNKNOWN"}</p>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-[11px] font-bold text-slate-500">Risk Assessment</span>
                      <p className="text-xs font-black capitalize text-slate-900">{selectedPatient.riskLevel || "Standard Profile"}</p>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-[11px] font-bold text-slate-500">Insurance Details</span>
                      <p className="text-xs font-bold text-slate-900">
                        {selectedPatient.insuranceProvider ? `${selectedPatient.insuranceProvider} (${selectedPatient.insuranceMemberId || "Active"})` : "Self Pay / Direct"}
                      </p>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Emergency Contact</span>
                      <p className="text-xs font-black text-slate-900">
                        {selectedPatient.emergencyContactName || selectedPatient.emergencyContact || "No contact specified"}
                      </p>
                      {selectedPatient.emergencyContactEmail && (
                        <p className="text-[11px] text-slate-600 font-semibold">{selectedPatient.emergencyContactEmail}</p>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block">Assigned Clinician</span>
                        <p className="text-xs font-black text-slate-900">Dr. {userName}</p>
                      </div>
                      <FaUserMd className="text-emerald-600 text-lg" />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "Medications & Rx" && (
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 animate-in fade-in">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FaPills className="text-teal-600" /> Active Prescriptions & Drug Protocol
                </h3>
                
                {patientRecords.filter(r => (r.type || "").toLowerCase().includes("rx") || (r.type || "").toLowerCase().includes("prescrip") || (r.type || "").toLowerCase().includes("med")).length > 0 ? (
                  <div className="space-y-3">
                    {patientRecords
                      .filter(r => (r.type || "").toLowerCase().includes("rx") || (r.type || "").toLowerCase().includes("prescrip") || (r.type || "").toLowerCase().includes("med"))
                      .map((rec, idx) => (
                        <div key={rec.id || idx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{rec.type}</span>
                            <span className="text-[11px] font-semibold text-slate-500">{rec.date}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium italic">"{rec.note}"</p>
                          <p className="text-[11px] text-slate-500 font-semibold">Provider: {rec.provider}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">
                      {selectedPatient.medications || "No active prescriptions currently on file for this patient."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Medical History" && (
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 animate-in fade-in">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FaFileAlt className="text-emerald-600" /> Complete Past Medical Encounters, Consultations & Uploaded Records
                </h3>
                
                {loadingRecords ? (
                  <div className="p-8 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    Loading patient health history...
                  </div>
                ) : patientRecords.length > 0 ? (
                  <div className="space-y-3">
                    {patientRecords.map((rec, idx) => (
                      <div key={rec.id || idx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            {rec.type || "Medical Record"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {rec.date || new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {rec.provider && (
                          <p className="text-[11px] font-semibold text-slate-600">Provider: {rec.provider}</p>
                        )}
                        {rec.note && (
                          <p className="text-xs text-slate-700 font-medium italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            "{rec.note}"
                          </p>
                        )}
                        {rec.resultUrl && (
                          <a
                            href={rec.resultUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline pt-1"
                          >
                            <FaFileAlt /> View / Download Attachment
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedPatient.medicalHistory || selectedPatient.chronicConditions ? (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">
                      {selectedPatient.medicalHistory || selectedPatient.chronicConditions}
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-400">
                    No past medical background or diagnostic logs recorded.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}